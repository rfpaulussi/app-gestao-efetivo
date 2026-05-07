create table if not exists public.log_movimentacao (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles(id) on delete restrict,
  funcionario_id uuid not null references public.funcionarios(id) on delete restrict,
  posto_origem_id uuid references public.postos(id) on delete set null,
  posto_destino_id uuid not null references public.postos(id) on delete restrict,
  funcao_atual text,
  funcao_proposta text,
  data_movimentacao date not null,
  observacoes text,
  status text not null check (status in ('pendente','aprovado','rejeitado')) default 'pendente',
  aprovado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_log_movimentacao_supervisor_id
  on public.log_movimentacao(supervisor_id);

create index if not exists idx_log_movimentacao_funcionario_id
  on public.log_movimentacao(funcionario_id);

create index if not exists idx_log_movimentacao_status
  on public.log_movimentacao(status);

alter table public.log_movimentacao enable row level security;

drop policy if exists "log_movimentacao_select" on public.log_movimentacao;
create policy "log_movimentacao_select"
on public.log_movimentacao
for select
to authenticated
using (
  public.get_user_role() in ('admin', 'viewer')
  or supervisor_id = auth.uid()
);

drop policy if exists "log_movimentacao_insert" on public.log_movimentacao;
create policy "log_movimentacao_insert"
on public.log_movimentacao
for insert
to authenticated
with check (
  public.get_user_role() = 'admin'
  or supervisor_id = auth.uid()
);

drop policy if exists "log_movimentacao_update_admin" on public.log_movimentacao;
create policy "log_movimentacao_update_admin"
on public.log_movimentacao
for update
to authenticated
using (
  public.get_user_role() = 'admin'
)
with check (
  public.get_user_role() = 'admin'
);

drop policy if exists "log_movimentacao_delete_admin" on public.log_movimentacao;
create policy "log_movimentacao_delete_admin"
on public.log_movimentacao
for delete
to authenticated
using (
  public.get_user_role() = 'admin'
);

create table if not exists public.ausencias (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references public.profiles(id) on delete restrict,
  funcionario_id uuid not null references public.funcionarios(id) on delete restrict,
  posto_id uuid references public.postos(id) on delete set null,
  data_ausencia date not null,
  cobertura boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ausencias_supervisor_id
  on public.ausencias(supervisor_id);

create index if not exists idx_ausencias_funcionario_id
  on public.ausencias(funcionario_id);

create index if not exists idx_ausencias_data
  on public.ausencias(data_ausencia);

alter table public.ausencias enable row level security;

drop policy if exists "ausencias_select" on public.ausencias;
create policy "ausencias_select"
on public.ausencias
for select
to authenticated
using (
  public.get_user_role() in ('admin', 'viewer')
  or supervisor_id = auth.uid()
);

drop policy if exists "ausencias_insert" on public.ausencias;
create policy "ausencias_insert"
on public.ausencias
for insert
to authenticated
with check (
  public.get_user_role() = 'admin'
  or supervisor_id = auth.uid()
);

drop policy if exists "ausencias_update_admin" on public.ausencias;
create policy "ausencias_update_admin"
on public.ausencias
for update
to authenticated
using (
  public.get_user_role() = 'admin'
)
with check (
  public.get_user_role() = 'admin'
);

drop policy if exists "ausencias_delete_admin" on public.ausencias;
create policy "ausencias_delete_admin"
on public.ausencias
for delete
to authenticated
using (
  public.get_user_role() = 'admin'
);

create or replace function public.approve_log_movimentacao(
  p_movimentacao_id uuid,
  p_admin_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov public.log_movimentacao%rowtype;
  v_funcao_id uuid;
  v_mes_atual date;
begin
  select *
  into v_mov
  from public.log_movimentacao
  where id = p_movimentacao_id
  for update;

  if not found then
    raise exception 'Movimentação não encontrada';
  end if;

  if v_mov.status <> 'pendente' then
    raise exception 'A movimentação já foi processada';
  end if;

  select id
  into v_funcao_id
  from public.funcoes_base
  where nome = coalesce(v_mov.funcao_proposta, v_mov.funcao_atual)
  limit 1;

  update public.funcionarios
  set
    current_posto_id = v_mov.posto_destino_id,
    funcao = coalesce(v_mov.funcao_proposta, v_mov.funcao_atual),
    funcao_id = v_funcao_id
  where id = v_mov.funcionario_id;

  update public.log_movimentacao
  set
    status = 'aprovado',
    aprovado_por = p_admin_id
  where id = p_movimentacao_id;

  v_mes_atual := date_trunc('month', current_date)::date;
  perform public.snapshot_efetivo_mensal(v_mes_atual);

  return 'ok';
end;
$$;

create or replace function public.reject_log_movimentacao(
  p_movimentacao_id uuid,
  p_admin_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.log_movimentacao
  set
    status = 'rejeitado',
    aprovado_por = p_admin_id
  where id = p_movimentacao_id
    and status = 'pendente';

  if not found then
    raise exception 'Movimentação não encontrada ou já processada';
  end if;

  return 'ok';
end;
$$;

NOTIFY pgrst, 'reload schema';

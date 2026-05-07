alter table public.funcionarios
  add column if not exists current_posto_id uuid references public.postos(id) on delete set null;

create index if not exists idx_funcionarios_current_posto_id
  on public.funcionarios(current_posto_id);

create table if not exists public.efetivo_mensal (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  mes_referencia date not null,
  cargo_mes text,
  status text check (status in ('ativo','ferias','afastado','desligado','licenca')) default 'ativo',
  supervisor_id uuid references public.profiles(id),
  posto_id uuid references public.postos(id),
  secretaria text,
  esta_ferias_hoje boolean default false,
  is_insalubre boolean default false,
  created_at timestamptz not null default now(),
  unique(funcionario_id, mes_referencia)
);

create index if not exists idx_efetivo_mensal_mes_referencia
  on public.efetivo_mensal(mes_referencia);

create index if not exists idx_efetivo_mensal_posto_id
  on public.efetivo_mensal(posto_id);

create index if not exists idx_efetivo_mensal_supervisor_id
  on public.efetivo_mensal(supervisor_id);

alter table public.efetivo_mensal enable row level security;

drop policy if exists "efetivo_select_admin_or_supervisor_or_viewer" on public.efetivo_mensal;
create policy "efetivo_select_admin_or_supervisor_or_viewer"
on public.efetivo_mensal
for select
to authenticated
using (
  public.get_user_role() = 'admin'
  or public.get_user_role() = 'viewer'
  or supervisor_id = auth.uid()
  or posto_id in (
    select p.id
    from public.postos p
    where p.supervisor_id = auth.uid()
  )
  or posto_id in (
    select p.id
    from public.postos p
    where p.contrato_id = (
      select pr.contrato_id
      from public.profiles pr
      where pr.id = auth.uid()
    )
  )
);

drop policy if exists "efetivo_insert_admin" on public.efetivo_mensal;
create policy "efetivo_insert_admin"
on public.efetivo_mensal
for insert
to authenticated
with check (
  public.get_user_role() = 'admin'
);

drop policy if exists "efetivo_update_admin" on public.efetivo_mensal;
create policy "efetivo_update_admin"
on public.efetivo_mensal
for update
to authenticated
using (
  public.get_user_role() = 'admin'
)
with check (
  public.get_user_role() = 'admin'
);

drop policy if exists "efetivo_delete_admin" on public.efetivo_mensal;
create policy "efetivo_delete_admin"
on public.efetivo_mensal
for delete
to authenticated
using (
  public.get_user_role() = 'admin'
);

create or replace function public.snapshot_efetivo_mensal(p_mes date default date_trunc('month', current_date)::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.efetivo_mensal
  where mes_referencia = p_mes;

  insert into public.efetivo_mensal (
    funcionario_id,
    mes_referencia,
    cargo_mes,
    status,
    supervisor_id,
    posto_id,
    secretaria,
    esta_ferias_hoje,
    is_insalubre
  )
  select
    f.id,
    p_mes,
    coalesce(f.funcao, f.cargo) as cargo_mes,
    case
      when f.status = 'inativo' then 'desligado'
      when f.status = 'ferias' then 'ferias'
      when f.status = 'afastado' then 'afastado'
      else 'ativo'
    end as status,
    f.supervisor_id,
    f.current_posto_id,
    po.secretaria,
    exists (
      select 1
      from public.ferias fe
      where fe.funcionario_id = f.id
        and current_date between fe.inicio_programado and fe.fim_programado
        and fe.status in ('programado', 'em_gozo')
    ) as esta_ferias_hoje,
    case
      when coalesce(po.cota_insalubridade, 0) > 0 then true
      else false
    end as is_insalubre
  from public.funcionarios f
  left join public.postos po on po.id = f.current_posto_id
  where f.current_posto_id is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

NOTIFY pgrst, 'reload schema';

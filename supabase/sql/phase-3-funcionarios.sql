create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  registro text unique not null,
  nome text not null,
  cargo text not null,
  funcao text,
  data_nascimento date,
  sexo text check (sexo in ('M','F','O')),
  data_admissao date not null,
  supervisor_id uuid references public.profiles(id) on delete set null,
  tempo_experiencia text,
  primeiro_periodo_inicio date,
  primeiro_periodo_fim date,
  segundo_periodo_inicio date,
  segundo_periodo_fim date,
  status_experiencia text check (status_experiencia in ('1_periodo','2_periodo','efetivado','desligado')) default '1_periodo',
  data_saida date,
  mes_saida integer,
  ano_saida integer,
  tipo_demissao text check (tipo_demissao in ('pedido_demissao','sem_justa_causa','justa_causa','aposentadoria','falecimento','outros')),
  motivacao text,
  substituicao_id uuid references public.funcionarios(id) on delete set null,
  status text check (status in ('ativo','inativo','afastado','ferias')) default 'ativo',
  created_at timestamptz not null default now()
);

create index if not exists idx_funcionarios_registro on public.funcionarios(registro);
create index if not exists idx_funcionarios_supervisor_id on public.funcionarios(supervisor_id);
create index if not exists idx_funcionarios_status on public.funcionarios(status);
create index if not exists idx_funcionarios_nome on public.funcionarios(nome);

alter table public.funcionarios enable row level security;

create or replace function public.normalize_funcionario_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.data_saida is not null then
    if new.tipo_demissao is null then
      raise exception 'tipo_demissao é obrigatório quando data_saida for informada';
    end if;

    new.status := 'inativo';
    new.status_experiencia := 'desligado';
    new.mes_saida := extract(month from new.data_saida)::integer;
    new.ano_saida := extract(year from new.data_saida)::integer;
  else
    new.mes_saida := null;
    new.ano_saida := null;

    if new.status = 'inativo' then
      new.status := 'ativo';
    end if;

    if new.segundo_periodo_fim is not null and current_date > new.segundo_periodo_fim then
      new.status_experiencia := 'efetivado';
    elsif new.primeiro_periodo_fim is not null and current_date > new.primeiro_periodo_fim then
      new.status_experiencia := '2_periodo';
    else
      new.status_experiencia := '1_periodo';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_funcionario_fields on public.funcionarios;

create trigger trg_normalize_funcionario_fields
before insert or update on public.funcionarios
for each row
execute function public.normalize_funcionario_fields();

drop policy if exists "funcionarios_select_by_role" on public.funcionarios;
create policy "funcionarios_select_by_role"
on public.funcionarios
for select
to authenticated
using (
  public.get_user_role() = 'admin'
  or public.get_user_role() = 'viewer'
  or supervisor_id = auth.uid()
  or supervisor_id in (
    select p.id
    from public.profiles p
    where p.contrato_id = (
      select contrato_id
      from public.profiles
      where id = auth.uid()
    )
  )
);

drop policy if exists "funcionarios_insert_admin" on public.funcionarios;
create policy "funcionarios_insert_admin"
on public.funcionarios
for insert
to authenticated
with check (
  public.get_user_role() = 'admin'
);

drop policy if exists "funcionarios_update_admin" on public.funcionarios;
create policy "funcionarios_update_admin"
on public.funcionarios
for update
to authenticated
using (
  public.get_user_role() = 'admin'
)
with check (
  public.get_user_role() = 'admin'
);

drop policy if exists "funcionarios_delete_admin" on public.funcionarios;
create policy "funcionarios_delete_admin"
on public.funcionarios
for delete
to authenticated
using (
  public.get_user_role() = 'admin'
);

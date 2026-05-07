create table if not exists public.funcoes_base (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  adicional_tipo_default text not null
    check (adicional_tipo_default in ('nenhum', 'insalubridade', 'periculosidade')),
  adicional_percentual_default numeric(5,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.funcoes_base enable row level security;

drop policy if exists "funcoes_base_select_authenticated" on public.funcoes_base;
create policy "funcoes_base_select_authenticated"
on public.funcoes_base
for select
to authenticated
using (true);

drop policy if exists "funcoes_base_mutation_admin" on public.funcoes_base;
create policy "funcoes_base_mutation_admin"
on public.funcoes_base
for all
to authenticated
using (public.get_user_role() = 'admin')
with check (public.get_user_role() = 'admin');

insert into public.funcoes_base (nome, adicional_tipo_default, adicional_percentual_default)
values
  ('AJUDANTE DE LIMPEZA', 'nenhum', 0),
  ('SUPERVISOR (A) DE SERVIÇOS', 'nenhum', 0),
  ('JOVEM APRENDIZ', 'nenhum', 0),
  ('AGENTE DE HIGIENIZAÇÃO A', 'insalubridade', 40),
  ('AGENTE DE HIGIENIZAÇÃO B', 'insalubridade', 40),
  ('AGENTE DE HIGIENIZAÇÃO C', 'insalubridade', 40),
  ('LIDER', 'nenhum', 0),
  ('ENCARREGADO (A)', 'nenhum', 0),
  ('AUXILIAR ADMINISTRATIVO', 'nenhum', 0),
  ('LIMPADOR DE VIDROS', 'periculosidade', 30)
on conflict (nome) do update
set
  adicional_tipo_default = excluded.adicional_tipo_default,
  adicional_percentual_default = excluded.adicional_percentual_default,
  ativo = true;

alter table public.funcionarios
  add column if not exists funcao_id uuid references public.funcoes_base(id) on delete set null;

create index if not exists idx_funcionarios_funcao_id
  on public.funcionarios(funcao_id);

update public.funcionarios f
set funcao_id = fb.id
from public.funcoes_base fb
where f.funcao_id is null
  and f.funcao is not null
  and upper(trim(f.funcao)) = upper(trim(fb.nome));

alter table public.postos
  add column if not exists qtd_vagas_insalubridade integer not null default 0,
  add column if not exists qtd_vagas_periculosidade integer not null default 0;

update public.postos
set qtd_vagas_insalubridade = coalesce(cota_insalubridade, 0)
where coalesce(qtd_vagas_insalubridade, 0) = 0;

alter table public.efetivo_mensal
  add column if not exists adicional_tipo_aplicado text
    check (adicional_tipo_aplicado in ('insalubridade', 'periculosidade')),
  add column if not exists adicional_percentual_aplicado numeric(5,2) not null default 0,
  add column if not exists consome_cota_adicional boolean not null default false;

create or replace function public.snapshot_efetivo_mensal(
  p_mes date default date_trunc('month', current_date)::date
)
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

  with base as (
    select
      f.id as funcionario_id,
      p_mes as mes_referencia,
      coalesce(f.funcao, fb.nome, f.cargo) as cargo_mes,
      case
        when f.status = 'inativo' then 'desligado'
        when f.status = 'ferias' then 'ferias'
        when f.status = 'afastado' then 'afastado'
        else 'ativo'
      end as status,
      f.supervisor_id,
      f.current_posto_id as posto_id,
      po.secretaria,
      false as esta_ferias_hoje,
      coalesce(fb.adicional_tipo_default, 'nenhum') as adicional_tipo_default,
      coalesce(fb.adicional_percentual_default, 0) as adicional_percentual_default,
      coalesce(po.qtd_vagas_insalubridade, 0) as qtd_vagas_insalubridade,
      coalesce(po.qtd_vagas_periculosidade, 0) as qtd_vagas_periculosidade,
      row_number() over (
        partition by
          f.current_posto_id,
          coalesce(fb.adicional_tipo_default, 'nenhum')
        order by
          f.data_admissao nulls last,
          f.registro
      ) as ordem_cota
    from public.funcionarios f
    left join public.funcoes_base fb on fb.id = f.funcao_id
    left join public.postos po on po.id = f.current_posto_id
    where f.current_posto_id is not null
  )
  insert into public.efetivo_mensal (
    funcionario_id,
    mes_referencia,
    cargo_mes,
    status,
    supervisor_id,
    posto_id,
    secretaria,
    esta_ferias_hoje,
    is_insalubre,
    adicional_tipo_aplicado,
    adicional_percentual_aplicado,
    consome_cota_adicional
  )
  select
    b.funcionario_id,
    b.mes_referencia,
    b.cargo_mes,
    b.status,
    b.supervisor_id,
    b.posto_id,
    b.secretaria,
    b.esta_ferias_hoje,
    case
      when b.adicional_tipo_default = 'insalubridade'
       and b.ordem_cota <= b.qtd_vagas_insalubridade then true
      else false
    end as is_insalubre,
    case
      when b.adicional_tipo_default = 'insalubridade'
       and b.ordem_cota <= b.qtd_vagas_insalubridade then 'insalubridade'
      when b.adicional_tipo_default = 'periculosidade'
       and b.ordem_cota <= b.qtd_vagas_periculosidade then 'periculosidade'
      else null
    end as adicional_tipo_aplicado,
    case
      when b.adicional_tipo_default = 'insalubridade'
       and b.ordem_cota <= b.qtd_vagas_insalubridade then b.adicional_percentual_default
      when b.adicional_tipo_default = 'periculosidade'
       and b.ordem_cota <= b.qtd_vagas_periculosidade then b.adicional_percentual_default
      else 0
    end as adicional_percentual_aplicado,
    case
      when b.adicional_tipo_default = 'insalubridade'
       and b.ordem_cota <= b.qtd_vagas_insalubridade then true
      when b.adicional_tipo_default = 'periculosidade'
       and b.ordem_cota <= b.qtd_vagas_periculosidade then true
      else false
    end as consome_cota_adicional
  from base b;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

NOTIFY pgrst, 'reload schema';

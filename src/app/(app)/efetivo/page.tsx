import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { EfetivoTable } from "@/components/efetivo/efetivo-table";
import { EfetivoFilters } from "@/components/efetivo/efetivo-filters";
import { GenerateSnapshotButton } from "@/components/efetivo/generate-snapshot-button";

type SearchParams = {
  mes?: string;
  status?: string;
  posto?: string;
  supervisor?: string;
};

function normalizeMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function EfetivoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const month = normalizeMonth(searchParams.mes);
  const mesReferencia = `${month}-01`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("efetivo_mensal")
    .select(`
      id,
      funcionario_id,
      mes_referencia,
      cargo_mes,
      status,
      secretaria,
      esta_ferias_hoje,
      is_insalubre,
      funcionario:funcionario_id (
        registro,
        nome
      ),
      supervisor:supervisor_id (
        nome
      ),
      posto:posto_id (
        nome
      )
    `)
    .eq("mes_referencia", mesReferencia)
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  if (searchParams.posto) {
    query = query.eq("posto_id", searchParams.posto);
  }

  if (searchParams.supervisor) {
    query = query.eq("supervisor_id", searchParams.supervisor);
  }

  const { data: rows } = await query;

  const { data: postos } = await supabase
    .from("postos")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: supervisors } = await supabase
    .from("profiles")
    .select("id, nome")
    .in("role", ["admin", "supervisor"])
    .eq("ativo", true)
    .order("nome", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Snapshot mensal</p>
          <h1 className="text-2xl font-semibold tracking-tight">Efetivo Mensal</h1>
        </div>

        {profile?.role === "admin" ? <GenerateSnapshotButton mes={month} /> : null}
      </div>

      <EfetivoFilters
        mes={month}
        status={searchParams.status ?? ""}
        posto={searchParams.posto ?? ""}
        supervisor={searchParams.supervisor ?? ""}
        postos={postos ?? []}
        supervisors={supervisors ?? []}
      />

      <EfetivoTable rows={(rows as any[]) ?? []} />
    </div>
  );
}

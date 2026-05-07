import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, email, role")
    .eq("id", user.id)
    .single();

  const { count: funcionariosCount } = await supabase
    .from("funcionarios")
    .select("*", { count: "exact", head: true });

  const { count: postosCount } = await supabase
    .from("postos")
    .select("*", { count: "exact", head: true })
    .eq("ativo", true);

  const { count: pendentesCount } = await supabase
    .from("log_movimentacao")
    .select("*", { count: "exact", head: true })
    .eq("status", "pendente");

  const { count: ausenciasHoje } = await supabase
    .from("ausencias")
    .select("*", { count: "exact", head: true })
    .eq("data_ausencia", new Date().toISOString().slice(0, 10));

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Painel inicial</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isAdmin ? "Painel do Administrador" : "Painel do Supervisor"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile?.nome} · {profile?.email} · {profile?.role}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Funcionários</p>
          <p className="mt-2 text-3xl font-semibold">{funcionariosCount ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Postos ativos</p>
          <p className="mt-2 text-3xl font-semibold">{postosCount ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Movimentações pendentes</p>
          <p className="mt-2 text-3xl font-semibold">{pendentesCount ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Ausências hoje</p>
          <p className="mt-2 text-3xl font-semibold">{ausenciasHoje ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">
            {isAdmin ? "Ações do admin" : "Ações do supervisor"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/funcionarios" className="rounded-md border px-3 py-2 text-sm">
              Funcionários
            </Link>
            <Link href="/postos" className="rounded-md border px-3 py-2 text-sm">
              Postos
            </Link>
            <Link href="/efetivo" className="rounded-md border px-3 py-2 text-sm">
              Efetivo
            </Link>
            <Link href="/sec" className="rounded-md border px-3 py-2 text-sm">
              SEC
            </Link>
            <Link href="/movimentacoes" className="rounded-md border px-3 py-2 text-sm">
              Movimentações
            </Link>
            <Link href="/ausencias" className="rounded-md border px-3 py-2 text-sm">
              Ausências
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Governança</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {isAdmin ? (
              <>
                <li>• Aprova ou rejeita movimentações.</li>
                <li>• Conduz fluxo documental de mudança de função.</li>
                <li>• Consulta toda a operação e dados mestres.</li>
              </>
            ) : (
              <>
                <li>• Lança movimentações, ausências e ocorrências.</li>
                <li>• Consulta efetivo, postos, funcionários e SEC.</li>
                <li>• Não aprova mudanças estruturais.</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AusenciasManager } from "@/components/ausencias/ausencias-manager";

export default async function AusenciasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: funcionarios } = await supabase
    .from("funcionarios")
    .select(`
      id,
      registro,
      nome,
      supervisor_id,
      current_posto_id,
      posto:current_posto_id (
        id,
        nome
      )
    `)
    .eq("status", "ativo")
    .order("nome", { ascending: true });

  const { data: supervisors } = await supabase
    .from("profiles")
    .select("id, nome, email")
    .in("role", ["admin", "supervisor"])
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: ausencias } = await supabase
    .from("ausencias")
    .select(`
      id,
      data_ausencia,
      cobertura,
      funcionario:funcionario_id (
        registro,
        nome
      ),
      posto:posto_id (
        nome
      ),
      cobertura_supervisor:cobertura_supervisor_id (
        nome
      ),
      cobertura_funcionario:cobertura_funcionario_id (
        registro,
        nome
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <AusenciasManager
      currentUserId={user.id}
      funcionarios={(funcionarios as any[]) ?? []}
      supervisors={supervisors ?? []}
      ausencias={(ausencias as any[]) ?? []}
    />
  );
}

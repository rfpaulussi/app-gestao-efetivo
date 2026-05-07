import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PostosManager } from "@/components/postos/postos-manager";

export default async function PostosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: postos } = await supabase
    .from("postos")
    .select(`
      id,
      nome,
      secretaria,
      func_previsto_edital,
      cota_insalubridade,
      qtd_vagas_insalubridade,
      ativo,
      contrato_id,
      supervisor_id,
      contratos:contrato_id (
        id,
        nome
      ),
      supervisor:supervisor_id (
        id,
        nome,
        email
      )
    `)
    .order("created_at", { ascending: false });

  const { data: contratos } = await supabase
    .from("contratos")
    .select("id, nome")
    .order("nome", { ascending: true });

  const { data: supervisors } = await supabase
    .from("profiles")
    .select("id, nome, email, role")
    .in("role", ["admin", "supervisor"])
    .eq("ativo", true)
    .order("nome", { ascending: true });

  return (
    <PostosManager
      initialPostos={(postos as any[]) ?? []}
      contratos={contratos ?? []}
      supervisors={supervisors ?? []}
      canEdit={profile?.role === "admin"}
    />
  );
}

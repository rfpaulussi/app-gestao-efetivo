import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { FuncionariosManager } from "@/components/funcionarios/funcionarios-manager";

export default async function FuncionariosPage() {
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

  const { data: funcionarios } = await supabase
    .from("funcionarios")
    .select(`
      id,
      registro,
      nome,
      cargo,
      funcao,
      funcao_id,
      data_nascimento,
      sexo,
      data_admissao,
      supervisor_id,
      modelo_experiencia,
      primeiro_periodo_inicio,
      primeiro_periodo_fim,
      segundo_periodo_inicio,
      segundo_periodo_fim,
      status_experiencia,
      data_saida,
      tipo_demissao,
      motivacao,
      substituicao_id,
      substitui_desligado,
      status,
      supervisor:supervisor_id (
        id,
        nome,
        email
      ),
      substituicao:substituicao_id (
        id,
        nome,
        registro
      ),
      funcao_ref:funcao_id (
        id,
        nome,
        adicional_tipo_default,
        adicional_percentual_default
      )
    `)
    .order("created_at", { ascending: false });

  const { data: supervisors } = await supabase
    .from("profiles")
    .select("id, nome, email")
    .in("role", ["admin", "supervisor"])
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: funcoes } = await supabase
    .from("funcoes_base")
    .select("id, nome, adicional_tipo_default, adicional_percentual_default")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  return (
    <FuncionariosManager
      funcionarios={(funcionarios as any[]) ?? []}
      supervisors={supervisors ?? []}
      funcoes={funcoes ?? []}
      canEdit={profile?.role === "admin"}
    />
  );
}

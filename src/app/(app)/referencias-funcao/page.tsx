import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ReferenciasFuncaoManager } from "@/components/referencias-funcao/referencias-funcao-manager";

export default async function ReferenciasFuncaoPage() {
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

  const { data: referencias } = await supabase
    .from("referencias_funcao")
    .select(`
      id,
      nome_referencia,
      contrato_id,
      funcao_id,
      vigencia_inicio,
      vigencia_fim,
      salario_base,
      assiduidade,
      valor_vr,
      valor_va,
      valor_vt,
      valor_plr,
      adicional_tipo,
      adicional_percentual,
      regiao,
      escala,
      horario,
      observacoes,
      ativo,
      contrato:contrato_id (
        nome
      ),
      funcao:funcao_id (
        nome
      )
    `)
    .order("vigencia_inicio", { ascending: false });

  const { data: contratos } = await supabase
    .from("contratos")
    .select("id, nome")
    .order("nome", { ascending: true });

  const { data: funcoes } = await supabase
    .from("funcoes_base")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  return (
    <ReferenciasFuncaoManager
      referencias={(referencias as any[]) ?? []}
      contratos={contratos ?? []}
      funcoes={funcoes ?? []}
      canEdit={profile?.role === "admin"}
    />
  );
}

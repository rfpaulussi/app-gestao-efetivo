import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SecPanel } from "@/components/sec/sec-panel";

export default async function SecPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const mesAtual = new Date();
  const mesReferencia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const { data: postos } = await supabase
    .from("postos")
    .select(`
      id,
      nome,
      secretaria,
      func_previsto_edital,
      qtd_vagas_insalubridade,
      supervisor:supervisor_id (
        nome
      )
    `)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: efetivo } = await supabase
    .from("efetivo_mensal")
    .select("posto_id, status, adicional_tipo_aplicado, consome_cota_adicional")
    .eq("mes_referencia", mesReferencia);

  const rows = (postos ?? []).map((posto: any) => {
    const doPosto = (efetivo ?? []).filter((item: any) => item.posto_id === posto.id);
    const noCampo = doPosto.filter((item: any) => item.status === "ativo").length;
    const ocupadasInsalubridade = doPosto.filter(
      (item: any) =>
        item.consome_cota_adicional === true &&
        item.adicional_tipo_aplicado === "insalubridade"
    ).length;

    return {
      ...posto,
      noCampo,
      ocupadasInsalubridade,
    };
  });

  return <SecPanel rows={rows} />;
}

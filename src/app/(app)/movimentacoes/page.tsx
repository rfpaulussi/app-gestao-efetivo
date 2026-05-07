import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { MovimentacoesManager } from "@/components/movimentacoes/movimentacoes-manager";

export default async function MovimentacoesPage() {
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
      funcao,
      current_posto_id,
      posto:current_posto_id (
        id,
        nome
      )
    `)
    .eq("status", "ativo")
    .order("nome", { ascending: true });

  const { data: postos } = await supabase
    .from("postos")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: funcoes } = await supabase
    .from("funcoes_base")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: movimentacoes } = await supabase
    .from("log_movimentacao")
    .select(`
      id,
      funcionario_id,
      posto_origem_id,
      posto_destino_id,
      funcao_atual,
      funcao_proposta,
      data_movimentacao,
      observacoes,
      status,
      exige_documento_funcao,
      status_documento,
      snapshot_atual,
      snapshot_proposta,
      funcionario:funcionario_id (
        registro,
        nome
      ),
      posto_origem:posto_origem_id (
        nome
      ),
      posto_destino:posto_destino_id (
        nome
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <MovimentacoesManager
      currentUserId={user.id}
      currentUserRole={profile?.role ?? "viewer"}
      funcionarios={(funcionarios as any[]) ?? []}
      postos={postos ?? []}
      funcoes={funcoes ?? []}
      movimentacoes={(movimentacoes as any[]) ?? []}
    />
  );
}

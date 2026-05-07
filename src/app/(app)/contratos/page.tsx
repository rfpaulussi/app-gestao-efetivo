import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ContratosManager } from "@/components/contratos/contratos-manager";

export default async function ContratosPage() {
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

  const { data: contratos } = await supabase
    .from("contratos")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <ContratosManager
      initialContratos={contratos ?? []}
      canEdit={profile?.role === "admin"}
    />
  );
}

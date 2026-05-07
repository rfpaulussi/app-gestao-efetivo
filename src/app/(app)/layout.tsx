import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { createClient } from "@/utils/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email, role")
    .eq("id", user.id)
    .single();

  const nome = profile?.nome ?? "Usuário";
  const email = profile?.email ?? user.email ?? "";
  const role = profile?.role ?? "viewer";

  return (
    <div className="min-h-screen bg-muted/30 lg:flex">
      <AppSidebar />

      <div className="min-w-0 flex-1">
        <AppHeader nome={nome} email={email} role={role} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

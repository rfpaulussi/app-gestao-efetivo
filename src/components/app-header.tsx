import { SignOutButton } from "@/components/sign-out-button";

type AppHeaderProps = {
  nome: string;
  email: string;
  role: string;
};

export function AppHeader({ nome, email, role }: AppHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div>
        <p className="text-sm text-muted-foreground">Usuário logado</p>
        <h2 className="text-sm font-semibold text-foreground">{nome}</h2>
        <p className="text-xs text-muted-foreground">
          {email} · {role}
        </p>
      </div>

      <SignOutButton />
    </header>
  );
}

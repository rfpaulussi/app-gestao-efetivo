import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Falha na autenticação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Não foi possível concluir o callback do Supabase. Isso normalmente
            indica URL de redirect faltando ou sessão expirada.
          </p>

          <Link href="/login" className="text-primary hover:underline">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

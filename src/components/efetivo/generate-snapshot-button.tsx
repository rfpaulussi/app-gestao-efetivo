"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type Props = {
  mes: string;
};

export function GenerateSnapshotButton({ mes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);

    const supabase = createClient();
    const mesReferencia = `${mes}-01`;

    const { error } = await supabase.rpc("snapshot_efetivo_mensal", {
      p_mes: mesReferencia,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Falha ao gerar snapshot.");
      return;
    }

    toast.success("Snapshot gerado com sucesso.");
    router.refresh();
  }

  return (
    <Button type="button" onClick={handleGenerate} disabled={loading}>
      {loading ? "Gerando..." : "Gerar snapshot"}
    </Button>
  );
}

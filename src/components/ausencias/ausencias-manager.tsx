"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

type SupervisorOption = {
  id: string;
  nome: string;
  email: string;
};

type FuncionarioOption = {
  id: string;
  registro: string;
  nome: string;
  supervisor_id: string | null;
  current_posto_id: string | null;
  posto: {
    id: string;
    nome: string;
  } | null;
};

type AusenciaRow = {
  id: string;
  data_ausencia: string;
  cobertura: boolean;
  funcionario: {
    registro: string;
    nome: string;
  } | null;
  posto: {
    nome: string;
  } | null;
  cobertura_supervisor: {
    nome: string;
  } | null;
  cobertura_funcionario: {
    registro: string;
    nome: string;
  } | null;
};

type Props = {
  currentUserId: string;
  funcionarios: FuncionarioOption[];
  supervisors: SupervisorOption[];
  ausencias: AusenciaRow[];
};

type FormState = {
  funcionario_id: string;
  data_ausencia: string;
  cobertura: boolean;
  cobertura_supervisor_id: string;
  cobertura_funcionario_id: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AusenciasManager({
  currentUserId,
  funcionarios,
  supervisors,
  ausencias,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormState>({
    funcionario_id: "",
    data_ausencia: todayISO(),
    cobertura: false,
    cobertura_supervisor_id: "",
    cobertura_funcionario_id: "",
  });
  const [saving, setSaving] = useState(false);

  const funcionarioSelecionado = useMemo(() => {
    return funcionarios.find((item) => item.id === form.funcionario_id) ?? null;
  }, [funcionarios, form.funcionario_id]);

  const funcionariosCobertura = useMemo(() => {
    if (!form.cobertura_supervisor_id) return [];
    return funcionarios.filter(
      (item) =>
        item.supervisor_id === form.cobertura_supervisor_id &&
        item.id !== form.funcionario_id
    );
  }, [funcionarios, form.cobertura_supervisor_id, form.funcionario_id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.funcionario_id) {
      toast.error("Selecione o funcionário ausente.");
      return;
    }

    if (form.cobertura && !form.cobertura_supervisor_id) {
      toast.error("Selecione o supervisor da cobertura.");
      return;
    }

    if (form.cobertura && !form.cobertura_funcionario_id) {
      toast.error("Selecione quem fez a cobertura.");
      return;
    }

    setSaving(true);

    const payload = {
      supervisor_id: currentUserId,
      funcionario_id: form.funcionario_id,
      posto_id: funcionarioSelecionado?.current_posto_id || null,
      data_ausencia: form.data_ausencia,
      cobertura: form.cobertura,
      cobertura_supervisor_id: form.cobertura ? form.cobertura_supervisor_id : null,
      cobertura_funcionario_id: form.cobertura ? form.cobertura_funcionario_id : null,
    };

    const { error } = await supabase.from("ausencias").insert(payload);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Ausência registrada.");
    setForm({
      funcionario_id: "",
      data_ausencia: todayISO(),
      cobertura: false,
      cobertura_supervisor_id: "",
      cobertura_funcionario_id: "",
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Fluxo operacional</p>
        <h1 className="text-2xl font-semibold tracking-tight">Ausências</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar ausência</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="funcionario_id">Funcionário ausente</Label>
              <select
                id="funcionario_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.funcionario_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    funcionario_id: e.target.value,
                    cobertura_supervisor_id: "",
                    cobertura_funcionario_id: "",
                  }))
                }
              >
                <option value="">Selecione</option>
                {funcionarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.registro} · {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input
                value={funcionarioSelecionado?.posto?.nome || ""}
                readOnly
                placeholder="Preenchida automaticamente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_ausencia">Data da ausência</Label>
              <Input
                id="data_ausencia"
                type="date"
                value={form.data_ausencia}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, data_ausencia: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2 self-end">
              <input
                id="cobertura"
                type="checkbox"
                checked={form.cobertura}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cobertura: e.target.checked,
                    cobertura_supervisor_id: e.target.checked ? prev.cobertura_supervisor_id : "",
                    cobertura_funcionario_id: e.target.checked ? prev.cobertura_funcionario_id : "",
                  }))
                }
              />
              <Label htmlFor="cobertura">Cobertura realizada</Label>
            </div>

            {form.cobertura ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cobertura_supervisor_id">Supervisor da cobertura</Label>
                  <select
                    id="cobertura_supervisor_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.cobertura_supervisor_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        cobertura_supervisor_id: e.target.value,
                        cobertura_funcionario_id: "",
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {supervisors.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} ({item.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cobertura_funcionario_id">Quem fez a cobertura</Label>
                  <select
                    id="cobertura_funcionario_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.cobertura_funcionario_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        cobertura_funcionario_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {funcionariosCobertura.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.registro} · {item.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Registrar ausência"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de ausências</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-3 pr-4">Funcionário</th>
                <th className="py-3 pr-4">Unidade</th>
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Cobertura</th>
                <th className="py-3 pr-4">Supervisor cobertura</th>
                <th className="py-3 pr-4">Funcionário cobertura</th>
              </tr>
            </thead>
            <tbody>
              {ausencias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-muted-foreground">
                    Nenhuma ausência registrada.
                  </td>
                </tr>
              ) : (
                ausencias.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pr-4">
                      {item.funcionario
                        ? `${item.funcionario.registro} · ${item.funcionario.nome}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">{item.posto?.nome || "—"}</td>
                    <td className="py-3 pr-4">
                      {format(new Date(`${item.data_ausencia}T00:00:00`), "dd/MM/yyyy")}
                    </td>
                    <td className="py-3 pr-4">{item.cobertura ? "Sim" : "Não"}</td>
                    <td className="py-3 pr-4">{item.cobertura_supervisor?.nome || "—"}</td>
                    <td className="py-3 pr-4">
                      {item.cobertura_funcionario
                        ? `${item.cobertura_funcionario.registro} · ${item.cobertura_funcionario.nome}`
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

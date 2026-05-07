"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

type Contrato = {
  id: string;
  nome: string;
  secretaria_municipal: string | null;
  numero_licitacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  ativo: boolean;
  created_at: string;
};

type Props = {
  initialContratos: Contrato[];
  canEdit: boolean;
};

type FormState = {
  nome: string;
  secretaria_municipal: string;
  numero_licitacao: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  nome: "",
  secretaria_municipal: "",
  numero_licitacao: "",
  data_inicio: "",
  data_fim: "",
  ativo: true,
};

export function ContratosManager({ initialContratos, canEdit }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function startEdit(item: Contrato) {
    setEditingId(item.id);
    setForm({
      nome: item.nome ?? "",
      secretaria_municipal: item.secretaria_municipal ?? "",
      numero_licitacao: item.numero_licitacao ?? "",
      data_inicio: item.data_inicio ?? "",
      data_fim: item.data_fim ?? "",
      ativo: item.ativo,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.nome.trim()) {
      toast.error("Informe o nome do contrato.");
      return;
    }

    setSaving(true);

    const payload = {
      nome: form.nome.trim(),
      secretaria_municipal: form.secretaria_municipal.trim() || null,
      numero_licitacao: form.numero_licitacao.trim() || null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      ativo: form.ativo,
    };

    const query = editingId
      ? supabase.from("contratos").update(payload).eq("id", editingId)
      : supabase.from("contratos").insert(payload);

    const { error } = await query;

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editingId ? "Contrato atualizado." : "Contrato criado.");
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Excluir este contrato?");
    if (!confirmed) return;

    const { error } = await supabase.from("contratos").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Contrato excluído.");
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Dados mestres</p>
        <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
      </div>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar contrato" : "Novo contrato"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome do contrato</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretaria_municipal">Secretaria municipal</Label>
                <Input
                  id="secretaria_municipal"
                  value={form.secretaria_municipal}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, secretaria_municipal: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_licitacao">Número da licitação</Label>
                <Input
                  id="numero_licitacao"
                  value={form.numero_licitacao}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, numero_licitacao: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm((prev) => ({ ...prev, data_inicio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm((prev) => ({ ...prev, data_fim: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  id="ativo"
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                />
                <Label htmlFor="ativo">Contrato ativo</Label>
              </div>

              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Atualizar contrato" : "Criar contrato"}
                </Button>

                {editingId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar edição
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Seu perfil está em modo leitura para contratos.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de contratos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-3 pr-4">Nome</th>
                <th className="py-3 pr-4">Secretaria</th>
                <th className="py-3 pr-4">Licitação</th>
                <th className="py-3 pr-4">Início</th>
                <th className="py-3 pr-4">Fim</th>
                <th className="py-3 pr-4">Status</th>
                {canEdit ? <th className="py-3 pr-4">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {initialContratos.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-6 text-muted-foreground">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              ) : (
                initialContratos.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pr-4">{item.nome}</td>
                    <td className="py-3 pr-4">{item.secretaria_municipal || "—"}</td>
                    <td className="py-3 pr-4">{item.numero_licitacao || "—"}</td>
                    <td className="py-3 pr-4">{item.data_inicio || "—"}</td>
                    <td className="py-3 pr-4">{item.data_fim || "—"}</td>
                    <td className="py-3 pr-4">{item.ativo ? "Ativo" : "Inativo"}</td>
                    {canEdit ? (
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => startEdit(item)}>
                            Editar
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                            Excluir
                          </Button>
                        </div>
                      </td>
                    ) : null}
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

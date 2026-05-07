"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

type ContratoOption = {
  id: string;
  nome: string;
};

type SupervisorOption = {
  id: string;
  nome: string;
  email: string;
  role: string;
};

type PostoView = {
  id: string;
  nome: string;
  secretaria: string | null;
  func_previsto_edital: number;
  cota_insalubridade: number;
  qtd_vagas_insalubridade: number;
  ativo: boolean;
  contrato_id: string;
  supervisor_id: string | null;
  contratos: { id: string; nome: string } | null;
  supervisor: { id: string; nome: string; email: string } | null;
};

type Props = {
  initialPostos: PostoView[];
  contratos: ContratoOption[];
  supervisors: SupervisorOption[];
  canEdit: boolean;
};

type FormState = {
  contrato_id: string;
  nome: string;
  secretaria: string;
  func_previsto_edital: string;
  qtd_vagas_insalubridade: string;
  supervisor_id: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  contrato_id: "",
  nome: "",
  secretaria: "",
  func_previsto_edital: "0",
  qtd_vagas_insalubridade: "0",
  supervisor_id: "",
  ativo: true,
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function PostosManager({
  initialPostos,
  contratos,
  supervisors,
  canEdit,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  function startEdit(item: PostoView) {
    setEditingId(item.id);
    setForm({
      contrato_id: item.contrato_id,
      nome: item.nome ?? "",
      secretaria: item.secretaria ?? "",
      func_previsto_edital: String(item.func_previsto_edital ?? 0),
      qtd_vagas_insalubridade: String(item.qtd_vagas_insalubridade ?? item.cota_insalubridade ?? 0),
      supervisor_id: item.supervisor_id ?? "",
      ativo: item.ativo,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.contrato_id) {
      toast.error("Selecione um contrato.");
      return;
    }

    if (!form.nome.trim()) {
      toast.error("Informe o nome do posto.");
      return;
    }

    setSaving(true);

    const qtdVagasInsalubridade = Number(form.qtd_vagas_insalubridade || 0);

    const payload = {
      contrato_id: form.contrato_id,
      nome: form.nome.trim(),
      secretaria: form.secretaria.trim() || null,
      func_previsto_edital: Number(form.func_previsto_edital || 0),
      qtd_vagas_insalubridade: qtdVagasInsalubridade,
      cota_insalubridade: qtdVagasInsalubridade,
      supervisor_id: form.supervisor_id || null,
      ativo: form.ativo,
    };

    const query = editingId
      ? supabase.from("postos").update(payload).eq("id", editingId)
      : supabase.from("postos").insert(payload);

    const { error } = await query;

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editingId ? "Posto atualizado." : "Posto criado.");
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Excluir este posto?");
    if (!confirmed) return;

    const { error } = await supabase.from("postos").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Posto excluído.");
    if (editingId === id) resetForm();
    router.refresh();
  }

  async function handleImportFile(file: File) {
    setImporting(true);

    try {
      const contratosMap = new Map(
        contratos.map((item) => [normalizeText(item.nome), item])
      );
      const supervisorsMap = new Map(
        supervisors.map((item) => [normalizeText(item.email), item])
      );

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      if (!rows.length) {
        toast.error("A planilha está vazia.");
        setImporting(false);
        return;
      }

      const payload = rows
        .map((row) => {
          const contratoNome = String(
            row.contrato_nome ?? row["Contrato"] ?? row["contrato"] ?? ""
          ).trim();

          const nome = String(row.nome ?? row["Nome"] ?? "").trim();
          const secretaria = String(row.secretaria ?? row["Secretaria"] ?? "").trim();
          const previsto = Number(row.func_previsto_edital ?? row["Previsto"] ?? 0);
          const vagasInsalubridade = Number(
            row.qtd_vagas_insalubridade ?? row["Vagas Insalubridade"] ?? 0
          );
          const supervisorEmail = String(
            row.supervisor_email ?? row["Supervisor Email"] ?? ""
          ).trim();
          const ativoRaw = String(row.ativo ?? "true").trim().toLowerCase();

          const contrato = contratosMap.get(normalizeText(contratoNome));
          const supervisor = supervisorEmail
            ? supervisorsMap.get(normalizeText(supervisorEmail))
            : null;

          if (!contrato || !nome) {
            return null;
          }

          return {
            contrato_id: contrato.id,
            nome,
            secretaria: secretaria || null,
            func_previsto_edital: Number.isFinite(previsto) ? previsto : 0,
            qtd_vagas_insalubridade: Number.isFinite(vagasInsalubridade) ? vagasInsalubridade : 0,
            cota_insalubridade: Number.isFinite(vagasInsalubridade) ? vagasInsalubridade : 0,
            supervisor_id: supervisor?.id ?? null,
            ativo: !["false", "0", "nao", "não"].includes(ativoRaw),
          };
        })
        .filter(Boolean);

      if (!payload.length) {
        toast.error("Nenhuma linha válida encontrada. Verifique contrato_nome e nome.");
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("postos").insert(payload as any[]);

      if (error) {
        toast.error(error.message);
        setImporting(false);
        return;
      }

      toast.success(`${payload.length} posto(s) importado(s).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("Falha ao processar a planilha.");
    }

    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Dados mestres</p>
        <h1 className="text-2xl font-semibold tracking-tight">Postos</h1>
      </div>

      {canEdit ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Importação XLSX de postos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Colunas mínimas: <strong>contrato_nome</strong>, <strong>nome</strong>, <strong>func_previsto_edital</strong>, <strong>qtd_vagas_insalubridade</strong>.
              </p>

              <div className="space-y-2">
                <Label htmlFor="xlsx_postos">Arquivo XLSX</Label>
                <Input
                  id="xlsx_postos"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleImportFile(file);
                    }
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                O contrato é localizado por nome e o supervisor por e-mail.
              </p>

              {importing ? (
                <p className="text-sm text-muted-foreground">Importando planilha...</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar posto" : "Novo posto"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="contrato_id">Contrato</Label>
                  <select
                    id="contrato_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.contrato_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, contrato_id: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {contratos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do posto</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretaria">Secretaria</Label>
                  <Input
                    id="secretaria"
                    value={form.secretaria}
                    onChange={(e) => setForm((prev) => ({ ...prev, secretaria: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="func_previsto_edital">Func. previsto no edital</Label>
                  <Input
                    id="func_previsto_edital"
                    type="number"
                    min="0"
                    value={form.func_previsto_edital}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, func_previsto_edital: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qtd_vagas_insalubridade">Vagas de insalubridade</Label>
                  <Input
                    id="qtd_vagas_insalubridade"
                    type="number"
                    min="0"
                    value={form.qtd_vagas_insalubridade}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, qtd_vagas_insalubridade: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisor_id">Supervisor</Label>
                  <select
                    id="supervisor_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.supervisor_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, supervisor_id: e.target.value }))}
                  >
                    <option value="">Sem supervisor</option>
                    {supervisors.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} ({item.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    id="ativo"
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  />
                  <Label htmlFor="ativo">Posto ativo</Label>
                </div>

                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : editingId ? "Atualizar posto" : "Criar posto"}
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
        </>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Seu perfil está em modo leitura para postos.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de postos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-3 pr-4">Posto</th>
                <th className="py-3 pr-4">Contrato</th>
                <th className="py-3 pr-4">Secretaria</th>
                <th className="py-3 pr-4">Previsto</th>
                <th className="py-3 pr-4">Vagas insalubridade</th>
                <th className="py-3 pr-4">Supervisor</th>
                <th className="py-3 pr-4">Status</th>
                {canEdit ? <th className="py-3 pr-4">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {initialPostos.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-6 text-muted-foreground">
                    Nenhum posto cadastrado.
                  </td>
                </tr>
              ) : (
                initialPostos.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pr-4">{item.nome}</td>
                    <td className="py-3 pr-4">{item.contratos?.nome || "—"}</td>
                    <td className="py-3 pr-4">{item.secretaria || "—"}</td>
                    <td className="py-3 pr-4">{item.func_previsto_edital}</td>
                    <td className="py-3 pr-4">{item.qtd_vagas_insalubridade ?? item.cota_insalubridade ?? 0}</td>
                    <td className="py-3 pr-4">{item.supervisor?.nome || "—"}</td>
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

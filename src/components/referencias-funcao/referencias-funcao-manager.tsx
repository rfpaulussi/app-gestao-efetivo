"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";

type Contrato = {
  id: string;
  nome: string;
};

type Funcao = {
  id: string;
  nome: string;
};

type Referencia = {
  id: string;
  nome_referencia: string;
  contrato_id: string;
  funcao_id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  salario_base: number;
  assiduidade: number;
  valor_vr: number;
  valor_va: number;
  valor_vt: number;
  valor_plr: number;
  adicional_tipo: "nenhum" | "insalubridade" | "periculosidade";
  adicional_percentual: number;
  regiao: string | null;
  escala: string | null;
  horario: string | null;
  observacoes: string | null;
  ativo: boolean;
  contrato: { nome: string } | null;
  funcao: { nome: string } | null;
};

type Props = {
  referencias: Referencia[];
  contratos: Contrato[];
  funcoes: Funcao[];
  canEdit: boolean;
};

type FormState = {
  nome_referencia: string;
  contrato_id: string;
  funcao_id: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  salario_base: string;
  assiduidade: string;
  valor_vr: string;
  valor_va: string;
  valor_vt: string;
  valor_plr: string;
  adicional_tipo: "nenhum" | "insalubridade" | "periculosidade";
  adicional_percentual: string;
  regiao: string;
  escala: string;
  horario: string;
  observacoes: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  nome_referencia: "",
  contrato_id: "",
  funcao_id: "",
  vigencia_inicio: "",
  vigencia_fim: "",
  salario_base: "0",
  assiduidade: "0",
  valor_vr: "0",
  valor_va: "0",
  valor_vt: "0",
  valor_plr: "0",
  adicional_tipo: "nenhum",
  adicional_percentual: "0",
  regiao: "",
  escala: "",
  horario: "",
  observacoes: "",
  ativo: true,
};

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ReferenciasFuncaoManager({
  referencias,
  contratos,
  funcoes,
  canEdit,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item: Referencia) {
    setEditingId(item.id);
    setForm({
      nome_referencia: item.nome_referencia ?? "",
      contrato_id: item.contrato_id ?? "",
      funcao_id: item.funcao_id ?? "",
      vigencia_inicio: item.vigencia_inicio ?? "",
      vigencia_fim: item.vigencia_fim ?? "",
      salario_base: String(item.salario_base ?? 0),
      assiduidade: String(item.assiduidade ?? 0),
      valor_vr: String(item.valor_vr ?? 0),
      valor_va: String(item.valor_va ?? 0),
      valor_vt: String(item.valor_vt ?? 0),
      valor_plr: String(item.valor_plr ?? 0),
      adicional_tipo: item.adicional_tipo ?? "nenhum",
      adicional_percentual: String(item.adicional_percentual ?? 0),
      regiao: item.regiao ?? "",
      escala: item.escala ?? "",
      horario: item.horario ?? "",
      observacoes: item.observacoes ?? "",
      ativo: item.ativo,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.nome_referencia.trim()) {
      toast.error("Informe o nome da referência.");
      return;
    }

    if (!form.contrato_id) {
      toast.error("Selecione o contrato.");
      return;
    }

    if (!form.funcao_id) {
      toast.error("Selecione a função.");
      return;
    }

    if (!form.vigencia_inicio) {
      toast.error("Informe a vigência inicial.");
      return;
    }

    setSaving(true);

    const payload = {
      nome_referencia: form.nome_referencia.trim(),
      contrato_id: form.contrato_id,
      funcao_id: form.funcao_id,
      vigencia_inicio: form.vigencia_inicio,
      vigencia_fim: form.vigencia_fim || null,
      salario_base: Number(form.salario_base || 0),
      assiduidade: Number(form.assiduidade || 0),
      valor_vr: Number(form.valor_vr || 0),
      valor_va: Number(form.valor_va || 0),
      valor_vt: Number(form.valor_vt || 0),
      valor_plr: Number(form.valor_plr || 0),
      adicional_tipo: form.adicional_tipo,
      adicional_percentual: Number(form.adicional_percentual || 0),
      regiao: form.regiao.trim() || null,
      escala: form.escala.trim() || null,
      horario: form.horario.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
    };

    const query = editingId
      ? supabase.from("referencias_funcao").update(payload).eq("id", editingId)
      : supabase.from("referencias_funcao").insert(payload);

    const { error } = await query;

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editingId ? "Referência atualizada." : "Referência criada.");
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Excluir esta referência?");
    if (!confirmed) return;

    const { error } = await supabase.from("referencias_funcao").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Referência excluída.");
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Parâmetros mestres</p>
        <h1 className="text-2xl font-semibold tracking-tight">Referências de Função</h1>
      </div>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar referência" : "Nova referência"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome_referencia">Nome da referência</Label>
                <Input
                  id="nome_referencia"
                  value={form.nome_referencia}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nome_referencia: e.target.value }))
                  }
                  placeholder="Ex.: Mogi Limpeza 706 - Abril/2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contrato_id">Contrato</Label>
                <select
                  id="contrato_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.contrato_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contrato_id: e.target.value }))
                  }
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
                <Label htmlFor="funcao_id">Função</Label>
                <select
                  id="funcao_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.funcao_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, funcao_id: e.target.value }))
                  }
                >
                  <option value="">Selecione</option>
                  {funcoes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vigencia_inicio">Vigência início</Label>
                <Input
                  id="vigencia_inicio"
                  type="date"
                  value={form.vigencia_inicio}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, vigencia_inicio: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vigencia_fim">Vigência fim</Label>
                <Input
                  id="vigencia_fim"
                  type="date"
                  value={form.vigencia_fim}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, vigencia_fim: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salario_base">Salário</Label>
                <Input
                  id="salario_base"
                  type="number"
                  step="0.01"
                  value={form.salario_base}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, salario_base: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assiduidade">Assiduidade</Label>
                <Input
                  id="assiduidade"
                  type="number"
                  step="0.01"
                  value={form.assiduidade}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, assiduidade: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_vr">Valor VR</Label>
                <Input
                  id="valor_vr"
                  type="number"
                  step="0.01"
                  value={form.valor_vr}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, valor_vr: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_va">Valor VA</Label>
                <Input
                  id="valor_va"
                  type="number"
                  step="0.01"
                  value={form.valor_va}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, valor_va: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_vt">Valor VT</Label>
                <Input
                  id="valor_vt"
                  type="number"
                  step="0.01"
                  value={form.valor_vt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, valor_vt: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_plr">Valor PLR</Label>
                <Input
                  id="valor_plr"
                  type="number"
                  step="0.01"
                  value={form.valor_plr}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, valor_plr: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adicional_tipo">Adicional</Label>
                <select
                  id="adicional_tipo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.adicional_tipo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      adicional_tipo: e.target.value as FormState["adicional_tipo"],
                    }))
                  }
                >
                  <option value="nenhum">Nenhum</option>
                  <option value="insalubridade">Insalubridade</option>
                  <option value="periculosidade">Periculosidade</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adicional_percentual">Percentual adicional</Label>
                <Input
                  id="adicional_percentual"
                  type="number"
                  step="0.01"
                  value={form.adicional_percentual}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      adicional_percentual: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regiao">Região</Label>
                <Input
                  id="regiao"
                  value={form.regiao}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, regiao: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="escala">Escala</Label>
                <Input
                  id="escala"
                  value={form.escala}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, escala: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horario">Horário</Label>
                <Input
                  id="horario"
                  value={form.horario}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, horario: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 self-end">
                <input
                  id="ativo"
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ativo: e.target.checked }))
                  }
                />
                <Label htmlFor="ativo">Referência ativa</Label>
              </div>

              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                />
              </div>

              <div className="flex gap-2 md:col-span-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Atualizar referência" : "Criar referência"}
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lista de referências</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-3 pr-4">Referência</th>
                <th className="py-3 pr-4">Contrato</th>
                <th className="py-3 pr-4">Função</th>
                <th className="py-3 pr-4">Vigência</th>
                <th className="py-3 pr-4">Salário</th>
                <th className="py-3 pr-4">Adicional</th>
                <th className="py-3 pr-4">Região</th>
                <th className="py-3 pr-4">Escala</th>
                <th className="py-3 pr-4">Horário</th>
                <th className="py-3 pr-4">Ativo</th>
                {canEdit ? <th className="py-3 pr-4">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {referencias.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 11 : 10} className="py-6 text-muted-foreground">
                    Nenhuma referência cadastrada.
                  </td>
                </tr>
              ) : (
                referencias.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pr-4">{item.nome_referencia}</td>
                    <td className="py-3 pr-4">{item.contrato?.nome || "—"}</td>
                    <td className="py-3 pr-4">{item.funcao?.nome || "—"}</td>
                    <td className="py-3 pr-4">
                      {item.vigencia_inicio}
                      {item.vigencia_fim ? ` até ${item.vigencia_fim}` : ""}
                    </td>
                    <td className="py-3 pr-4">{money(item.salario_base)}</td>
                    <td className="py-3 pr-4">
                      {item.adicional_tipo} {Number(item.adicional_percentual || 0)}%
                    </td>
                    <td className="py-3 pr-4">{item.regiao || "—"}</td>
                    <td className="py-3 pr-4">{item.escala || "—"}</td>
                    <td className="py-3 pr-4">{item.horario || "—"}</td>
                    <td className="py-3 pr-4">{item.ativo ? "Sim" : "Não"}</td>
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

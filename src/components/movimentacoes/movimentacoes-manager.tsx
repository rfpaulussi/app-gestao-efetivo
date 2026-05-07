"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

type FuncaoOption = {
  id: string;
  nome: string;
};

type FuncionarioOption = {
  id: string;
  registro: string;
  nome: string;
  funcao: string | null;
  current_posto_id: string | null;
  posto: {
    id: string;
    nome: string;
  } | null;
};

type PostoOption = {
  id: string;
  nome: string;
};

type SnapshotReferencia = {
  nome_referencia?: string | null;
  contrato?: string | null;
  posto?: string | null;
  funcao?: string | null;
  salario_base?: number | null;
  assiduidade?: number | null;
  valor_vr?: number | null;
  valor_va?: number | null;
  valor_vt?: number | null;
  valor_plr?: number | null;
  adicional_tipo?: string | null;
  adicional_percentual?: number | null;
  regiao?: string | null;
  escala?: string | null;
  horario?: string | null;
  observacoes?: string | null;
};

type MovimentacaoRow = {
  id: string;
  funcionario_id: string;
  posto_origem_id: string | null;
  posto_destino_id: string;
  funcao_atual: string | null;
  funcao_proposta: string | null;
  data_movimentacao: string;
  observacoes: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  exige_documento_funcao: boolean;
  status_documento:
    | "nao_aplicavel"
    | "pendente_geracao"
    | "gerado"
    | "enviado_setor_medico"
    | "aprovado_setor_medico"
    | "aprovado_gerente"
    | "concluido";
  snapshot_atual: SnapshotReferencia | null;
  snapshot_proposta: SnapshotReferencia | null;
  funcionario: {
    registro: string;
    nome: string;
  } | null;
  posto_origem: {
    nome: string;
  } | null;
  posto_destino: {
    nome: string;
  } | null;
};

type Props = {
  currentUserId: string;
  currentUserRole: string;
  funcionarios: FuncionarioOption[];
  postos: PostoOption[];
  funcoes: FuncaoOption[];
  movimentacoes: MovimentacaoRow[];
};

type FormState = {
  funcionario_id: string;
  posto_destino_id: string;
  funcao_proposta: string;
  data_movimentacao: string;
  observacoes: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function documentoLabel(status: MovimentacaoRow["status_documento"]) {
  switch (status) {
    case "nao_aplicavel":
      return "Não aplicável";
    case "pendente_geracao":
      return "Pendente PDF";
    case "gerado":
      return "PDF gerado";
    case "enviado_setor_medico":
      return "Enviado ao médico";
    case "aprovado_setor_medico":
      return "Aprovado médico";
    case "aprovado_gerente":
      return "Aprovado gerente";
    case "concluido":
      return "Concluído";
    default:
      return "—";
  }
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function MovimentacoesManager({
  currentUserId,
  currentUserRole,
  funcionarios,
  postos,
  funcoes,
  movimentacoes,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<FormState>({
    funcionario_id: "",
    posto_destino_id: "",
    funcao_proposta: "",
    data_movimentacao: todayISO(),
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const funcionarioSelecionado = useMemo(() => {
    return funcionarios.find((item) => item.id === form.funcionario_id) ?? null;
  }, [funcionarios, form.funcionario_id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.funcionario_id) {
      toast.error("Selecione o funcionário.");
      return;
    }

    if (!funcionarioSelecionado?.current_posto_id) {
      toast.error("O funcionário selecionado não possui posto de origem.");
      return;
    }

    if (!form.posto_destino_id) {
      toast.error("Selecione o posto de destino.");
      return;
    }

    if (form.posto_destino_id === funcionarioSelecionado.current_posto_id) {
      toast.error("O posto de destino precisa ser diferente do posto de origem.");
      return;
    }

    if (!form.funcao_proposta) {
      toast.error("Selecione a função proposta.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("create_log_movimentacao_with_referencias", {
      p_supervisor_id: currentUserId,
      p_funcionario_id: form.funcionario_id,
      p_posto_destino_id: form.posto_destino_id,
      p_funcao_proposta: form.funcao_proposta,
      p_data_movimentacao: form.data_movimentacao,
      p_observacoes: form.observacoes.trim() || null,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Movimentação registrada com referências congeladas.");
    setForm({
      funcionario_id: "",
      posto_destino_id: "",
      funcao_proposta: "",
      data_movimentacao: todayISO(),
      observacoes: "",
    });
    router.refresh();
  }

  async function handleApprove(id: string) {
    setProcessingId(id);

    const { error } = await supabase.rpc("approve_log_movimentacao", {
      p_movimentacao_id: id,
      p_admin_id: currentUserId,
    });

    setProcessingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Movimentação aprovada.");
    router.refresh();
  }

  async function handleReject(id: string) {
    setProcessingId(id);

    const { error } = await supabase.rpc("reject_log_movimentacao", {
      p_movimentacao_id: id,
      p_admin_id: currentUserId,
    });

    setProcessingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Movimentação rejeitada.");
    router.refresh();
  }

  async function handleGerarPdf(id: string) {
    const preview = window.open("", "_blank");
    setProcessingId(id);

    const { error } = await supabase.rpc("update_log_movimentacao_documento_status", {
      p_movimentacao_id: id,
      p_status_documento: "gerado",
      p_admin_id: currentUserId,
    });

    setProcessingId(null);

    if (error) {
      if (preview) preview.close();
      toast.error(error.message);
      return;
    }

    if (preview) {
      preview.location.href = `/api/movimentacoes/${id}/pdf`;
    }

    toast.success("PDF gerado.");
    router.refresh();
  }

  async function handleDocumentoStatus(
    id: string,
    statusDocumento:
      | "enviado_setor_medico"
      | "aprovado_setor_medico"
      | "aprovado_gerente"
  ) {
    setProcessingId(id);

    const { error } = await supabase.rpc("update_log_movimentacao_documento_status", {
      p_movimentacao_id: id,
      p_status_documento: statusDocumento,
      p_admin_id: currentUserId,
    });

    setProcessingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Status documental atualizado.");
    router.refresh();
  }

  async function handleConcluir(id: string) {
    setProcessingId(id);

    const { error } = await supabase.rpc("finalize_log_movimentacao_documento", {
      p_movimentacao_id: id,
      p_admin_id: currentUserId,
    });

    setProcessingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    const snapshotResult = await supabase.rpc("snapshot_efetivo_mensal", {
      p_mes: monthStartISO(),
    });

    if (snapshotResult.error) {
      toast.error(`Movimentação concluída, mas falhou ao atualizar snapshot: ${snapshotResult.error.message}`);
      router.refresh();
      return;
    }

    toast.success("Mudança de função concluída e efetivo atualizado.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Fluxo operacional</p>
        <h1 className="text-2xl font-semibold tracking-tight">Movimentações</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ao registrar, o sistema congela a referência atual e a proposta pela data da movimentação.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar movimentação</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="funcionario_id">Funcionário</Label>
              <select
                id="funcionario_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.funcionario_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    funcionario_id: e.target.value,
                    funcao_proposta: "",
                    posto_destino_id: "",
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
              <Label htmlFor="data_movimentacao">Data da movimentação</Label>
              <Input
                id="data_movimentacao"
                type="date"
                value={form.data_movimentacao}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, data_movimentacao: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Posto de origem</Label>
              <Input
                value={funcionarioSelecionado?.posto?.nome || ""}
                readOnly
                placeholder="Preenchido automaticamente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="posto_destino_id">Posto de destino</Label>
              <select
                id="posto_destino_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.posto_destino_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, posto_destino_id: e.target.value }))
                }
              >
                <option value="">Selecione</option>
                {postos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Função atual</Label>
              <Input
                value={funcionarioSelecionado?.funcao || ""}
                readOnly
                placeholder="Preenchida automaticamente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao_proposta">Função proposta</Label>
              <select
                id="funcao_proposta"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.funcao_proposta}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, funcao_proposta: e.target.value }))
                }
              >
                <option value="">Selecione</option>
                {funcoes.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={form.observacoes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, observacoes: e.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Registrar movimentação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de movimentações</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-3 pr-4">Funcionário</th>
                <th className="py-3 pr-4">Origem</th>
                <th className="py-3 pr-4">Destino</th>
                <th className="py-3 pr-4">Função atual</th>
                <th className="py-3 pr-4">Função proposta</th>
                <th className="py-3 pr-4">Ref. atual</th>
                <th className="py-3 pr-4">Ref. proposta</th>
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Documento</th>
                {currentUserRole === "admin" ? <th className="py-3 pr-4">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {movimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={currentUserRole === "admin" ? 11 : 10} className="py-6 text-muted-foreground">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                movimentacoes.map((item) => (
                  <tr key={item.id} className="border-b align-top">
                    <td className="py-3 pr-4">
                      {item.funcionario
                        ? `${item.funcionario.registro} · ${item.funcionario.nome}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">{item.posto_origem?.nome || "—"}</td>
                    <td className="py-3 pr-4">{item.posto_destino?.nome || "—"}</td>
                    <td className="py-3 pr-4">{item.funcao_atual || "—"}</td>
                    <td className="py-3 pr-4">{item.funcao_proposta || "—"}</td>
                    <td className="py-3 pr-4">
                      {item.snapshot_atual ? (
                        <div className="space-y-1">
                          <div>{item.snapshot_atual.nome_referencia || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.snapshot_atual.regiao || "—"} · {item.snapshot_atual.escala || "—"} · {item.snapshot_atual.horario || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {money(item.snapshot_atual.salario_base)}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {item.snapshot_proposta ? (
                        <div className="space-y-1">
                          <div>{item.snapshot_proposta.nome_referencia || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.snapshot_proposta.regiao || "—"} · {item.snapshot_proposta.escala || "—"} · {item.snapshot_proposta.horario || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {money(item.snapshot_proposta.salario_base)}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {format(new Date(`${item.data_movimentacao}T00:00:00`), "dd/MM/yyyy")}
                    </td>
                    <td className="py-3 pr-4">{item.status}</td>
                    <td className="py-3 pr-4">{documentoLabel(item.status_documento)}</td>
                    {currentUserRole === "admin" ? (
                      <td className="py-3 pr-4">
                        {item.status === "pendente" ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleApprove(item.id)}
                              disabled={processingId === item.id}
                            >
                              Aprovar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(item.id)}
                              disabled={processingId === item.id}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        ) : item.status === "aprovado" && item.exige_documento_funcao ? (
                          <div className="flex flex-wrap gap-2">
                            {item.status_documento === "pendente_geracao" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleGerarPdf(item.id)}
                                disabled={processingId === item.id}
                              >
                                Gerar PDF
                              </Button>
                            ) : null}

                            {item.status_documento !== "pendente_geracao" ? (
                              <a
                                href={`/api/movimentacoes/${item.id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
                              >
                                Abrir PDF
                              </a>
                            ) : null}

                            {item.status_documento === "gerado" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleDocumentoStatus(item.id, "enviado_setor_medico")}
                                disabled={processingId === item.id}
                              >
                                Enviado médico
                              </Button>
                            ) : null}

                            {item.status_documento === "enviado_setor_medico" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleDocumentoStatus(item.id, "aprovado_setor_medico")}
                                disabled={processingId === item.id}
                              >
                                Médico aprovou
                              </Button>
                            ) : null}

                            {item.status_documento === "aprovado_setor_medico" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleDocumentoStatus(item.id, "aprovado_gerente")}
                                disabled={processingId === item.id}
                              >
                                Gerente aprovou
                              </Button>
                            ) : null}

                            {item.status_documento === "aprovado_gerente" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleConcluir(item.id)}
                                disabled={processingId === item.id}
                              >
                                Concluir
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
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

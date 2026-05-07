"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInYears, format } from "date-fns";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

type Supervisor = {
  id: string;
  nome: string;
  email: string;
};

type FuncaoBase = {
  id: string;
  nome: string;
  adicional_tipo_default: "nenhum" | "insalubridade" | "periculosidade";
  adicional_percentual_default: number;
};

type Funcionario = {
  id: string;
  registro: string;
  nome: string;
  cargo: string;
  funcao: string | null;
  funcao_id: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  data_admissao: string;
  supervisor_id: string | null;
  modelo_experiencia: string | null;
  primeiro_periodo_inicio: string | null;
  primeiro_periodo_fim: string | null;
  segundo_periodo_inicio: string | null;
  segundo_periodo_fim: string | null;
  status_experiencia: string;
  data_saida: string | null;
  tipo_demissao: string | null;
  motivacao: string | null;
  substituicao_id: string | null;
  substitui_desligado: boolean;
  status: string;
  supervisor: Supervisor | null;
  substituicao: {
    id: string;
    nome: string;
    registro: string;
  } | null;
  funcao_ref: FuncaoBase | null;
};

type Props = {
  funcionarios: Funcionario[];
  supervisors: Supervisor[];
  funcoes: FuncaoBase[];
  canEdit: boolean;
};

type FormState = {
  registro: string;
  nome: string;
  cargo: string;
  funcao_id: string;
  data_nascimento: string;
  sexo: string;
  data_admissao: string;
  supervisor_id: string;
  modelo_experiencia: string;
  data_saida: string;
  tipo_demissao: string;
  motivacao: string;
  substituicao_id: string;
  substitui_desligado: boolean;
  status: string;
};

const emptyForm: FormState = {
  registro: "",
  nome: "",
  cargo: "",
  funcao_id: "",
  data_nascimento: "",
  sexo: "",
  data_admissao: "",
  supervisor_id: "",
  modelo_experiencia: "30x30",
  data_saida: "",
  tipo_demissao: "",
  motivacao: "",
  substituicao_id: "",
  substitui_desligado: false,
  status: "ativo",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return format(new Date(`${value}T00:00:00`), "dd/MM/yyyy");
}

function calcAge(value: string) {
  if (!value) return "—";
  return `${differenceInYears(new Date(), new Date(`${value}T00:00:00`))} anos`;
}

function calcPeriodos(dataAdmissao: string, modelo: string) {
  if (!dataAdmissao) {
    return {
      primeiroInicio: "—",
      primeiroFim: "—",
      segundoInicio: "—",
      segundoFim: "—",
    };
  }

  const inicio = new Date(`${dataAdmissao}T00:00:00`);
  const dias = modelo === "45x45" ? 45 : 30;

  const p1i = new Date(inicio);
  const p1f = new Date(inicio);
  p1f.setDate(p1f.getDate() + dias - 1);

  const p2i = new Date(p1f);
  p2i.setDate(p2i.getDate() + 1);

  const p2f = new Date(p2i);
  p2f.setDate(p2f.getDate() + dias - 1);

  return {
    primeiroInicio: format(p1i, "dd/MM/yyyy"),
    primeiroFim: format(p1f, "dd/MM/yyyy"),
    segundoInicio: format(p2i, "dd/MM/yyyy"),
    segundoFim: format(p2f, "dd/MM/yyyy"),
  };
}

function excelDateToISO(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const yyyy = String(parsed.y).padStart(4, "0");
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  return null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function FuncionariosManager({
  funcionarios,
  supervisors,
  funcoes,
  canEdit,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const isOffboarding = Boolean(form.data_saida);

  const periodos = useMemo(() => {
    return calcPeriodos(form.data_admissao, form.modelo_experiencia);
  }, [form.data_admissao, form.modelo_experiencia]);

  const funcaoSelecionada = useMemo(() => {
    return funcoes.find((item) => item.id === form.funcao_id) ?? null;
  }, [funcoes, form.funcao_id]);

  const desligadosDisponiveis = useMemo(() => {
    return funcionarios.filter((item) => {
      if (editingId && item.id === editingId) return false;
      return item.status === "inativo";
    });
  }, [funcionarios, editingId]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item: Funcionario) {
    setEditingId(item.id);
    setForm({
      registro: item.registro ?? "",
      nome: item.nome ?? "",
      cargo: item.cargo ?? "",
      funcao_id: item.funcao_id ?? "",
      data_nascimento: item.data_nascimento ?? "",
      sexo: item.sexo ?? "",
      data_admissao: item.data_admissao ?? "",
      supervisor_id: item.supervisor_id ?? "",
      modelo_experiencia: item.modelo_experiencia ?? "30x30",
      data_saida: item.data_saida ?? "",
      tipo_demissao: item.tipo_demissao ?? "",
      motivacao: item.motivacao ?? "",
      substituicao_id: item.substituicao_id ?? "",
      substitui_desligado: item.substitui_desligado ?? false,
      status: item.status ?? "ativo",
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.registro.trim()) {
      toast.error("Informe o registro.");
      return;
    }

    if (!form.nome.trim()) {
      toast.error("Informe o nome.");
      return;
    }

    if (!form.cargo.trim()) {
      toast.error("Informe o cargo.");
      return;
    }

    if (!form.data_admissao) {
      toast.error("Informe a data de admissão.");
      return;
    }

    if (!form.funcao_id) {
      toast.error("Selecione a função.");
      return;
    }

    if (isOffboarding && !form.tipo_demissao) {
      toast.error("Informe o tipo de demissão.");
      return;
    }

    if (form.substitui_desligado && !form.substituicao_id) {
      toast.error("Selecione qual funcionário desligado está sendo substituído.");
      return;
    }

    setSaving(true);

    const payload = {
      registro: form.registro.trim(),
      nome: form.nome.trim(),
      cargo: form.cargo.trim(),
      funcao_id: form.funcao_id,
      funcao: funcaoSelecionada?.nome ?? null,
      data_nascimento: form.data_nascimento || null,
      sexo: form.sexo || null,
      data_admissao: form.data_admissao,
      supervisor_id: form.supervisor_id || null,
      modelo_experiencia: form.modelo_experiencia,
      data_saida: form.data_saida || null,
      tipo_demissao: form.tipo_demissao || null,
      motivacao: form.motivacao.trim() || null,
      substitui_desligado: form.substitui_desligado,
      substituicao_id: form.substitui_desligado ? form.substituicao_id || null : null,
      status: form.data_saida ? "inativo" : form.status,
    };

    const query = editingId
      ? supabase.from("funcionarios").update(payload).eq("id", editingId)
      : supabase.from("funcionarios").insert(payload);

    const { error } = await query;

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editingId ? "Funcionário atualizado." : "Funcionário cadastrado.");
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Excluir este funcionário?");
    if (!confirmed) return;

    const { error } = await supabase.from("funcionarios").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Funcionário excluído.");
    if (editingId === id) resetForm();
    router.refresh();
  }

  async function handleImportFile(file: File) {
    setImporting(true);

    try {
      const funcoesMap = new Map(funcoes.map((item) => [normalizeText(item.nome), item]));
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
          const registro = String(row.registro ?? row.Registro ?? row.REGISTRO ?? "").trim();
          const nome = String(row.nome ?? row.Nome ?? row.NOME ?? "").trim();
          const cargo = String(row.cargo ?? row.Cargo ?? row.CARGO ?? "").trim();
          const funcaoNome = String(
            row.funcao ?? row.Funcao ?? row["Função"] ?? row.FUNCAO ?? ""
          ).trim();
          const sexo = String(row.sexo ?? row.Sexo ?? row.SEXO ?? "").trim();
          const dataNascimento = excelDateToISO(
            row.data_nascimento ?? row["Data Nascimento"] ?? row.dataNascimento ?? row.nascimento
          );
          const dataAdmissao = excelDateToISO(
            row.data_admissao ?? row["Data Admissão"] ?? row.dataAdmissao ?? row.admissao
          );
          const modeloExperiencia = String(
            row.modelo_experiencia ?? row["Modelo Experiência"] ?? row.modeloExperiencia ?? "30x30"
          ).trim();

          const funcaoBase = funcoesMap.get(normalizeText(funcaoNome));

          if (!registro || !nome || !cargo || !dataAdmissao || !funcaoBase) {
            return null;
          }

          return {
            registro,
            nome,
            cargo,
            funcao: funcaoBase.nome,
            funcao_id: funcaoBase.id,
            sexo: sexo || null,
            data_nascimento: dataNascimento,
            data_admissao: dataAdmissao,
            modelo_experiencia: modeloExperiencia === "45x45" ? "45x45" : "30x30",
            supervisor_id: form.supervisor_id || null,
            status: "ativo",
          };
        })
        .filter(Boolean);

      if (!payload.length) {
        toast.error("Nenhuma linha válida encontrada. Verifique se a coluna função bate com o cadastro mestre.");
        setImporting(false);
        return;
      }

      const { error } = await supabase.from("funcionarios").insert(payload as any[]);

      if (error) {
        toast.error(error.message);
        setImporting(false);
        return;
      }

      toast.success(`${payload.length} funcionário(s) importado(s).`);
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
        <p className="text-sm text-muted-foreground">Cadastro central</p>
        <h1 className="text-2xl font-semibold tracking-tight">Funcionários</h1>
      </div>

      {canEdit ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Importação XLSX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Colunas mínimas: <strong>registro</strong>, <strong>nome</strong>, <strong>cargo</strong>, <strong>funcao</strong>, <strong>data_admissao</strong>.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supervisor_import">Supervisor padrão para importação</Label>
                  <select
                    id="supervisor_import"
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

                <div className="space-y-2">
                  <Label htmlFor="xlsx_file">Arquivo XLSX</Label>
                  <Input
                    id="xlsx_file"
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
              </div>

              <p className="text-xs text-muted-foreground">
                A coluna <strong>funcao</strong> da planilha precisa bater com o cadastro mestre de funções.
              </p>

              {importing ? (
                <p className="text-sm text-muted-foreground">Importando planilha...</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar funcionário" : "Novo funcionário"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="registro">Registro</Label>
                  <Input
                    id="registro"
                    value={form.registro}
                    onChange={(e) => setForm((prev) => ({ ...prev, registro: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={form.cargo}
                    onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funcao_id">Função</Label>
                  <select
                    id="funcao_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.funcao_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, funcao_id: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {funcoes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border p-4 md:col-span-2">
                  <p className="mb-2 text-sm font-medium">Regra padrão da função selecionada</p>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo de adicional</p>
                      <p>{funcaoSelecionada?.adicional_tipo_default ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Percentual padrão</p>
                      <p>{funcaoSelecionada ? `${funcaoSelecionada.adicional_percentual_default}%` : "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={form.data_nascimento}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, data_nascimento: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Idade estimada: {calcAge(form.data_nascimento)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <select
                    id="sexo"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.sexo}
                    onChange={(e) => setForm((prev) => ({ ...prev, sexo: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_admissao">Data de admissão</Label>
                  <Input
                    id="data_admissao"
                    type="date"
                    value={form.data_admissao}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, data_admissao: e.target.value }))
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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="modelo_experiencia">Modelo de experiência</Label>
                  <select
                    id="modelo_experiencia"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.modelo_experiencia}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, modelo_experiencia: e.target.value }))
                    }
                  >
                    <option value="30x30">30 x 30 dias</option>
                    <option value="45x45">45 x 45 dias</option>
                  </select>
                </div>

                <div className="rounded-lg border p-4 md:col-span-2">
                  <p className="mb-3 text-sm font-medium">Períodos calculados automaticamente</p>
                  <div className="grid gap-3 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">1º início</p>
                      <p>{periodos.primeiroInicio}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">1º fim</p>
                      <p>{periodos.primeiroFim}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">2º início</p>
                      <p>{periodos.segundoInicio}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">2º fim</p>
                      <p>{periodos.segundoFim}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="status">Status operacional</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    disabled={isOffboarding}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="afastado">Afastado</option>
                    <option value="ferias">Férias</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2 border-t pt-4">
                  <h3 className="font-medium">Substituição de desligado</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="substitui_desligado">Está substituindo alguém desligado?</Label>
                  <select
                    id="substitui_desligado"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.substitui_desligado ? "sim" : "nao"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        substitui_desligado: e.target.value === "sim",
                        substituicao_id: e.target.value === "sim" ? prev.substituicao_id : "",
                      }))
                    }
                  >
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="substituicao_id">Funcionário desligado substituído</Label>
                  <select
                    id="substituicao_id"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.substituicao_id}
                    disabled={!form.substitui_desligado}
                    onChange={(e) => setForm((prev) => ({ ...prev, substituicao_id: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {desligadosDisponiveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} ({item.registro})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2 border-t pt-4">
                  <h3 className="font-medium">Desligamento</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_saida">Data de saída</Label>
                  <Input
                    id="data_saida"
                    type="date"
                    value={form.data_saida}
                    onChange={(e) => setForm((prev) => ({ ...prev, data_saida: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_demissao">Tipo de demissão</Label>
                  <select
                    id="tipo_demissao"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.tipo_demissao}
                    onChange={(e) => setForm((prev) => ({ ...prev, tipo_demissao: e.target.value }))}
                  >
                    <option value="">Selecione</option>
                    <option value="pedido_demissao">Pedido de demissão</option>
                    <option value="sem_justa_causa">Sem justa causa</option>
                    <option value="justa_causa">Justa causa</option>
                    <option value="aposentadoria">Aposentadoria</option>
                    <option value="falecimento">Falecimento</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="motivacao">Motivação</Label>
                  <Input
                    id="motivacao"
                    value={form.motivacao}
                    onChange={(e) => setForm((prev) => ({ ...prev, motivacao: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : editingId ? "Atualizar funcionário" : "Cadastrar funcionário"}
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lista de funcionários</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-3 pr-4">Registro</th>
                <th className="py-3 pr-4">Nome</th>
                <th className="py-3 pr-4">Cargo</th>
                <th className="py-3 pr-4">Função</th>
                <th className="py-3 pr-4">Adicional padrão</th>
                <th className="py-3 pr-4">Admissão</th>
                <th className="py-3 pr-4">Supervisor</th>
                <th className="py-3 pr-4">Modelo exp.</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Status exp.</th>
                <th className="py-3 pr-4">Saída</th>
                <th className="py-3 pr-4">Substitui desligado</th>
                {canEdit ? <th className="py-3 pr-4">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {funcionarios.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 13 : 12} className="py-6 text-muted-foreground">
                    Nenhum funcionário cadastrado.
                  </td>
                </tr>
              ) : (
                funcionarios.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pr-4">{item.registro}</td>
                    <td className="py-3 pr-4">{item.nome}</td>
                    <td className="py-3 pr-4">{item.cargo}</td>
                    <td className="py-3 pr-4">{item.funcao_ref?.nome || item.funcao || "—"}</td>
                    <td className="py-3 pr-4">
                      {item.funcao_ref
                        ? `${item.funcao_ref.adicional_tipo_default} ${item.funcao_ref.adicional_percentual_default}%`
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">{formatDate(item.data_admissao)}</td>
                    <td className="py-3 pr-4">{item.supervisor?.nome || "—"}</td>
                    <td className="py-3 pr-4">{item.modelo_experiencia || "—"}</td>
                    <td className="py-3 pr-4">{item.status}</td>
                    <td className="py-3 pr-4">{item.status_experiencia}</td>
                    <td className="py-3 pr-4">{formatDate(item.data_saida)}</td>
                    <td className="py-3 pr-4">
                      {item.substitui_desligado
                        ? item.substituicao?.nome || "Sim"
                        : "Não"}
                    </td>
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

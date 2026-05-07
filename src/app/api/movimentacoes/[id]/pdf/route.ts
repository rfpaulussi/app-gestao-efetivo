import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type SnapshotRef = {
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

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatVigenciaMes(value?: string | null) {
  if (!value) return "—";
  const [y, m] = value.slice(0, 7).split("-");
  return `${m}/${y}`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function drawLabelValue(
  page: any,
  font: any,
  bold: any,
  x: number,
  y: number,
  label: string,
  value: string,
  width = 320
) {
  page.drawText(label, {
    x,
    y,
    size: 9,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(value || "—", {
    x,
    y: y - 12,
    size: 10,
    font,
    maxWidth: width,
    color: rgb(0, 0, 0),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // route handler
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: mov, error } = await supabase
    .from("log_movimentacao")
    .select(`
      id,
      data_movimentacao,
      observacoes,
      funcao_atual,
      funcao_proposta,
      snapshot_atual,
      snapshot_proposta,
      funcionario:funcionario_id (
        registro,
        nome
      ),
      supervisor:supervisor_id (
        nome,
        email
      ),
      posto_origem:posto_origem_id (
        nome
      ),
      posto_destino:posto_destino_id (
        nome
      )
    `)
    .eq("id", context.params.id)
    .single();

  if (error || !mov) {
    return NextResponse.json({ error: "Movimentação não encontrada" }, { status: 404 });
  }

  const atual = (mov.snapshot_atual || {}) as SnapshotRef;
  const proposta = (mov.snapshot_proposta || {}) as SnapshotRef;

  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 paisagem aproximado
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 36;
  let y = 555;

  page.drawRectangle({
    x: 20,
    y: 520,
    width: 802,
    height: 50,
    borderWidth: 1,
    borderColor: rgb(0.2, 0.2, 0.2),
  });

  page.drawText("MOVIMENTAÇÃO DE COLABORADOR", {
    x: 280,
    y: 545,
    size: 16,
    font: bold,
  });

  page.drawText("Vigência", {
    x: 720,
    y: 545,
    size: 10,
    font: bold,
  });

  page.drawText(formatVigenciaMes(mov.data_movimentacao), {
    x: 720,
    y: 530,
    size: 12,
    font: bold,
  });

  const tipoMudanca =
    (mov.funcao_atual || "") !== (mov.funcao_proposta || "")
      ? "Mudança de função"
      : "Transferência";

  page.drawText(`Tipo: ${tipoMudanca}`, {
    x: marginX,
    y: 530,
    size: 11,
    font: bold,
  });

  page.drawRectangle({
    x: 20,
    y: 485,
    width: 390,
    height: 28,
    color: rgb(0.95, 0.97, 0.75),
    borderWidth: 1,
    borderColor: rgb(0.5, 0.5, 0.5),
  });

  page.drawRectangle({
    x: 412,
    y: 485,
    width: 410,
    height: 28,
    color: rgb(0.82, 0.92, 0.78),
    borderWidth: 1,
    borderColor: rgb(0.5, 0.5, 0.5),
  });

  page.drawText("SITUAÇÃO ATUAL", {
    x: 145,
    y: 494,
    size: 14,
    font: bold,
  });

  page.drawText("SITUAÇÃO PROPOSTA", {
    x: 545,
    y: 494,
    size: 14,
    font: bold,
  });

  page.drawText(`${mov.funcionario?.registro || "—"}  ${mov.funcionario?.nome || "—"}`, {
    x: marginX,
    y: 460,
    size: 12,
    font: bold,
  });

  page.drawText(`Supervisor: ${mov.supervisor?.nome || "—"}`, {
    x: 620,
    y: 460,
    size: 10,
    font,
  });

  page.drawLine({
    start: { x: 421, y: 80 },
    end: { x: 421, y: 480 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  drawLabelValue(page, font, bold, 40, 430, "Contrato", atual.contrato || "—");
  drawLabelValue(page, font, bold, 440, 430, "Contrato", proposta.contrato || "—");

  drawLabelValue(page, font, bold, 40, 390, "Local", atual.posto || mov.posto_origem?.nome || "—");
  drawLabelValue(page, font, bold, 440, 390, "Local", proposta.posto || mov.posto_destino?.nome || "—");

  drawLabelValue(page, font, bold, 40, 350, "Função", atual.funcao || mov.funcao_atual || "—");
  drawLabelValue(page, font, bold, 440, 350, "Função", proposta.funcao || mov.funcao_proposta || "—");

  drawLabelValue(page, font, bold, 40, 310, "Região", atual.regiao || "—");
  drawLabelValue(page, font, bold, 440, 310, "Região", proposta.regiao || "—");

  drawLabelValue(page, font, bold, 40, 270, "Salário", money(atual.salario_base));
  drawLabelValue(page, font, bold, 440, 270, "Salário", money(proposta.salario_base));

  drawLabelValue(page, font, bold, 40, 230, "Escala", atual.escala || "—");
  drawLabelValue(page, font, bold, 440, 230, "Escala", proposta.escala || "—");

  drawLabelValue(page, font, bold, 40, 190, "Horário", atual.horario || "—");
  drawLabelValue(page, font, bold, 440, 190, "Horário", proposta.horario || "—");

  drawLabelValue(
    page,
    font,
    bold,
    40,
    150,
    "Adicional",
    atual.adicional_tipo && atual.adicional_tipo !== "nenhum"
      ? `${atual.adicional_tipo} ${Number(atual.adicional_percentual || 0)}%`
      : "Nenhum"
  );
  drawLabelValue(
    page,
    font,
    bold,
    440,
    150,
    "Adicional",
    proposta.adicional_tipo && proposta.adicional_tipo !== "nenhum"
      ? `${proposta.adicional_tipo} ${Number(proposta.adicional_percentual || 0)}%`
      : "Nenhum"
  );

  drawLabelValue(
    page,
    font,
    bold,
    40,
    110,
    "Benefícios",
    `VR ${money(atual.valor_vr)} | VA ${money(atual.valor_va)} | VT ${money(atual.valor_vt)} | PLR ${money(atual.valor_plr)}`
  );
  drawLabelValue(
    page,
    font,
    bold,
    440,
    110,
    "Benefícios",
    `VR ${money(proposta.valor_vr)} | VA ${money(proposta.valor_va)} | VT ${money(proposta.valor_vt)} | PLR ${money(proposta.valor_plr)}`
  );

  page.drawText(`Data da movimentação: ${formatDateBR(mov.data_movimentacao)}`, {
    x: 40,
    y: 60,
    size: 10,
    font: font,
  });

  page.drawText(`Observações: ${mov.observacoes || "—"}`, {
    x: 260,
    y: 60,
    size: 10,
    font: font,
    maxWidth: 520,
  });

  page.drawText("Supervisor", { x: 70, y: 28, size: 10, font: bold });
  page.drawText("Setor médico", { x: 300, y: 28, size: 10, font: bold });
  page.drawText("Gerente operacional", { x: 520, y: 28, size: 10, font: bold });

  page.drawLine({ start: { x: 40, y: 38 }, end: { x: 180, y: 38 }, thickness: 1, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: 260, y: 38 }, end: { x: 400, y: 38 }, thickness: 1, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: 480, y: 38 }, end: { x: 680, y: 38 }, thickness: 1, color: rgb(0, 0, 0) });

  const pdfBytes = await doc.save();
  const nomeArquivo = sanitizeFileName(
    `movimentacao_${mov.funcionario?.registro || "funcionario"}_${mov.data_movimentacao || "data"}`
  );

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

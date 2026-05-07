type SecRow = {
  id: string;
  nome: string;
  secretaria: string | null;
  func_previsto_edital: number;
  qtd_vagas_insalubridade: number;
  supervisor: { nome: string } | null;
  noCampo: number;
  ocupadasInsalubridade: number;
};

type Props = {
  rows: SecRow[];
};

function getBadge(saldo: number) {
  if (saldo < 0) {
    return {
      label: "ATENÇÃO: cota excedida",
      className: "bg-red-500/15 text-red-300 border border-red-500/30",
    };
  }

  if (saldo === 0) {
    return {
      label: "Cota no limite",
      className: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
    };
  }

  return {
    label: "Cota disponível",
    className: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  };
}

function getStatusPosto(previsto: number, noCampo: number) {
  if (noCampo === previsto) return "Completo";
  if (noCampo < previsto) return "Abaixo";
  return "Acima";
}

export function SecPanel({ rows }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Secretarias / Postos</p>
        <h1 className="text-2xl font-semibold tracking-tight">Painel SEC</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 text-card-foreground overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="py-3 pr-4">Local</th>
              <th className="py-3 pr-4">Secretaria</th>
              <th className="py-3 pr-4">Previsto edital</th>
              <th className="py-3 pr-4">Nº no campo</th>
              <th className="py-3 pr-4">Status do posto</th>
              <th className="py-3 pr-4">Supervisor</th>
              <th className="py-3 pr-4">Vagas insalubridade</th>
              <th className="py-3 pr-4">Ocupadas insalubridade</th>
              <th className="py-3 pr-4">Saldo</th>
              <th className="py-3 pr-4">Ação recomendada</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-6 text-muted-foreground">
                  Nenhum posto disponível para cálculo.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const saldo = row.qtd_vagas_insalubridade - row.ocupadasInsalubridade;
                const badge = getBadge(saldo);
                const statusPosto = getStatusPosto(row.func_previsto_edital, row.noCampo);

                return (
                  <tr key={row.id} className="border-b">
                    <td className="py-3 pr-4">{row.nome}</td>
                    <td className="py-3 pr-4">{row.secretaria || "—"}</td>
                    <td className="py-3 pr-4">{row.func_previsto_edital}</td>
                    <td className="py-3 pr-4">{row.noCampo}</td>
                    <td className="py-3 pr-4">{statusPosto}</td>
                    <td className="py-3 pr-4">{row.supervisor?.nome || "—"}</td>
                    <td className="py-3 pr-4">{row.qtd_vagas_insalubridade}</td>
                    <td className="py-3 pr-4">{row.ocupadasInsalubridade}</td>
                    <td className="py-3 pr-4">{saldo}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

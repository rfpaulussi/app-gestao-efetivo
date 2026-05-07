type EfetivoRow = {
  id: string;
  funcionario_id: string;
  mes_referencia: string;
  cargo_mes: string | null;
  status: string;
  secretaria: string | null;
  esta_ferias_hoje: boolean;
  is_insalubre: boolean;
  funcionario: {
    registro: string;
    nome: string;
  } | null;
  supervisor: {
    nome: string;
  } | null;
  posto: {
    nome: string;
  } | null;
};

type Props = {
  rows: EfetivoRow[];
};

export function EfetivoTable({ rows }: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr className="text-left">
            <th className="py-3 pr-4">Registro</th>
            <th className="py-3 pr-4">Nome</th>
            <th className="py-3 pr-4">Cargo no mês</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Supervisor</th>
            <th className="py-3 pr-4">Posto</th>
            <th className="py-3 pr-4">Secretaria</th>
            <th className="py-3 pr-4">Férias hoje?</th>
            <th className="py-3 pr-4">Insalubre?</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-6 text-muted-foreground">
                Nenhum snapshot mensal encontrado para os filtros aplicados.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-3 pr-4">{row.funcionario?.registro || "—"}</td>
                <td className="py-3 pr-4">{row.funcionario?.nome || "—"}</td>
                <td className="py-3 pr-4">{row.cargo_mes || "—"}</td>
                <td className="py-3 pr-4">{row.status}</td>
                <td className="py-3 pr-4">{row.supervisor?.nome || "—"}</td>
                <td className="py-3 pr-4">{row.posto?.nome || "—"}</td>
                <td className="py-3 pr-4">{row.secretaria || "—"}</td>
                <td className="py-3 pr-4">{row.esta_ferias_hoje ? "Sim" : "Não"}</td>
                <td className="py-3 pr-4">{row.is_insalubre ? "Sim" : "Não"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

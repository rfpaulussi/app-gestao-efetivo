import { format } from "date-fns";

type Funcionario = {
  id: string;
  registro: string;
  nome: string;
  cargo: string;
  funcao: string | null;
  data_admissao: string;
  data_saida: string | null;
  status: string;
  status_experiencia: string;
  supervisor: {
    id: string;
    nome: string;
    email: string;
  } | null;
};

type Props = {
  funcionarios: Funcionario[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return format(new Date(`${value}T00:00:00`), "dd/MM/yyyy");
}

export function FuncionariosTable({ funcionarios }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Cadastro central</p>
        <h1 className="text-2xl font-semibold tracking-tight">Funcionários</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <p className="text-sm text-muted-foreground">
          Nesta parte vamos validar o banco, a rota e a listagem base. O formulário completo e a importação XLSX entram na próxima parte.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 text-card-foreground overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="py-3 pr-4">Registro</th>
              <th className="py-3 pr-4">Nome</th>
              <th className="py-3 pr-4">Cargo</th>
              <th className="py-3 pr-4">Função</th>
              <th className="py-3 pr-4">Admissão</th>
              <th className="py-3 pr-4">Supervisor</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Status exp.</th>
              <th className="py-3 pr-4">Saída</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-muted-foreground">
                  Nenhum funcionário cadastrado.
                </td>
              </tr>
            ) : (
              funcionarios.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3 pr-4">{item.registro}</td>
                  <td className="py-3 pr-4">{item.nome}</td>
                  <td className="py-3 pr-4">{item.cargo}</td>
                  <td className="py-3 pr-4">{item.funcao || "—"}</td>
                  <td className="py-3 pr-4">{formatDate(item.data_admissao)}</td>
                  <td className="py-3 pr-4">{item.supervisor?.nome || "—"}</td>
                  <td className="py-3 pr-4">{item.status}</td>
                  <td className="py-3 pr-4">{item.status_experiencia}</td>
                  <td className="py-3 pr-4">{formatDate(item.data_saida)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

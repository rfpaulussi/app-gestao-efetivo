type Option = {
  id: string;
  nome: string;
};

type Props = {
  mes: string;
  status: string;
  posto: string;
  supervisor: string;
  postos: Option[];
  supervisors: Option[];
};

export function EfetivoFilters({
  mes,
  status,
  posto,
  supervisor,
  postos,
  supervisors,
}: Props) {
  return (
    <form className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-4">
      <div className="space-y-2">
        <label htmlFor="mes" className="text-sm font-medium">
          Mês
        </label>
        <input
          id="mes"
          name="mes"
          type="month"
          defaultValue={mes}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="ferias">Férias</option>
          <option value="afastado">Afastado</option>
          <option value="desligado">Desligado</option>
          <option value="licenca">Licença</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="posto" className="text-sm font-medium">
          Posto
        </label>
        <select
          id="posto"
          name="posto"
          defaultValue={posto}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {postos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="supervisor" className="text-sm font-medium">
          Supervisor
        </label>
        <select
          id="supervisor"
          name="supervisor"
          defaultValue={supervisor}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {supervisors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-4 flex gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Aplicar filtros
        </button>

        <a
          href="/efetivo"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium"
        >
          Limpar
        </a>
      </div>
    </form>
  );
}

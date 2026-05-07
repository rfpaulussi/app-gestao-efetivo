import Link from "next/link";
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPinned,
  ShieldAlert,
  TriangleAlert,
  Users,
  UserMinus,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Contratos", href: "/contratos", icon: Building2, enabled: true },
  { label: "Postos", href: "/postos", icon: MapPinned, enabled: true },
  { label: "Funcionários", href: "/funcionarios", icon: Users, enabled: true },
  { label: "Referências", href: "/referencias-funcao", icon: FileText, enabled: true },
  { label: "Efetivo Mensal", href: "/efetivo", icon: ClipboardList, enabled: true },
  { label: "SEC", href: "/sec", icon: ShieldAlert, enabled: true },
  { label: "Movimentações", href: "/movimentacoes", icon: ArrowLeftRight, enabled: true },
  { label: "Ausências", href: "/ausencias", icon: UserMinus, enabled: true },
  { label: "Férias", href: "#", icon: CalendarDays, enabled: false },
  { label: "Auditoria", href: "#", icon: TriangleAlert, enabled: false },
];

export function AppSidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-card lg:block">
      <div className="flex h-16 items-center px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Gestão Operacional
          </p>
          <h1 className="text-base font-semibold">App de Efetivos</h1>
        </div>
      </div>

      <Separator />

      <nav className="space-y-1 p-4">
        {items.map((item) => {
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-60"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide">
                  em breve
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-primary/10"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

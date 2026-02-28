import { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    BarChart3,
    Bot,
    FileText,
    Settings,
    Users,
    ArrowLeftRight,
} from "lucide-react";

export const metadata: Metadata = { title: "Menú" };

const MENU_ITEMS = [
    {
        group: "Herramientas",
        items: [
            {
                href: "/dashboard/movements",
                icon: ArrowLeftRight,
                title: "Movimientos",
                desc: "Historial de entradas y salidas",
            },
            {
                href: "/dashboard/reports",
                icon: BarChart3,
                title: "Reportes",
                desc: "Exportar y analizar datos",
            },
            {
                href: "/dashboard/assistant",
                icon: Bot,
                title: "Asistente IA",
                desc: "Consultas inteligentes sobre el depósito",
            },
        ],
    },
    {
        group: "Administración",
        items: [
            {
                href: "/dashboard/users",
                icon: Users,
                title: "Usuarios",
                desc: "Gestionar accesos y roles",
            },
            {
                href: "/dashboard/documentation",
                icon: FileText,
                title: "Documentación",
                desc: "Guías y manuales del sistema",
            },
            {
                href: "/dashboard/settings",
                icon: Settings,
                title: "Configuración",
                desc: "Preferencias de la cuenta",
            },
        ],
    },
];

export default function MenuPage() {
    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Menú</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Todas las secciones del sistema
                </p>
            </div>

            {MENU_ITEMS.map((group) => (
                <div key={group.group} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2">
                        {group.group}
                    </p>
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors active:bg-muted/60"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <Icon className="h-4 w-4 text-foreground/70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {item.desc}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

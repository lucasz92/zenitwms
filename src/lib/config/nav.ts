// ============================================================
// NAVIGATION CONFIG — Zenit WMS
// Define aquí los ítems del sidebar con sus roles permitidos
// ============================================================

import {
    LayoutDashboard,
    Package,
    MapPin,
    ArrowLeftRight,
    ScanLine,
    BarChart3,
    Bot,
    Settings,
    Users,
    FileText,
    Image as ImageIcon,
    AlertTriangle,
    Brain,
    Printer,
    type LucideIcon,
} from "lucide-react";
export type UserRole = "admin" | "manager" | "auditor" | "employee";
export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    roles?: UserRole[]; // undefined = visible para todos
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
    {
        label: "General",
        items: [
            {
                title: "Dashboard",
                href: "/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Inventario",
                href: "/dashboard/inventory",
                icon: Package,
            },
            {
                title: "Ubicaciones",
                href: "/dashboard/locations",
                icon: MapPin,
            },
            {
                title: "Movimientos",
                href: "/dashboard/movements",
                icon: ArrowLeftRight,
            },
            {
                title: "Catálogo",
                href: "/dashboard/catalog",
                icon: ImageIcon,
            },
        ],
    },
    {
        label: "Herramientas",
        items: [
            {
                title: "Escáner",
                href: "/dashboard/scanner",
                icon: ScanLine,
            },
            {
                title: "Asistente IA",
                href: "/dashboard/assistant",
                icon: Bot,
            },
            {
                title: "Impresión A4",
                href: "/dashboard/print-center",
                icon: Printer,
            },
            {
                title: "Alertas",
                href: "/dashboard/alerts",
                icon: AlertTriangle,
                roles: ["admin", "manager", "auditor"],
            },
        ],
    },
    {
        label: "Sistema",
        items: [
            {
                title: "Documentación",
                href: "/dashboard/docs",
                icon: FileText,
                roles: ["admin", "manager"],
            },
            {
                title: "Cerebro IA",
                href: "/dashboard/knowledge",
                icon: Brain,
                roles: ["admin"],
            },
            {
                title: "Usuarios",
                href: "/dashboard/users",
                icon: Users,
                roles: ["admin", "manager"],
            },
            {
                title: "Configuración",
                href: "/dashboard/settings",
                icon: Settings,
                roles: ["admin"],
            },
        ],
    },
];

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
    description?: string;
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
                description: "Resumen general del sistema",
            },
            {
                title: "Inventario",
                href: "/dashboard/inventory",
                icon: Package,
                description: "Gestión de stock, reportes y exportación",
            },
            {
                title: "Ubicaciones",
                href: "/dashboard/locations",
                icon: MapPin,
                description: "Gestión de ubicaciones del depósito",
            },
            {
                title: "Movimientos",
                href: "/dashboard/movements",
                icon: ArrowLeftRight,
                description: "Historial de entradas y salidas",
            },
            {
                title: "Catálogo",
                href: "/dashboard/catalog",
                icon: ImageIcon,
                description: "Base de datos de productos e imágenes",
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
                description: "Cámara y lectura de códigos",
            },
            {
                title: "Asistente IA",
                href: "/dashboard/assistant",
                icon: Bot,
                description: "Consultas inteligentes sobre el depósito",
            },
            {
                title: "Impresión A4",
                href: "/dashboard/print-center",
                icon: Printer,
                description: "Etiquetas y carteles A4 para pallets",
            },
            {
                title: "Alertas",
                href: "/dashboard/alerts",
                icon: AlertTriangle,
                roles: ["admin", "manager", "auditor"],
                description: "Centro de alertas y notificaciones",
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
                description: "Guías y manuales del sistema",
            },
            {
                title: "Cerebro IA",
                href: "/dashboard/knowledge",
                icon: Brain,
                roles: ["admin"],
                description: "Base de conocimiento del sistema",
            },
            {
                title: "Usuarios",
                href: "/dashboard/users",
                icon: Users,
                roles: ["admin", "manager"],
                description: "Gestionar accesos y roles",
            },
            {
                title: "Configuración",
                href: "/dashboard/settings",
                icon: Settings,
                roles: ["admin"],
                description: "Preferencias de la cuenta",
            },
        ],
    },
];

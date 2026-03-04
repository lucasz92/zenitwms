import {
    Package,
    MapPin,
    ArrowLeftRight,
    AlertTriangle,
    TrendingUp,
    Activity,
    Layers,
    BarChart3,
    Clock,
} from "lucide-react";
import { db } from "@/lib/db";
import { products, locations, inventoryMovements, alerts } from "@/lib/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
    const [productsCount] = await db.select({ value: count() }).from(products);
    const [locatedCount] = await db.select({ value: count() }).from(locations).where(sql`${locations.productId} IS NOT NULL`);
    const [movementsToday] = await db.select({ value: count() }).from(inventoryMovements).where(sql`date_trunc('day', ${inventoryMovements.createdAt}) = CURRENT_DATE`);
    const [alertsCount] = await db.select({ value: count() }).from(alerts).where(eq(alerts.status, "pending"));

    const locationRate = productsCount.value > 0
        ? ((locatedCount.value / productsCount.value) * 100).toFixed(0)
        : "0";

    const today = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });
    const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

    return (
        <div className="space-y-6 pb-8">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1 pb-2 border-b border-border/50">
                <div>
                    <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-1">
                        {todayCapitalized}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Panel de control
                    </h1>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 px-3 py-1.5 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Sistema en línea
                </div>
            </div>

            {/* ── KPI Tiles ───────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total productos */}
                <KpiCard
                    label="Total Productos"
                    value={productsCount.value.toLocaleString()}
                    sub="En catálogo activo"
                    icon={Package}
                    accent="blue"
                />
                {/* Tasa de ubicados */}
                <KpiCard
                    label="Ubicados"
                    value={locatedCount.value.toLocaleString()}
                    sub={`${locationRate}% del catálogo asignado`}
                    icon={MapPin}
                    accent="emerald"
                />
                {/* Movimientos hoy */}
                <KpiCard
                    label="Movimientos Hoy"
                    value={movementsToday.value.toString()}
                    sub="Tránsitos en 24 h"
                    icon={ArrowLeftRight}
                    accent="violet"
                />
                {/* Alertas */}
                <KpiCard
                    label="Incidentes"
                    value={alertsCount.value.toString()}
                    sub={alertsCount.value > 0 ? "Requieren revisión" : "Sin pendientes"}
                    icon={AlertTriangle}
                    accent={alertsCount.value > 0 ? "amber" : "emerald"}
                />
            </div>

            {/* ── Widgets row ─────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Flujo de movimientos (2/3 width) */}
                <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">Flujo de Movimientos</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Actividad reciente del almacén</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-lg px-2.5 py-1.5 border border-border/50">
                            <Clock className="h-3 w-3" />
                            Últimas 24h
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="flex flex-col h-44 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 gap-3">
                            <div className="p-3 rounded-full bg-muted/40">
                                <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground/70">
                                    {movementsToday.value > 0
                                        ? `${movementsToday.value} movimiento${movementsToday.value !== 1 ? "s" : ""} registrado${movementsToday.value !== 1 ? "s" : ""} hoy`
                                        : "Sin movimientos registrados hoy"}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    El gráfico histórico se activará con mayor volumen de datos
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Estado del inventario (1/3 width) */}
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50">
                        <div className={`p-1.5 rounded-lg ${alertsCount.value > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                            <Activity className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Estado del Inventario</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Niveles y alertas activas</p>
                        </div>
                    </div>
                    <div className="p-5 space-y-3">
                        {/* Location rate bar */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-medium text-muted-foreground">Tasa de ubicación</span>
                                <span className="text-xs font-bold text-foreground">{locationRate}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                                    style={{ width: `${locationRate}%` }}
                                />
                            </div>
                        </div>

                        {/* Alert status */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg border ${alertsCount.value > 0
                            ? "border-amber-200/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40"
                            : "border-emerald-200/60 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/40"}`}>
                            <div className={`mt-0.5 shrink-0 h-2 w-2 rounded-full ${alertsCount.value > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                            <div>
                                <p className={`text-xs font-semibold ${alertsCount.value > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                                    {alertsCount.value > 0
                                        ? `${alertsCount.value} alerta${alertsCount.value !== 1 ? "s" : ""} pendiente${alertsCount.value !== 1 ? "s" : ""}`
                                        : "Niveles estables"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                                    {alertsCount.value > 0
                                        ? "Revisá la sección de alertas para gestionar incidencias."
                                        : "El stock respeta los mínimos configurados."}
                                </p>
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-center">
                                <p className="text-lg font-bold text-foreground">{productsCount.value.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Productos</p>
                            </div>
                            <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-center">
                                <p className="text-lg font-bold text-foreground">{locatedCount.value.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Ubicados</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Action Links Row ─────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {([
                    { label: "Inventario", sub: "Ver catálogo completo", href: "/dashboard/inventory", color: "text-blue-500", bg: "bg-blue-500/8", border: "border-blue-200/60 dark:border-blue-900/40", icon: Layers },
                    { label: "Movimientos", sub: "Registrar entradas y salidas", href: "/dashboard/movements", color: "text-violet-500", bg: "bg-violet-500/8", border: "border-violet-200/60 dark:border-violet-900/40", icon: ArrowLeftRight },
                    { label: "Ubicaciones", sub: "Mapa del depósito", href: "/dashboard/locations", color: "text-emerald-500", bg: "bg-emerald-500/8", border: "border-emerald-200/60 dark:border-emerald-900/40", icon: MapPin },
                    { label: "Alertas", sub: "Gestionar incidentes", href: "/dashboard/alerts", color: "text-amber-500", bg: "bg-amber-500/8", border: "border-amber-200/60 dark:border-amber-900/40", icon: AlertTriangle },
                ] as const).map((item) => {
                    const Icon = item.icon;
                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center gap-3 rounded-xl border ${item.border} ${item.bg} p-4 transition-all hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]`}
                        >
                            <div className={`p-2 rounded-lg bg-background/70 ${item.color} border border-current/10`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground leading-none">{item.label}</p>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-tight truncate">{item.sub}</p>
                            </div>
                        </a>
                    );
                })}
            </div>

        </div>
    );
}

// ── KPI Card component ──────────────────────────────────────────────────────

type Accent = "blue" | "emerald" | "violet" | "amber";

const accentMap: Record<Accent, { icon: string; value: string; bar: string; border: string }> = {
    blue: { icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400", value: "text-blue-600 dark:text-blue-400", bar: "from-blue-500 to-blue-400", border: "border-blue-100 dark:border-blue-900/40" },
    emerald: { icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", value: "text-emerald-600 dark:text-emerald-400", bar: "from-emerald-500 to-emerald-400", border: "border-emerald-100 dark:border-emerald-900/40" },
    violet: { icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400", value: "text-violet-600 dark:text-violet-400", bar: "from-violet-500 to-violet-400", border: "border-violet-100 dark:border-violet-900/40" },
    amber: { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400", value: "text-amber-600 dark:text-amber-400", bar: "from-amber-500 to-amber-400", border: "border-amber-100 dark:border-amber-900/40" },
};

function KpiCard({
    label, value, sub, icon: Icon, accent,
}: {
    label: string;
    value: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: Accent;
}) {
    const a = accentMap[accent];
    return (
        <div className={`relative rounded-xl border ${a.border} bg-card p-5 flex flex-col gap-3 overflow-hidden hover:shadow-sm transition-shadow`}>
            {/* top accent line */}
            <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-b-full bg-gradient-to-r ${a.bar} opacity-60`} />

            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{label}</p>
                <div className={`p-2 rounded-lg ${a.icon}`}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
            </div>

            <div>
                <p className={`text-3xl font-bold tracking-tight ${a.value}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{sub}</p>
            </div>
        </div>
    );
}

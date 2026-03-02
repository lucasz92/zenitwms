import {
    Package,
    MapPin,
    ArrowLeftRight,
    TrendingUp,
    AlertTriangle,
    Activity,
    Layers,
    Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { products, locations, inventoryMovements, alerts } from "@/lib/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as motion from "framer-motion/client";

export default async function DashboardPage() {
    // ── Fetching real stats from DB ──
    const [productsCount] = await db.select({ value: count() }).from(products);
    const [locatedCount] = await db.select({ value: count() }).from(locations).where(sql`${locations.productId} IS NOT NULL`);
    const [movementsToday] = await db.select({ value: count() }).from(inventoryMovements).where(sql`date_trunc('day', ${inventoryMovements.createdAt}) = CURRENT_DATE`);
    const [alertsCount] = await db.select({ value: count() }).from(alerts).where(eq(alerts.status, "pending"));

    const stats = [
        {
            title: "Total Productos",
            value: productsCount.value.toString(),
            change: "En catálogo actual",
            icon: Package,
            color: "text-blue-500",
            bg: "bg-blue-500/10 dark:bg-blue-500/20",
            border: "border-blue-500/20"
        },
        {
            title: "Tasa de Ubicados",
            value: locatedCount.value.toString(),
            change: `${productsCount.value > 0 ? ((locatedCount.value / productsCount.value) * 100).toFixed(1) : 0}% del stock asignado`,
            icon: MapPin,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
            border: "border-emerald-500/20"
        },
        {
            title: "Rotación (Hoy)",
            value: movementsToday.value.toString(),
            change: "Tránsitos en 24h",
            icon: ArrowLeftRight,
            color: "text-violet-500",
            bg: "bg-violet-500/10 dark:bg-violet-500/20",
            border: "border-violet-500/20"
        },
        {
            title: "Incidentes/Alertas",
            value: alertsCount.value.toString(),
            change: "Requieren revisión",
            icon: AlertTriangle,
            color: "text-amber-500",
            bg: "bg-amber-500/10 dark:bg-amber-500/20",
            border: "border-amber-500/20"
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
    };

    return (
        <div className="space-y-8 pb-8 relative">
            {/* Subtle background glow effect (minimal glassmorphism approach) */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 via-primary/[0.02] to-transparent pointer-events-none -mx-6 sm:-mx-8 px-6 sm:px-8 -z-10" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        Dashboard
                        <Sparkles className="h-5 w-5 text-primary/60" />
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1 capitalize">
                        {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50 shadow-sm px-3 py-1"
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Sistema en línea
                </Badge>
            </div>

            {/* Stats Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div key={stat.title} variants={itemVariants}>
                            <Card className={`relative overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all duration-300 bg-card/80 backdrop-blur-[2px]`}>
                                {/* Subtle contextual border top */}
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20 ${stat.color}`} />

                                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground">
                                        {stat.title}
                                    </CardTitle>
                                    <div className={`rounded-xl p-2.5 shadow-inner border ${stat.border} ${stat.bg}`}>
                                        <Icon className={`h-4 w-4 ${stat.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent className="px-5 pb-5">
                                    <p className="text-2xl font-black text-foreground tracking-tight">{stat.value}</p>
                                    <p className="text-[11px] font-medium text-muted-foreground mt-1 flex items-center gap-1.5 opacity-80">
                                        {stat.change}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Widgets */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="grid gap-6 lg:grid-cols-2"
            >
                <Card className="border-border/50 shadow-sm bg-card/90 overflow-hidden group">
                    <CardHeader className="px-5 pt-5 pb-4 border-b border-border/40 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-base font-bold">
                                Flujo de Movimientos
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="flex flex-col h-48 items-center justify-center rounded-xl border border-dashed border-border/60 bg-gradient-to-b from-muted/10 to-transparent relative group-hover:border-primary/20 transition-colors">
                            <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground/80">
                                {movementsToday.value > 0 ? "Registro de actividad reciente." : "Sin movimientos registrados en esta sesión."}
                            </p>
                            <p className="text-xs text-muted-foreground/50 mt-1">El gráfico se generará al alcanzar volumen.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm bg-card/90 overflow-hidden group">
                    <CardHeader className="px-5 pt-5 pb-4 border-b border-border/40 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-base font-bold">
                                    Estado del Inventario
                                </CardTitle>
                            </div>
                            {alertsCount.value > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{alertsCount.value} Alertas</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className={`flex flex-col h-48 items-center justify-center rounded-xl border border-dashed border-border/60 transition-colors ${alertsCount.value > 0 ? "bg-amber-500/5 group-hover:border-amber-500/30" : "bg-gradient-to-b from-muted/10 to-transparent group-hover:border-primary/20"}`}>
                            <Activity className={`h-10 w-10 mb-3 ${alertsCount.value > 0 ? "text-amber-500/50" : "text-emerald-500/40"}`} />
                            <p className="text-sm font-medium text-foreground">
                                {alertsCount.value > 0 ? "Sectores con alertas críticas" : "Todos los niveles estables"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 text-center max-w-[250px]">
                                {alertsCount.value > 0 ? "Revise la sección de inventario para reabastecimiento o conteos de emergencia." : "El volumen actual del almacén responde a los perfiles mínimos estipulados."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

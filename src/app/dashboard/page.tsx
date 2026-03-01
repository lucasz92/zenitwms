import {
    Package,
    MapPin,
    ArrowLeftRight,
    TrendingUp,
    AlertTriangle,
    Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { products, locations, inventoryMovements, alerts } from "@/lib/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
            change: "En catálogo",
            icon: Package,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            title: "Ubicados",
            value: locatedCount.value.toString(),
            change: `${productsCount.value > 0 ? ((locatedCount.value / productsCount.value) * 100).toFixed(1) : 0}% del total`,
            icon: MapPin,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            title: "Movimientos Hoy",
            value: movementsToday.value.toString(),
            change: "Registrados hoy",
            icon: ArrowLeftRight,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
        },
        {
            title: "Alertas Pendientes",
            value: alertsCount.value.toString(),
            change: "Requieren atención",
            icon: AlertTriangle,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                        {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
                >
                    <Activity className="h-3 w-3" />
                    En línea
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.title} className="border-border/60 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <div className={`rounded-lg p-2 ${stat.bg}`}>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{stat.change}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Placeholder tables / charts */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-semibold">
                                Movimientos Recientes
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground bg-muted/5">
                            {movementsToday.value > 0 ? "Movimientos registrados hoy." : "No hay movimientos recientes."}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-semibold">
                                Alertas de Stock
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground bg-muted/5">
                            {alertsCount.value > 0 ? `${alertsCount.value} alertas activas.` : "Todo bajo control. Sin alertas."}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

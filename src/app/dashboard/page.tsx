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

// ── Data placeholder (se reemplazará con Supabase queries) ──
const stats = [
    {
        title: "Total Productos",
        value: "0",
        change: "+0 este mes",
        icon: Package,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
    },
    {
        title: "Ubicados",
        value: "0",
        change: "0% del total",
        icon: MapPin,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
    },
    {
        title: "Movimientos Hoy",
        value: "0",
        change: "+0 vs. ayer",
        icon: ArrowLeftRight,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
    },
    {
        title: "Stock Crítico",
        value: "0",
        change: "productos bajo mínimo",
        icon: AlertTriangle,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
    },
];

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Bienvenido de vuelta. Aquí está el resumen de tu depósito.
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
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                            Conecta Supabase para ver movimientos
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-semibold">
                                Stock Crítico
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                            Conecta Supabase para ver alertas
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

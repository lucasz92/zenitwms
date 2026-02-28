import { Metadata } from "next";
import {
    TrendingUp,
    TrendingDown,
    Activity,
    CalendarDays,
} from "lucide-react";
import { MovementsTable } from "@/components/movements/movements-table";
import { TransfersTable } from "@/components/transfers/transfers-table";
import { getMovements, getMovementStats } from "@/lib/db/queries/movements";
import { getTransfers } from "@/lib/db/queries/transfers";
import { getProducts } from "@/lib/db/queries/products";
import { withTimeout } from "@/lib/utils/with-timeout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
    title: "Movimientos",
};

export default async function MovementsPage() {
    const [movements, stats, allProducts, transfers] = await Promise.all([
        withTimeout(getMovements(200), []),
        withTimeout(getMovementStats(), { today: 0, week: 0, entries: 0, exits: 0 }),
        withTimeout(getProducts(), []),
        withTimeout(getTransfers(), []),
    ]);

    // Transformar productos en formato mínimo para el selector del modal
    const productOptions = allProducts.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        stock: p.stock,
    }));

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Historial de entradas, salidas y ajustes de stock
                </p>
            </div>

            <Tabs defaultValue="history" className="space-y-4">
                <TabsList className="bg-muted/50 p-1 border border-border/50">
                    <TabsTrigger value="history" className="text-sm">
                        Historial (Kardex)
                    </TabsTrigger>
                    <TabsTrigger value="transfers" className="text-sm">
                        Control de Remitos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-5 mt-0 outline-none">
                    {/* KPI cards */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                                <Activity className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Hoy</p>
                                <p className="text-xl font-bold leading-tight">{stats.today}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                                <CalendarDays className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Esta semana</p>
                                <p className="text-xl font-bold leading-tight">{stats.week}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total entradas</p>
                                <p className="text-xl font-bold leading-tight">+{stats.entries}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total salidas</p>
                                <p className="text-xl font-bold leading-tight">−{stats.exits}</p>
                            </div>
                        </div>
                    </div>

                    {/* Table Kardex */}
                    <MovementsTable movements={movements} products={productOptions} />
                </TabsContent>

                <TabsContent value="transfers" className="mt-0 outline-none">
                    {/* Tabla de Remitos / Lotes */}
                    <TransfersTable transfers={transfers} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

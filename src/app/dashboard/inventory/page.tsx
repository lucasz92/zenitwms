import { Metadata } from "next";
import { Package, AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { getProducts, getInventoryStats } from "@/lib/db/queries/products";
import { withTimeout } from "@/lib/utils/with-timeout";

export const metadata: Metadata = {
    title: "Inventario",
};

export default async function InventoryPage() {
    // Queries paralelas a Supabase via Drizzle
    const [products, stats] = await Promise.all([
        withTimeout(getProducts(), []),
        withTimeout(getInventoryStats(), { total: 0, located: 0, out_of_stock: 0, low_stock: 0 }),
    ]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Inventario
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Productos registrados en el sistema
                </p>
            </div>

            {/* Mini-stats row */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Package className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-xl font-bold leading-tight">{stats.total}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Ubicados</p>
                        <p className="text-xl font-bold leading-tight">{stats.located}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Stock bajo</p>
                        <p className="text-xl font-bold leading-tight">{stats.low_stock}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Sin stock</p>
                        <p className="text-xl font-bold leading-tight">{stats.out_of_stock}</p>
                    </div>
                </div>
            </div>

            {/* Table — datos reales de Supabase */}
            <InventoryTable products={products} />
        </div>
    );
}

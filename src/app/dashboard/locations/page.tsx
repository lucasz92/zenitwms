import { Metadata } from "next";
import {
    MapIcon,
    CheckCircle2,
    PackageCheck,
    Percent,
} from "lucide-react";
import { getLocations, getLocationStats } from "@/lib/db/queries/locations";
import { getProducts } from "@/lib/db/queries/products";
import { withTimeout } from "@/lib/utils/with-timeout";

import { LocationsClient } from "./locations-client";

export const metadata: Metadata = {
    title: "Ubicaciones Fisicas",
};

export default async function LocationsPage() {
    const [locations, stats, products] = await Promise.all([
        withTimeout(getLocations(), []),
        withTimeout(getLocationStats(), { total: 0, occupied: 0, available: 0, occupancyRate: 0 }),
        withTimeout(getProducts(), []),
    ]);

    const productOptions = products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
    }));

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Ubicaciones del Depósito</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Mapeo visual de estanterías y asignación de productos
                </p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <MapIcon className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Posiciones Totales</p>
                        <p className="text-xl font-bold leading-tight">{stats.total}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Disponibles (Vacías)</p>
                        <p className="text-xl font-bold leading-tight">{stats.available}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <PackageCheck className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Ocupadas</p>
                        <p className="text-xl font-bold leading-tight">{stats.occupied}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                        <Percent className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Ocupación</p>
                        <p className="text-xl font-bold leading-tight">{stats.occupancyRate.toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            {/* Cliente: Tabs, Mapa, Tabla y Modales */}
            <LocationsClient locations={locations} products={productOptions} />
        </div>
    );
}

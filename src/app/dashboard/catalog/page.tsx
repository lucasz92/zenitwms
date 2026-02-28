import { Metadata } from "next";
import { Camera } from "lucide-react";
import { getProducts } from "@/lib/db/queries/products";
import { withTimeout } from "@/lib/utils/with-timeout";
import { CatalogGrid } from "@/components/catalog/catalog-grid";

export const metadata: Metadata = {
    title: "Catálogo Visual",
};

export default async function CatalogPage() {
    const products = await withTimeout(getProducts(), []);

    return (
        <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Catálogo Visual</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
                        Grilla interactiva diseñada para dispositivos móviles. Presioná el ícono de cámara sobre cualquier producto para tomar y subir una foto instantánea al servidor.
                    </p>
                </div>

                {/* Action Callout */}
                <div className="flex lg:hidden items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm w-fit">
                    <Camera className="h-4 w-4" />
                    Carga rápida activa
                </div>
            </div>

            <CatalogGrid products={products} />
        </div>
    );
}

"use client";

import { useState, useMemo } from "react";
import { Search, Image as ImageIcon } from "lucide-react";
import { ProductCard } from "./product-card";
import type { ProductRow } from "@/lib/db/queries/products";
import { cn } from "@/lib/utils";

interface CatalogGridProps {
    products: ProductRow[];
}

export function CatalogGrid({ products }: CatalogGridProps) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "missing" | "has_image">("all");

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            // Filtros de estado visual
            if (filter === "missing" && p.image_url) return false;
            if (filter === "has_image" && !p.image_url) return false;

            // Filtro por texto
            if (search) {
                const q = search.toLowerCase();
                return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
            }
            return true;
        });
    }, [products, search, filter]);

    return (
        <div className="space-y-4">
            {/* Search & Filters Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sticky top-[60px] z-30 bg-background/80 backdrop-blur-md py-2 border-b">
                <div className="relative flex-1 max-w-md">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por código o descripción..."
                        className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-4 text-sm placeholder:text-muted-foreground transition-colors shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/50">
                    <button
                        onClick={() => setFilter("all")}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all", filter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter("missing")}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1", filter === "missing" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        Falta Foto
                        <span className="bg-destructive/10 text-destructive text-[10px] px-1.5 rounded-full">{products.filter(p => !p.image_url).length}</span>
                    </button>
                    <button
                        onClick={() => setFilter("has_image")}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all", filter === "has_image" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        Completos
                    </button>
                </div>
            </div>

            {/* Grid */}
            {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 mt-8">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h3 className="font-semibold text-lg">No se encontraron productos</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">No hay resultados para los filtros actuales. Probá buscando de otra manera.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mt-4 pb-20">
                    {filteredProducts.map((p) => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>
            )}
        </div>
    );
}

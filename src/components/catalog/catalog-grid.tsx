"use client";

import { useState, useMemo } from "react";
import { Search, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import type { ProductRow } from "@/lib/db/queries/products";
import { cn } from "@/lib/utils";

interface CatalogGridProps {
    products: ProductRow[];
}

const PAGE_SIZE = 48;

export function CatalogGrid({ products }: CatalogGridProps) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "missing" | "has_image">("all");
    const [page, setPage] = useState(1);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (filter === "missing" && p.image_url) return false;
            if (filter === "has_image" && !p.image_url) return false;
            if (search) {
                const q = search.toLowerCase();
                return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
            }
            return true;
        });
    }, [products, search, filter]);

    // Reset page when filters/search change
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleFilterChange = (newFilter: "all" | "missing" | "has_image") => {
        setFilter(newFilter);
        setPage(1);
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    return (
        <div className="space-y-4">
            {/* Search & Filters Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sticky top-[60px] z-30 bg-background/80 backdrop-blur-md py-2 border-b">
                <div className="relative flex-1 max-w-md">
                    <input
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar por código o descripción..."
                        className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-4 text-sm placeholder:text-muted-foreground transition-colors shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/50">
                    <button
                        onClick={() => handleFilterChange("all")}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all", filter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => handleFilterChange("missing")}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1", filter === "missing" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        Falta Foto
                        <span className="bg-destructive/10 text-destructive text-[10px] px-1.5 rounded-full">{products.filter(p => !p.image_url).length}</span>
                    </button>
                    <button
                        onClick={() => handleFilterChange("has_image")}
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
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mt-4">
                        {paginated.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between border-t pt-4 pb-20">
                        <p className="text-xs text-muted-foreground">
                            Mostrando{" "}
                            <span className="font-semibold text-foreground">
                                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredProducts.length)}
                            </span>{" "}
                            de{" "}
                            <span className="font-semibold text-foreground">{filteredProducts.length}</span>{" "}
                            productos
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                            </button>
                            <span className="text-xs font-mono text-muted-foreground px-2">
                                {safePage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Siguiente <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

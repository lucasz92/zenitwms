"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { LocationRow } from "@/lib/db/queries/locations";
import { Package, Grid2x2, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WarehouseMapProps {
    locations: LocationRow[];
    onSelectCell: (loc: LocationRow) => void;
}

// Transformamos los rows planos en una jerarquía visual: Sector -> Row -> Column -> Estantes
export function WarehouseMap({ locations, onSelectCell }: WarehouseMapProps) {
    const [activeColumn, setActiveColumn] = useState<string | null>(null);

    const mapData = useMemo(() => {
        // 1. Agrupar por Sector > Fila > Columna
        const sectors: Record<string, Record<string, Record<string, LocationRow[]>>> = {};

        locations.forEach((loc) => {
            const s = loc.sector || "General";
            const r = loc.row || "A";
            const c = loc.column || "01";

            if (!sectors[s]) sectors[s] = {};
            if (!sectors[s][r]) sectors[s][r] = {};
            if (!sectors[s][r][c]) sectors[s][r][c] = [];

            sectors[s][r][c].push(loc);
        });

        // 2. Ordenar las columnas internamente por estante ascendente (1, 2, 3...)
        Object.values(sectors).forEach(rows => {
            Object.values(rows).forEach(cols => {
                Object.values(cols).forEach(shelves => {
                    shelves.sort((a, b) => parseInt(a.shelf || "0") - parseInt(b.shelf || "0"));
                });
            });
        });

        return sectors;
    }, [locations]);

    // Encontrar qué columna está activa para el inspector lateral
    const activeShelves = useMemo(() => {
        if (!activeColumn) return [];
        const [s, r, c] = activeColumn.split("|");
        return mapData[s]?.[r]?.[c] || [];
    }, [activeColumn, mapData]);

    if (locations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/20 border-border/50">
                <Grid2x2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <h3 className="font-semibold text-lg">El mapa está vacío</h3>
                <p className="text-sm text-muted-foreground">Creá estanterías para ver la representación visual 2D del depósito.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Visual Grid Area (2/3 width) */}
            <div className="flex-1 w-full bg-muted/10 border border-border/60 rounded-xl p-4 md:p-6 overflow-x-auto">
                <div className="min-w-[600px] flex flex-col gap-8">
                    {Object.entries(mapData).sort().map(([sectorName, rows]) => (
                        <div key={sectorName} className="space-y-4">
                            <h3 className="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b pb-2">{sectorName}</h3>

                            <div className="flex flex-col gap-6">
                                {Object.entries(rows).sort().map(([rowName, columns]) => (
                                    <div key={rowName} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">{rowName}</span>

                                            {/* El Rack de la Fila */}
                                            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg border border-border/50">
                                                {Object.entries(columns).sort().map(([colName, shelves]) => {
                                                    // Calculamos el color de "vista desde arriba" basado en qué tan llena está la columna
                                                    const total = shelves.length;
                                                    const ocupados = shelves.filter(s => s.productId).length;
                                                    const colId = `${sectorName}|${rowName}|${colName}`;
                                                    const isActive = activeColumn === colId;

                                                    let bgClass = "bg-muted hover:bg-muted-foreground/20 border-transparent text-muted-foreground"; // Vacío
                                                    if (ocupados > 0 && ocupados < total) bgClass = "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-900 border"; // Parcial
                                                    if (ocupados === total) bgClass = "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-500 border-emerald-200 dark:border-emerald-900 border"; // Lleno

                                                    return (
                                                        <button
                                                            key={colName}
                                                            onClick={() => setActiveColumn(colId)}
                                                            className={cn(
                                                                "relative flex flex-col items-center justify-center w-10 h-10 rounded-md font-mono text-[11px] font-bold transition-all shadow-sm ring-offset-background",
                                                                bgClass,
                                                                isActive && "ring-2 ring-ring ring-offset-2 scale-110 z-10 shadow-md"
                                                            )}
                                                            title={`Columna ${colName} (${ocupados}/${total} ocupados)`}
                                                        >
                                                            {colName}
                                                            {/* Mini barrita de ocupación debajo del número */}
                                                            <div className="absolute bottom-1 w-6 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                                                <div className="h-full bg-current opacity-50" style={{ width: `${(ocupados / total) * 100}%` }} />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Shelf Inspector Sidebar (1/3 width) */}
            <div className={cn(
                "w-full md:w-80 shrink-0 border border-border/60 bg-card rounded-xl overflow-hidden transition-opacity shadow-sm",
                !activeColumn && "opacity-50 pointer-events-none"
            )}>
                <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">
                        {activeColumn ? `Inspector Columna ${activeColumn.split("|")[2]}` : "Seleccioná una columna"}
                    </h4>
                </div>

                <div className="p-4 flex flex-col gap-3 max-h-[600px] overflow-y-auto">
                    {!activeColumn ? (
                        <p className="text-xs text-muted-foreground text-center py-8">
                            Hacé clic en cualquier cuadrado del mapa visual para ver los estantes (niveles de altura) que contiene esa columna.
                        </p>
                    ) : (
                        <div className="flex flex-col-reverse gap-2">
                            {/* Mostramos reverse para que el estante 1 (piso) quede abajo */}
                            {activeShelves.map((shelf) => {
                                const vacio = !shelf.productId;

                                return (
                                    <div
                                        key={shelf.id}
                                        className={cn(
                                            "group relative flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                                            vacio
                                                ? "bg-muted/30 border-dashed border-border hover:border-primary/50"
                                                : "bg-card border-border shadow-sm hover:border-primary/50"
                                        )}
                                        onClick={() => onSelectCell(shelf)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Nivel indicator */}
                                            <div className="flex flex-col items-center justify-center w-8 h-8 rounded bg-muted text-xs font-bold shrink-0">
                                                N{shelf.shelf}
                                            </div>

                                            {/* Contenido */}
                                            <div className="flex flex-col min-w-0 pr-2">
                                                {vacio ? (
                                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Disponible</span>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-semibold truncate leading-tight">{shelf.productName}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                                            {shelf.productCode}
                                                            {shelf.isPrimary && <span className="bg-primary/10 text-primary px-1 rounded font-bold uppercase">P</span>}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stock Badge */}
                                        {!vacio && (
                                            <div className="flex shrink-0 items-center justify-center bg-foreground text-background font-mono font-bold text-xs rounded-full min-w-[32px] h-6 px-2">
                                                {shelf.productStock}
                                            </div>
                                        )}

                                        {/* Hover Edit Overlay */}
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg border border-primary text-xs font-semibold text-primary">
                                            Editar Asignación
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

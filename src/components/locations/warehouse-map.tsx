"use client";

import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { LocationRow } from "@/lib/db/queries/locations";
import { Package, Grid2x2, ChevronRight, CheckCircle2, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface WarehouseMapProps {
    locations: LocationRow[];
    onSelectCell: (loc: LocationRow) => void;
}

// ── Sortable Sector Component ──
function SortableSector({
    sectorName,
    description,
    rows,
    activeColumn,
    setActiveColumn,
}: {
    sectorName: string;
    description?: string;
    rows: Record<string, Record<string, LocationRow[]>>;
    activeColumn: string | null;
    setActiveColumn: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sectorName });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        opacity: isDragging ? 0.9 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("space-y-4 bg-background/50 p-4 rounded-xl border border-border/40 shadow-sm", isDragging && "shadow-lg border-primary/50 bg-background")}>
            <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground/50 hover:text-foreground transition-colors touch-none">
                        <GripHorizontal className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{sectorName}</h3>
                        {description && <span className="text-[10px] text-muted-foreground/70 font-medium italic">{description}</span>}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {Object.entries(rows).sort().map(([rowName, columns]) => (
                    <div key={rowName} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">{rowName}</span>

                            {/* El Rack de la Fila */}
                            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg border border-border/50">
                                {Object.entries(columns).sort().map(([colName, shelves]) => {
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
    );
}

// ── Main Map Component ──
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

    // Track sector configuration
    const [sectorOrder, setSectorOrder] = useState<string[]>([]);
    const [sectorDescriptions, setSectorDescriptions] = useState<Record<string, string>>({});

    // Initial fetch of the layout arrangement from the API
    useEffect(() => {
        const fetchLayout = async () => {
            const staticSectors = Object.keys(mapData).sort(); // default alphabetical
            try {
                // If the mapData has sectors, lets ask the DB for their specific configured layout order
                if (staticSectors.length > 0) {
                    const res = await fetch('/api/locations/layout/read'); // We will build this read endpoint next
                    if (res.ok) {
                        const layoutData = await res.json();
                        if (layoutData && layoutData.layouts && layoutData.layouts.length > 0) {
                            // Map the DB layout, but importantly preserve any NEW sectors that aren't in the DB yet at the end
                            const dbOrder = layoutData.layouts.map((l: any) => l.sectorName);
                            // Store descriptions
                            const descMap: Record<string, string> = {};
                            layoutData.layouts.forEach((l: any) => {
                                if (l.description) descMap[l.sectorName] = l.description;
                            });
                            setSectorDescriptions(descMap);

                            // Only keep sectors that still exist in mapData
                            const validDbOrder = dbOrder.filter((s: string) => staticSectors.includes(s));
                            // Append newly created sectors that have no DB layout yet
                            const unmappedSectors = staticSectors.filter(s => !validDbOrder.includes(s));

                            setSectorOrder([...validDbOrder, ...unmappedSectors]);
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load layout:", error);
            }
            // fallback to default
            setSectorOrder(staticSectors);
        };

        fetchLayout();
    }, [mapData]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSectorOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Fire and forget server persistence
                const payload = newOrder.map((sectorName, index) => ({
                    sectorName,
                    orderIndex: index,
                    description: sectorDescriptions[sectorName] || null
                }));
                fetch('/api/locations/layout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(err => console.error("Silently failed to save layout", err));

                return newOrder;
            });
        }
    };

    const handleUpdateDescription = (sectorName: string, desc: string) => {
        const newDescs = { ...sectorDescriptions, [sectorName]: desc };
        setSectorDescriptions(newDescs);

        // Persist to DB
        const payload = sectorOrder.map((s, idx) => ({
            sectorName: s,
            orderIndex: idx,
            description: s === sectorName ? desc : (sectorDescriptions[s] || null)
        }));

        fetch('/api/locations/layout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Failed to save description", err));
    };



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
            <div className="flex-1 w-full bg-muted/10 border border-border/60 rounded-xl p-4 md:p-6 overflow-x-auto relative min-h-[500px]">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={sectorOrder}
                        strategy={rectSortingStrategy}
                    >
                        <div className="min-w-[600px] flex flex-wrap items-start gap-8">
                            {sectorOrder.map((sectorName) => {
                                const rows = mapData[sectorName];
                                if (!rows) return null;
                                return (
                                    <div key={sectorName} className="flex-shrink-0 min-w-[300px]">
                                        <SortableSector
                                            sectorName={sectorName}
                                            description={sectorDescriptions[sectorName]}
                                            rows={rows}
                                            activeColumn={activeColumn}
                                            setActiveColumn={setActiveColumn}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Combined Sidebar: Inspector + Glossary */}
            <div className="w-full md:w-80 shrink-0 flex flex-col gap-6">
                {/* 1. Inspector Panel */}
                <div className={cn(
                    "border border-border/60 bg-card rounded-xl overflow-hidden shadow-sm transition-all",
                    !activeColumn && "opacity-60 scale-[0.98] blur-[0.5px]"
                )}>
                    <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold text-sm">
                            {activeColumn ? `Inspector Columna ${activeColumn.split("|")[2]}` : "Seleccioná una columna"}
                        </h4>
                    </div>

                    <div className="p-4 flex flex-col gap-3 max-h-[350px] overflow-y-auto">
                        {!activeColumn ? (
                            <p className="text-[11px] text-muted-foreground text-center py-6">
                                Hacé clic en cualquier cuadrado del mapa visual para ver los estantes (niveles de altura).
                            </p>
                        ) : (
                            <div className="flex flex-col-reverse gap-2">
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
                                                <div className="flex flex-col items-center justify-center w-8 h-8 rounded bg-muted text-xs font-bold shrink-0">
                                                    N{shelf.shelf}
                                                </div>
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

                                            {!vacio && (
                                                <div className="flex shrink-0 items-center justify-center bg-foreground text-background font-mono font-bold text-xs rounded-full min-w-[32px] h-6 px-2">
                                                    {shelf.productStock}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Glossary Panel */}
                <div className="border border-border/60 bg-card rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-muted px-4 py-3 border-b flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold text-sm">Glosario de Sectores</h4>
                    </div>
                    <div className="p-4 flex flex-col gap-4 max-h-[400px] overflow-y-auto">
                        {sectorOrder.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-4">No hay sectores registrados.</p>
                        ) : (
                            <div className="space-y-3">
                                {sectorOrder.map((s) => (
                                    <div key={s} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{s}</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Descripción (ej: Cielo Abierto)"
                                            defaultValue={sectorDescriptions[s] || ""}
                                            onBlur={(e) => handleUpdateDescription(s, e.target.value)}
                                            className="w-full text-xs bg-transparent border-b border-border focus:border-primary outline-none py-1 transition-colors"
                                        />
                                    </div>
                                ))}
                                <p className="text-[10px] text-muted-foreground italic pt-2 border-t mt-4">
                                    * Los cambios se guardan automáticamente al perder el foco del campo.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

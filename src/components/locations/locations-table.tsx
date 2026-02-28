"use client";

import { useState, useMemo } from "react";
import { Plus, ListFilter, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { LocationRow } from "@/lib/db/queries/locations";

interface LocationsTableProps {
    locations: LocationRow[];
    onSelect: (loc: LocationRow) => void;
    onCreate: () => void;
}

export function LocationsTable({ locations, onSelect, onCreate }: LocationsTableProps) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "empty" | "occupied">("all");

    const filtered = useMemo(() => {
        return locations.filter((loc) => {
            // Filtro tipo
            if (typeFilter === "empty" && loc.productId) return false;
            if (typeFilter === "occupied" && !loc.productId) return false;

            // Filtro texto (busca por ubicacion Fisica o por Producto)
            if (search) {
                const q = search.toLowerCase();
                const fisica = `${loc.sector}-${loc.row}-${loc.column}-${loc.shelf}`.toLowerCase();
                const prod = `${loc.productCode || ""} ${loc.productName || ""}`.toLowerCase();

                return fisica.includes(q) || prod.includes(q);
            }
            return true;
        });
    }, [locations, search, typeFilter]);

    const FILTERS = [
        { key: "all", label: "Todas" },
        { key: "empty", label: "Disponibles" },
        { key: "occupied", label: "Ocupadas" },
    ] as const;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar ej: FER-A-01 o Martillo..."
                        className="h-8 w-full rounded-md border border-input bg-background pl-3 pr-8 text-sm placeholder:text-muted-foreground/60 transition-colors"
                    />
                    <ListFilter className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground/60" />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-muted/40 p-0.5 rounded-md border border-border/50">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setTypeFilter(f.key)}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-sm transition-all",
                                    typeFilter === f.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <Button size="sm" className="h-8 text-xs" onClick={onCreate}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Estanterías
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="py-2.5 w-[140px] text-[11px] font-semibold tracking-wider text-muted-foreground/70">Coordenada</TableHead>
                            <TableHead className="py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70">Contenido / Producto</TableHead>
                            <TableHead className="py-2.5 w-[100px] text-right text-[11px] font-semibold tracking-wider text-muted-foreground/70">Stock</TableHead>
                            <TableHead className="py-2.5 w-[80px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                    No se encontraron ubicaciones físicas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((loc) => {
                                const disponible = !loc.productId;
                                const fisica = `${loc.sector}-${loc.row}-${loc.column}-${loc.shelf}`;

                                return (
                                    <TableRow key={loc.id} className="hover:bg-muted/30 cursor-pointer group" onClick={() => onSelect(loc)}>
                                        <TableCell className="py-2.5 font-mono text-xs font-semibold">
                                            {fisica}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                            {disponible ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                    DISPONIBLE
                                                </span>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{loc.productName}</span>
                                                    <span className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                                                        {loc.productCode}
                                                        {loc.isPrimary && (
                                                            <span className="inline-block px-1.5 bg-primary/10 text-primary rounded-[3px] text-[9px] uppercase tracking-wider font-bold">Pick Face</span>
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2.5 text-right font-mono text-sm font-bold">
                                            {disponible ? <span className="text-muted-foreground/30">—</span> : loc.productStock}
                                        </TableCell>
                                        <TableCell className="py-2.5 text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

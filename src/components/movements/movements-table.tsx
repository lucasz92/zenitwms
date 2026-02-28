"use client";

import { useState, useMemo } from "react";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ArrowLeftRight,
    SlidersHorizontal,
    Plus,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Download,
} from "lucide-react";
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
import { RegisterMovementModal } from "./register-movement-modal";
import type { MovementRow } from "@/lib/db/queries/movements";
import { exportTableToPDF } from "@/lib/utils/pdf-generator";

const PAGE_SIZE = 15;

const TYPE_CONFIG = {
    entry: {
        label: "Entrada",
        icon: ArrowDownToLine,
        className: "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30",
        sign: "+",
        signClass: "text-emerald-600",
    },
    exit: {
        label: "Salida",
        icon: ArrowUpFromLine,
        className: "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-950/30",
        sign: "−",
        signClass: "text-red-600",
    },
    adjustment: {
        label: "Ajuste",
        icon: SlidersHorizontal,
        className: "text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30",
        sign: "=",
        signClass: "text-blue-600",
    },
    transfer: {
        label: "Transferencia",
        icon: ArrowLeftRight,
        className: "text-orange-700 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-950/30",
        sign: "↔",
        signClass: "text-orange-600",
    },
} as const;

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

interface MovementsTableProps {
    movements: MovementRow[];
    products: { id: string; code: string; name: string; stock: number }[];
}

export function MovementsTable({ movements, products }: MovementsTableProps) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "entry" | "exit" | "adjustment" | "transfer">("all");
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);

    const filtered = useMemo(() => {
        return movements.filter((m) => {
            if (typeFilter !== "all" && m.type !== typeFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    m.productCode?.toLowerCase().includes(q) ||
                    m.productName?.toLowerCase().includes(q) ||
                    m.notes?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [movements, search, typeFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const FILTERS = [
        { key: "all", label: "Todos" },
        { key: "entry", label: "Entradas" },
        { key: "exit", label: "Salidas" },
        { key: "adjustment", label: "Ajustes" },
        { key: "transfer", label: "Transferencias" },
    ] as const;

    const handleExportPDF = () => {
        const head = [["FECHA", "CÓDIGO", "PRODUCTO", "TIPO", "CANT.", "NOTAS", "USUARIO"]];
        const body = filtered.map(m => {
            const cfg = TYPE_CONFIG[m.type as keyof typeof TYPE_CONFIG];
            return [
                formatDate(m.createdAt),
                m.productCode || "—",
                m.productName || "—",
                cfg?.label || m.type,
                `${cfg?.sign || ""}${m.quantity}`,
                m.notes || "—",
                m.userName || "Sistema"
            ];
        });

        const filterLabel = FILTERS.find(f => f.key === typeFilter)?.label || "Todos";

        exportTableToPDF({
            filename: "Movimientos_Zenit",
            title: "Reporte de Movimientos",
            subtitle: `Filtro: ${filterLabel} ${search ? `| Búsqueda: "${search}"` : ""}`,
            head,
            body
        });
    };

    return (
        <>
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-xs">
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Buscar producto..."
                            className="h-8 w-full rounded-md border border-input bg-background pl-3 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => { setTypeFilter(f.key); setPage(1); }}
                                className={cn(
                                    "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                                    typeFilter === f.key
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportPDF}>
                            <Download className="h-3.5 w-3.5" />
                            Ver PDF
                        </Button>
                        <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => setModalOpen(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Registrar
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 py-2.5 w-[130px]">Fecha</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 py-2.5">Producto</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 py-2.5 w-[120px]">Tipo</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 py-2.5 w-[80px] text-right">Cant.</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 py-2.5 hidden md:table-cell">Notas</TableHead>
                                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 py-2.5 hidden lg:table-cell w-[120px]">Usuario</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <ArrowLeftRight className="h-8 w-8 opacity-30" />
                                            <p className="text-sm">
                                                {search || typeFilter !== "all"
                                                    ? "No hay movimientos con ese filtro."
                                                    : "No hay movimientos registrados aún."}
                                            </p>
                                            {!search && typeFilter === "all" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-1 text-xs"
                                                    onClick={() => setModalOpen(true)}
                                                >
                                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                    Registrar primer movimiento
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((mov) => {
                                    const cfg = TYPE_CONFIG[mov.type as keyof typeof TYPE_CONFIG];
                                    const Icon = cfg?.icon ?? ArrowLeftRight;
                                    return (
                                        <TableRow key={mov.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="py-2.5 text-xs text-muted-foreground font-mono">
                                                {formatDate(mov.createdAt)}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-medium">{mov.productName}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{mov.productCode}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                                    cfg?.className
                                                )}>
                                                    <Icon className="h-3 w-3" />
                                                    {cfg?.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-right">
                                                <span className={cn("font-mono font-semibold text-sm", cfg?.signClass)}>
                                                    {cfg?.sign}{mov.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5 hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                                                {mov.notes ?? <span className="opacity-30">—</span>}
                                            </TableCell>
                                            <TableCell className="py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                                                {mov.userName ?? "Sistema"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {filtered.length > 0 && (
                        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5">
                            <p className="text-xs text-muted-foreground">
                                {filtered.length === movements.length
                                    ? `${movements.length} movimientos`
                                    : `${filtered.length} de ${movements.length}`}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-xs text-muted-foreground px-1">{page} / {totalPages}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <RegisterMovementModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                products={products}
            />
        </>
    );
}

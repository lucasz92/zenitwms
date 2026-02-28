"use client";

import { useState, useMemo } from "react";
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Pencil,
    Trash2,
    MapPin,
    Package,
    Download,
    FileSpreadsheet,
    FileText,
    FileJson,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { StockBadge } from "./stock-badge";
import { ProductModal } from "./product-modal";
import { DeleteProductDialog } from "./delete-product-dialog";
import { getStockStatus, UNIT_LABELS, type UnitType } from "@/types/product";
import type { ProductRow } from "@/lib/db/queries/products";
import { exportTableToPDF } from "@/lib/utils/pdf-generator";
import { exportTableToExcel, exportTableToCSV } from "@/lib/utils/export-data";

const PAGE_SIZE = 15;

type SortKey = "code" | "name" | "stock" | "updated_at";
type SortDir = "asc" | "desc";

interface InventoryTableProps {
    products: ProductRow[];
}

export function InventoryTable({ products }: InventoryTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "low" | "critical" | "out">("all");
    const [sortKey, setSortKey] = useState<SortKey>("code");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(1);

    // Modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
    const [deleteProduct, setDeleteProduct] = useState<ProductRow | null>(null);

    // Filter + sort
    const filtered = useMemo(() => {
        let rows = products.filter((p) => {
            const q = search.toLowerCase();
            if (q && !p.code.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) {
                return false;
            }
            if (statusFilter !== "all" && getStockStatus(p.stock, p.min_stock) !== statusFilter) {
                return false;
            }
            return true;
        });

        rows = rows.sort((a, b) => {
            let cmp = 0;
            if (sortKey === "code") cmp = a.code.localeCompare(b.code);
            else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
            else if (sortKey === "stock") cmp = a.stock - b.stock;
            else if (sortKey === "updated_at") cmp = a.updated_at.localeCompare(b.updated_at);

            return sortDir === "asc" ? cmp : -cmp;
        });

        return rows;
    }, [products, search, statusFilter, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
        setPage(1);
    };

    const handleSearch = (v: string) => { setSearch(v); setPage(1); };
    const handleFilter = (v: typeof statusFilter) => { setStatusFilter(v); setPage(1); };

    const FILTER_LABELS = {
        all: "Todos",
        low: "Stock bajo",
        critical: "Crítico",
        out: "Sin stock",
    };

    const prepareExportData = () => {
        const head = ["CÓDIGO", "PRODUCTO", "STOCK", "MIN", "UNIDAD", "UBICACIÓN", "PRECIO"];
        const body = filtered.map(p => [
            p.code,
            p.name,
            p.stock.toString(),
            p.min_stock.toString(),
            UNIT_LABELS[p.unit_type],
            p.location || "Sin ubicar",
            p.price != null ? `$${p.price.toLocaleString("es-AR")}` : "—"
        ]);
        return { head, body };
    };

    const handleExportPDF = () => {
        const { head, body } = prepareExportData();
        exportTableToPDF({
            filename: "Inventario_Zenit",
            title: "Reporte de Inventario",
            subtitle: `Estado de stock - Filtro: ${FILTER_LABELS[statusFilter]}`,
            head: [head],
            body
        });
    };

    const handleExportExcel = () => {
        const { head, body } = prepareExportData();
        // Agregamos el header como primera fila para Excel/CSV
        exportTableToExcel([head, ...body], "Inventario_Zenit");
    };

    const handleExportCSV = () => {
        const { head, body } = prepareExportData();
        exportTableToCSV([head, ...body], "Inventario_Zenit");
    };

    const SortButton = ({ k, label }: { k: SortKey; label: string }) => (
        <button
            onClick={() => toggleSort(k)}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
            {label}
            <ArrowUpDown className={cn("h-3 w-3", sortKey === k ? "text-foreground" : "text-muted-foreground/50")} />
        </button>
    );

    // Counts for filter buttons
    const counts = useMemo(() => ({
        low: products.filter((p) => getStockStatus(p.stock, p.min_stock) === "low").length,
        critical: products.filter((p) => getStockStatus(p.stock, p.min_stock) === "critical").length,
        out: products.filter((p) => getStockStatus(p.stock, p.min_stock) === "out").length,
    }), [products]);

    return (
        <>
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Buscar por código o nombre..."
                            className={cn(
                                "h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm",
                                "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status filter pills */}
                        <div className="flex items-center gap-1.5">
                            {(["all", "low", "critical", "out"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => handleFilter(f)}
                                    className={cn(
                                        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                                        statusFilter === f
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                    )}
                                >
                                    {FILTER_LABELS[f]}
                                    {f !== "all" && counts[f] > 0 && (
                                        <span className="ml-1 opacity-70">({counts[f]})</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                    <Download className="h-3.5 w-3.5" />
                                    Exportar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={handleExportPDF} className="text-xs cursor-pointer">
                                    <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    Descargar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportExcel} className="text-xs cursor-pointer">
                                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    Descargar Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportCSV} className="text-xs cursor-pointer">
                                    <FileJson className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    Descargar CSV
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="w-10 text-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2.5">#</TableHead>
                                <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2.5 w-[100px]">
                                    <SortButton k="code" label="Código" />
                                </TableHead>
                                <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2.5">
                                    <SortButton k="name" label="Producto" />
                                </TableHead>
                                <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2.5 w-[90px] text-right">
                                    <SortButton k="stock" label="Stock" />
                                </TableHead>
                                <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2.5 hidden md:table-cell">Unidad</TableHead>
                                <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2.5 hidden lg:table-cell">Ubicación</TableHead>
                                <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-2.5 hidden xl:table-cell text-right">Precio</TableHead>
                                <TableHead className="w-8" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Package className="h-8 w-8 opacity-30" />
                                            <p className="text-sm">
                                                {search || statusFilter !== "all"
                                                    ? "No se encontraron productos con ese filtro."
                                                    : "No hay productos registrados aún."}
                                            </p>
                                            {!search && statusFilter === "all" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-1 text-xs"
                                                    onClick={() => setCreateOpen(true)}
                                                >
                                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                    Agregar primer producto
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((product, idx) => {
                                    const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                                    const status = getStockStatus(product.stock, product.min_stock);
                                    return (
                                        <TableRow
                                            key={product.id}
                                            className="group hover:bg-muted/30 transition-colors"
                                        >
                                            <TableCell className="text-center text-xs text-muted-foreground/50 py-2.5">
                                                {rowNum}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <span className="font-mono text-xs font-medium text-foreground bg-muted/60 rounded px-1.5 py-0.5">
                                                    {product.code}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-medium text-foreground leading-tight">
                                                        {product.name}
                                                    </span>
                                                    {product.description && (
                                                        <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                                                            {product.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-right">
                                                <StockBadge stock={product.stock} minStock={product.min_stock} />
                                            </TableCell>
                                            <TableCell className="py-2.5 hidden md:table-cell">
                                                <span className="text-xs text-muted-foreground">
                                                    {UNIT_LABELS[product.unit_type]}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5 hidden lg:table-cell">
                                                {product.location ? (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        <span className="font-mono">{product.location}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/40 italic">Sin ubicar</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2.5 hidden xl:table-cell text-right">
                                                <span className="text-sm text-muted-foreground">
                                                    {product.price != null
                                                        ? `$${product.price.toLocaleString("es-AR")}`
                                                        : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2.5 pr-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                            <span className="sr-only">Acciones</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem
                                                            className="text-xs gap-2"
                                                            onClick={() => setEditProduct(product)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2">
                                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                            Ver ubicación
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-xs gap-2 text-destructive focus:text-destructive"
                                                            onClick={() => setDeleteProduct(product)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination footer */}
                    {filtered.length > 0 && (
                        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5">
                            <p className="text-xs text-muted-foreground">
                                {filtered.length === products.length
                                    ? `${products.length} productos`
                                    : `${filtered.length} de ${products.length} productos`}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-xs text-muted-foreground px-1">
                                    {page} / {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ProductModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                product={null}
            />
            <ProductModal
                open={!!editProduct}
                onClose={() => setEditProduct(null)}
                product={editProduct}
            />
            <DeleteProductDialog
                open={!!deleteProduct}
                onClose={() => setDeleteProduct(null)}
                product={deleteProduct}
            />
        </>
    );
}

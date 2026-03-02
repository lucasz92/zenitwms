"use client";

import { useState, useMemo, CSSProperties } from "react";
import {
    Plus, Search, Download, FileSpreadsheet, FileText, FileJson, ArrowUpDown,
    ChevronLeft, ChevronRight, CopyPlus, AlertCircle, Printer, FileText as FileTextIcon,
    ImagePlus, MoreHorizontal, Pencil, Trash2, Package, GripHorizontal
} from "lucide-react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    FilterFn,
} from "@tanstack/react-table";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger
} from "@/components/ui/context-menu";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { StockBadge } from "./stock-badge";
import { ProductModal } from "./product-modal";
import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductDetailsModal } from "./product-details-modal";
import { PrintModal } from "./print-modal";
import { PrintWarningModal } from "./print-warning-modal";
import { ReportAlertModal } from "./report-alert-modal";
import { ProductImageModal } from "./product-image-modal";
import { getStockStatus, UNIT_LABELS } from "@/types/product";
import type { ProductRow } from "@/lib/db/queries/products";
import { exportTableToPDF } from "@/lib/utils/pdf-generator";
import { exportTableToExcel, exportTableToCSV } from "@/lib/utils/export-data";

type ColumnMeta = {
    className?: string; // Passed to both TH and TD to hide on responsive views
};

const PAGE_SIZE = 15;

const DraggableTableHeader = ({ header }: { header: any }) => {
    const { attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
        id: header.column.id,
    });

    const isDraggable = header.column.id !== "actions" && header.column.id !== "rowNum";

    // We add minWidth matching the size to ensure cells render well
    const style: CSSProperties = {
        width: header.getSize(),
        minWidth: header.getSize(),
        position: "relative",
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 2 : 1,
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? "none" : "width transform 0.2s ease",
        whiteSpace: "nowrap"
    };

    return (
        <TableHead
            ref={isDraggable ? setNodeRef : null}
            style={style}
            className={cn(
                "group hover:bg-muted/30 transition-colors border-r border-border/40 last:border-r-0 py-2.5 px-3 max-w-full overflow-hidden truncate",
                header.column.columnDef.meta?.className
            )}
        >
            <div className="flex items-center gap-2 justify-between w-full h-full">
                <div className="flex-1 flex items-center gap-1.5 overflow-hidden text-[11px] font-bold text-muted-foreground/80 tracking-wider" style={{ fontFamily: 'var(--font-jetbrains-mono, "JetBrains Mono"), "JetBrains Mono Fallback"' }}>
                    <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                    {header.column.getCanSort() && (
                        <div
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                                "cursor-pointer p-1 rounded hover:bg-muted transition-colors shrink-0",
                                header.column.getIsSorted() ? "text-foreground bg-muted" : "text-muted-foreground/40 hover:text-foreground"
                            )}
                        >
                            <ArrowUpDown className="h-3 w-3" />
                        </div>
                    )}
                </div>
                {isDraggable && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-muted-foreground/50 hover:text-foreground shrink-0"
                    >
                        <GripHorizontal className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {/* Resizer Handle */}
            {header.column.getCanResize() && (
                <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={cn(
                        "absolute right-0 top-0 h-full w-[5px] cursor-col-resize user-select-none touch-none bg-border/40 hover:bg-primary/50 transition-colors z-10",
                        header.column.getIsResizing() ? "bg-primary" : ""
                    )}
                />
            )}
        </TableHead>
    );
};

interface InventoryTableProps {
    products: ProductRow[];
}

export function InventoryTable({ products }: InventoryTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "low" | "critical" | "out">("all");

    // Modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
    const [deleteProduct, setDeleteProduct] = useState<ProductRow | null>(null);
    const [detailsProduct, setDetailsProduct] = useState<ProductRow | null>(null);
    const [printProduct, setPrintProduct] = useState<ProductRow | null>(null);
    const [warningPrintProduct, setWarningPrintProduct] = useState<ProductRow | null>(null);
    const [alertProduct, setAlertProduct] = useState<ProductRow | null>(null);
    const [imageProduct, setImageProduct] = useState<ProductRow | null>(null);

    // Apply manual status filtering outside of tanstack to respect the pill filters accurately
    const filteredProducts = useMemo(() => {
        if (statusFilter === "all") return products;
        return products.filter((p) => getStockStatus(p.stock, p.min_stock) === statusFilter);
    }, [products, statusFilter]);

    // TanStack Definitions
    const columns = useMemo<ColumnDef<ProductRow, any>[]>(() => [
        {
            id: "rowNum",
            header: "#",
            size: 50,
            enableSorting: false,
            enableResizing: false,
            cell: (info) => (
                <div className="text-center text-xs text-muted-foreground/50">
                    {(info.table.getState().pagination.pageIndex * info.table.getState().pagination.pageSize) + info.row.index + 1}
                </div>
            ),
            meta: { className: "text-center w-[50px] min-w-[50px]" as any }
        },
        {
            accessorKey: "code",
            id: "code",
            header: "Código",
            size: 110,
            cell: (info) => (
                <div className="flex flex-col gap-1 items-start max-w-full overflow-hidden">
                    <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 border border-border/40 rounded px-1.5 py-0.5 truncate max-w-full">
                        {info.getValue() as string}
                    </span>
                    <div className="md:hidden flex flex-wrap gap-1 mt-0.5 max-w-full">
                        {info.row.original.sector && <span className="text-[10px] text-muted-foreground bg-muted/30 px-1 rounded truncate max-w-full">{info.row.original.sector}</span>}
                    </div>
                </div>
            )
        },
        {
            accessorKey: "name",
            id: "name",
            header: "Producto",
            size: 280,
            cell: (info) => {
                const product = info.row.original;
                return (
                    <div className="flex flex-col gap-0.5 max-w-full overflow-hidden">
                        <span className="text-sm font-semibold text-foreground leading-tight truncate w-full">
                            {product.name}
                        </span>
                        {product.description && (
                            <span className="text-[11px] text-muted-foreground truncate w-full opacity-80">
                                {product.description}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: "fila",
            id: "fila",
            header: "Fila",
            size: 60,
            meta: { className: "hidden lg:table-cell" as any },
            cell: (info) => <div className="text-center text-xs font-mono font-medium truncate">{info.getValue() as string || "-"}</div>
        },
        {
            accessorKey: "columna",
            id: "columna",
            header: "Col.",
            size: 60,
            meta: { className: "hidden lg:table-cell" as any },
            cell: (info) => <div className="text-center text-xs font-mono font-medium truncate">{info.getValue() as string || "-"}</div>
        },
        {
            accessorKey: "estante",
            id: "estante",
            header: "Estante",
            size: 70,
            meta: { className: "hidden xl:table-cell" as any },
            cell: (info) => <div className="text-center text-xs font-mono truncate">{info.getValue() as string || "-"}</div>
        },
        {
            accessorKey: "posicion",
            id: "posicion",
            header: "Pos.",
            size: 70,
            meta: { className: "hidden xl:table-cell" as any },
            cell: (info) => <div className="text-center text-xs font-mono truncate">{info.getValue() as string || "-"}</div>
        },
        {
            accessorKey: "sector",
            id: "sector",
            header: "Sector",
            size: 90,
            meta: { className: "hidden md:table-cell" as any },
            cell: (info) => (
                <div className="flex justify-start">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-sm shadow-sm truncate max-w-[90px]">
                        {info.getValue() as string || "-"}
                    </span>
                </div>
            )
        },
        {
            accessorKey: "stock",
            id: "stock",
            header: "Stock",
            size: 100,
            cell: (info) => {
                const product = info.row.original;
                return (
                    <div className="flex flex-col items-end gap-1 overflow-hidden pr-2">
                        <StockBadge stock={product.stock} minStock={product.min_stock} />
                        <div className="text-[10px] text-muted-foreground font-medium truncate w-full text-right">{UNIT_LABELS[product.unit_type]}</div>
                    </div>
                )
            },
            meta: { className: "text-right" as any }
        },
        {
            accessorKey: "price",
            id: "price",
            header: "Precio",
            size: 100,
            meta: { className: "hidden xl:table-cell text-right" as any },
            cell: (info) => {
                const val = info.getValue() as number | null;
                return <div className="text-right text-sm font-medium text-muted-foreground truncate w-full pr-2">{val != null ? `$${val.toLocaleString("es-AR")}` : "—"}</div>;
            }
        },
        {
            id: "actions",
            header: "",
            size: 50,
            enableSorting: false,
            enableResizing: false,
            meta: { className: "w-[50px] min-w-[50px] text-center" as any },
            cell: (info) => {
                const product = info.row.original;
                return (
                    <div className="dropdown-trigger-area flex justify-center w-full">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Acciones</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => setDetailsProduct(product)}>
                                    <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground" /> Ver detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => setImageProduct(product)}>
                                    <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" /> Ver / Cambiar foto
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => setEditProduct(product)}>
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Editar producto
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => setPrintProduct(product)}>
                                    <Printer className="h-3.5 w-3.5 text-muted-foreground" /> Imprimir etiqueta
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => setWarningPrintProduct(product)}>
                                    <CopyPlus className="h-3.5 w-3.5 text-orange-500/80" /> Ubicación doble
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-xs gap-2 text-destructive focus:text-destructive" onClick={() => setAlertProduct(product)}>
                                    <AlertCircle className="h-3.5 w-3.5" /> Reportar problema
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteProduct(product)}>
                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            }
        }
    ], []);

    const [columnOrder, setColumnOrder] = useState<string[]>(columns.map((c) => c.id as string));
    const [columnSizing, setColumnSizing] = useState({});
    const [sorting, setSorting] = useState<SortingState>([{ id: "code", desc: false }]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

    // Custom global filter function referencing code & name specifically
    const globalFilterFn: FilterFn<ProductRow> = (row, columnId, filterValue) => {
        const q = (filterValue as string).toLowerCase();
        const c = row.original.code.toLowerCase();
        const n = row.original.name.toLowerCase();
        return c.includes(q) || n.includes(q);
    };

    const table = useReactTable({
        data: filteredProducts,
        columns,
        state: {
            sorting,
            globalFilter: search,
            columnOrder,
            columnSizing,
            pagination,
        },
        enableColumnResizing: true,
        columnResizeMode: "onChange",
        onSortingChange: setSorting,
        onGlobalFilterChange: setSearch,
        globalFilterFn,
        onColumnOrderChange: setColumnOrder,
        onColumnSizingChange: setColumnSizing,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // Sensors for Dnd-Kit columns
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setColumnOrder((order) => {
                const oldIndex = order.indexOf(active.id as string);
                const newIndex = order.indexOf(over.id as string);
                return arrayMove(order, oldIndex, newIndex);
            });
        }
    };

    // Exports & Counters
    const FILTER_LABELS = { all: "Todos", low: "Stock bajo", critical: "Crítico", out: "Sin stock" };
    const prepareExportData = () => {
        const head = ["CÓDIGO", "PRODUCTO", "FILA", "COLUMNA", "ESTANTE", "POSICIÓN", "SECTOR", "STOCK", "MIN", "UNIDAD", "PRECIO"];
        const rowsToExport = table.getFilteredRowModel().rows;
        const body = rowsToExport.map(r => {
            const p = r.original;
            return [
                p.code, p.name, p.fila || "-", p.columna || "-", p.estante || "-",
                p.posicion || "-", p.sector || "-", p.stock.toString(), p.min_stock.toString(),
                UNIT_LABELS[p.unit_type], p.location || "Sin ubicar", p.price != null ? `$${p.price.toLocaleString("es-AR")}` : "—"
            ];
        });
        return { head, body };
    };
    const handleExportPDF = () => {
        const { head, body } = prepareExportData();
        exportTableToPDF({ filename: "Inventario_Zenit", title: "Reporte de Inventario", subtitle: `Filtro: ${FILTER_LABELS[statusFilter]}`, head: [head], body });
    };
    const handleExportExcel = () => {
        const { head, body } = prepareExportData();
        exportTableToExcel([head, ...body], "Inventario_Zenit");
    };
    const handleExportCSV = () => {
        const { head, body } = prepareExportData();
        exportTableToCSV([head, ...body], "Inventario_Zenit");
    };
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
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por código o nombre..."
                            className={cn(
                                "h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm",
                                "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scroll">
                            {(["all", "low", "critical", "out"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => { setStatusFilter(f); setPagination({ pageIndex: 0, pageSize: PAGE_SIZE }); }}
                                    className={cn(
                                        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all whitespace-nowrap",
                                        statusFilter === f
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                    )}
                                >
                                    {FILTER_LABELS[f]}
                                    {f !== "all" && counts[f] > 0 && <span className="ml-1 opacity-70">({counts[f]})</span>}
                                </button>
                            ))}
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs hidden xs:flex">
                                    <Download className="h-3.5 w-3.5" />
                                    Exportar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={handleExportPDF} className="text-xs cursor-pointer"><FileText className="mr-2 h-3.5 w-3.5" /> Descargar PDF</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportExcel} className="text-xs cursor-pointer"><FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Descargar Excel</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportCSV} className="text-xs cursor-pointer"><FileJson className="mr-2 h-3.5 w-3.5" /> Descargar CSV</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                        </Button>
                    </div>
                </div>

                {/* React Table Container */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                        <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden md:overflow-x-auto">
                            <Table className="min-w-full" style={{ width: table.getTotalSize() }}>
                                <TableHeader>
                                    {table.getHeaderGroups().map((hg) => (
                                        <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                                            {hg.headers.map((h) => (
                                                <DraggableTableHeader key={h.id} header={h} />
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-40 text-center">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <Package className="h-8 w-8 opacity-30" />
                                                    <p className="text-sm">
                                                        {search || statusFilter !== "all"
                                                            ? "No se encontraron productos con ese filtro."
                                                            : "No hay productos registrados aún."}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <ContextMenu key={row.id}>
                                                <ContextMenuTrigger asChild>
                                                    <TableRow
                                                        className="group hover:bg-muted/30 transition-colors md:cursor-pointer relative border-b-border/40"
                                                        onContextMenu={(e) => {
                                                            const target = e.target as HTMLElement;
                                                            if (target.closest("button") || target.closest(".dropdown-trigger-area")) e.preventDefault();
                                                        }}
                                                        onClick={(e) => {
                                                            if (window.innerWidth < 768) {
                                                                const target = e.target as HTMLElement;
                                                                if (!target.closest("button") && !target.closest(".dropdown-trigger-area")) {
                                                                    setDetailsProduct(row.original);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {row.getVisibleCells().map((cell) => (
                                                            <TableCell
                                                                key={cell.id}
                                                                style={{
                                                                    width: cell.column.getSize(),
                                                                    minWidth: cell.column.getSize(),
                                                                    maxWidth: cell.column.getSize()
                                                                }}
                                                                className={cn(
                                                                    "py-2.5 px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap",
                                                                    (cell.column.columnDef.meta as ColumnMeta)?.className
                                                                )}
                                                            >
                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent className="w-56" alignOffset={-10}>
                                                    <ContextMenuItem className="text-xs gap-2 py-2" onClick={() => setDetailsProduct(row.original)}><FileTextIcon className="h-4 w-4 mr-1" /> Ver detalles</ContextMenuItem>
                                                    <ContextMenuItem className="text-xs gap-2 py-2" onClick={() => setImageProduct(row.original)}><ImagePlus className="h-4 w-4 mr-1" /> Ver fotografía</ContextMenuItem>
                                                    <ContextMenuItem className="text-xs gap-2 py-2" onClick={() => setEditProduct(row.original)}><Pencil className="h-4 w-4 mr-1" /> Editar ficha</ContextMenuItem>
                                                    <ContextMenuItem className="text-xs gap-2 py-2" onClick={() => setPrintProduct(row.original)}><Printer className="h-4 w-4 mr-1" /> Imprimir térmica</ContextMenuItem>
                                                    <ContextMenuItem className="text-xs gap-2 py-2" onClick={() => setWarningPrintProduct(row.original)}><CopyPlus className="h-4 w-4 mr-1 text-orange-500/80" /> Doble ubicación</ContextMenuItem>
                                                    <ContextMenuSeparator />
                                                    <ContextMenuItem className="text-xs gap-2 py-2 text-destructive focus:text-destructive" onClick={() => setAlertProduct(row.original)}><AlertCircle className="h-4 w-4 mr-1" /> Reportar stock</ContextMenuItem>
                                                    <ContextMenuItem className="text-xs gap-2 py-2 text-destructive focus:text-destructive" onClick={() => setDeleteProduct(row.original)}><Trash2 className="h-4 w-4 mr-1" /> Eliminar</ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination footer */}
                            {table.getFilteredRowModel().rows.length > 0 && (
                                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {table.getFilteredRowModel().rows.length} de {products.length} productos
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground px-1 font-medium">
                                            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Modals */}
            <ProductModal open={createOpen} onClose={() => setCreateOpen(false)} product={null} />
            <ProductModal open={!!editProduct} onClose={() => setEditProduct(null)} product={editProduct} />
            <DeleteProductDialog open={!!deleteProduct} onClose={() => setDeleteProduct(null)} product={deleteProduct} />
            <ProductDetailsModal open={!!detailsProduct} onClose={() => setDetailsProduct(null)} product={detailsProduct} />
            <PrintModal open={!!printProduct} onClose={() => setPrintProduct(null)} product={printProduct} />
            <PrintWarningModal open={!!warningPrintProduct} onClose={() => setWarningPrintProduct(null)} product={warningPrintProduct} />
            <ReportAlertModal open={!!alertProduct} onClose={() => setAlertProduct(null)} product={alertProduct} />
            <ProductImageModal open={!!imageProduct} onClose={() => setImageProduct(null)} product={imageProduct} />
        </>
    );
}

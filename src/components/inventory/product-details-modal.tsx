"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, FileText, Tag, Barcode, LayoutGrid, Printer, CopyPlus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductRow } from "@/lib/db/queries/products";
import { StockBadge } from "./stock-badge";
import { UNIT_LABELS } from "@/types/product";

interface ProductDetailsModalProps {
    open: boolean;
    onClose: () => void;
    product: ProductRow | null;
    onPrint?: () => void;
    onPrintWarning?: () => void;
}

export function ProductDetailsModal({ open, onClose, product, onPrint, onPrintWarning }: ProductDetailsModalProps) {
    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[550px] overflow-hidden p-0">
                {/* Header (Hero) */}
                <div className="bg-muted/40 p-6 pb-4 border-b border-border/40">
                    <DialogHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Badge variant="outline" className="font-mono text-xs bg-background/50 mb-2">
                                    <Barcode className="w-3 h-3 mr-1.5 inline-block" />
                                    {product.code}
                                </Badge>
                                <DialogTitle className="text-xl leading-tight">
                                    {product.name}
                                </DialogTitle>
                                {product.description && (
                                    <DialogDescription className="text-sm mt-2 line-clamp-2">
                                        {product.description}
                                    </DialogDescription>
                                )}
                            </div>
                            <div className="shrink-0 text-right">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                                    Stock Actual
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-2xl font-bold font-mono">
                                        {product.stock}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {UNIT_LABELS[product.unit_type]}
                                    </span>
                                </div>
                                <div className="mt-1 flex justify-end">
                                    <StockBadge stock={product.stock} minStock={product.min_stock} />
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* Body details */}
                <div className="p-6 grid gap-6">
                    {/* Location Card */}
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-foreground/80">
                            <MapPin className="w-4 h-4 text-primary" />
                            Ubicación Principal
                        </div>
                        {product.sector || product.fila || product.estante ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Depósito</span>
                                    <div className="font-medium text-sm">{product.deposito || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Sector/Fila</span>
                                    <div className="font-medium text-sm">{product.sector || '-'} / {product.fila || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Columna</span>
                                    <div className="font-medium text-sm">{product.columna || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nivel/Pos</span>
                                    <div className="font-medium text-sm">{product.estante || '-'} {product.posicion ? `(${product.posicion})` : ''}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground/60 italic py-2">
                                Este producto aún no tiene una ubicación asignada.
                            </div>
                        )}
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <Tag className="w-3.5 h-3.5" />
                                Categoría
                            </div>
                            <div className="text-sm font-medium pl-5">{product.categoria || 'Sin categoría'}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Mínimo / Unidad
                            </div>
                            <div className="text-sm font-medium pl-5">
                                {product.min_stock} {UNIT_LABELS[product.unit_type]}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <FileText className="w-3.5 h-3.5" />
                                Precio
                            </div>
                            <div className="text-sm font-medium pl-5">
                                {product.price != null ? `$${Number(product.price).toLocaleString("es-AR")}` : 'Sin precio listado'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <Package className="w-3.5 h-3.5" />
                                Proveedor / Sinónimo
                            </div>
                            <div className="text-sm font-medium pl-5 max-w-[200px] truncate" title={product.proveedor || product.sinonimo || 'N/A'}>
                                {product.proveedor || product.sinonimo || '-'}
                            </div>
                        </div>
                        {/* Image Grid Slot */}
                        <div className="col-span-2 mt-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Fotografía
                            </div>
                            {product.image_url ? (
                                <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20 w-full h-[200px] flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain" />
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground/60 italic py-2">
                                    No hay foto para este producto.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer with actions */}
                <div className="p-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="w-full sm:flex-1 font-semibold" onClick={onClose}>
                        Cerrar
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {onPrintWarning && (
                            <Button variant="secondary" className="w-full sm:w-auto text-orange-600 dark:text-orange-500 hover:text-orange-700 hover:bg-orange-500/10 font-bold" onClick={onPrintWarning}>
                                <CopyPlus className="w-4 h-4 mr-2" />
                                2da Ubicación
                            </Button>
                        )}
                        {onPrint && (
                            <Button className="w-full sm:w-auto font-bold shadow-sm" onClick={onPrint}>
                                <Printer className="w-4 h-4 mr-2" />
                                Imprimir Etiqueta
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

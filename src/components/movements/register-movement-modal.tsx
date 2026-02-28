"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { createMovement } from "@/app/actions/movements";

interface Product {
    id: string;
    code: string;
    name: string;
    stock: number;
}

interface RegisterMovementModalProps {
    open: boolean;
    onClose: () => void;
    products: Product[];
    defaultProductId?: string; // Para abrir desde el escáner
}

const TYPE_OPTIONS = [
    { value: "entry", label: "Entrada — sumar al stock" },
    { value: "exit", label: "Salida — restar del stock" },
    { value: "adjustment", label: "Ajuste — fijar stock exacto" },
    { value: "transfer", label: "Transferencia — mover entre ubicaciones" },
] as const;

type MovType = "entry" | "exit" | "adjustment" | "transfer";

export function RegisterMovementModal({
    open,
    onClose,
    products,
    defaultProductId,
}: RegisterMovementModalProps) {
    const [productId, setProductId] = useState(defaultProductId ?? "");
    const [type, setType] = useState<MovType>("entry");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setProductId(defaultProductId ?? "");
            setType("entry");
            setQuantity("");
            setNotes("");
            setError(null);
        }
    }, [open, defaultProductId]);

    const selectedProduct = products.find((p) => p.id === productId);

    // Preview de stock resultante
    const previewStock = (() => {
        if (!selectedProduct || !quantity || isNaN(Number(quantity))) return null;
        const qty = Number(quantity);
        const curr = selectedProduct.stock;
        if (type === "entry") return curr + qty;
        if (type === "exit") return curr - qty;
        if (type === "adjustment") return qty;
        return null;
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId) { setError("Seleccioná un producto"); return; }
        if (!quantity || Number(quantity) <= 0) { setError("Ingresá una cantidad válida"); return; }

        setLoading(true);
        setError(null);

        const result = await createMovement({
            productId,
            type,
            quantity,
            notes: notes.trim() || null,
        });

        if (result.ok) {
            onClose();
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar movimiento</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        El stock del producto se actualizará automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <form id="movement-form" onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-2">
                        {/* Producto */}
                        <div className="space-y-1.5">
                            <Label htmlFor="product" className="text-xs">Producto *</Label>
                            <Select value={productId} onValueChange={setProductId} disabled={loading}>
                                <SelectTrigger id="product" className="h-9 text-sm">
                                    <SelectValue placeholder="Seleccioná un producto..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((p) => (
                                        <SelectItem key={p.id} value={p.id} className="text-sm">
                                            <span className="font-mono text-xs mr-2 text-muted-foreground">{p.code}</span>
                                            {p.name}
                                            <span className="ml-2 text-muted-foreground text-xs">(stock: {p.stock})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tipo */}
                        <div className="space-y-1.5">
                            <Label htmlFor="type" className="text-xs">Tipo *</Label>
                            <Select value={type} onValueChange={(v) => setType(v as MovType)} disabled={loading}>
                                <SelectTrigger id="type" className="h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TYPE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Cantidad */}
                        <div className="space-y-1.5">
                            <Label htmlFor="quantity" className="text-xs">
                                {type === "adjustment" ? "Nuevo stock exacto *" : "Cantidad *"}
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder={type === "adjustment" ? "Ej: 50 (nuevo total)" : "Ej: 10"}
                                disabled={loading}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Preview de stock */}
                        {previewStock !== null && selectedProduct && (
                            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                                <span className="text-muted-foreground">Stock:</span>
                                <span className="font-mono font-semibold">{selectedProduct.stock}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className={`font-mono font-bold ${previewStock < 0 ? "text-red-600" : previewStock === 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {previewStock}
                                </span>
                                {previewStock < 0 && (
                                    <span className="text-xs text-red-600 ml-1">¡No hay suficiente stock!</span>
                                )}
                            </div>
                        )}

                        {/* Notas */}
                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs">Notas (opcional)</Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej: Recepción proveedor XYZ / Factura 001-005"
                                disabled={loading}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                            {error}
                        </p>
                    )}
                </form>

                <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="movement-form"
                        size="sm"
                        disabled={loading || (previewStock !== null && previewStock < 0)}
                    >
                        {loading ? (
                            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Registrando...</>
                        ) : (
                            "Registrar movimiento"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

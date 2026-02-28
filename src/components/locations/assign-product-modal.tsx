"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import { assignProductToLocation, deleteLocation } from "@/app/actions/locations";
import type { LocationRow } from "@/lib/db/queries/locations";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AssignProductModalProps {
    location: LocationRow | null; // null si está cerrado
    onClose: () => void;
    products: { id: string; code: string; name: string }[];
}

export function AssignProductModal({ location, onClose, products }: AssignProductModalProps) {
    const [productId, setProductId] = useState<string>("none"); // "none" es vacío
    const [isPrimary, setIsPrimary] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (location) {
            setProductId(location.productId ?? "none");
            setIsPrimary(location.isPrimary ?? false);
            setError(null);
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!location) return;

        setLoading(true);
        setError(null);

        const val = productId === "none" ? null : productId;

        const res = await assignProductToLocation({
            locationId: location.id,
            productId: val,
            isPrimary,
        });

        setLoading(false);
        if (res.ok) onClose();
        else setError(res.error);
    };

    const handleDelete = async () => {
        if (!location || location.productId) return;
        if (!confirm("¿Seguro que querés eliminar esta coordenada física del mapa?")) return;

        setLoading(true);
        const res = await deleteLocation(location.id);
        setLoading(false);

        if (res.ok) onClose();
        else setError(res.error);
    };

    if (!location) return null;
    const nombreFisico = `${location.sector}-${location.row}-${location.column}-${location.shelf}`;

    return (
        <Dialog open={!!location} onOpenChange={(v) => !v && !loading && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar {nombreFisico}</DialogTitle>
                </DialogHeader>

                <form id="assign-form" onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Producto Asignado</Label>
                        <Select value={productId} onValueChange={setProductId} disabled={loading}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Seleccioná un producto..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" className="text-muted-foreground italic text-sm">-- Vaciar estante --</SelectItem>
                                {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-sm">
                                        {p.code} — {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {productId !== "none" && (
                        <div className="flex items-center gap-2 mt-3">
                            <input
                                type="checkbox"
                                id="isPrimary"
                                checked={isPrimary}
                                onChange={(e) => setIsPrimary(e.target.checked)}
                                className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            />
                            <Label htmlFor="isPrimary" className="text-sm cursor-pointer font-normal">
                                Es la ubicación principal para surtir pedidos (`Pick Face`)
                            </Label>
                        </div>
                    )}

                    {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
                </form>

                <DialogFooter className="gap-2 pt-2 items-center flex-row justify-between w-full sm:justify-between">
                    {!location.productId && productId === "none" ? (
                        <Button variant="ghost" size="sm" type="button" onClick={handleDelete} disabled={loading} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2 h-8">
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Destruir Física
                        </Button>
                    ) : <div />}

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button type="submit" form="assign-form" size="sm" disabled={loading}>
                            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Guardar Cambios"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

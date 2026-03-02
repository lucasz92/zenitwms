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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LayoutGrid } from "lucide-react";
import { createRack } from "@/app/actions/locations";

interface CreateRackModalProps {
    open: boolean;
    onClose: () => void;
}

export function CreateRackModal({ open, onClose }: CreateRackModalProps) {
    const [warehouse, setWarehouse] = useState("Principal");
    const [sector, setSector] = useState("");
    const [row, setRow] = useState("");
    const [colsStart, setColsStart] = useState("1");
    const [colsEnd, setColsEnd] = useState("10");
    const [shelves, setShelves] = useState("4");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setWarehouse("Principal");
            setSector("");
            setRow("");
            setColsStart("1");
            setColsEnd("10");
            setShelves("4");
            setError(null);
        }
    }, [open]);

    // Preview total ubicaciones
    const isNumRange = !isNaN(Number(colsStart)) && !isNaN(Number(colsEnd));
    let colCount = 0;

    if (isNumRange) {
        const cStart = parseInt(colsStart) || 0;
        const cEnd = parseInt(colsEnd) || 0;
        colCount = Math.max(0, cEnd - cStart + 1);
    } else if (colsStart.length === 1 && colsEnd.length === 1) {
        const start = colsStart.toUpperCase().charCodeAt(0);
        const end = colsEnd.toUpperCase().charCodeAt(0);
        colCount = Math.max(0, end - start + 1);
    }

    const s = parseInt(shelves) || 0;
    const totalGeneradas = colCount * s;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sector || !row || !colsStart || !colsEnd || !shelves) {
            setError("Completá todos los campos.");
            return;
        }
        setError(null);
        setLoading(true);

        const res = await createRack({
            warehouse,
            sector,
            row,
            colsStart: colsStart.toUpperCase(),
            colsEnd: colsEnd.toUpperCase(),
            shelves,
        });

        setLoading(false);
        if (res.ok) {
            onClose();
        } else {
            setError(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Insertar Bloque de Estanterías</DialogTitle>
                    <DialogDescription className="text-xs">
                        Se crearán automáticamente todas las coordenadas físicas, ej: {sector || "SEC"}-{row || "A"}-{colsStart.padStart(2, "0")}-01
                    </DialogDescription>
                </DialogHeader>

                <form id="rack-form" onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <Label htmlFor="warehouse" className="text-xs">Depósito</Label>
                            <Input id="warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} disabled={loading} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <Label htmlFor="sector" className="text-xs">Sector</Label>
                            <Input id="sector" placeholder="Ej: Pasillo Principal" value={sector} onChange={(e) => setSector(e.target.value)} disabled={loading} className="h-8 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="row" className="text-xs tooltip" title="Fila o Letra de pasillo">Fila</Label>
                            <Input id="row" placeholder="A" value={row} onChange={(e) => setRow(e.target.value)} disabled={loading} className="h-8 text-sm" />
                        </div>

                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs">Rango de Columnas (1-10 o A-Z)</Label>
                            <div className="flex items-center gap-2">
                                <Input type="text" value={colsStart} onChange={(e) => setColsStart(e.target.value)} disabled={loading} className="h-8 text-sm uppercase" />
                                <span className="text-muted-foreground text-xs">a</span>
                                <Input type="text" value={colsEnd} onChange={(e) => setColsEnd(e.target.value)} disabled={loading} className="h-8 text-sm uppercase" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5 col-span-3">
                            <Label htmlFor="shelves" className="text-xs">Niveles de altura (Estantes por columna)</Label>
                            <Input id="shelves" type="number" min={1} max={20} value={shelves} onChange={(e) => setShelves(e.target.value)} disabled={loading} className="h-8 text-sm" />
                        </div>
                    </div>

                    {/* Preview del bloque a generar */}
                    {totalGeneradas > 0 && sector && row && (
                        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 text-blue-800 dark:text-blue-300 px-3 py-2 text-xs">
                            <LayoutGrid className="h-4 w-4 shrink-0" />
                            <span>
                                Se crearán <strong>{totalGeneradas}</strong> ubicaciones físicas en el sistema para escanear y asignar.
                            </span>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
                    )}
                </form>

                <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="rack-form" size="sm" disabled={loading || totalGeneradas === 0 || totalGeneradas > 200}>
                        {loading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Creando...</> : "Generar Bloque"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

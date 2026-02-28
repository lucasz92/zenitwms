"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createAlert } from "@/app/actions/alerts";
import type { ProductRow } from "@/lib/db/queries/products";

interface ReportAlertModalProps {
    open: boolean;
    onClose: () => void;
    product: ProductRow | null;
}

export function ReportAlertModal({ open, onClose, product }: ReportAlertModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [type, setType] = useState<string>("");
    const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
    const [description, setDescription] = useState("");

    if (!product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!type) {
            toast.error("Por favor seleccione un tipo de alerta.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = {
                productId: product.id,
                productCode: product.code,
                productName: product.name,
                type,
                priority,
                description,
                reportedBy: "Sistema Operativo", // In a real app, this would be the logged-in user's info
            };

            const res = await createAlert(formData);

            if (res.success) {
                toast.success("Alerta reportada exitosamente.");
                // Reset form
                setType("");
                setPriority("medium");
                setDescription("");
                onClose();
            } else {
                toast.error(res.error || "No se pudo reportar la alerta.");
            }
        } catch (error) {
            toast.error("Error de comunicación. Intente nuevamente.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <DialogTitle>Reportar Problema</DialogTitle>
                                <DialogDescription className="mt-1">
                                    Producto: <strong className="font-mono text-foreground">{product.code}</strong>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid gap-5 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                                Tipo de Problema *
                            </Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger id="type" className="h-10">
                                    <SelectValue placeholder="Seleccione un tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STOCK_DISCREPANCY">Inconsistencia de Stock</SelectItem>
                                    <SelectItem value="DAMAGED_PRODUCT">Producto Dañado/Roto</SelectItem>
                                    <SelectItem value="LOCATION_ERROR">Error de Ubicación</SelectItem>
                                    <SelectItem value="BARCODE_ISSUE">Problema con Etiqueta/Código</SelectItem>
                                    <SelectItem value="EXPIRATION">Próximo a Vencer</SelectItem>
                                    <SelectItem value="OTHER">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                                Prioridad
                            </Label>
                            <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                                <SelectTrigger id="priority" className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Baja (Informativa)</SelectItem>
                                    <SelectItem value="medium">Media (Revisar luego)</SelectItem>
                                    <SelectItem value="high">Alta (Requiere Atención Inmediata)</SelectItem>
                                    <SelectItem value="critical">Crítica (Bloqueante / Riesgo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                                Descripción / Observaciones
                            </Label>
                            <Textarea
                                id="desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describa el problema encontrado..."
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="destructive" disabled={submitting || !type}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Alerta
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    CheckCircle2,
    AlertTriangle,
    MessageSquare,
    Package,
    ArrowRight,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TransferWithDetails } from "./transfers-table";
import { updateTransferItem, completeTransferOrder, addTransferLog, deleteTransferOrder } from "@/app/actions/transfers";
import { toast } from "sonner";

interface TransferDetailModalProps {
    transfer: TransferWithDetails | null;
    open: boolean;
    onClose: () => void;
}

export function TransferDetailModal({ transfer, open, onClose }: TransferDetailModalProps) {
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    // Temporary State to avoiding flickers during optimistic mutations
    const [optimisticItems, setOptimisticItems] = useState<Record<string, number>>({});

    if (!transfer) return null;

    const isCompleted = transfer.status === "COMPLETED";

    const handleUpdateQty = async (itemId: string, qtyExpected: number, e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 0) val = 0;

        // Optimistic UI update
        setOptimisticItems(prev => ({ ...prev, [itemId]: val }));

        // Backend Update
        // Note: For a production app you'd want debouncing here to avoid blasting DB
        const res = await updateTransferItem(itemId, val, qtyExpected);
        if (!res.success) {
            toast.error(res.error);
            // Revert on error
            setOptimisticItems(prev => {
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) return;

        setIsSubmitting(true);
        const res = await addTransferLog(transfer.id, note.trim());
        if (res.success) {
            setNote("");
            toast.success("Nota agregada");
        } else {
            toast.error(res.error);
        }
        setIsSubmitting(false);
    };

    const handleComplete = async () => {
        if (!confirm("¿Deseas completar este remito? Esto impactará en el inventario real y no podrá modificarse posteriormente.")) return;

        setIsClosing(true);
        const res = await completeTransferOrder(transfer.id);
        if (res.success) {
            toast.success("Remito completado e inventario actualizado.");
            onClose();
        } else {
            toast.error(res.error);
            setIsClosing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("⚠️ ¿Estás seguro de eliminar PERMANENTEMENTE este movimiento y todos sus datos?")) return;

        setIsClosing(true);
        const res = await deleteTransferOrder(transfer.id);
        if (res.success) {
            toast.success("Remito eliminado.");
            onClose();
        } else {
            toast.error(res.error);
            setIsClosing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col overflow-hidden gap-0">
                {/* Header Superior */}
                <div className="flex justify-between items-center p-4 border-b bg-muted/10 shrink-0">
                    <div>
                        <DialogTitle className="flex items-center gap-3 text-xl">
                            {transfer.transferId}
                            <Badge variant={isCompleted ? "default" : "outline"} className="uppercase text-[10px] tracking-wider">
                                {isCompleted ? "Completado" : "Pendiente de Cierre"}
                            </Badge>
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <span>{transfer.type}</span>
                            <span>•</span>
                            <span>Origen: {transfer.origin || "Múltiple"}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!isCompleted && (
                            <Button onClick={handleComplete} disabled={isClosing} className="gap-2 bg-slate-800 text-white hover:bg-black">
                                {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Cerrar Remito
                            </Button>
                        )}
                        <Button onClick={handleDelete} disabled={isClosing} variant="destructive" size="icon">
                            S
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-0 relative">
                    {/* Lista Principal de Productos */}
                    <div className="flex-1 overflow-auto bg-background p-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-center">Esperado</TableHead>
                                    <TableHead className="text-center">Auditado</TableHead>
                                    <TableHead className="text-center w-24">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transfer.items.map((item) => {
                                    const qtyRec = optimisticItems[item.id] ?? item.qtyReceived;
                                    const isMatch = qtyRec === item.qtyExpected;
                                    const isAlert = qtyRec !== item.qtyExpected;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-mono text-sm font-semibold">{item.productCode}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{item.productName}</div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono font-medium text-muted-foreground">
                                                {item.qtyExpected}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    disabled={isCompleted}
                                                    className={cn(
                                                        "w-20 mx-auto text-center font-mono font-bold h-8 focus-visible:ring-1",
                                                        isMatch ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" :
                                                            "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                                                    )}
                                                    value={qtyRec}
                                                    onChange={(e) => handleUpdateQty(item.id, item.qtyExpected, e)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {isMatch ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Sidebar: Bitácora */}
                    <div className="w-80 border-l bg-muted/10 flex flex-col h-full shrink-0">
                        <div className="p-3 border-b text-sm font-bold flex items-center gap-2 text-muted-foreground bg-muted/20">
                            <MessageSquare className="h-4 w-4" /> Bitácora / Notas
                        </div>
                        <ScrollArea className="flex-1 p-3">
                            <div className="space-y-3">
                                {transfer.logs.map((log) => (
                                    <div key={log.id} className="bg-background border rounded-lg p-3 text-xs flex flex-col gap-1 shadow-sm">
                                        <p className="text-foreground leading-relaxed">{log.text}</p>
                                        <div className="flex justify-between items-center mt-1 pt-2 border-t font-medium text-[10px] text-muted-foreground uppercase opacity-80 mt-auto">
                                            <span>{log.user || "Sistema"}</span>
                                            <span>{format(new Date(log.date), "dd MMM HH:mm", { locale: es })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-3 border-t bg-background shrink-0 pb-6">
                            <form onSubmit={handleAddNote} className="flex flex-col gap-2">
                                <Input
                                    placeholder="Escribir novedad..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="text-xs h-9"
                                />
                                <Button type="submit" disabled={isSubmitting || !note.trim()} size="sm" className="w-full h-8 text-xs font-semibold">
                                    {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Registrar Nota
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Loader2, Upload, X, FileSpreadsheet, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createTransferOrder } from "@/app/actions/transfers";

const transferSchema = z.object({
    transferId: z.string().min(1, "El ID del remito es requerido"),
    type: z.enum(["INBOUND", "REWORK", "SCRAP"]),
    origin: z.string().optional(),
    target: z.string().optional(),
    referenceEmail: z.string().optional(),
});

type TransferForm = z.infer<typeof transferSchema>;

interface ParsedItem {
    code: string;
    name: string;
    qtyExpected: number;
}

interface CreateTransferModalProps {
    open: boolean;
    onClose: () => void;
}

export function CreateTransferModal({ open, onClose }: CreateTransferModalProps) {
    const [items, setItems] = useState<ParsedItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<TransferForm>({
        resolver: zodResolver(transferSchema),
        defaultValues: {
            type: "INBOUND",
            transferId: `ID-${format(new Date(), "yyMMdd-HHmm")}`,
            origin: "",
            target: "Stock General",
            referenceEmail: "",
        },
    });

    const currentType = watch("type");
    const isOutbound = currentType === "REWORK" || currentType === "SCRAP";

    const handleClose = () => {
        reset();
        setItems([]);
        onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const parsedItems: ParsedItem[] = data.map((row: any) => {
                    const codeKey = Object.keys(row).find(k => k.toLowerCase().includes('cod') || k.toLowerCase().includes('sku'));
                    const qtyKey = Object.keys(row).find(k => k.toLowerCase().includes('cant') || k.toLowerCase().includes('qty'));
                    const nameKey = Object.keys(row).find(k =>
                        k.toLowerCase().includes('desc') ||
                        k.toLowerCase().includes('nom') ||
                        k.toLowerCase().includes('prod') ||
                        k.toLowerCase().includes('art') ||
                        k.toLowerCase().includes('mat') ||
                        k.toLowerCase().includes('detalle')
                    );

                    if (!codeKey) return null;

                    // @ts-ignore
                    return {
                        code: String(row[codeKey]).toUpperCase(),
                        // @ts-ignore
                        name: nameKey ? String(row[nameKey]) : 'Sin descripción',
                        // @ts-ignore
                        qtyExpected: Number(row[qtyKey] || 1),
                    };
                }).filter(Boolean) as ParsedItem[];

                setItems(parsedItems);
                if (parsedItems.length > 0) {
                    toast.success(`Se importaron ${parsedItems.length} ítems del Excel`);
                } else {
                    toast.error("No se detectaron códigos en el Excel. Revisa el formato.");
                }
            } catch (error) {
                console.error("Excel parse error", error);
                toast.error("Error al procesar el archivo Excel");
            }
        };
        reader.readAsBinaryString(file);
    };

    const onSubmit = async (data: TransferForm) => {
        setIsSubmitting(true);
        try {
            const res = await createTransferOrder({ ...data, items });
            if (res.success) {
                toast.success("Remito creado exitosamente");
                handleClose();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Falló la conexión al crear la transferencia");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="shrink-0 mb-4">
                    <DialogTitle className="text-xl">Nuevo Movimiento de Lote / Remito</DialogTitle>
                </DialogHeader>

                <form id="create-transfer-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6 pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Movimiento</Label>
                            <Select
                                value={currentType}
                                onValueChange={(val: any) => setValue("type", val)}
                            >
                                <SelectTrigger className="font-semibold px-3 border-primary/40 bg-primary/5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INBOUND">Entrada / Recepción</SelectItem>
                                    <SelectItem value="REWORK">Salida a Retrabajo</SelectItem>
                                    <SelectItem value="SCRAP">Salida a Scrap / Pérdida</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{isOutbound ? 'Referencia / Ticket' : 'Remito / ID Transf.'}</Label>
                            <Input
                                {...register("transferId")}
                                placeholder="Ej: TR-00429"
                                className="font-mono"
                            />
                            {errors.transferId && <p className="text-[10px] text-destructive">{errors.transferId.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{isOutbound ? 'Destino Físico' : 'Origen'}</Label>
                            <Input {...register("origin")} placeholder={isOutbound ? "Taller Externo" : "Planta Matriz"} />
                        </div>
                        <div className="space-y-2">
                            <Label>Area / Recepción Interna</Label>
                            <Input {...register("target")} placeholder="Stock General, Mantenimiento..." />
                        </div>
                    </div>

                    {isOutbound && (
                        <div className="space-y-2">
                            <Label>Correo de Referencia / Autorizado por</Label>
                            <Input {...register("referenceEmail")} placeholder="gerencia@empresa.com" />
                        </div>
                    )}

                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-sm font-bold text-foreground">Listado de Ítems ({items.length})</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">Podés cargar un Excel (Código, Descripción, Cantidad)</p>
                            </div>
                            <div className="flex gap-2">
                                <Label htmlFor="excel-upload" className="cursor-pointer">
                                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                        <span>Importar Excel</span>
                                    </div>
                                    <input
                                        id="excel-upload"
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                    />
                                </Label>
                            </div>
                        </div>

                        {items.length > 0 ? (
                            <div className="rounded-md border bg-muted/20">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="h-8 py-1">Código</TableHead>
                                            <TableHead className="h-8 py-1">Descripción</TableHead>
                                            <TableHead className="h-8 py-1 text-center w-24">Cant.</TableHead>
                                            <TableHead className="h-8 py-1 w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => (
                                            <TableRow key={idx} className="h-10">
                                                <TableCell className="font-mono text-xs font-semibold py-1">{item.code}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground truncate max-w-[200px] py-1">{item.name}</TableCell>
                                                <TableCell className="text-center font-mono text-xs py-1">{item.qtyExpected}</TableCell>
                                                <TableCell className="py-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleRemoveItem(idx)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="border border-dashed rounded-lg p-6 bg-muted/10 flex flex-col items-center justify-center text-center">
                                <AlertTriangle className="h-8 w-8 text-amber-500/50 mb-2" />
                                <p className="text-sm font-medium">No hay ítems cargados</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                                    Importá un archivo Excel para listar los productos esperados en este movimiento.
                                </p>
                            </div>
                        )}
                    </div>
                </form>

                <DialogFooter className="shrink-0 pt-4 border-t mt-4">
                    <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="create-transfer-form" disabled={isSubmitting || items.length === 0} className="font-bold min-w-[140px]">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Crear Remito"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

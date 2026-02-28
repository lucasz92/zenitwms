"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Plus,
    Search,
    Truck,
    Package,
    ArrowRight,
    ArrowDownToLine,
    ArrowUpFromLine,
    AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TransferOrder, TransferItem, TransferLog } from "@/lib/db/schema";
import { TransferDetailModal } from "./transfer-detail-modal";
import { CreateTransferModal } from "./create-transfer-modal";

export type TransferWithDetails = TransferOrder & {
    items: TransferItem[];
    logs: TransferLog[];
};

interface TransfersTableProps {
    transfers: TransferWithDetails[];
}

export function TransfersTable({ transfers }: TransfersTableProps) {
    const [search, setSearch] = useState("");
    const [selectedTransfer, setSelectedTransfer] = useState<TransferWithDetails | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Filter
    const filtered = transfers.filter((t) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            t.transferId.toLowerCase().includes(q) ||
            (t.origin && t.origin.toLowerCase().includes(q)) ||
            (t.target && t.target.toLowerCase().includes(q))
        );
    });

    const getTypeColor = (type: string) => {
        switch (type) {
            case "INBOUND": return "bg-blue-500 hover:bg-blue-600";
            case "REWORK": return "bg-amber-500 hover:bg-amber-600";
            case "SCRAP": return "bg-red-500 hover:bg-red-600";
            default: return "bg-slate-500 hover:bg-slate-600";
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "INBOUND": return "Recepción";
            case "REWORK": return "Retrabajo";
            case "SCRAP": return "Scrap";
            default: return type;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "INBOUND": return <ArrowDownToLine className="h-3 w-3 mr-1" />;
            case "REWORK": return <AlertTriangle className="h-3 w-3 mr-1" />;
            case "SCRAP": return <ArrowUpFromLine className="h-3 w-3 mr-1" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar ID de remito u origen..."
                        className="pl-8 h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Remito
                </Button>
            </div>

            {/* Grid de Remitos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 h-40 flex flex-col items-center justify-center border rounded-lg border-dashed text-muted-foreground bg-muted/10">
                        <Truck className="h-8 w-8 opacity-20 mb-2" />
                        <p className="text-sm">No se encontraron remitos.</p>
                    </div>
                ) : (
                    filtered.map((t) => (
                        <Card
                            key={t.id}
                            className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm relative overflow-hidden group"
                            onClick={() => setSelectedTransfer(t)}
                        >
                            <div className={cn("absolute top-0 right-0 px-2 py-0.5 text-[10px] font-bold text-white uppercase rounded-bl-lg shadow-sm flex items-center", getTypeColor(t.type))}>
                                {getTypeIcon(t.type)} {getTypeLabel(t.type)}
                            </div>
                            <CardContent className="p-4 pt-6">
                                <div className="flex justify-between items-end mb-3">
                                    <h3 className="font-mono font-bold text-lg">{t.transferId}</h3>
                                    <Badge variant={t.status === "COMPLETED" ? "default" : "secondary"} className="text-[10px] uppercase">
                                        {t.status === "COMPLETED" ? "Completado" : "Pendiente"}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-muted/40 p-1.5 rounded-md">
                                    <Package className="h-3.5 w-3.5" />
                                    <span className="font-semibold text-foreground">{t.items.length}</span> items
                                    <span className="text-muted-foreground/30">|</span>
                                    <span className="truncate max-w-[150px]">{t.origin || t.referenceEmail || "Sin ref."}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex justify-between items-center border-t border-border/50 pt-3">
                                    <span>Creado el {format(new Date(t.createdAt), "dd MMM, HH:mm", { locale: es })}</span>
                                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <TransferDetailModal
                transfer={selectedTransfer}
                open={!!selectedTransfer}
                onClose={() => setSelectedTransfer(null)}
            />

            <CreateTransferModal
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
            />
        </div>
    );
}


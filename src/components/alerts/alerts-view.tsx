"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Trash2,
    MoreHorizontal,
    Search as SearchIcon,
    Download
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
import { updateAlertStatus, deleteAlert } from "@/app/actions/alerts";
import type { Alert } from "@/lib/db/schema";
import { exportTableToPDF } from "@/lib/utils/pdf-generator";

type StatusFilter = "all" | "pending" | "completed";

// Configuraciones visuales por prioridad
const PRIORITY_CONFIG = {
    critical: { label: "Crítica", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200" },
    high: { label: "Alta", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200" },
    medium: { label: "Media", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200" },
    low: { label: "Baja", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200" },
} as const;

export function AlertsView({ initialAlerts }: { initialAlerts: Alert[] }) {
    const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
    const [filterStatus, setFilterStatus] = useState<StatusFilter>("pending");
    const [isUpdating, setIsUpdating] = useState(false);

    // Kpis
    const metrics = useMemo(() => {
        const criticalCount = alerts.filter(a => a.status !== 'completed' && a.priority === 'critical').length;
        const pendingCount = alerts.filter(a => a.status !== 'completed').length;
        const resolvedTodayCount = alerts.filter(a =>
            a.status === 'completed' &&
            a.resolvedAt &&
            new Date(a.resolvedAt).getDate() === new Date().getDate()
        ).length;

        return { criticalCount, pendingCount, resolvedTodayCount };
    }, [alerts]);

    // Filtrado
    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            if (filterStatus === "pending" && alert.status === "completed") return false;
            if (filterStatus === "completed" && alert.status !== "completed") return false;
            return true;
        });
    }, [alerts, filterStatus]);

    // Acciones DB
    const handleStatusUpdate = async (id: string, newStatus: "pending" | "in_progress" | "completed") => {
        setIsUpdating(true);
        const res = await updateAlertStatus(id, newStatus);
        if (res.success) {
            setAlerts(curr => curr.map(a =>
                a.id === id ? { ...a, status: newStatus, resolvedAt: newStatus === 'completed' ? new Date() : null } : a
            ));
        }
        setIsUpdating(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Seguro de eliminar esta alerta?")) return;
        setIsUpdating(true);
        const res = await deleteAlert(id);
        if (res.success) {
            setAlerts(curr => curr.filter(a => a.id !== id));
        }
        setIsUpdating(false);
    };

    // PDF Export
    const handleExportPDF = () => {
        const head = [["PRODUCTO", "CÓDIGO", "PROBLEMA", "PRIORIDAD", "ESTADO", "REPORTADO POR", "FECHA"]];
        const body = filteredAlerts.map(a => {
            const statusLabel = a.status === 'completed' ? 'Resuelto' : (a.status === 'in_progress' ? 'En Progreso' : 'Pendiente');
            return [
                a.productName || "—",
                a.productCode || "—",
                a.type,
                PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG]?.label || a.priority,
                statusLabel,
                a.reportedBy || "Anónimo",
                a.createdAt ? format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm') : "—"
            ];
        });

        exportTableToPDF({
            filename: "Alertas_Zenit",
            title: "Reporte de Alertas",
            subtitle: `Filtro: ${filterStatus === "all" ? "Todas" : filterStatus === "pending" ? "Pendientes" : "Historial"}`,
            head,
            body
        });
    };

    return (
        <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setFilterStatus("pending")}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            filterStatus === "pending" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Pendientes
                        {metrics.pendingCount > 0 && (
                            <span className="bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full text-[10px] leading-none">
                                {metrics.pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilterStatus("completed")}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                            filterStatus === "completed" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Historial (Resueltos)
                    </button>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportPDF}>
                        <Download className="h-3.5 w-3.5" />
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 rounded-xl border border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30 p-4 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/50">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-red-600/70 dark:text-red-400/70 pt-1">Críticas (Pendientes)</p>
                        <p className="text-3xl font-black text-red-950 dark:text-red-50 leading-none">{metrics.criticalCount}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-blue-200/50 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/30 p-4 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70 pt-1">Total Pendientes</p>
                        <p className="text-3xl font-black text-blue-950 dark:text-blue-50 leading-none">{metrics.pendingCount}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-emerald-200/50 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-4 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 pt-1">Resueltas Hoy</p>
                        <p className="text-3xl font-black text-emerald-950 dark:text-emerald-50 leading-none">{metrics.resolvedTodayCount}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-[45%] text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-3">Producto / Problema</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-3">Prioridad</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-3 hidden md:table-cell">Reportado</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-3">Estado</TableHead>
                            <TableHead className="w-12 text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAlerts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center">
                                        <CheckCircle2 className="h-8 w-8 opacity-20 mb-2" />
                                        <p className="text-sm">No hay alertas para este filtro.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAlerts.map(alert => {
                                const priConfig = PRIORITY_CONFIG[alert.priority as keyof typeof PRIORITY_CONFIG];
                                return (
                                    <TableRow
                                        key={alert.id}
                                        className={cn(
                                            "group transition-colors",
                                            alert.status === 'completed' && "opacity-60 bg-muted/20"
                                        )}
                                    >
                                        <TableCell className="py-3">
                                            <div className="flex items-start gap-3">
                                                <div className={cn("mt-1 p-2 rounded-lg border", priConfig?.className)}>
                                                    <AlertTriangle className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-sm leading-tight">
                                                        {alert.productName || "Desconocido"}
                                                    </span>
                                                    <span className="text-xs font-mono text-muted-foreground mb-1">
                                                        {alert.productCode || "S/C"}
                                                    </span>
                                                    <div className="inline-flex w-fit items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
                                                        {alert.type}
                                                    </div>
                                                    {alert.description && (
                                                        <span className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                                                            "{alert.description}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <Badge variant="outline" className={cn("text-xs font-bold uppercase", priConfig?.className)}>
                                                {priConfig?.label || alert.priority}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="py-3 hidden md:table-cell text-xs text-muted-foreground">
                                            <div className="flex flex-col gap-1">
                                                <span>{format(new Date(alert.createdAt), "d MMM, HH:mm", { locale: es })}</span>
                                                <span className="opacity-70">{alert.reportedBy || "Usuario Auxiliar"}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3">
                                            <select
                                                disabled={isUpdating}
                                                value={alert.status}
                                                onChange={(e) => handleStatusUpdate(alert.id, e.target.value as any)}
                                                className={cn(
                                                    "h-8 w-[130px] rounded-md border text-xs font-medium focus:ring-1 focus:ring-ring focus:outline-none transition-colors",
                                                    alert.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" :
                                                        alert.status === 'in_progress' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30" :
                                                            "bg-background text-foreground border-input"
                                                )}
                                            >
                                                <option value="pending">Pendiente</option>
                                                <option value="in_progress">En Progreso</option>
                                                <option value="completed">Resuelto</option>
                                            </select>
                                            {alert.resolvedAt && alert.status === 'completed' && (
                                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium ml-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {format(new Date(alert.resolvedAt), "d MMM", { locale: es })}
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell className="py-3 pr-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Acciones</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem className="text-xs gap-2">
                                                        <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        Ver Producto Asociado
                                                    </DropdownMenuItem>

                                                    {alert.status !== 'completed' ? (
                                                        <DropdownMenuItem
                                                            className="text-xs gap-2 text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/50"
                                                            onClick={() => handleStatusUpdate(alert.id, 'completed')}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Marcar como Resuelto
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="text-xs gap-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/50"
                                                            onClick={() => handleStatusUpdate(alert.id, 'pending')}
                                                        >
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                            Reabrir Alerta
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-xs gap-2 text-destructive focus:text-destructive focus:bg-red-50 dark:focus:bg-red-950/50"
                                                        onClick={() => handleDelete(alert.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Eliminar Alerta
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
            </div>
        </div>
    );
}


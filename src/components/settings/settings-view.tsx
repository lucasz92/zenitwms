"use client";

import { useState } from "react";
import { UploadCloud, Download, Loader2, Database, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { CheckCircle2, FileSpreadsheet } from "lucide-react";
import { exportFullDatabase, importBulkProducts } from "@/app/actions/settings";

export function SettingsView() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [previewData, setPreviewData] = useState<any[] | null>(null);
    const [fileName, setFileName] = useState("");
    const [duplicateAction, setDuplicateAction] = useState<'update' | 'skip'>('update');

    const handleExport = async () => {
        setIsExporting(true);
        toast.loading("Exportando base de datos...", { id: "export" });

        const res = await exportFullDatabase();
        if (res.success && res.data) {
            const ws = XLSX.utils.json_to_sheet(res.data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventario_Completo");

            // Forzar formateo a texto si hay códigos para no romper 10-01 a fecha
            const range = XLSX.utils.decode_range(ws['!ref'] || "");
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                    if (ws[cellRef] && ws[cellRef].t === 'n' && C === 1) { // Asumiendo CODIGO es columna 1 (0 es ID)
                        ws[cellRef].t = 's';
                        ws[cellRef].v = String(ws[cellRef].v);
                    }
                }
            }

            XLSX.writeFile(wb, `Backup_WMS_V2_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Base de datos descargada con éxito.", { id: "export" });
        } else {
            toast.error(res.error || "Fallo en la exportación", { id: "export" });
        }

        setIsExporting(false);
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Raw json array
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                toast.error("El archivo está vacío o no tiene el formato correcto.", { id: "import" });
                return;
            }

            setPreviewData(jsonData);
        } catch (error) {
            console.error(error);
            toast.error("Error al leer formato del archivo.", { id: "import" });
        } finally {
            e.target.value = ""; // reset
        }
    };

    const handleConfirmImport = async () => {
        if (!previewData) return;

        setIsImporting(true);
        toast.loading(`Enviando ${previewData.length} filas al servidor...`, { id: "import" });

        try {
            // Aseguramos que la info viaje limpia al Server Action (solo primitivos)
            const cleanData = JSON.parse(JSON.stringify(previewData));
            const res = await importBulkProducts(cleanData, duplicateAction);

            if (res.success) {
                toast.success(`Importación exitosa. Agregados: ${res.inserted}, Actualizados: ${res.updated || 0}, Saltados: ${res.skipped || 0}`, { id: "import", duration: 6000 });
                setPreviewData(null);
            } else {
                toast.error(res.error || "Falló la importación masiva.", { id: "import" });
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión durante la importación.", { id: "import" });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* CARD EXPORT */}
            <Card className="border-green-200 dark:border-green-900/30">
                <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-2">
                        <Download className="h-5 w-5" />
                    </div>
                    <CardTitle>Exportación Total (Backup)</CardTitle>
                    <CardDescription>
                        Descarga toda la base de datos de productos y sus ubicaciones en un archivo Excel crudo y plano.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                        El archivo resultante es 100% compatible con la estructura estandarizada anterior. Útil para auditoría profunda o backup en frío.
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full bg-green-600 hover:bg-green-700"
                    >
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        {isExporting ? "Generando Excel..." : "Forzar Descarga de Base (.xlsx)"}
                    </Button>
                </CardFooter>
            </Card>

            {/* CARD IMPORT */}
            <Card className="border-purple-200 dark:border-purple-900/30">
                <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                        <UploadCloud className="h-5 w-5" />
                    </div>
                    <CardTitle>Importador Masivo</CardTitle>
                    <CardDescription>
                        Sube un Excel con columnas `CODIGO`, `NOMBRE`, `CANTIDAD`, `CATEGORIA`, `SECTOR` para inyectar artículos al sistema al instante.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-yellow-700 dark:text-yellow-600 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg flex gap-2">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>
                            <strong>Peligro Cuidado:</strong> Si el código ya existe, su Stock será <b>sobreescrito</b> (upsert) por el valor del archivo perdiendo su historial. Haz esto sólo para cargas iniciales o regularización absoluta.
                        </span>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="relative w-full">
                        <Button
                            disabled={isImporting}
                            className="w-full bg-purple-600 hover:bg-purple-700 pointer-events-none"
                        >
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            {isImporting ? "Procesando Importación..." : "Subir Excel para Importar"}
                        </Button>
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            disabled={isImporting}
                            onChange={handleImportFile}
                            title="Selecciona archivo Excel"
                        />
                    </div>
                </CardFooter>
            </Card>

            {/* PREVIEW MODAL */}
            <Dialog open={!!previewData} onOpenChange={(open) => {
                if (!open && !isImporting) setPreviewData(null);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="text-purple-600 h-5 w-5" />
                            Vista Previa de Importación
                        </DialogTitle>
                        <DialogDescription>
                            Archivo: <strong>{fileName}</strong>. Se procesarán <strong>{previewData?.length} filas</strong> en total. Revisa que las primeras 5 filas se hayan interpretado correctamente antes de confirmar.
                        </DialogDescription>
                    </DialogHeader>

                    {previewData && (
                        <div className="flex flex-col gap-4 mt-4">
                            {/* Opciones de Duplicados */}
                            <div className="bg-muted/50 p-4 rounded-lg border flex flex-col gap-3">
                                <div>
                                    <h4 className="font-semibold text-sm">¿Qué hacer con los códigos duplicados?</h4>
                                    <p className="text-xs text-muted-foreground">Si el código ya existe en la base de datos principal:</p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                                    <label className="flex items-start gap-2 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="duplicateAction"
                                            value="update"
                                            checked={duplicateAction === 'update'}
                                            onChange={() => setDuplicateAction('update')}
                                            className="mt-0.5 accent-purple-600"
                                        />
                                        <div>
                                            <span className="font-medium text-purple-700 dark:text-purple-400">Actualizar Stock y Datos</span>
                                            <p className="text-[10px] text-muted-foreground">Se sobreescribirán los datos y el stock con los del Excel.</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="duplicateAction"
                                            value="skip"
                                            checked={duplicateAction === 'skip'}
                                            onChange={() => setDuplicateAction('skip')}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <span className="font-medium">Ignorar / Saltar</span>
                                            <p className="text-[10px] text-muted-foreground">Solo se añadirán los códigos nuevos que no existan.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="overflow-auto border rounded-lg bg-white max-h-[40vh]">
                                <Table>
                                    <TableHeader className="bg-muted sticky top-0 shadow-sm z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            {/* Extract headers from first row keys */}
                                            {Object.keys(previewData[0] || {}).map((key) => (
                                                <TableHead key={key} className="whitespace-nowrap font-bold text-xs uppercase text-slate-600">
                                                    {key}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.slice(0, 5).map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                                {Object.keys(previewData[0] || {}).map((key, j) => (
                                                    <TableCell key={j} className="text-xs whitespace-nowrap">
                                                        {String(row[key] ?? "")}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                        {previewData.length > 5 && (
                                            <TableRow>
                                                <TableCell colSpan={Object.keys(previewData[0] || {}).length + 1} className="text-center text-xs text-muted-foreground bg-muted/20 italic">
                                                    (Mostrando solo una previsualización de las primeras 5 filas de un total de {previewData.length})
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-4 shrink-0 flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewData(null)}
                            disabled={isImporting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmImport}
                            disabled={isImporting}
                            className="bg-purple-600 hover:bg-purple-700 w-48"
                        >
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            {isImporting ? "Procesando..." : "Confirmar Importación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

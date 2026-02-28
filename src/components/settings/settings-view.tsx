"use client";

import { useState } from "react";
import { UploadCloud, Download, Loader2, Database, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { exportFullDatabase, importBulkProducts } from "@/app/actions/settings";

export function SettingsView() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

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

        if (!confirm(`¿Estás seguro de que quieres realizar una importación masiva usando el archivo ${file.name}? Esta acción mutará o creará productos en la base de datos principal.`)) {
            e.target.value = "";
            return;
        }

        setIsImporting(true);
        toast.loading("Procesando y validando Excel...", { id: "import" });

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Raw json array
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                toast.error("El archivo está vacío o no tiene el formato correcto.", { id: "import" });
                setIsImporting(false);
                return;
            }

            toast.loading(`Enviando ${jsonData.length} filas al servidor...`, { id: "import" });

            const res = await importBulkProducts(jsonData);

            if (res.success) {
                toast.success(`Importación exitosa. Creados: ${res.inserted}, Actualizados: ${res.updated}`, { id: "import", duration: 5000 });
            } else {
                toast.error(res.error || "Falló la importación masiva.", { id: "import" });
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al leer formato del archivo.", { id: "import" });
        } finally {
            setIsImporting(false);
            e.target.value = ""; // reset
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

        </div>
    );
}

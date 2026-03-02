"use client";

import { useState } from "react";
import { X, Printer, Settings, AlertCircle, CopyPlus, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductRow } from "@/lib/db/queries/products";

interface PrintWarningModalProps {
    open: boolean;
    onClose: () => void;
    product: ProductRow | null;
}

export function PrintWarningModal({ open, onClose, product }: PrintWarningModalProps) {
    const [copies, setCopies] = useState(1);

    // Warning Form State
    const [sector, setSector] = useState("DEP01");
    const [fila, setFila] = useState("");
    const [columna, setColumna] = useState("");
    const [estante, setEstante] = useState("");
    const [note, setNote] = useState("");

    if (!product) return null;

    const handlePrint = () => {
        const finalWidth = 100; // Fixed width for warning labels (10cm)
        const printWindow = window.open('', '', `width=800,height=600`);
        if (!printWindow) return;

        let content = '';
        const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${product.code}&scale=3&height=12&includetext=false`;

        for (let i = 0; i < copies; i++) {
            content += `
                <div class="label-container">
                    <div class="label-page">
                        
                        <!-- Warning Header -->
                        <div class="warning-header">
                            <div>¡ATENCIÓN! - UBICACIÓN ADICIONAL</div>
                        </div>

                        <div class="main-body">
                            <!-- Left: Product Info & Code -->
                            <div class="left-col">
                                <div class="code text-fit">${product.code}</div>
                                <div class="desc">${product.name}</div>
                                
                                <div style="margin-top: auto;">
                                    <img class="barcode" src="${barcodeUrl}" />
                                </div>
                            </div>

                            <!-- Right: New Location Info -->
                            <div class="right-col">
                                <div class="info-label">UBICACIÓN:</div>
                                <div class="loc-grid">
                                    <div class="loc-box">
                                        <div class="loc-title">DEPÓSITO</div>
                                        <div class="loc-val">${sector || '-'}</div>
                                    </div>
                                    <div class="loc-box">
                                        <div class="loc-title">FILA</div>
                                        <div class="loc-val">${fila || '-'}</div>
                                    </div>
                                    <div class="loc-box">
                                        <div class="loc-title">COLUMNA</div>
                                        <div class="loc-val">${columna || '-'}</div>
                                    </div>
                                    <div class="loc-box">
                                        <div class="loc-title">ESTANTE</div>
                                        <div class="loc-val">${estante || '-'}</div>
                                    </div>
                                </div>
                                
                                ${note ? `
                                <div style="margin-top: 2mm; flex: 1; display: flex; flex-direction: column;">
                                    <div class="info-label">NOTA / ALERTA:</div>
                                    <div class="note-box">${note}</div>
                                </div>
                                ` : ''}

                                <div class="ref-box">
                                    VER UBICACIÓN PRINCIPAL EN SISTEMA
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            `;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Alerta Ubicacion ${product.code}</title>
                <style>
                    /* CRITICAL: Force page size */
                    @page { 
                        size: ${finalWidth}mm 50mm; 
                        margin: 0; 
                    }
                    
                    body { 
                        margin: 0; 
                        padding: 0;
                        font-family: Arial, Helvetica, sans-serif; 
                        width: ${finalWidth}mm;
                        background: white;
                    }

                    .label-container {
                        width: ${finalWidth}mm;
                        height: 50mm;
                        overflow: hidden;
                        page-break-after: always;
                        display: flex;
                        justify-content: center;
                    }

                    .label-container:last-child {
                        page-break-after: auto;
                    }
                    
                    .label-page {
                        width: ${finalWidth}mm; 
                        height: 50mm;
                        padding: 1mm;
                        position: relative;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                    }

                    .warning-header {
                        background: black;
                        color: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        text-align: center;
                        font-weight: 900;
                        font-size: 11pt;
                        padding: 1mm 0;
                        width: 100%;
                        border-radius: 2px;
                        margin-bottom: 1.5mm;
                        letter-spacing: 1px;
                    }

                    .main-body {
                        display: flex;
                        gap: 2mm;
                        flex: 1;
                    }

                    .left-col {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        border-right: 1.5px dashed #000;
                        padding-right: 2mm;
                    }

                    .right-col {
                        flex: 1.2;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .code {
                        font-size: 16pt;
                        font-weight: 900;
                        letter-spacing: -0.5px;
                        line-height: 1;
                        color: #000;
                    }

                    .desc {
                        font-size: 8pt;
                        font-weight: bold;
                        line-height: 1.1;
                        margin-top: 0.5mm;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }

                    .info-label {
                        font-size: 7pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        margin-bottom: 0.5mm;
                    }

                    .extra-qty {
                        font-size: 18pt;
                        font-weight: 900;
                        line-height: 1;
                        margin-bottom: 1mm;
                    }

                    .barcode {
                        height: 8mm;
                        width: 40mm;
                        object-fit: contain;
                    }

                    .loc-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 1mm;
                        margin-top: 1px;
                    }

                    .loc-box {
                        border: 1px solid #000;
                        border-radius: 2px;
                        padding: 1mm;
                        min-width: 15mm;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }

                    .loc-title {
                        font-size: 5pt;
                        font-weight: bold;
                    }

                    .loc-val {
                        font-size: 9.5pt;
                        font-weight: 900;
                        line-height: 1;
                    }

                    .note-box {
                        font-size: 8pt;
                        font-weight: bold;
                        border: 1px solid #000;
                        padding: 1mm;
                        border-radius: 2px;
                        background: #eee !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        height: 100%;
                    }

                    .ref-box {
                        margin-top: auto;
                        text-align: center;
                        font-size: 7pt;
                        font-weight: bold;
                        border-top: 1px solid #000;
                        padding-top: 1mm;
                    }
                </style>
            </head>
            <body>
                ${content}
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-3xl overflow-hidden p-0 gap-0 bg-transparent border-none shadow-none">
                <DialogTitle className="sr-only">Etiqueta de Ubicación Doble</DialogTitle>
                <div className="bg-card w-full flex flex-col rounded-xl overflow-hidden shadow-2xl border border-border">
                    {/* Header */}
                    <div className="p-4 border-b border-border/40 flex justify-between items-center bg-yellow-500/10 dark:bg-yellow-500/5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
                                <CopyPlus className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-foreground">Etiqueta de Ubicación Doble</h3>
                                <p className="text-xs text-muted-foreground">Generar aviso térmico de stock excedente</p>
                            </div>
                        </div>
                        {/* Removida X porque Dialog de Shadcn ya inserta un botón predeterminado que pisaba este */}
                    </div>

                    <div className="p-0 flex flex-col md:flex-row h-full max-h-[80vh]">
                        {/* LEFT: FORM */}
                        <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-border bg-background overflow-y-auto">
                            <h4 className="font-semibold text-sm mb-4 text-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                Datos de la Nueva Ubicación
                            </h4>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Sector / Depósito</Label>
                                        <Input
                                            value={sector}
                                            onChange={(e) => setSector(e.target.value.toUpperCase())}
                                            placeholder="Ej: DEP01"
                                            className="h-9 uppercase font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Fila</Label>
                                        <Input
                                            value={fila}
                                            onChange={(e) => setFila(e.target.value.toUpperCase())}
                                            placeholder="Ej: A"
                                            maxLength={3}
                                            className="h-9 uppercase font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Columna</Label>
                                        <Input
                                            value={columna}
                                            onChange={(e) => setColumna(e.target.value.toUpperCase())}
                                            placeholder="Ej: 04"
                                            maxLength={4}
                                            className="h-9 uppercase font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Estante / Nivel</Label>
                                        <Input
                                            value={estante}
                                            onChange={(e) => setEstante(e.target.value.toUpperCase())}
                                            placeholder="Ej: 2"
                                            maxLength={3}
                                            className="h-9 uppercase font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border mt-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Nota / Advertencia (Opcional)</Label>
                                        <Textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Ej: Excedente de importación..."
                                            className="resize-none h-16 text-sm"
                                            maxLength={60}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: PREVIEW & ACTIONS */}
                        <div className="w-full md:w-1/2 bg-muted/20 flex flex-col">
                            <div className="p-6 flex-1 flex flex-col justify-center items-center overflow-y-auto">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 w-full text-center">
                                    Vista Previa (10x5cm)
                                </Label>

                                <div className="w-full flex justify-center py-6 bg-muted/40 rounded-xl border border-dashed border-border shadow-inner">
                                    <div
                                        className="bg-white text-black p-[4.5px] rounded shadow-xl flex flex-col relative shrink-0 transition-all font-sans"
                                        style={{ width: '300px', height: '150px' }} // 3x scaled 100x50mm
                                    >
                                        {/* Warning Header */}
                                        <div className="bg-black text-white text-center font-black text-sm py-1 mb-1 rounded-sm tracking-widest uppercase">
                                            ¡ATENCIÓN! - UBICACIÓN ADICIONAL
                                        </div>

                                        <div className="flex gap-2 h-full pb-1">
                                            {/* PREVIEW Left */}
                                            <div className="flex-1 border-r-2 border-dashed border-black/80 pr-2 flex flex-col">
                                                <div className="font-black text-xl leading-none tracking-tight">{product.code}</div>
                                                <div className="text-[10px] font-bold leading-tight mt-1 line-clamp-2 uppercase">{product.name}</div>

                                                <div className="mt-auto">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${product.code}&scale=3&height=12&includetext=false`} className="h-6 w-full object-contain mix-blend-multiply origin-left" alt="bc" />
                                                </div>
                                            </div>

                                            {/* PREVIEW Right */}
                                            <div className="flex-[1.2] flex flex-col">
                                                <div className="text-[8px] font-black uppercase mb-0.5">UBICACIÓN:</div>
                                                <div className="grid grid-cols-2 gap-1 mb-1">
                                                    <div className="border border-black rounded-sm p-0.5 text-center flex flex-col justify-center h-8">
                                                        <div className="text-[6px] font-bold uppercase">Depósito</div>
                                                        <div className="font-black text-xs leading-none">{sector || '-'}</div>
                                                    </div>
                                                    <div className="border border-black rounded-sm p-0.5 text-center flex flex-col justify-center h-8">
                                                        <div className="text-[6px] font-bold uppercase">Fila</div>
                                                        <div className="font-black text-xs leading-none">{fila || '-'}</div>
                                                    </div>
                                                    <div className="border border-black rounded-sm p-0.5 text-center flex flex-col justify-center h-8">
                                                        <div className="text-[6px] font-bold uppercase">Columna</div>
                                                        <div className="font-black text-xs leading-none">{columna || '-'}</div>
                                                    </div>
                                                    <div className="border border-black rounded-sm p-0.5 text-center flex flex-col justify-center h-8">
                                                        <div className="text-[6px] font-bold uppercase">Estante</div>
                                                        <div className="font-black text-xs leading-none">{estante || '-'}</div>
                                                    </div>
                                                </div>

                                                {note && (
                                                    <div className="mt-1 flex-1 flex flex-col">
                                                        <div className="text-[7px] font-black uppercase">Nota:</div>
                                                        <div className="border border-black bg-neutral-200 text-black text-[9px] font-bold p-1 rounded-sm line-clamp-3 leading-tight flex-1">
                                                            {note}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="text-[7px] font-black text-center mt-auto border-t border-black pt-1">
                                                    VER UBICACIÓN PRINCIPAL EN SISTEMA
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 bg-background border-t border-border flex items-center justify-between gap-4 mt-auto">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">Copias:</span>
                                    <div className="flex items-center border border-border rounded-lg overflow-hidden bg-muted/30">
                                        <button onClick={() => setCopies(Math.max(1, copies - 1))} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-muted font-bold transition-colors">-</button>
                                        <div className="w-10 h-8 sm:w-12 sm:h-10 flex items-center justify-center font-semibold font-mono text-base border-x border-border/50 bg-background">{copies}</div>
                                        <button onClick={() => setCopies(copies + 1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-muted font-bold transition-colors">+</button>
                                    </div>
                                </div>
                                <Button onClick={handlePrint} className="flex-1 shadow-md whitespace-nowrap px-4 sm:px-8 bg-yellow-600 hover:bg-yellow-700 text-white">
                                    <Printer className="h-4 w-4 mr-2" />
                                    Imprimir Alerta
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

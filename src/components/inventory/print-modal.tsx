"use client";

import { useState } from "react";
import { X, Printer, Settings, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductRow } from "@/lib/db/queries/products";

interface PrintModalProps {
    open: boolean;
    onClose: () => void;
    product: ProductRow | null;
}

export function PrintModal({ open, onClose, product }: PrintModalProps) {
    const [copies, setCopies] = useState(1);
    const [labelWidth, setLabelWidth] = useState(100); // 100mm default
    const [customWidth, setCustomWidth] = useState(100); // For custom input
    const [isCustom, setIsCustom] = useState(false);

    if (!product) return null;

    const activeWidth = isCustom ? customWidth : labelWidth;

    const handlePrint = () => {
        const finalWidth = activeWidth > 0 ? activeWidth : 100;
        const printWindow = window.open('', '', `width=800,height=600`);
        if (!printWindow) return;

        let content = '';
        const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${product.code}&scale=3&height=12&includetext=false`;

        for (let i = 0; i < copies; i++) {
            content += `
                <div class="label-container">
                    <div class="label-page">
                        <div class="top-row">
                            <div class="code text-fit">${product.code}</div>
                            <img class="barcode" src="${barcodeUrl}" />
                        </div>

                        <div class="main-info">
                            <div class="desc">${product.name}</div>
                            <div class="sub-desc">
                                ${product.sinonimo || ''} 
                                ${(product.sinonimo && product.description) ? '-' : ''} 
                                ${product.description || ''}
                            </div>
                        </div>

                        <div class="location-box">
                            <div class="loc-item"><span class="label">D:</span> ${product.deposito?.replace(/\\D/g, '') || '0'}</div>
                            <div class="loc-item"><span class="label">E:</span> ${product.estante || '0'}</div>
                            <div class="loc-item"><span class="label">F:</span> ${product.fila || '0'}</div>
                            <div class="loc-item"><span class="label">C:</span> ${product.columna || '0'}</div>
                            <div class="loc-item"><span class="label">U:</span> ${product.posicion || '0'}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Etiqueta ${product.code}</title>
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
                        padding: 2mm 3mm;
                        position: relative;
                        box-sizing: border-box;
                        background: white;
                    }
                    
                    .top-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 2mm;
                        height: 12mm;
                        overflow: hidden;
                    }
                    
                    .code {
                        font-size: ${finalWidth > 90 ? '28pt' : '22pt'};
                        font-weight: 600;
                        letter-spacing: -1px;
                        line-height: 1;
                        color: #000;
                        margin-top: 2px;
                        white-space: nowrap;
                    }
                    
                    .barcode {
                        height: 12mm;
                        width: ${finalWidth > 90 ? '60mm' : '45mm'};
                        object-fit: contain;
                    }

                    .main-info {
                        display: flex;
                        flex-direction: column;
                        gap: 2mm;
                        margin-bottom: 2mm;
                    }

                    .desc {
                        font-size: ${finalWidth > 110 ? '14pt' : '11pt'};
                        font-weight: bold;
                        text-transform: uppercase;
                        line-height: 1.1;
                        max-height: 11mm;
                        overflow: hidden;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                    }

                    .sub-desc {
                        font-size: 11pt;
                        font-weight: normal;
                        color: #000;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .location-box {
                        position: absolute;
                        bottom: 2mm;
                        left: 2mm;
                        right: 2mm;
                        border: 1px solid #000;
                        border-radius: 4px;
                        padding: 1.5mm 3mm;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: ${finalWidth > 110 ? '11pt' : '9pt'};
                        font-weight: bold;
                        background: white;
                    }

                    .loc-item {
                        display: flex;
                        gap: 3px;
                    }
                    
                    .label {
                        color: #000;
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
            <DialogContent className="sm:max-w-2xl overflow-hidden p-0 gap-0 bg-transparent border-none shadow-none">
                <div className="bg-card w-full flex flex-col rounded-xl overflow-hidden shadow-2xl border border-border">
                    {/* Header */}
                    <div className="p-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
                        <div>
                            <DialogTitle className="font-bold text-lg text-foreground">Imprimir Etiqueta</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Zebra/Térmica ({activeWidth}x50mm)</DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>

                    <div className="p-6 sm:p-8 bg-muted/10 flex flex-col items-center gap-6 overflow-y-auto max-h-[80vh]">

                        {/* Size Selector */}
                        <div className="w-full flex flex-col gap-2.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ancho de Etiqueta</label>
                            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                                <button
                                    onClick={() => { setLabelWidth(100); setIsCustom(false); }}
                                    className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border flex-1 ${!isCustom && labelWidth === 100 ? 'bg-background border-primary text-primary ring-1 ring-primary shadow-sm' : 'bg-background/50 border-border text-muted-foreground hover:bg-background'}`}
                                >
                                    10cm (100mm)
                                </button>
                                <button
                                    onClick={() => { setLabelWidth(150); setIsCustom(false); }}
                                    className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border flex-1 ${!isCustom && labelWidth === 150 ? 'bg-background border-primary text-primary ring-1 ring-primary shadow-sm' : 'bg-background/50 border-border text-muted-foreground hover:bg-background'}`}
                                >
                                    15cm (150mm)
                                </button>
                                <button
                                    onClick={() => setIsCustom(true)}
                                    className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border flex-1 ${isCustom ? 'bg-background border-primary text-primary ring-1 ring-primary shadow-sm' : 'bg-background/50 border-border text-muted-foreground hover:bg-background'}`}
                                >
                                    <div className="flex items-center gap-2 justify-center">
                                        <Settings className="h-4 w-4" />
                                        Personalizado
                                    </div>
                                </button>
                            </div>

                            {/* Custom Input */}
                            {isCustom && (
                                <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3 mb-3">
                                        <label className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider">Ancho Exacto (mm):</label>
                                        <Input
                                            type="number"
                                            value={customWidth}
                                            onChange={(e) => setCustomWidth(Number(e.target.value))}
                                            className="w-24 h-8 text-center font-mono font-bold border-yellow-500/30 text-yellow-700 dark:text-yellow-400 focus-visible:ring-yellow-500/20"
                                            min={20}
                                            max={300}
                                        />
                                    </div>
                                    <p className="text-[11px] text-yellow-600 dark:text-yellow-500/90 flex gap-2 leading-relaxed">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>
                                            <strong className="font-semibold">Importante:</strong> Si utiliza un tamaño personalizado, debe seleccionar <strong>"Tamaño de Papel Personalizado"</strong> en el diálogo de impresión de Windows/Chrome para que no se corte la impresión.
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* VISUAL PREVIEW - SCALED TO SCREEN BUT PRESERVING LAYOUT */}
                        <div className="w-full flex justify-center py-6 bg-muted/40 rounded-xl border border-dashed border-border overflow-hidden">
                            <div
                                className="bg-white text-black p-3 rounded shadow-xl flex flex-col relative shrink-0 transform transition-all duration-300 origin-top"
                                style={{
                                    width: `${activeWidth * 3}px`, /* Approx 3px per mm for preview */
                                    height: '200px', // 50mm * 4
                                    transform: activeWidth > 120 ? 'scale(0.8)' : 'scale(1)'
                                }}
                            >
                                {/* Top: Code & Barcode */}
                                <div className="flex justify-between items-start mb-2 h-[50px]">
                                    <div className={`${activeWidth >= 120 ? 'text-5xl' : 'text-4xl'} font-extrabold tracking-tighter leading-none mt-1 whitespace-nowrap`}>
                                        {product.code}
                                    </div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${product.code}&scale=3&height=12&includetext=false`}
                                        className="h-[45px] object-contain mix-blend-multiply"
                                        style={{ width: activeWidth >= 120 ? '240px' : '150px' }}
                                        alt="barcode"
                                    />
                                </div>

                                <div className="flex flex-col gap-1 mb-auto">
                                    <div className={`${activeWidth >= 120 ? 'text-2xl' : 'text-lg'} font-bold uppercase leading-none line-clamp-2`}>
                                        {product.name}
                                    </div>
                                    <div className="text-sm font-medium leading-tight text-neutral-600 truncate">
                                        {product.sinonimo || ''} {(product.sinonimo && product.description) ? '-' : ''} {product.description || ''}
                                    </div>
                                </div>

                                {/* Bottom Location Box */}
                                <div className={`absolute bottom-3 left-3 right-3 border-2 border-black rounded px-2.5 py-1.5 flex justify-between items-center ${activeWidth >= 120 ? 'text-lg' : 'text-[13px]'} font-bold bg-white/90`}>
                                    <div><span className="font-normal text-neutral-600 mr-0.5">D:</span>{product.deposito?.replace(/\\D/g, '') || '0'}</div>
                                    <div><span className="font-normal text-neutral-600 mr-0.5">E:</span>{product.estante || '0'}</div>
                                    <div><span className="font-normal text-neutral-600 mr-0.5">F:</span>{product.fila || '0'}</div>
                                    <div><span className="font-normal text-neutral-600 mr-0.5">C:</span>{product.columna || '0'}</div>
                                    <div><span className="font-normal text-neutral-600 mr-0.5">U:</span>{product.posicion || '0'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full bg-background p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Copias:</span>
                                <div className="flex items-center border border-border rounded-lg overflow-hidden bg-muted/30">
                                    <button
                                        onClick={() => setCopies(Math.max(1, copies - 1))}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-muted font-bold transition-colors"
                                    >
                                        -
                                    </button>
                                    <div className="w-12 h-10 flex items-center justify-center font-semibold font-mono text-lg border-x border-border/50 bg-background">
                                        {copies}
                                    </div>
                                    <button
                                        onClick={() => setCopies(copies + 1)}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-muted font-bold transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <Button
                                onClick={handlePrint}
                                size="lg"
                                className="w-full sm:w-auto shadow-md"
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir Ahora
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

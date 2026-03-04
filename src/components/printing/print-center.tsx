"use client";

import { useState } from 'react';
import { Printer, Search, Box, Tags, Maximize, Trash2, Plus, List } from 'lucide-react';
import { searchProductsForPrint } from '@/app/actions/products';

// Definimos el tipo del resultado del searchProductsForPrint
type PrintProduct = Awaited<ReturnType<typeof searchProductsForPrint>>[number];

export function PrintCenter() {
    const [activeTab, setActiveTab] = useState<'labels' | 'posters'>('labels'); // 'labels' (2x10) or 'posters' (A4 Landscape)
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<PrintProduct | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);

    type SheetItem = {
        product: PrintProduct;
        labelQty: number;
        printCount: number;
        id: number;
    };

    const [sheetItems, setSheetItems] = useState<SheetItem[]>([]);

    // Label Config
    const [labelQty, setLabelQty] = useState(1); // Cantidad QUE DICE la etiqueta (ej: 100 un)
    const [printCount, setPrintCount] = useState(20); // Cantidad de etiquetas A IMPRIMIR

    // Poster Config
    const [posterQty, setPosterQty] = useState(0); // Cantidad total del pallet

    // Label Specs
    const [marginTop, setMarginTop] = useState(5); // mm
    const [marginLeft, setMarginLeft] = useState(5); // mm
    const [labelWidth, setLabelWidth] = useState(200); // mm (Total Page Width)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        setLoadingSearch(true);
        try {
            const results = await searchProductsForPrint(searchTerm);
            if (results && results.length > 0) {
                // Selecciona el primer mejor match
                const bestMatch = results[0];
                setSelectedProduct(bestMatch);
                setPosterQty(bestMatch.cantidad || 0);
            } else {
                alert("Producto no encontrado.");
                setSelectedProduct(null);
            }
        } catch (error) {
            console.error(error);
            alert("Error al buscar producto.");
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleAddToSheet = () => {
        if (!selectedProduct) return;

        const newItem: SheetItem = {
            product: selectedProduct,
            labelQty: labelQty,
            printCount: printCount, // Number of labels to print for this item
            id: Date.now()
        };

        setSheetItems(prev => [...prev, newItem]);
    };

    const handleClearSheet = () => {
        if (confirm('¿Seguro que desea limpiar la planilla?')) {
            setSheetItems([]);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Determine what to show: Sheet or Single Preview
    const isSheetMode = sheetItems.length > 0;

    // Flatten items for rendering 
    const itemsToRender = isSheetMode
        ? sheetItems.flatMap(item => Array(item.printCount).fill(item))
        : (selectedProduct && activeTab === 'labels' ? Array(printCount).fill({ product: selectedProduct, labelQty }) : []);

    // Helper to render Poster Content (Reused for Preview and Print to ensure separation of concerns)
    const renderPosterContent = () => {
        if (!selectedProduct) return null;
        return (
            <div className="border-[4px] border-black h-full flex flex-col bg-white box-border text-black overflow-hidden">

                {/* ── Header ─────────────────────────────────────── */}
                <div className="flex justify-between items-center border-b-[3px] border-black px-8 py-3 shrink-0">
                    <div className="text-lg font-black uppercase tracking-[0.2em] text-black">
                        IDENTIFICACIÓN DE PALLET
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold font-mono leading-none">{new Date().toLocaleDateString()}</div>
                        <div className="text-sm font-mono text-slate-500 print:text-black">{new Date().toLocaleTimeString()}</div>
                    </div>
                </div>

                {/* ── Código + Nombre ─────────────────────────────── */}
                <div className="flex-1 flex flex-col items-center justify-center px-10 gap-3">
                    <div className="text-[128px] leading-[1] font-black tracking-tighter text-black text-center w-full truncate">
                        {selectedProduct.codigo}
                    </div>
                    <div
                        className="text-[44px] font-bold text-black text-center leading-tight w-full"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {selectedProduct.nombre}
                    </div>
                </div>

                {/* ── Cantidad ────────────────────────────────────── */}
                <div className="border-t-[3px] border-dashed border-black mx-8 mb-4" />
                <div className="flex flex-col items-center px-10 pb-4 shrink-0">
                    <div className="text-sm font-black uppercase tracking-[0.25em] text-black mb-2">
                        CANTIDAD CONTENIDA
                    </div>
                    <div className="w-full border-[5px] border-black rounded-2xl flex items-baseline justify-center gap-4 py-3">
                        <span className="text-[90px] leading-none font-black">{posterQty}</span>
                        <span className="text-[40px] font-bold uppercase">{selectedProduct.unidad_medida}</span>
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────── */}
                <div className="border-t-[3px] border-black px-8 py-2 flex justify-between items-center shrink-0">
                    <span className="text-xs font-mono font-bold tracking-widest uppercase">INVENTARIO SYSTEM</span>
                    <div className="flex items-center gap-2">
                        <Box size={14} />
                        <span className="text-xs font-mono font-bold">CONTROL INTERNO</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-background overflow-hidden relative print:block print:h-auto print:overflow-visible print:bg-white print:m-0 print:p-0">
            {/* Global Print Reset: This is the magic sauce to allow multi-page printing in a Dashboard Layout */}
            {activeTab === 'labels' ? (
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 0; }
                        /* Remove height and overflow constraints from ancestors but preserve hidden elements */
                        html, body, main, .h-screen, .overflow-hidden, .flex, .flex-col, .h-full, .h-\\[100dvh\\] { height: auto !important; min-height: auto !important; max-height: none !important; overflow: visible !important; }
                        /* Specifically target the NextJS root container */
                        body > div:first-child { height: auto !important; overflow: visible !important; display: block !important; }
                        /* Force hide layout elements using a high specificity selector */
                        nav, aside, header, footer, [role="navigation"], .no-print, .print\\:hidden, [class*="print:hidden"] { display: none !important; }
                        body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                    }
                `}</style>
            ) : (
                <style>{`
                    @media print {
                        @page {
                            size: 297mm 210mm;
                            margin: 0;
                        }
                        html, body, main, .h-screen, .overflow-hidden, .flex, .flex-col, .h-full, .h-\\[100dvh\\] {
                            height: auto !important;
                            min-height: auto !important;
                            max-height: none !important;
                            overflow: visible !important;
                        }
                        body > div:first-child { height: auto !important; overflow: visible !important; display: block !important; }
                        nav, aside, header, footer, [role="navigation"], .no-print, .print\\:hidden, [class*="print:hidden"] { display: none !important; }
                        body {
                            background: white !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            margin: 0;
                            padding: 0;
                            width: 297mm;
                            height: 210mm;
                        }
                    }
                `}</style>
            )}

            {/* NO-PRINT Toolbar */}
            <div className="bg-card border-b border-border p-6 print:hidden shrink-0 flex flex-col gap-6 z-10 w-full relative">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <Printer className="text-primary" />
                        Centro de Impresión A4
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Genere etiquetas de fraccionamiento o carteles A4.
                    </p>
                </div>

                {/* 1. Select Product */}
                <div className="flex gap-4 items-end bg-muted/20 p-4 rounded-xl border border-border">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Buscar Producto</label>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Ej: TC001 o Tornillo..."
                                className="flex-1 p-2 bg-background border border-input rounded-lg text-sm font-mono font-bold uppercase text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            <button type="submit" disabled={loadingSearch} className="px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center justify-center">
                                {loadingSearch ? <div className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <Search size={18} />}
                            </button>
                        </form>
                    </div>
                    {selectedProduct && (
                        <div className="flex-[2] border-l border-border pl-4">
                            <div className="text-xs text-muted-foreground font-bold uppercase">Seleccionado</div>
                            <div className="font-bold text-lg text-foreground line-clamp-1">{selectedProduct.nombre}</div>
                            <div className="text-sm text-muted-foreground font-mono">{selectedProduct.codigo}</div>
                        </div>
                    )}
                </div>

                {selectedProduct && (
                    <div className="flex gap-8 flex-wrap">
                        {/* 2. Select Tool Type */}
                        <div className="w-48 flex flex-col gap-2 shrink-0">
                            <button
                                onClick={() => setActiveTab('labels')}
                                className={`p-3 rounded-xl border text-left transition-all ${activeTab === 'labels' ? 'bg-primary/5 border-primary text-primary ring-1 ring-primary' : 'bg-card border-border hover:bg-muted text-foreground'}`}
                            >
                                <div className="font-bold flex items-center gap-2"><Tags size={16} /> Etiquetas</div>
                                <div className="text-xs opacity-70">20 por hoja (2x10)</div>
                            </button>
                            <button
                                onClick={() => setActiveTab('posters')}
                                className={`p-3 rounded-xl border text-left transition-all ${activeTab === 'posters' ? 'bg-primary/5 border-primary text-primary ring-1 ring-primary' : 'bg-card border-border hover:bg-muted text-foreground'}`}
                            >
                                <div className="font-bold flex items-center gap-2"><Maximize size={16} /> Cartel A4</div>
                                <div className="text-xs opacity-70">Para Pallet / FIFO</div>
                            </button>
                        </div>

                        {/* 3. Configuration */}
                        <div className="flex-1 min-w-[300px] bg-card border border-border rounded-xl p-4 flex items-end justify-between flex-wrap gap-4">

                            {activeTab === 'labels' && (
                                <div className="flex flex-wrap gap-4 items-end w-full">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Contenido (Un)</label>
                                        <input type="number" value={labelQty} onChange={e => setLabelQty(Number(e.target.value))} className="p-2 border border-input bg-background rounded-lg w-20 font-bold text-center text-foreground" />
                                        <span className="ml-1 text-sm text-muted-foreground">{selectedProduct.unidad_medida}</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Cant. Etiquetas</label>
                                        <input type="number" value={printCount} onChange={e => setPrintCount(Number(e.target.value))} className="p-2 border border-input bg-background rounded-lg w-20 font-bold text-center text-foreground" />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase">Ancho (mm)</label>
                                        <input type="number" value={labelWidth} onChange={e => setLabelWidth(Number(e.target.value))} className="p-2 border border-input bg-background rounded-lg w-16 font-bold text-center text-xs text-foreground" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase">Marg. Sup (mm)</label>
                                        <input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} className="p-2 border border-input bg-background rounded-lg w-16 font-bold text-center text-xs text-foreground" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase">Marg. Izq (mm)</label>
                                        <input type="number" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} className="p-2 border border-input bg-background rounded-lg w-16 font-bold text-center text-xs text-foreground" />
                                    </div>

                                    <div className="flex-1 min-w-[20px]"></div>

                                    <button
                                        onClick={handleAddToSheet}
                                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold rounded-lg flex items-center gap-2 ml-auto"
                                    >
                                        <Plus size={18} /> Añadir
                                    </button>
                                </div>
                            )}

                            {activeTab === 'posters' && (
                                <div className="flex gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Cantidad Total Pallet</label>
                                        <input type="number" value={posterQty} onChange={e => setPosterQty(Number(e.target.value))} className="p-2 border border-input bg-background rounded-lg w-32 font-bold text-center text-lg text-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">{selectedProduct.unidad_medida}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 shrink-0 ml-auto items-end w-full lg:w-auto justify-end">
                                {isSheetMode && (
                                    <button onClick={handleClearSheet} className="px-4 py-3 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold rounded-xl flex items-center gap-2 border border-destructive/20">
                                        <Trash2 size={20} /> Limpiar
                                    </button>
                                )}
                                <button onClick={handlePrint} className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-sm">
                                    <Printer size={20} /> {activeTab === 'labels' && isSheetMode ? `IMPRIMIR (${itemsToRender.length})` : 'IMPRIMIR'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PREVIEW AREA (Also Print Area) */}
            <div className="flex-1 bg-muted/30 p-8 overflow-y-auto flex justify-center print:block print:p-0 print:m-0 print:bg-white print:overflow-visible relative -z-0">

                {/* Visual Indicator for Sheet Mode */}
                {isSheetMode && (
                    <div className="absolute top-4 left-4 print:hidden bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 z-10">
                        <List size={14} /> Planilla Activa ({itemsToRender.length} etiquetas)
                    </div>
                )}

                {/* 1. LABELS VIEW */}
                {activeTab === 'labels' && (
                    <>
                        {(selectedProduct || isSheetMode) ? (
                            <div className="flex justify-center w-full min-h-[500px] print:block print:w-auto print:min-h-0">
                                <div
                                    className={`bg-white text-black shadow-2xl print:shadow-none min-h-[297mm] grid content-start gap-x-[0mm] gap-y-[0mm] relative mx-auto print:mx-0
                                    ${labelWidth < 140 ? 'grid-cols-1' : 'grid-cols-2'}`}
                                    style={{
                                        width: `${labelWidth}mm`,
                                        paddingTop: `${marginTop}mm`,
                                        paddingLeft: `${marginLeft}mm`,
                                        paddingRight: `0mm`
                                    }}
                                >

                                    {itemsToRender.map((item, i) => (
                                        <div key={i} className="h-[29.7mm] border border-dashed border-slate-300 flex flex-col p-[2mm] pt-[1mm] overflow-hidden relative break-inside-avoid page-break-inside-avoid print:border-transparent">
                                            {/* Cut lines helper */}
                                            <div className="absolute inset-0 border-[0.5px] border-slate-100 print:border-slate-300 pointer-events-none"></div>

                                            {/* Top Row: Code + Qty */}
                                            <div className="flex justify-between items-start z-10 leading-none mb-0.5">
                                                <div className="font-black text-lg tracking-tight text-black">{item.product.codigo}</div>
                                                <div className="font-bold text-base text-black">{item.labelQty} <span className="text-[9px] align-top">{item.product.unidad_medida}</span></div>
                                            </div>

                                            {/* Name Row */}
                                            <div className="z-10 mb-auto min-h-[14px]">
                                                <div className="text-[9px] font-bold line-clamp-2 leading-tight uppercase mr-8 text-black">{item.product.nombre}</div>
                                                <div className="text-[8px] text-slate-500 truncate mr-8">{item.product.sinonimo || ''}</div>
                                            </div>

                                            {/* Bottom Row: Location + Barcode */}
                                            <div className="flex items-end justify-between z-10 mt-0.5">
                                                {/* Location Box */}
                                                <div className="border border-black rounded-[2px] px-1 py-[1px] flex gap-1 text-[7px] font-bold bg-white text-black leading-none">
                                                    <span>D:{item.product.ubicacion?.deposito?.replace(/\D/g, '') || '0'}</span>
                                                    <span>S:{item.product.ubicacion?.sector || '-'}</span>
                                                    <span>E:{item.product.ubicacion?.estante || '0'}</span>
                                                    <span>F:{item.product.ubicacion?.fila || '0'}</span>
                                                    <span>C:{item.product.ubicacion?.columna || '0'}</span>
                                                </div>

                                                {/* Barcode */}
                                                <div className="absolute bottom-[2mm] right-[2mm] w-16 h-8 bg-white">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${item.product.codigo}&scale=1&height=6&includetext=false`}
                                                        className="w-full h-full object-contain mix-blend-multiply"
                                                        alt=""
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center opacity-20 select-none mt-20 h-64 print:hidden">
                                <Printer size={64} className="mb-4" />
                                <p className="font-bold text-2xl">Seleccione un producto para previsualizar</p>
                            </div>
                        )}
                    </>
                )}

                {/* 2. POSTER VIEW (A4 Landscape) */}
                {activeTab === 'posters' && selectedProduct && (
                    <>
                        {/* PREVIEW ONLY CONTAINER (Scaled) - Hidden on Print */}
                        <div className="w-full overflow-auto flex justify-center items-start py-4 px-4 print:hidden min-h-[300px]">
                            <div
                                className="origin-top-left transition-transform duration-300 shadow-2xl"
                                style={{
                                    transform: 'scale(0.38)',
                                    width: '297mm',
                                    height: '210mm',
                                    flexShrink: 0,
                                }}
                            >
                                <div className="w-[297mm] h-[210mm] relative bg-white">
                                    {renderPosterContent()}
                                </div>
                            </div>
                        </div>

                        {/* PRINT ONLY CONTAINER (Full Scale) - Visible only on Print - NO SCALING */}
                        <div className="hidden print:block w-[297mm] h-[210mm] bg-white p-0 m-0 box-border overflow-hidden">
                            {renderPosterContent()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

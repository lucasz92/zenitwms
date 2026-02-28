"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Package, MapPin, Box, AlertTriangle } from "lucide-react";
import { createProduct, updateProduct } from "@/app/actions/products";
import { UNIT_LABELS, type UnitType } from "@/types/product";
import type { ProductRow } from "@/lib/db/queries/products";
import { cn } from "@/lib/utils";

interface ProductModalProps {
    open: boolean;
    onClose: () => void;
    product?: ProductRow | null;
}

type Tab = "info" | "location" | "stock";

interface FormData {
    // Básicos
    code: string;
    name: string;
    description: string;
    categoria: string;
    sinonimo: string;
    proveedor: string;
    observacion: string;
    // Stock
    price: string;
    stock: string;
    min_stock: string;
    unit_type: UnitType;
    // Ubicación
    deposito: string;
    sector: string;
    fila: string;
    columna: string;
    estante: string;
    posicion: string;
    orientacion: string;
}

const EMPTY: FormData = {
    code: "",
    name: "",
    description: "",
    categoria: "General",
    sinonimo: "",
    proveedor: "",
    observacion: "",
    price: "",
    stock: "0",
    min_stock: "0",
    unit_type: "un",
    deposito: "DEP01",
    sector: "",
    fila: "",
    columna: "",
    estante: "",
    posicion: "",
    orientacion: "",
};

function toForm(p: ProductRow): FormData {
    return {
        code: p.code,
        name: p.name,
        description: p.description ?? "",
        categoria: (p as any).categoria ?? "General",
        sinonimo: (p as any).sinonimo ?? "",
        proveedor: (p as any).proveedor ?? "",
        observacion: (p as any).observacion ?? "",
        price: p.price != null ? String(p.price) : "",
        stock: String(p.stock),
        min_stock: String(p.min_stock),
        unit_type: p.unit_type as UnitType,
        deposito: (p as any).deposito ?? "DEP01",
        sector: (p as any).sector ?? "",
        fila: (p as any).fila ?? "",
        columna: (p as any).columna ?? "",
        estante: (p as any).estante ?? "",
        posicion: (p as any).posicion ?? "",
        orientacion: (p as any).orientacion ?? "",
    };
}

const CATEGORIAS = ["General", "Bulonería", "Electrónica", "Materia Prima", "Herramientas", "Insumos", "Repuestos", "Consumibles"];
const DEPOSITOS = ["DEP01", "DEPCA", "GENERAL", "EXTERNO", "PATIO"];
const SECTORES = ["PAÑOL 1", "PAÑOL 2", "PAÑOL 3", "COBERTIZO", "EXTERNO", "PATIO", "OFICINA"];
const UNIDADES: UnitType[] = ["un", "mt", "mt2", "kg", "lt", "caja"];

export function ProductModal({ open, onClose, product }: ProductModalProps) {
    const isEdit = !!product;
    const [form, setForm] = useState<FormData>(product ? toForm(product) : EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("info");

    useEffect(() => {
        if (open) {
            setForm(product ? toForm(product) : EMPTY);
            setError(null);
            setActiveTab("info");
        }
    }, [open, product]);

    const handleOpenChange = (val: boolean) => {
        if (!val && !loading) onClose();
    };

    const set = (field: keyof FormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const setVal = (field: keyof FormData) => (val: string) =>
        setForm((f) => ({ ...f, [field]: val }));

    const locationPreview = [
        form.deposito,
        form.sector ? `${form.sector}` : "",
        [form.fila, form.columna, form.estante].filter(Boolean).join(""),
        form.posicion,
    ].filter(Boolean).join("-");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: form.price,
            stock: form.stock,
            min_stock: form.min_stock,
            unit_type: form.unit_type,
            categoria: form.categoria,
            sinonimo: form.sinonimo.trim() || null,
            proveedor: form.proveedor.trim() || null,
            observacion: form.observacion.trim() || null,
            deposito: form.deposito.trim().toUpperCase() || null,
            sector: form.sector.trim().toUpperCase() || null,
            fila: form.fila.trim() || null,
            columna: form.columna.trim() || null,
            estante: form.estante.trim() || null,
            posicion: form.posicion.trim() || null,
            orientacion: form.orientacion.trim() || null,
        };

        const result = isEdit
            ? await updateProduct(product.id, payload)
            : await createProduct(payload);

        if (result.ok) {
            onClose();
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    /** Shared input class */
    const inputCls = "h-9 text-sm font-medium bg-muted/40 border-border focus:border-primary focus:ring-2 focus:ring-primary/15";

    const TabBtn = ({ id, icon: Icon, label }: { id: Tab; icon: React.ElementType; label: string }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-semibold transition-all",
                activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </button>
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-5 pb-0">
                    <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        {isEdit
                            ? `Editando: ${product.code} — ${product.name}`
                            : "Completá los datos para registrar un nuevo producto en el inventario."}
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex border-b border-border mt-2 px-2">
                    <TabBtn id="info" icon={Package} label="Información" />
                    <TabBtn id="location" icon={MapPin} label="Ubicación" />
                    <TabBtn id="stock" icon={Box} label="Stock" />
                </div>

                <form id="product-form" onSubmit={handleSubmit}>
                    <div className="px-6 py-5 min-h-[320px]">

                        {/* ─── TAB: INFORMACIÓN ─── */}
                        {activeTab === "info" && (
                            <div className="grid grid-cols-2 gap-4">
                                {/* Código + Categoría */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Código <span className="text-destructive">*</span></Label>
                                    <Input
                                        value={form.code}
                                        onChange={set("code")}
                                        placeholder="XXX-000"
                                        disabled={loading}
                                        className={cn(inputCls, "font-mono uppercase tracking-wider")}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Categoría</Label>
                                    <Select value={form.categoria} onValueChange={setVal("categoria")} disabled={loading}>
                                        <SelectTrigger className={cn(inputCls, "w-full")}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIAS.map((c) => (
                                                <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Descripción */}
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs">Descripción / Nombre <span className="text-destructive">*</span></Label>
                                    <Input
                                        value={form.name}
                                        onChange={set("name")}
                                        placeholder="Nombre completo del producto..."
                                        disabled={loading}
                                        className={cn(inputCls, "text-base font-semibold")}
                                    />
                                </div>

                                {/* Sinónimo + Proveedor */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Sinónimo / Alias</Label>
                                    <Input
                                        value={form.sinonimo}
                                        onChange={set("sinonimo")}
                                        placeholder="Ej: Tuerca 10mm..."
                                        disabled={loading}
                                        className={inputCls}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Proveedor</Label>
                                    <Input
                                        value={form.proveedor}
                                        onChange={set("proveedor")}
                                        placeholder="Nombre del proveedor"
                                        disabled={loading}
                                        className={inputCls}
                                    />
                                </div>

                                {/* Descripción (campo original) */}
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs">Descripción adicional</Label>
                                    <Input
                                        value={form.description}
                                        onChange={set("description")}
                                        placeholder="Especificación técnica opcional..."
                                        disabled={loading}
                                        className={inputCls}
                                    />
                                </div>

                                {/* Observaciones */}
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs">Notas / Observaciones</Label>
                                    <Textarea
                                        value={form.observacion}
                                        onChange={set("observacion")}
                                        placeholder="Detalles adicionales, condiciones especiales..."
                                        disabled={loading}
                                        rows={3}
                                        className="text-sm bg-muted/40 border-border resize-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ─── TAB: UBICACIÓN ─── */}
                        {activeTab === "location" && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Depósito Principal</Label>
                                        <Input
                                            list="depositos-list"
                                            value={form.deposito}
                                            onChange={(e) => setForm(f => ({ ...f, deposito: e.target.value.toUpperCase() }))}
                                            placeholder="DEP01"
                                            disabled={loading}
                                            className={cn(inputCls, "uppercase")}
                                        />
                                        <datalist id="depositos-list">
                                            {DEPOSITOS.map(d => <option key={d} value={d} />)}
                                        </datalist>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Sector / Área</Label>
                                        <Input
                                            list="sectores-list"
                                            value={form.sector}
                                            onChange={(e) => setForm(f => ({ ...f, sector: e.target.value.toUpperCase() }))}
                                            placeholder="Ej: PAÑOL 1"
                                            disabled={loading}
                                            className={cn(inputCls, "uppercase")}
                                        />
                                        <datalist id="sectores-list">
                                            {SECTORES.map(s => <option key={s} value={s} />)}
                                        </datalist>
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-xs">Orientación</Label>
                                        <Input
                                            value={form.orientacion}
                                            onChange={set("orientacion")}
                                            placeholder="Ej: Frente / Fondo / Norte..."
                                            disabled={loading}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>

                                {/* Fila / Columna / Estante / Posición */}
                                <div className="grid grid-cols-4 gap-3">
                                    {([
                                        { label: "Fila", key: "fila" },
                                        { label: "Columna", key: "columna" },
                                        { label: "Estante", key: "estante" },
                                        { label: "Posición", key: "posicion" },
                                    ] as const).map(({ label, key }) => (
                                        <div key={key} className="rounded-xl border border-border bg-muted/30 p-3 text-center hover:border-primary/40 transition-colors">
                                            <Label className="mb-2 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
                                            <Input
                                                value={form[key]}
                                                onChange={set(key)}
                                                disabled={loading}
                                                placeholder="—"
                                                className="h-8 border-none bg-transparent text-center font-mono font-bold text-base shadow-none focus-visible:ring-0 p-0"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Preview */}
                                {locationPreview && (
                                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                                        <div>
                                            <p className="text-xs font-semibold text-primary">Código de ubicación generado</p>
                                            <p className="mt-0.5 font-mono text-sm font-bold tracking-widest text-foreground">{locationPreview}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── TAB: STOCK ─── */}
                        {activeTab === "stock" && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                                        <Label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Stock Actual</Label>
                                        <div className="flex items-baseline gap-2 mt-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={form.stock}
                                                onChange={set("stock")}
                                                disabled={loading}
                                                className="h-auto border-none bg-transparent p-0 text-4xl font-black shadow-none focus-visible:ring-0 w-full"
                                            />
                                            <span className="text-sm font-bold text-muted-foreground">{form.unit_type}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Stock Mínimo (alerta)</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={form.min_stock}
                                                onChange={set("min_stock")}
                                                disabled={loading}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Precio ($)</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={form.price}
                                                onChange={set("price")}
                                                placeholder="0.00"
                                                disabled={loading}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Unidad de medida */}
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unidad de Medida</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {UNIDADES.map((u) => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, unit_type: u }))}
                                                disabled={loading}
                                                className={cn(
                                                    "min-w-[52px] rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all",
                                                    form.unit_type === u
                                                        ? "border-primary bg-primary text-primary-foreground shadow-md -translate-y-0.5"
                                                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                                                )}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4 gap-2">
                        <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
                            <span className="text-destructive font-bold">*</span> Campos obligatorios
                        </p>
                        <Button variant="outline" size="sm" onClick={onClose} disabled={loading} type="button">
                            Cancelar
                        </Button>
                        <Button type="submit" form="product-form" size="sm" disabled={loading}>
                            {loading ? (
                                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Guardando...</>
                            ) : isEdit ? "Guardar cambios" : "Agregar producto"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

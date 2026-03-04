"use client";

import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateProductImage } from "@/app/actions/products";
import type { ProductRow } from "@/lib/db/queries/products";
import { cn } from "@/lib/utils";

interface ProductCardProps {
    product: ProductRow;
}

export function ProductCard({ product }: ProductCardProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(product.image_url);
    const [error, setError] = useState<string | null>(null);
    const [justUploaded, setJustUploaded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasImage = !!localImageUrl;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Si ya tiene imagen, confirmamos antes de reemplazar
        if (hasImage) {
            const ok = window.confirm(
                `"${product.code}" ya tiene una imagen.\n¿Querés reemplazarla con la nueva foto?`
            );
            if (!ok) {
                e.target.value = "";
                return;
            }
        }

        let supabase;
        try {
            supabase = createClient();
        } catch {
            setError("Faltan las variables de entorno de Supabase en .env.local");
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Solo se permiten imágenes.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("La imagen no puede pesar más de 5MB.");
            return;
        }

        try {
            setIsUploading(true);
            setError(null);
            setJustUploaded(false);

            const fileExt = file.name.split(".").pop() || "jpg";
            const fileName = `${product.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("products")
                .upload(fileName, file, { cacheControl: "3600", upsert: true });

            if (uploadError) {
                throw new Error("No se pudo subir la imagen. ¿El bucket 'products' existe y es público?");
            }

            const { data: publicUrlData } = supabase.storage
                .from("products")
                .getPublicUrl(fileName);

            const publicUrl = publicUrlData.publicUrl;

            const res = await updateProductImage(product.id, publicUrl);

            if (!res.ok) {
                throw new Error(res.error || "Error al actualizar la base de datos.");
            }

            setLocalImageUrl(publicUrl);
            setJustUploaded(true);
            setTimeout(() => setJustUploaded(false), 3000);

        } catch (err: any) {
            setError(err.message || "Error desconocido al procesar la foto.");
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-md">

            {/* Badge stock */}
            <div className="absolute right-2 top-2 z-10">
                <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shadow-sm backdrop-blur-md",
                    product.stock > 0
                        ? "bg-black/50 text-white dark:bg-white/80 dark:text-black"
                        : "bg-destructive/80 text-white"
                )}>
                    {product.stock} {product.unit_type}
                </span>
            </div>

            {/* Badge "foto subida" */}
            {justUploaded && (
                <div className="absolute left-2 top-2 z-10 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow animate-in fade-in slide-in-from-top-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Guardada
                </div>
            )}

            {/* Área de imagen */}
            <div className="relative aspect-square w-full bg-muted/30 overflow-hidden flex items-center justify-center">

                {/* Spinner de carga */}
                {isUploading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">Subiendo...</span>
                    </div>
                )}

                {/* Imagen o placeholder */}
                {localImageUrl ? (
                    <img
                        src={localImageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground/40 bg-muted/20">
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase">Sin foto</span>
                    </div>
                )}

                {/* Overlay de acción */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <label className="cursor-pointer flex flex-col items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        <div className={cn(
                            "rounded-full p-3 shadow-xl hover:scale-110 active:scale-95 transition-transform",
                            hasImage
                                ? "bg-amber-400 text-black"   // amarillo si ya tiene foto → "reemplazar"
                                : "bg-white text-black"        // blanco si no tiene → "agregar"
                        )}>
                            {hasImage
                                ? <RefreshCw className="h-5 w-5" />
                                : <Camera className="h-5 w-5" />
                            }
                        </div>
                        <span className="text-white text-xs font-bold drop-shadow-md">
                            {hasImage ? "Cambiar foto" : "Tomar foto"}
                        </span>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col p-3 border-t bg-card">
                <h3 className="text-sm font-bold leading-tight line-clamp-2" title={product.name}>
                    {product.name}
                </h3>
                <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs font-mono text-muted-foreground">{product.code}</p>
                    {hasImage && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            ✓ Con foto
                        </span>
                    )}
                </div>

                {error && (
                    <div className="mt-2 text-[10px] text-destructive bg-destructive/10 p-1.5 rounded leading-tight">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}

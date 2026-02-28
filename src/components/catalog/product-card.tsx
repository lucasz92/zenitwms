"use client";

import { useState } from "react";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let supabase;
        try {
            supabase = createClient();
        } catch (err: any) {
            setError("Faltan las variables de entorno de Supabase en .env.local");
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Solo se permiten imágenes.");
            return;
        }

        // Limitar tamaño a 5MB aprox
        if (file.size > 5 * 1024 * 1024) {
            setError("La imagen no puede pesar más de 5MB.");
            return;
        }

        try {
            setIsUploading(true);
            setError(null);

            // 1. Crear nombre único para el archivo
            const fileExt = file.name.split(".").pop();
            const fileName = `${product.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 2. Subir a Supabase Storage (Bucket: 'products')
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("products")
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (uploadError) {
                console.error("Error subiendo a Supabase Storage:", uploadError);
                throw new Error("No se pudo subir la imagen al Bucket. ¿Aseguraste que el bucket 'products' exista y sea público?");
            }

            // 3. Obtener URL pública
            const { data: publicUrlData } = supabase.storage
                .from("products")
                .getPublicUrl(filePath);

            const publicUrl = publicUrlData.publicUrl;

            // 4. Actualizar la base de datos (Server Action)
            const res = await updateProductImage(product.id, publicUrl);

            if (!res.ok) {
                throw new Error(res.error || "Error al actualizar la base de datos.");
            }

            setLocalImageUrl(publicUrl);
        } catch (err: any) {
            setError(err.message || "Error desconocido al procesar la foto.");
        } finally {
            setIsUploading(false);
            // Limpiar el input para permitir volver a seleccionar la misma foto si hubo error
            e.target.value = "";
        }
    };

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all hover:shadow-md">

            {/* Etiqueta de Stock */}
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

            {/* Área de Imagen */}
            <div className="relative aspect-square w-full bg-muted/30 overflow-hidden flex items-center justify-center">
                {isUploading ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground w-full h-full bg-background/80 backdrop-blur-sm absolute inset-0 z-20">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs font-medium">Subiendo foto...</span>
                    </div>
                ) : null}

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

                {/* Botón flotante para la cámara */}
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity flex items-center justify-center group-hover:opacity-100 backdrop-blur-[2px]">
                    <label className="cursor-pointer flex flex-col items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        <div className="bg-white text-black rounded-full p-3 shadow-xl hover:scale-110 active:scale-95 transition-transform">
                            <Camera className="h-5 w-5" />
                        </div>
                        <span className="text-white text-xs font-bold shadow-black drop-shadow-md">Tomar Foto</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment" /* Clave para mobile: abre la cámara trasera */
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </div>

            {/* Info del Producto */}
            <div className="flex flex-col p-3 border-t bg-card h-full">
                <h3 className="text-sm font-bold leading-tight line-clamp-2" title={product.name}>
                    {product.name}
                </h3>
                <p className="mt-1 text-xs font-mono text-muted-foreground">
                    {product.code}
                </p>

                {error && (
                    <div className="mt-2 text-[10px] text-destructive bg-destructive/10 p-1.5 rounded leading-tight">
                        {error}
                    </div>
                )}
            </div>

        </div>
    );
}

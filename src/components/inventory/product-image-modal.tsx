"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { X, UploadCloud, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProductRow } from "@/lib/db/queries/products";
import { updateProductImage } from "@/app/actions/products";
import { createClient } from "@/lib/supabase/client";

interface ProductImageModalProps {
    open: boolean;
    onClose: () => void;
    product: ProductRow | null;
}

export function ProductImageModal({ open, onClose, product }: ProductImageModalProps) {
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!product) return null;

    // Start with the existing image or any local preview
    const currentImage = previewUrl || product.image_url;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor selecciona un archivo de imagen válido.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("La imagen es muy pesada. Máximo 5MB permitidos.");
            return;
        }

        try {
            setLoading(true);

            // 1. Show local preview instantly
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);

            // 2. Upload Logic using secure API route
            const formData = new FormData();
            formData.append("file", file);
            formData.append("productId", product.id);

            const uploadRes = await fetch("/api/upload/image", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json();
                throw new Error(errorData.error || "Error al subir la imagen.");
            }

            const { url: uploadedUrl } = await uploadRes.json();

            // Then call the server action
            const result = await updateProductImage(product.id, uploadedUrl);
            if (!result.ok) throw new Error(result.error);

            toast.success("Fotografía actualizada exitosamente.");

        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Hubo un problema al subir la imagen.");
            setPreviewUrl(null); // Revert
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset input
            }
        }
    };

    const handleDelete = async () => {
        if (!currentImage) return;

        try {
            setLoading(true);
            const result = await updateProductImage(product.id, null);
            if (!result.ok) throw new Error(result.error);

            setPreviewUrl(null);
            toast.success("Imagen eliminada.");
        } catch (error) {
            console.error("Delete error", error);
            toast.error("No se pudo eliminar la imagen.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && !loading && onClose()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <ImageIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-foreground leading-none">Fotografía del Producto</h3>
                            <p className="text-xs text-muted-foreground mt-1 font-mono">{product.code} - {product.name}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Cerrar</span>
                    </Button>
                </div>

                {/* Body - Image Viewer / Uploader */}
                <div className="p-6 flex flex-col items-center justify-center min-h-[300px] relative">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        disabled={loading}
                    />

                    {currentImage ? (
                        <div className="relative w-full aspect-square max-h-[320px] rounded-lg overflow-hidden border border-border group bg-muted/10 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentImage}
                                alt={product.name}
                                className={cn(
                                    "max-w-full max-h-full object-contain transition-all duration-300",
                                    loading && "opacity-50 blur-sm scale-95"
                                )}
                            />

                            {/* Overlay Controls */}
                            {!loading && (
                                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <Button
                                        variant="secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="shadow-lg"
                                    >
                                        <UploadCloud className="h-4 w-4 mr-2" />
                                        Cambiar
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={handleDelete}
                                        className="shadow-lg"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-background/80 p-3 rounded-full shadow-lg">
                                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            onClick={() => !loading && fileInputRef.current?.click()}
                            className={cn(
                                "w-full aspect-square max-h-[280px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 transition-colors",
                                loading ? "bg-muted/30 cursor-wait" : "hover:border-primary/50 hover:bg-primary/5 cursor-pointer group"
                            )}
                        >
                            {loading ? (
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            ) : (
                                <>
                                    <div className="p-4 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                                        <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="text-center px-4">
                                        <p className="text-sm font-semibold text-foreground">Click para subir foto</p>
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG o WEBP (Max. 5MB)</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-muted/10 border-t border-border flex justify-end">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

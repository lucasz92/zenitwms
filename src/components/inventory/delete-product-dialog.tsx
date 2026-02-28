"use client";

import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { deleteProduct } from "@/app/actions/products";
import type { ProductRow } from "@/lib/db/queries/products";

interface DeleteProductDialogProps {
    open: boolean;
    onClose: () => void;
    product: ProductRow | null;
}

export function DeleteProductDialog({
    open,
    onClose,
    product,
}: DeleteProductDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!product) return;
        setLoading(true);
        setError(null);

        const result = await deleteProduct(product.id);

        if (result.ok) {
            onClose();
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                        Estás por eliminar{" "}
                        <span className="font-semibold text-foreground">
                            [{product?.code}] {product?.name}
                        </span>
                        . Esta acción no se puede deshacer y eliminará también todas sus
                        ubicaciones registradas.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {error && (
                    <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                        {error}
                    </p>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            "Sí, eliminar"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

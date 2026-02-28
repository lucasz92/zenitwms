"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { inventoryMovements, products, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { ActionResult } from "./products";

const MovementSchema = z.object({
    productId: z.string().uuid("Seleccioná un producto"),
    type: z.enum(["entry", "exit", "adjustment", "transfer"]),
    quantity: z.preprocess(
        (v) => Number(v),
        z.number().int().positive("La cantidad debe ser mayor a 0")
    ),
    notes: z.string().max(500).optional().nullable(),
});

export async function createMovement(
    formData: Record<string, unknown>
): Promise<ActionResult> {
    try {
        const { userId } = await auth();
        if (!userId) return { ok: false, error: "No autenticado" };

        const parsed = MovementSchema.safeParse(formData);
        if (!parsed.success) {
            return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
        }

        const { productId, type, quantity, notes } = parsed.data;

        // Obtener stock actual
        const [product] = await db
            .select({ stock: products.stock, name: products.name })
            .from(products)
            .where(eq(products.id, productId))
            .limit(1);

        if (!product) return { ok: false, error: "Producto no encontrado" };

        // Calcular nuevo stock
        let newStock: number;
        if (type === "entry") {
            newStock = product.stock + quantity;
        } else if (type === "exit") {
            if (product.stock < quantity) {
                return {
                    ok: false,
                    error: `Stock insuficiente. Disponible: ${product.stock}`,
                };
            }
            newStock = product.stock - quantity;
        } else if (type === "adjustment") {
            newStock = quantity; // El campo cantidad es el nuevo stock absoluto
        } else {
            // transfer: por ahora solo resta del origen
            if (product.stock < quantity) {
                return { ok: false, error: `Stock insuficiente. Disponible: ${product.stock}` };
            }
            newStock = product.stock - quantity;
        }

        // Asegurar que el usuario existe en nuestra tabla, o crearlo
        await db
            .insert(users)
            .values({ id: userId, email: `${userId}@clerk`, role: "employee" })
            .onConflictDoNothing();

        // Insertar movimiento + actualizar stock en transacción
        await db.transaction(async (tx) => {
            await tx.insert(inventoryMovements).values({
                productId,
                userId,
                type,
                quantity,
                notes: notes ?? null,
            });

            await tx
                .update(products)
                .set({ stock: newStock, updatedAt: new Date() })
                .where(eq(products.id, productId));
        });

        revalidatePath("/dashboard/movements");
        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard");
        return { ok: true };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        return { ok: false, error: msg };
    }
}

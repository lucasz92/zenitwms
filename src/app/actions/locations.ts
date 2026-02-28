"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { ActionResult } from "./products";

const CreateRackSchema = z.object({
    warehouse: z.string().min(1, "El depósito es requerido"),
    sector: z.string().min(1, "El sector es requerido"),
    row: z.string().min(1, "La fila/pasillo es requerida"),
    colsStart: z.coerce.number().int().min(1),
    colsEnd: z.coerce.number().int().min(1),
    shelves: z.coerce.number().int().min(1).max(20, "Máximo 20 estantes de alto"),
});

/**
 * Crea las coordenadas "físicas" de una estantería entera.
 * Ej: Fila A, Columnas de la 1 a la 10, 4 estantes de alto = 40 records.
 */
export async function createRack(formData: Record<string, unknown>): Promise<ActionResult> {
    try {
        const { userId } = await auth();
        if (!userId) return { ok: false, error: "No autenticado" };

        const parsed = CreateRackSchema.safeParse(formData);
        if (!parsed.success) {
            return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
        }

        const { warehouse, sector, row, colsStart, colsEnd, shelves } = parsed.data;

        if (colsStart > colsEnd) {
            return { ok: false, error: "La columna inicial no puede ser mayor a la final" };
        }

        // Generar la matriz de ubicaciones
        const newLocations = [];
        for (let c = colsStart; c <= colsEnd; c++) {
            for (let s = 1; s <= shelves; s++) {
                // Formatear columna a 2 dígitos (ej: 01, 02)
                const colStr = c.toString().padStart(2, "0");
                newLocations.push({
                    warehouse,
                    sector,
                    row,
                    column: colStr,
                    shelf: s.toString(),
                });
            }
        }

        if (newLocations.length > 200) {
            return { ok: false, error: "Estás intentando crear demasiadas ubicaciones de golpe (>200). Hacelo en partes." };
        }

        // Insertar el bloque
        await db.insert(locations).values(newLocations).onConflictDoNothing();

        revalidatePath("/dashboard/locations");
        return { ok: true };
    } catch (err) {
        console.error("[createRack]", err);
        return { ok: false, error: "Error al crear la estantería" };
    }
}

const AssignProductSchema = z.object({
    locationId: z.string().uuid("Ubicación inválida"),
    productId: z.string().uuid("Producto inválido").nullable(), // null para vaciar
    isPrimary: z.boolean().default(false),
});

/**
 * Asigna un producto a una ubicación, o la vacía si productId es null.
 */
export async function assignProductToLocation(formData: Record<string, unknown>): Promise<ActionResult> {
    try {
        const { userId } = await auth();
        if (!userId) return { ok: false, error: "No autenticado" };

        const parsed = AssignProductSchema.safeParse(formData);
        if (!parsed.success) {
            return { ok: false, error: "Datos inválidos" };
        }

        const { locationId, productId, isPrimary } = parsed.data;

        await db.transaction(async (tx) => {
            // Si se marca como primaria para este producto,
            // sacar la flag de las otras ubicaciones de este producto (solo 1 primaria)
            if (productId && isPrimary) {
                await tx
                    .update(locations)
                    .set({ isPrimary: false })
                    .where(eq(locations.productId, productId));
            }

            // Actualizar la ubicación seleccionada
            await tx
                .update(locations)
                .set({
                    productId: productId ?? null,
                    isPrimary: productId ? isPrimary : false, // Si se vacía, no es primaria
                })
                .where(eq(locations.id, locationId));
        });

        revalidatePath("/dashboard/locations");
        revalidatePath("/dashboard/inventory"); // El primary location sale ahí
        return { ok: true };
    } catch (err) {
        console.error("[assignProduct]", err);
        return { ok: false, error: "Error al asignar producto" };
    }
}

export async function deleteLocation(locationId: string): Promise<ActionResult> {
    try {
        const { userId } = await auth();
        if (!userId) return { ok: false, error: "No autenticado" };

        // Solo permitir borrar si NO tiene producto asignado (se asume que la FK igual lo evitaría, pero validamos acá)
        const [loc] = await db.select().from(locations).where(eq(locations.id, locationId));
        if (!loc) return { ok: false, error: "Ubicación no encontrada" };
        if (loc.productId) return { ok: false, error: "No se puede eliminar: tiene un producto asignado. Vaciala primero." };

        await db.delete(locations).where(eq(locations.id, locationId));

        revalidatePath("/dashboard/locations");
        return { ok: true };
    } catch (err) {
        console.error("[deleteLocation]", err);
        return { ok: false, error: "Error al eliminar ubicación" };
    }
}

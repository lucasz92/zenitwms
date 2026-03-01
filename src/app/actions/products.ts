"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { products, users, locations } from "@/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

// ── Validation schema ────────────────────────────────────────────────────

const ProductSchema = z.object({
    code: z.string().min(1, "El código es obligatorio").max(50),
    name: z.string().min(1, "El nombre es obligatorio").max(255),
    description: z.string().max(500).optional().nullable(),
    price: z.preprocess(
        (v) => (v === "" || v == null ? null : Number(v)),
        z.number().positive().nullable()
    ),
    stock: z.preprocess((v) => Number(v), z.number().int().min(0)),
    min_stock: z.preprocess((v) => Number(v), z.number().int().min(0)),
    unit_type: z.enum(["un", "mt", "mt2", "kg", "lt", "caja"]),
    // Campos extendidos
    categoria: z.string().optional().nullable(),
    sinonimo: z.string().optional().nullable(),
    proveedor: z.string().optional().nullable(),
    observacion: z.string().optional().nullable(),
    // Ubicación
    deposito: z.string().optional().nullable(),
    sector: z.string().optional().nullable(),
    fila: z.string().optional().nullable(),
    columna: z.string().optional().nullable(),
    estante: z.string().optional().nullable(),
    posicion: z.string().optional().nullable(),
    orientacion: z.string().optional().nullable(),
});

export type ActionResult =
    | { ok: true }
    | { ok: false; error: string };

// ── Helper — ensure user exists in our DB ─────────────────────────────────

async function ensureUser() {
    const user = await currentUser();
    if (!user) throw new Error("No autenticado");

    const email = user.emailAddresses[0]?.emailAddress || `no-email-${user.id}@zenit.local`;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Usuario";

    await db.insert(users).values({
        id: user.id,
        email,
        name,
        avatarUrl: user.imageUrl,
    }).onConflictDoUpdate({
        target: users.id,
        set: {
            email,
            name,
            avatarUrl: user.imageUrl,
            updatedAt: new Date(),
        }
    });

    return user.id;
}

// ── CREATE ───────────────────────────────────────────────────────────────

export async function createProduct(
    formData: Record<string, unknown>
): Promise<ActionResult> {
    try {
        const userId = await ensureUser();
        const parsed = ProductSchema.safeParse(formData);

        if (!parsed.success) {
            return {
                ok: false,
                error: parsed.error.issues[0]?.message ?? "Datos inválidos",
            };
        }

        const data = parsed.data;

        const [newProduct] = await db.insert(products).values({
            code: data.code,
            name: data.name,
            description: data.description ?? null,
            price: data.price != null ? String(data.price) : null,
            stock: data.stock,
            minStock: data.min_stock,
            unitType: data.unit_type,
            categoria: data.categoria ?? "General",
            sinonimo: data.sinonimo ?? null,
            proveedor: data.proveedor ?? null,
            observacion: data.observacion ?? null,
            createdBy: userId,
        }).returning({ id: products.id });

        if (data.deposito || data.sector || data.fila || data.columna || data.estante || data.posicion) {
            await db.insert(locations).values({
                productId: newProduct.id,
                warehouse: data.deposito || "Gral",
                sector: data.sector ?? null,
                row: data.fila ?? null,
                column: data.columna ?? null,
                shelf: data.estante ?? null,
                position: data.posicion ?? null,
                orientation: data.orientacion ?? null,
                isPrimary: true,
            });
        }

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard");
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        // Unique constraint violation
        if (msg.includes("products_code_unique")) {
            return { ok: false, error: "Ya existe un producto con ese código." };
        }
        return { ok: false, error: msg };
    }
}

// ── UPDATE ───────────────────────────────────────────────────────────────

export async function updateProduct(
    id: string,
    formData: Record<string, unknown>
): Promise<ActionResult> {
    try {
        await ensureUser();
        const parsed = ProductSchema.safeParse(formData);

        if (!parsed.success) {
            return {
                ok: false,
                error: parsed.error.issues[0]?.message ?? "Datos inválidos",
            };
        }

        const data = parsed.data;

        await db
            .update(products)
            .set({
                code: data.code,
                name: data.name,
                description: data.description ?? null,
                price: data.price != null ? String(data.price) : null,
                stock: data.stock,
                minStock: data.min_stock,
                unitType: data.unit_type,
                categoria: data.categoria ?? "General",
                sinonimo: data.sinonimo ?? null,
                proveedor: data.proveedor ?? null,
                observacion: data.observacion ?? null,
                updatedAt: new Date(),
            })
            .where(eq(products.id, id));

        const existingPrimary = await db.query.locations.findFirst({
            where: (locs, { eq, and }) => and(eq(locs.productId, id), eq(locs.isPrimary, true))
        });

        if (existingPrimary) {
            await db.update(locations).set({
                warehouse: data.deposito || "Gral",
                sector: data.sector ?? null,
                row: data.fila ?? null,
                column: data.columna ?? null,
                shelf: data.estante ?? null,
                position: data.posicion ?? null,
                orientation: data.orientacion ?? null,
                updatedAt: new Date(),
            }).where(eq(locations.id, existingPrimary.id));
        } else if (data.deposito || data.sector || data.fila || data.columna || data.estante || data.posicion) {
            await db.insert(locations).values({
                productId: id,
                warehouse: data.deposito || "Gral",
                sector: data.sector ?? null,
                row: data.fila ?? null,
                column: data.columna ?? null,
                shelf: data.estante ?? null,
                position: data.posicion ?? null,
                orientation: data.orientacion ?? null,
                isPrimary: true,
            });
        }

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard");
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        if (msg.includes("products_code_unique")) {
            return { ok: false, error: "Ya existe un producto con ese código." };
        }
        return { ok: false, error: msg };
    }
}


// ── DELETE ───────────────────────────────────────────────────────────────

export async function deleteProduct(id: string): Promise<ActionResult> {
    try {
        await ensureUser();

        await db.delete(products).where(eq(products.id, id));

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard");
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        // FK restrict — tiene movimientos registrados
        if (msg.includes("restrict")) {
            return {
                ok: false,
                error:
                    "No se puede eliminar: el producto tiene movimientos registrados.",
            };
        }
        return { ok: false, error: msg };
    }
}

/**
 * Actualiza la URL de la imagen de un producto después de subirla a Supabase Storage.
 */
export async function updateProductImage(productId: string, imageUrl: string | null): Promise<ActionResult> {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("No autenticado");

        await db.update(products).set({ imageUrl, updatedAt: new Date() }).where(eq(products.id, productId));

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/catalog");
        revalidatePath("/dashboard");
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        console.error("[updateProductImage]", msg);
        return { ok: false, error: "Error al vincular la imagen al producto" };
    }
}

const LocationSchema = z.object({
    deposito: z.string().optional().nullable(),
    sector: z.string().optional().nullable(),
    fila: z.string().optional().nullable(),
    columna: z.string().optional().nullable(),
    estante: z.string().optional().nullable(),
    posicion: z.string().optional().nullable(),
});

export async function updateProductLocation(productId: string, formData: Record<string, unknown>): Promise<ActionResult> {
    try {
        await ensureUser();
        const parsed = LocationSchema.safeParse(formData);

        if (!parsed.success) {
            return {
                ok: false,
                error: parsed.error.issues[0]?.message ?? "Datos inválidos",
            };
        }

        const data = parsed.data;

        const existingPrimary = await db.query.locations.findFirst({
            where: (locs, { eq, and }) => and(eq(locs.productId, productId), eq(locs.isPrimary, true))
        });

        if (existingPrimary) {
            await db.update(locations).set({
                warehouse: data.deposito || "Gral",
                sector: data.sector ?? null,
                row: data.fila ?? null,
                column: data.columna ?? null,
                shelf: data.estante ?? null,
                position: data.posicion ?? null,
                updatedAt: new Date(),
            }).where(eq(locations.id, existingPrimary.id));
        } else if (data.deposito || data.sector || data.fila || data.columna || data.estante || data.posicion) {
            await db.insert(locations).values({
                productId: productId,
                warehouse: data.deposito || "Gral",
                sector: data.sector ?? null,
                row: data.fila ?? null,
                column: data.columna ?? null,
                shelf: data.estante ?? null,
                position: data.posicion ?? null,
                isPrimary: true,
            });
        }

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/catalog");
        revalidatePath("/dashboard");
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        console.error("[updateProductLocation]", msg);
        return { ok: false, error: "Error al actualizar ubicación" };
    }
}

// ── PRINTING SEARCH ─────────────────────────────────────────────────────────

export async function searchProductsForPrint(term: string) {
    try {
        await ensureUser();
        if (!term.trim()) return [];

        const searchTerm = `%${term.trim()}%`;

        // Búsqueda aproximada asumiendo PostgreSQL ILIKE
        const results = await db.query.products.findMany({
            where: or(
                ilike(products.code, searchTerm),
                ilike(products.name, searchTerm),
                ilike(products.sinonimo, searchTerm)
            ),
            with: {
                locations: true
            },
            limit: 5,
        });

        return results.map(r => {
            const loc = r.locations?.find((l: any) => l.isPrimary) || r.locations?.[0] || null;
            return {
                id: r.id,
                codigo: r.code,
                nombre: r.name,
                sinonimo: r.sinonimo,
                unidad_medida: r.unitType,
                cantidad: r.stock,
                ubicacion: {
                    deposito: loc?.warehouse ?? null,
                    sector: loc?.sector ?? null,
                    estante: loc?.shelf ?? null,
                    fila: loc?.row ?? null,
                    columna: loc?.column ?? null,
                }
            };
        });
    } catch (err: unknown) {
        console.error("Error en búsqueda de impresión", err);
        return [];
    }
}

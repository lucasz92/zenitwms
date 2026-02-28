"use server";

import { db } from "@/lib/db";
import { products, productVariants, locations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function exportFullDatabase() {
    try {
        // Obtenemos los productos con sus variantes y ubicaciones
        const allProducts = await db.query.products.findMany({
            with: {
                variants: true,
                locations: true,
            }
        });

        // Aplanamos la data para que el XLSX lo lea fácil
        const flattenedData = allProducts.map(p => {
            const loc = p.locations[0]; // Tomar ubicación principal si existe
            return {
                ID: p.id,
                CODIGO: p.code,
                NOMBRE: p.name,
                CATEGORIA: p.categoria || "",
                CANTIDAD: p.stock,
                UNIDAD: p.unitType || "",
                MINIMO: p.minStock,
                DEPOSITO: loc?.warehouse || "",
                SECTOR: loc?.sector || "",
                FILA: loc?.row || "",
                COLUMNA: loc?.column || "",
                ESTANTE: loc?.shelf || "",
                POSICION: loc?.position || "",
                ORIENTACION: loc?.orientation || ""
            };
        });

        return { success: true, data: flattenedData };
    } catch (error: any) {
        console.error("Error exporting", error);
        return { success: false, error: "Error al exportar la base de datos" };
    }
}

export async function importBulkProducts(data: any[]) {
    try {
        let insertedCount = 0;
        let updatedCount = 0;

        await db.transaction(async (tx) => {
            for (const row of data) {
                const code = String(row.codigo || row.code || row.CODIGO || "").trim().toUpperCase();
                if (!code) continue;

                const name = String(row.nombre || row.name || row.NOMBRE || "Sin nombre").trim();
                let stock = parseInt(row.cantidad || row.qty || row.CANTIDAD || row.stock || 0);
                if (isNaN(stock)) stock = 0;
                let minStock = parseInt(row.minimo || row.minStock || row.MINIMO || 0);
                if (isNaN(minStock)) minStock = 0;

                const categoria = String(row.categoria || row.category || row.CATEGORIA || "").trim() || null;
                const unitTypeString = String(row.unidad || row.unit || row.UNIDAD || "un").trim().toLowerCase();
                // @ts-ignore Permitimos este casteo para el ENUM de unitType
                const unitType: any = ["un", "caja", "kg", "lt", "pallet"].includes(unitTypeString) ? unitTypeString : "un";

                // Buscamos si existe
                const existingProduct = await tx.query.products.findFirst({
                    where: eq(products.code, code)
                });

                if (existingProduct) {
                    // Solo actualizamos Stock y Metadata si se requiere, pero por seguridad, 
                    // la importación masiva suele hacer "upsert" del stock.
                    await tx.update(products).set({
                        name,
                        stock,
                        minStock,
                        categoria,
                        unitType,
                        updatedAt: new Date()
                    }).where(eq(products.id, existingProduct.id));
                    updatedCount++;
                } else {
                    // Lo creamos
                    const [newProduct] = await tx.insert(products).values({
                        code,
                        name,
                        stock,
                        minStock,
                        categoria,
                        unitType,
                    }).returning({ id: products.id });

                    // Si mandó ubicación, la creamos
                    const deposit = String(row.deposito || row.DEPOSITO || "");
                    const sector = String(row.sector || row.SECTOR || "");
                    if (deposit || sector) {
                        await tx.insert(locations).values({
                            productId: newProduct.id,
                            warehouse: deposit || "Gral",
                            sector: sector || null,
                            row: String(row.fila || row.FILA || "") || null,
                            column: String(row.columna || row.COLUMNA || "") || null,
                            shelf: String(row.estante || row.ESTANTE || "") || null,
                            position: String(row.posicion || row.POSICION || "") || null,
                            orientation: String(row.orientacion || row.ORIENTACION || "") || null,
                        });
                    }
                    insertedCount++;
                }
            }
        });

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/locations");
        return { success: true, inserted: insertedCount, updated: updatedCount };
    } catch (e: any) {
        console.error("Bulk Import:", e);
        return { success: false, error: "Fallo transaccional durante la importación. Ningún producto fue alterado." };
    }
}

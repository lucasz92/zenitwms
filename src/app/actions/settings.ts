"use server";

import { db } from "@/lib/db";
import { products, locations } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// exportFullDatabase
// ─────────────────────────────────────────────────────────────────────────────
export async function exportFullDatabase() {
    try {
        const allProducts = await db.query.products.findMany({
            with: { variants: true, locations: true },
        });

        const flattenedData = allProducts.map((p) => {
            const loc = p.locations[0];
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
                ORIENTACION: loc?.orientation || "",
            };
        });

        return { success: true, data: flattenedData };
    } catch (error: any) {
        console.error("Error exporting", error);
        return { success: false, error: "Error al exportar la base de datos" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// importBulkProducts — Versión optimizada BULK
//
// Estrategia (mínimo de queries, sin loop por fila):
//  1. Parse all rows in memory → no DB queries
//  2. If 'skip': one SELECT to find existing codes
//  3. One INSERT...ON CONFLICT DO NOTHING for all new products
//  4. If 'update': individual UPDATEs only for already-existing products
//  5. One SELECT to fetch productId ↔ code map for location rows
//  6. One DELETE + chunked bulk INSERT for locations
//
// Para 500 filas: ~6 queries totales vs ~1500 del enfoque anterior.
// ─────────────────────────────────────────────────────────────────────────────

type UnitTypeValue = "un" | "caja" | "kg" | "lt" | "mt" | "mt2";
const VALID_UNIT_TYPES: UnitTypeValue[] = ["un", "caja", "kg", "lt", "mt", "mt2"];

interface ParsedRow {
    code: string;
    name: string;
    stock: number;
    minStock: number;
    categoria: string | null;
    unitType: UnitTypeValue;
    deposit: string;
    sector: string | null;
    fila: string | null;
    columna: string | null;
    estante: string | null;
    posicion: string | null;
    orientacion: string | null;
    hasLocation: boolean;
}

function parseRow(row: any): ParsedRow | null {
    const code = String(row.codigo ?? row.code ?? row.CODIGO ?? "").trim().toUpperCase();
    if (!code) return null;

    const name = String(row.nombre ?? row.name ?? row.NOMBRE ?? "Sin nombre").trim();
    const stockRaw = parseInt(row.cantidad ?? row.qty ?? row.CANTIDAD ?? row.stock ?? 0);
    const stock = isNaN(stockRaw) ? 0 : Math.max(0, stockRaw);
    const minRaw = parseInt(row.minimo ?? row.minStock ?? row.MINIMO ?? 0);
    const minStock = isNaN(minRaw) ? 0 : Math.max(0, minRaw);
    const categoria = String(row.categoria ?? row.category ?? row.CATEGORIA ?? "").trim() || null;
    const unitRaw = String(row.unidad ?? row.unit ?? row.UNIDAD ?? "un").trim().toLowerCase();
    const unitType: UnitTypeValue = VALID_UNIT_TYPES.includes(unitRaw as UnitTypeValue)
        ? (unitRaw as UnitTypeValue)
        : "un";

    const deposit = String(row.deposito ?? row.DEPOSITO ?? "").trim();
    const sector = String(row.sector ?? row.SECTOR ?? "").trim() || null;
    const fila = String(row.fila ?? row.FILA ?? "").trim() || null;
    const columna = String(row.columna ?? row.COLUMNA ?? "").trim() || null;
    const estante = String(row.estante ?? row.ESTANTE ?? "").trim() || null;
    const posicion = String(row.posicion ?? row.POSICION ?? "").trim() || null;
    const orientacion = String(row.orientacion ?? row.ORIENTACION ?? "").trim() || null;
    const hasLocation = !!(deposit || sector || fila || columna || estante);

    return { code, name, stock, minStock, categoria, unitType, deposit, sector, fila, columna, estante, posicion, orientacion, hasLocation };
}

export async function importBulkProducts(
    data: any[],
    duplicateAction: "update" | "skip" = "update"
) {
    try {
        // ── 1. Parse all rows in memory ──────────────────────────────────────
        const rows: ParsedRow[] = data.map(parseRow).filter(Boolean) as ParsedRow[];

        if (rows.length === 0) {
            return { success: true, inserted: 0, updated: 0, skipped: 0 };
        }

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        // ── 2. Determine which codes already exist ───────────────────────────
        const allCodes = rows.map((r) => r.code);
        const existingRows = await db
            .select({ code: products.code })
            .from(products)
            .where(inArray(products.code, allCodes));
        const existingCodes = new Set(existingRows.map((e) => e.code.toUpperCase()));

        const toInsert = rows.filter((r) => !existingCodes.has(r.code));
        const toUpdate = rows.filter((r) => existingCodes.has(r.code));

        if (duplicateAction === "skip") {
            skippedCount = toUpdate.length;
        }

        const rowsToProcess = duplicateAction === "skip" ? toInsert : rows;

        if (rowsToProcess.length === 0) {
            return { success: true, inserted: 0, updated: 0, skipped: skippedCount };
        }

        await db.transaction(async (tx) => {
            const now = new Date();

            // ── 3. Bulk INSERT new products ──────────────────────────────────
            if (toInsert.length > 0) {
                const CHUNK = 500;
                for (let i = 0; i < toInsert.length; i += CHUNK) {
                    const chunk = toInsert.slice(i, i + CHUNK);
                    await tx.insert(products).values(
                        chunk.map((r) => ({
                            code: r.code,
                            name: r.name,
                            stock: r.stock,
                            minStock: r.minStock,
                            categoria: r.categoria,
                            unitType: r.unitType,
                            createdAt: now,
                            updatedAt: now,
                        }))
                    ).onConflictDoNothing({ target: products.code });
                }
                insertedCount = toInsert.length;
            }

            // ── 4. Update existing products (only if action = 'update') ──────
            if (duplicateAction === "update" && toUpdate.length > 0) {
                for (const r of toUpdate) {
                    await tx
                        .update(products)
                        .set({
                            name: r.name,
                            stock: r.stock,
                            minStock: r.minStock,
                            categoria: r.categoria,
                            unitType: r.unitType,
                            updatedAt: now,
                        })
                        .where(eq(products.code, r.code));
                }
                updatedCount = toUpdate.length;
            }

            // ── 5. Fetch IDs for location rows ───────────────────────────────
            const rowsWithLoc = rowsToProcess.filter((r) => r.hasLocation);
            if (rowsWithLoc.length === 0) return;

            const codesWithLoc = rowsWithLoc.map((r) => r.code);
            const productIdRows = await tx
                .select({ id: products.id, code: products.code })
                .from(products)
                .where(inArray(products.code, codesWithLoc));

            const codeToId = new Map<string, string>(
                productIdRows.map((p) => [p.code.toUpperCase(), p.id])
            );

            const productIds = [...codeToId.values()];
            if (productIds.length === 0) return;

            // ── 6. Delete old primary locations + bulk insert new ones ────────
            await tx.delete(locations).where(inArray(locations.productId, productIds));

            const locPayload = rowsWithLoc
                .filter((r) => codeToId.has(r.code))
                .map((r) => ({
                    productId: codeToId.get(r.code)!,
                    warehouse: r.deposit || "Principal",
                    sector: r.sector,
                    row: r.fila,
                    column: r.columna,
                    shelf: r.estante,
                    position: r.posicion,
                    orientation: r.orientacion,
                    isPrimary: true as const,
                }));

            const LOC_CHUNK = 500;
            for (let i = 0; i < locPayload.length; i += LOC_CHUNK) {
                await tx.insert(locations).values(locPayload.slice(i, i + LOC_CHUNK));
            }
        });

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/locations");
        return { success: true, inserted: insertedCount, updated: updatedCount, skipped: skippedCount };
    } catch (e: any) {
        console.error("Bulk Import error:", e);
        return {
            success: false,
            error: `Error durante la importación: ${e?.message ?? "error desconocido"}`,
        };
    }
}

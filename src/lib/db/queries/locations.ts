import { db } from "@/lib/db";
import { locations, products, sectorLayouts } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function getLocations() {
    const rows = await db
        .select({
            id: locations.id,
            warehouse: locations.warehouse,
            sector: locations.sector,
            row: locations.row,
            column: locations.column,
            shelf: locations.shelf,
            isPrimary: locations.isPrimary,
            // Datos del producto si está ocupado
            productId: products.id,
            productCode: products.code,
            productName: products.name,
            productStock: products.stock,
        })
        .from(locations)
        .leftJoin(products, sql`${locations.productId} = ${products.id}`)
        .orderBy(
            locations.warehouse,
            locations.sector,
            locations.row,
            locations.column,
            locations.shelf
        );

    return rows;
}

export type LocationRow = Awaited<ReturnType<typeof getLocations>>[number];

export async function getLocationStats() {
    const [stats] = await db.select({
        total: sql<number>`count(*)::int`,
        occupied: sql<number>`count(*) filter (where ${locations.productId} is not null)::int`,
        available: sql<number>`count(*) filter (where ${locations.productId} is null)::int`,
    }).from(locations);

    const s = stats ?? { total: 0, occupied: 0, available: 0 };
    const occupancyRate = s.total > 0 ? (s.occupied / s.total) * 100 : 0;

    return { ...s, occupancyRate };
}

export async function getSectorsLayout() {
    return await db
        .select({
            sectorName: sectorLayouts.sectorName,
            description: sectorLayouts.description,
            orderIndex: sectorLayouts.orderIndex,
        })
        .from(sectorLayouts)
        .orderBy(sectorLayouts.orderIndex);
}

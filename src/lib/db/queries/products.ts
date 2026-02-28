import { db } from "@/lib/db";
import { products, locations } from "@/lib/db/schema";
import { sql, eq, asc } from "drizzle-orm";

/**
 * Obtiene todos los productos con su ubicación primaria (join)
 * Retorna un array listo para pasarle al InventoryTable
 */
export async function getProducts() {
    // LEFT JOIN con locations para traer la ubicación primaria
    const rows = await db
        .select({
            id: products.id,
            code: products.code,
            name: products.name,
            description: products.description,
            price: products.price,
            stock: products.stock,
            min_stock: products.minStock,
            unit_type: products.unitType,
            image_url: products.imageUrl,
            categoria: products.categoria,
            sinonimo: products.sinonimo,
            proveedor: products.proveedor,
            observacion: products.observacion,
            deposito: products.deposito,
            sector: products.sector,
            fila: products.fila,
            columna: products.columna,
            estante: products.estante,
            posicion: products.posicion,
            orientacion: products.orientacion,
            created_at: products.createdAt,
            updated_at: products.updatedAt,
            // Concatenar ubicación primaria como string display
            location: sql<string | null>`
        CASE
          WHEN ${locations.id} IS NOT NULL THEN
            CONCAT_WS(' / ',
              NULLIF(${locations.warehouse}, 'Principal'),
              NULLIF(${locations.sector}, NULL),
              NULLIF(CONCAT(${locations.row}, '-', ${locations.column}), '-'),
              NULLIF(CONCAT('C', ${locations.shelf}), 'C')
            )
          ELSE NULL
        END
      `,
        })
        .from(products)
        .leftJoin(
            locations,
            sql`${locations.productId} = ${products.id} AND ${locations.isPrimary} = true`
        )
        .orderBy(asc(products.code));

    return rows.map((r) => ({
        ...r,
        price: r.price != null ? Number(r.price) : null,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
    }));
}

export type ProductRow = Awaited<ReturnType<typeof getProducts>>[number];

/**
 * Métricas rápidas para los KPI cards (una sola query)
 */
export async function getInventoryStats() {
    const rows = await db
        .select({
            total: sql<number>`count(*)::int`,
            located: sql<number>`count(${locations.id})::int`,
            out_of_stock: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
            low_stock: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.minStock})::int`,
        })
        .from(products)
        .leftJoin(
            locations,
            sql`${locations.productId} = ${products.id} AND ${locations.isPrimary} = true`
        );

    return rows[0] ?? { total: 0, located: 0, out_of_stock: 0, low_stock: 0 };
}

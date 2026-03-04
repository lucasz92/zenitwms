import { db } from "@/lib/db";
import { products, locations } from "@/lib/db/schema";
import { sql, eq, asc, ilike, or, and, lte, gt } from "drizzle-orm";

const PAGE_SIZE = 50; // Filas por página en inventario

export interface GetProductsOptions {
    page?: number;       // 1-indexed
    search?: string;     // buscar en code o name
    filter?: "all" | "low_stock" | "critical" | "out_of_stock";
}

/**
 * Obtiene productos paginados con su ubicación primaria (JOIN)
 * Retorna { rows, total, totalPages }
 */
export async function getProducts(options: GetProductsOptions = {}) {
    const { page = 1, search = "", filter = "all" } = options;
    const offset = (page - 1) * PAGE_SIZE;

    // ── Condiciones de filtrado ───────────────────────────────────────────────
    const conditions: any[] = [];

    if (search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(
            or(
                ilike(products.code, term),
                ilike(products.name, term),
                ilike(products.sinonimo, term)
            )
        );
    }

    if (filter === "out_of_stock") {
        conditions.push(eq(products.stock, 0));
    } else if (filter === "low_stock") {
        conditions.push(
            and(gt(products.stock, 0), lte(products.stock, products.minStock))
        );
    } else if (filter === "critical") {
        conditions.push(lte(products.stock, products.minStock));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // ── Query de datos ────────────────────────────────────────────────────────
    const rowsQuery = db
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
            deposito: locations.warehouse,
            sector: locations.sector,
            fila: locations.row,
            columna: locations.column,
            estante: locations.shelf,
            posicion: locations.position,
            orientacion: locations.orientation,
            created_at: products.createdAt,
            updated_at: products.updatedAt,
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
        .orderBy(asc(products.code))
        .limit(PAGE_SIZE)
        .offset(offset);

    // ── Query de total (para paginación) ──────────────────────────────────────
    const countQuery = db
        .select({ total: sql<number>`count(*)::int` })
        .from(products);

    // Apply where clauses
    const [rows, countResult] = await Promise.all([
        whereClause ? rowsQuery.where(whereClause) : rowsQuery,
        whereClause ? countQuery.where(whereClause) : countQuery,
    ]);

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return {
        rows: rows.map((r) => ({
            ...r,
            price: r.price != null ? Number(r.price) : null,
            created_at: r.created_at.toISOString(),
            updated_at: r.updated_at.toISOString(),
        })),
        total,
        totalPages,
        page,
        pageSize: PAGE_SIZE,
    };
}

export type ProductRow = Awaited<ReturnType<typeof getProducts>>["rows"][number];

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

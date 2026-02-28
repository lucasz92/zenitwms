import { db } from "@/lib/db";
import { inventoryMovements, products, users } from "@/lib/db/schema";
import { sql, desc } from "drizzle-orm";

export async function getMovements(limit = 100) {
    const rows = await db
        .select({
            id: inventoryMovements.id,
            type: inventoryMovements.type,
            quantity: inventoryMovements.quantity,
            notes: inventoryMovements.notes,
            createdAt: inventoryMovements.createdAt,
            // Producto
            productId: products.id,
            productCode: products.code,
            productName: products.name,
            // Usuario
            userId: users.id,
            userName: users.name,
        })
        .from(inventoryMovements)
        .leftJoin(products, sql`${inventoryMovements.productId} = ${products.id}`)
        .leftJoin(users, sql`${inventoryMovements.userId} = ${users.id}`)
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(limit);

    return rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
    }));
}

export type MovementRow = Awaited<ReturnType<typeof getMovements>>[number];

/**
 * Mini-stats para los KPI cards
 */
export async function getMovementStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [stats] = await db.select({
        today: sql<number>`count(*) filter (where ${inventoryMovements.createdAt} >= ${todayStart.toISOString()})::int`,
        week: sql<number>`count(*) filter (where ${inventoryMovements.createdAt} >= ${weekStart.toISOString()})::int`,
        entries: sql<number>`coalesce(sum(${inventoryMovements.quantity}) filter (where ${inventoryMovements.type} = 'entry'), 0)::int`,
        exits: sql<number>`coalesce(sum(${inventoryMovements.quantity}) filter (where ${inventoryMovements.type} = 'exit'), 0)::int`,
    }).from(inventoryMovements);

    return stats ?? { today: 0, week: 0, entries: 0, exits: 0 };
}

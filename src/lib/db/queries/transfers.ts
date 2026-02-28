import { db } from "../index";
import { transferOrders, transferItems, transferLogs } from "../schema";
import { desc, eq } from "drizzle-orm";

export async function getTransfers() {
    try {
        const data = await db.query.transferOrders.findMany({
            orderBy: [desc(transferOrders.createdAt)],
            with: {
                items: true,
                logs: {
                    orderBy: [desc(transferLogs.date)]
                }
            }
        });
        return data;
    } catch (e) {
        console.error("Error fetching transfers:", e);
        return [];
    }
}

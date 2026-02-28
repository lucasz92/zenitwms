"use server";

import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createAlertSchema = z.object({
    productId: z.string().uuid().nullable().optional(),
    productCode: z.string().nullable().optional(),
    productName: z.string().nullable().optional(),
    type: z.string().min(1, "El tipo es requerido"),
    description: z.string().nullable().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]),
    reportedBy: z.string().nullable().optional(),
});

export async function createAlert(data: z.infer<typeof createAlertSchema>) {
    try {
        const validated = createAlertSchema.parse(data);
        await db.insert(alerts).values({
            productId: validated.productId,
            productCode: validated.productCode,
            productName: validated.productName,
            type: validated.type,
            description: validated.description,
            priority: validated.priority,
            reportedBy: validated.reportedBy || "Usuario Anónimo",
            status: "pending",
        });

        revalidatePath("/dashboard/alerts");
        return { success: true };
    } catch (e) {
        console.error("Error creating alert:", e);
        return { success: false, error: "Error al crear la alerta" };
    }
}

export async function updateAlertStatus(id: string, status: "pending" | "in_progress" | "completed") {
    try {
        await db.update(alerts)
            .set({
                status,
                resolvedAt: status === "completed" ? new Date() : null,
            })
            .where(eq(alerts.id, id));

        revalidatePath("/dashboard/alerts");
        return { success: true };
    } catch (e) {
        console.error("Error updating alert status:", e);
        return { success: false, error: "Error al actualizar el estado" };
    }
}

export async function deleteAlert(id: string) {
    try {
        await db.delete(alerts).where(eq(alerts.id, id));
        revalidatePath("/dashboard/alerts");
        return { success: true };
    } catch (e) {
        console.error("Error deleting alert:", e);
        return { success: false, error: "Error al eliminar la alerta" };
    }
}

export async function getAlerts() {
    try {
        const data = await db.select().from(alerts).orderBy(desc(alerts.createdAt));
        return data;
    } catch (e: any) {
        // Tabla no existe aún en la DB (código Postgres: 42P01 = undefined_table)
        const isTableMissing = e?.message?.includes("42P01") || e?.message?.includes("relation") || e?.message?.includes("does not exist");
        if (isTableMissing) {
            console.warn("⚠️ La tabla 'alerts' no existe en Supabase. Ejecutá la migración en el SQL Editor.");
        } else {
            console.error("Error fetching alerts:", e);
        }
        return [];
    }
}

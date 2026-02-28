"use server";

import { db } from "@/lib/db";
import { transferOrders, transferItems, transferLogs, products, inventoryMovements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function createTransferOrder(data: {
    transferId: string;
    type: "INBOUND" | "REWORK" | "SCRAP";
    origin?: string;
    target?: string;
    referenceEmail?: string;
    items: {
        code: string;
        name: string;
        qtyExpected: number;
    }[];
}) {
    try {
        const user = await currentUser();
        const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Sistema";

        // Transacción DB para asegurar la integridad de Orden -> Ítems -> Log
        const orderId = await db.transaction(async (tx) => {
            // 1. Crear Orden Cabecera
            const [order] = await tx
                .insert(transferOrders)
                .values({
                    transferId: data.transferId,
                    type: data.type,
                    origin: data.origin,
                    target: data.target,
                    referenceEmail: data.referenceEmail,
                    status: "PENDING",
                })
                .returning({ id: transferOrders.id });

            // 2. Crear los ítems requeridos
            if (data.items.length > 0) {
                const insertItems = data.items.map((i) => ({
                    transferOrderId: order.id,
                    productCode: i.code,
                    productName: i.name,
                    qtyExpected: i.qtyExpected,
                    qtyReceived: 0,
                    status: "PENDING" as const,
                }));
                await tx.insert(transferItems).values(insertItems);
            }

            // 3. Crear el primer Log ("Creado")
            await tx.insert(transferLogs).values({
                transferOrderId: order.id,
                text: `Movimiento ${data.type} creado con ${data.items.length} ítems.`,
                type: "INFO",
                user: userName,
            });

            return order.id;
        });

        revalidatePath("/dashboard/movements");
        return { success: true, orderId };
    } catch (e: any) {
        console.error("Error creating transfer order:", e);
        return { success: false, error: e.message || "Error al crear el remito" };
    }
}

export async function updateTransferItem(itemId: string, qtyReceived: number, qtyExpected: number) {
    try {
        let status: "OK" | "OVER" | "SHORT" | "PENDING" = "PENDING";

        if (qtyReceived === qtyExpected) status = "OK";
        else if (qtyReceived > qtyExpected) status = "OVER";
        else if (qtyReceived > 0) status = "SHORT";

        await db
            .update(transferItems)
            .set({ qtyReceived, status })
            .where(eq(transferItems.id, itemId));

        revalidatePath("/dashboard/movements");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Error al actualizar la cantidad" };
    }
}

export async function addTransferLog(orderId: string, text: string) {
    try {
        const user = await currentUser();
        const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Usuario";

        await db.insert(transferLogs).values({
            transferOrderId: orderId,
            text,
            type: "USER_NOTE",
            user: userName,
        });

        revalidatePath("/dashboard/movements");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Error agregando la nota" };
    }
}

export async function completeTransferOrder(orderId: string) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("No autenticado");
        const user = await currentUser();
        const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Sistema";

        await db.transaction(async (tx) => {
            // Obtener la orden y sus items
            const order = await tx.query.transferOrders.findFirst({
                where: eq(transferOrders.id, orderId),
                with: { items: true },
            });

            if (!order) throw new Error("Orden no encontrada");
            if (order.status === "COMPLETED") throw new Error("La orden ya fue cerrada");

            // Recorrer los items recibidos de la orden para aplicar al inventario principal
            for (const item of order.items) {
                // Solo nos importa si hay cantidad recibida
                if (item.qtyReceived > 0) {
                    // Buscar si el producto existe
                    const existingProduct = await tx.query.products.findFirst({
                        where: eq(products.code, item.productCode)
                    });

                    // Factor: Entrada (Inbound/Rework suma), Salida (Scrap resta)
                    // (NOTA: Si Rework/Scrap significa retirar productos del inventario general hacia otro sector, 
                    // asumimos que es SALIDA. Ajusta este factor según tu lógica de negocio)
                    const isAddition = order.type === "INBOUND";
                    const multiplier = isAddition ? 1 : -1;
                    const changeQty = item.qtyReceived * multiplier;

                    if (existingProduct) {
                        // Actualizar stock del producto
                        await tx.update(products)
                            .set({
                                stock: existingProduct.stock + changeQty,
                                updatedAt: new Date(),
                            })
                            .where(eq(products.id, existingProduct.id));

                        // Generar el registro en el Kardex Histórico (`inventory_movements`)
                        await tx.insert(inventoryMovements).values({
                            productId: existingProduct.id,
                            userId: userId,
                            type: isAddition ? "entry" : "exit",
                            quantity: item.qtyReceived,
                            notes: `Ref: ${order.transferId} (${order.type})`
                        });
                    }
                }
            }

            // Marcar orden como completada
            await tx.update(transferOrders)
                .set({
                    status: "COMPLETED",
                    closedAt: new Date()
                })
                .where(eq(transferOrders.id, orderId));

            // Log de cierre
            await tx.insert(transferLogs).values({
                transferOrderId: orderId,
                text: `Orden cerrada y procesada en el inventario general.`,
                type: "INFO",
                user: userName,
            });
        });

        revalidatePath("/dashboard/movements");
        revalidatePath("/dashboard/inventory");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Error al completar la orden de transferencia" };
    }
}

export async function deleteTransferOrder(orderId: string) {
    try {
        await db.delete(transferOrders).where(eq(transferOrders.id, orderId));
        revalidatePath("/dashboard/movements");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Error eliminando el movimiento" };
    }
}

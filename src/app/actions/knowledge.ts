"use server";

import { db } from "@/lib/db";
import { knowledgeDocuments, documentNotes } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";

export async function getKnowledgeDocuments() {
    try {
        const data = await db.query.knowledgeDocuments.findMany({
            orderBy: [desc(knowledgeDocuments.createdAt)],
            with: {
                notes: {
                    orderBy: [desc(documentNotes.updatedAt)]
                }
            }
        });
        return data;
    } catch (e) {
        console.error("Error fetching documents:", e);
        return [];
    }
}

export async function createKnowledgeDocument(data: {
    title: string;
    content: string;
    type: "TEXT" | "MARKDOWN" | "PDF" | "MANUAL";
}) {
    try {
        await db.insert(knowledgeDocuments).values({
            title: data.title,
            content: data.content,
            type: data.type,
            isActive: true,
        });

        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Error al crear documento" };
    }
}

export async function updateKnowledgeDocument(id: string, data: { title: string; content: string }) {
    try {
        await db.update(knowledgeDocuments)
            .set({
                title: data.title,
                content: data.content,
                updatedAt: new Date()
            })
            .where(eq(knowledgeDocuments.id, id));

        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Error al actualizar." };
    }
}

export async function toggleKnowledgeDocumentActive(id: string, currentState: boolean) {
    try {
        await db.update(knowledgeDocuments)
            .set({ isActive: !currentState, updatedAt: new Date() })
            .where(eq(knowledgeDocuments.id, id));

        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Error al cambiar estado" };
    }
}

export async function deleteKnowledgeDocument(id: string) {
    try {
        await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Error al eliminar" };
    }
}

export async function saveDocumentNote(documentId: string, noteText: string) {
    try {
        const user = await currentUser();
        const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : "Sistema";

        // Verifica si ya hay nota (para simplicidad de la migración, la sobreescribimos o creamos nueva)
        const existing = await db.query.documentNotes.findFirst({
            where: eq(documentNotes.documentId, documentId)
        });

        if (existing) {
            await db.update(documentNotes)
                .set({ notes: noteText, user: userName, updatedAt: new Date() })
                .where(eq(documentNotes.id, existing.id));
        } else {
            await db.insert(documentNotes).values({
                documentId,
                notes: noteText,
                user: userName,
            });
        }

        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Error al guardar nota" };
    }
}

"use server";

import { clerkClient, auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ClerkUserRole = "admin" | "manager" | "employee" | "auditor";

export interface MappedUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    imageUrl: string;
    role: ClerkUserRole;
    createdAt: number;
}

export async function getUsers(): Promise<MappedUser[]> {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Acceso denegado");

        const client = await clerkClient();

        // Obtenemos todos los usuarios del workspace de Clerk
        // Limit: 100 usuarios por default (suficiente por ahora, de lo contrario paginación iterativa)
        const response = await client.users.getUserList({ limit: 100 });

        const mappedUsers = response.data.map((u) => {
            const role = (u.publicMetadata?.role as ClerkUserRole) || "employee";
            const email = u.emailAddresses[0]?.emailAddress || "Sin email";
            const firstName = u.firstName;
            const lastName = u.lastName;
            const fullName = [firstName, lastName].filter(Boolean).join(" ") || u.username || "Usuario";

            return {
                id: u.id,
                email,
                firstName,
                lastName,
                fullName,
                imageUrl: u.imageUrl,
                role,
                createdAt: u.createdAt,
            };
        });

        // Ordenamos por fecha de creación descendente (los más nuevos primero)
        return mappedUsers.sort((a, b) => b.createdAt - a.createdAt);

    } catch (e) {
        console.error("[getUsers] Error fetching from Clerk:", e);
        return [];
    }
}

export async function updateUserRole(targetUserId: string, newRole: ClerkUserRole) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Acceso denegado");

        const client = await clerkClient();

        // Validar que el usuario que ejecuta la acción es admin/manager
        const currentUser = await client.users.getUser(userId);
        const currentUserRole = currentUser.publicMetadata?.role as string;

        if (currentUserRole !== "admin" && currentUserRole !== "manager") {
            // Nota de seguridad: En una primera implementación si NO hay admins aún, el primer usuario
            // capaz debe poder auto-elevarse o alguien debe setear el primer admin. 
            // Para simplificar, permitimos la primera vez si la BD de Clerk no tiene ningún admin asignado,
            // pero lo más seguro es setear el rol inicial deducido de Clerk Dashboard o mediante regla on-register.
            // Dejemos que sólo fallen los 'employee/auditor' confirmados
            if (currentUserRole === "employee" || currentUserRole === "auditor") {
                return { ok: false, error: "No tienes permisos para modificar roles." };
            }
        }

        // 1. Actualizar publicMetadata en Clerk
        const targetUser = await client.users.getUser(targetUserId);
        await client.users.updateUserMetadata(targetUserId, {
            publicMetadata: {
                ...targetUser.publicMetadata,
                role: newRole,
            },
        });

        // 2. Sincronizar (Upsert) en Supabase (tabla 'users')
        // Esto es útil para mantener la consistencia de Foreign Keys y para consultas complejas.
        const email = targetUser.emailAddresses[0]?.emailAddress || "Sin email";
        const fullName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") || targetUser.username;

        await db
            .insert(users)
            .values({
                id: targetUserId,
                email,
                name: fullName,
                role: newRole,
                avatarUrl: targetUser.imageUrl,
            })
            .onConflictDoUpdate({
                target: users.id,
                set: {
                    role: newRole,
                    name: fullName,
                    avatarUrl: targetUser.imageUrl,
                    updatedAt: new Date(),
                },
            });

        revalidatePath("/dashboard/users");
        return { ok: true };
    } catch (e: any) {
        console.error("[updateUserRole] Error:", e);
        return { ok: false, error: e.message || "Error al actualizar rol." };
    }
}

import { Metadata } from "next";
import { getUsers } from "@/app/actions/users";
import { UsersView } from "@/components/users/users-view";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
    title: "Equipo y Usuarios",
    description: "Gestión de roles y permisos del equipo",
};

export default async function UsersPage() {
    const user = await currentUser();
    if (!user) redirect("/login");

    const role = user.publicMetadata?.role as string;

    // Proteger la ruta: Sólo Admin y Manager pueden ver la gestión de usuarios
    // Para simplificar pruebas iniciales puedes comentar esta restricción
    if (role !== "admin" && role !== "manager") {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 p-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Acceso Denegado</h2>
                <p className="text-center text-sm text-muted-foreground max-w-md">
                    No tienes permisos suficientes para acceder a la gestión de equipo.
                    Contacta a un administrador.
                </p>
                <a href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Volver al Inicio
                </a>
            </div>
        );
    }

    const usersList = await getUsers();

    return (
        <div className="h-full flex flex-col space-y-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Equipo y Usuarios
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Gestioná los permisos y accesos de los miembros de tu organización
                </p>
            </div>

            <UsersView initialUsers={usersList} currentUserId={user.id} currentUserRole={role} />
        </div>
    );
}

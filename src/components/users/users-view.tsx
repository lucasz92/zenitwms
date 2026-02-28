"use client";

import { useState } from "react";
import { type MappedUser, type ClerkUserRole, updateUserRole } from "@/app/actions/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert, ShieldCheck, UserCog, Users as UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsersViewProps {
    initialUsers: MappedUser[];
    currentUserId: string;
    currentUserRole: string;
}

const ROLES: { value: ClerkUserRole; label: string; icon: any; color: string }[] = [
    { value: "admin", label: "Administrador", icon: ShieldCheck, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    { value: "manager", label: "Encargado", icon: UserCog, color: "text-brand-600 bg-brand-50 border-brand-200" },
    { value: "auditor", label: "Auditor", icon: ShieldAlert, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { value: "employee", label: "Empleado", icon: UsersIcon, color: "text-slate-600 bg-slate-50 border-slate-200" },
];

export function UsersView({ initialUsers, currentUserId, currentUserRole }: UsersViewProps) {
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    const handleRoleChange = async (userId: string, newRole: ClerkUserRole) => {
        // Validación básica front-end
        if (userId === currentUserId) {
            alert("No puedes modificarte el rol a ti mismo. Pide a otro administrador que lo haga.");
            return;
        }

        setUpdatingUserId(userId);

        const res = await updateUserRole(userId, newRole);

        if (!res.ok) {
            // Revert fallback: Next.js revalidatePath does mostly work automagically 
            // but for immediate UI error feedback we show an alert. 
            alert(res.error);
        } else {
            // Si el Toast no existe, asumo que es para un console.log, pero 
            // normalmente Next14 server action con revalidatePath refrescará la vista via Server Component
        }

        setUpdatingUserId(null);
    };

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left relative">
                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Miembro del Equipo</th>
                            <th className="px-6 py-4 font-semibold">Correo Electrónico</th>
                            <th className="px-6 py-4 font-semibold">Fecha de Ingreso</th>
                            <th className="px-6 py-4 font-semibold">Asignación de Rol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {initialUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                    No se encontraron usuarios o hubo un error al cargar.
                                </td>
                            </tr>
                        ) : (
                            initialUsers.map((user) => {
                                const isBusy = updatingUserId === user.id;
                                const currentRoleInfo = ROLES.find(r => r.value === user.role) || ROLES[3];
                                const RoleIcon = currentRoleInfo.icon;

                                return (
                                    <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border">
                                                    <AvatarImage src={user.imageUrl} />
                                                    <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-foreground">
                                                        {user.fullName}
                                                        {user.id === currentUserId && (
                                                            <span className="ml-2 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">TÚ</span>
                                                        )}
                                                    </p>
                                                    {/* Mostrar rol en badge por si no es editable */}
                                                    <div className="md:hidden mt-1">
                                                        <Badge variant="outline" className={cn("text-[10px]", currentRoleInfo.color)}>
                                                            <RoleIcon className="w-3 h-3 mr-1" /> {currentRoleInfo.label}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                            {new Date(user.createdAt).toLocaleDateString("es-AR", { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {currentUserRole !== "employee" && currentUserRole !== "auditor" && user.id !== currentUserId ? (
                                                <Select
                                                    disabled={isBusy}
                                                    defaultValue={user.role}
                                                    onValueChange={(val) => handleRoleChange(user.id, val as ClerkUserRole)}
                                                >
                                                    <SelectTrigger className="w-[160px] h-9">
                                                        {isBusy ? (
                                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                                                        ) : (
                                                            <SelectValue />
                                                        )}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ROLES.map((role) => {
                                                            const IconMatch = role.icon;
                                                            return (
                                                                <SelectItem key={role.value} value={role.value}>
                                                                    <div className="flex items-center gap-2">
                                                                        <IconMatch className="h-4 w-4 text-muted-foreground" />
                                                                        <span>{role.label}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            )
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant="outline" className={cn("px-2 py-1 flex w-fit items-center gap-1.5", currentRoleInfo.color)}>
                                                    <RoleIcon className="h-3.5 w-3.5" />
                                                    {currentRoleInfo.label}
                                                </Badge>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

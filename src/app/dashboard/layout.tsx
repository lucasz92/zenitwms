import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UserRole } from "@/lib/config/nav";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await currentUser();

    if (!user) {
        redirect("/login");
    }

    // El rol se guarda en publicMetadata del usuario en el dashboard de Clerk
    // Ejemplo: { role: "admin" }
    const role = (user.publicMetadata?.role as UserRole) ?? "employee";
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Usuario";

    return (
        <TooltipProvider>
            <DashboardShell
                userName={fullName}
                userEmail={user.emailAddresses[0]?.emailAddress ?? ""}
                userRole={role}
                avatarUrl={user.imageUrl}
            >
                {children}
            </DashboardShell>
        </TooltipProvider>
    );
}

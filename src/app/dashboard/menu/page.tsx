import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NAV_GROUPS } from "@/lib/config/nav";
import { currentUser } from "@clerk/nextjs/server";
import type { UserRole } from "@/lib/config/nav";

export const metadata: Metadata = { title: "Menú" };

export default async function MenuPage() {
    const user = await currentUser();
    const role = (user?.publicMetadata?.role as UserRole) ?? "employee";

    const filteredGroups = NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
            (item) => !item.roles || item.roles.includes(role)
        ),
    })).filter((group) => group.items.length > 0);

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Menú</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Todas las secciones del sistema
                </p>
            </div>

            {filteredGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1 mb-2">
                        {group.label}
                    </p>
                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors active:bg-muted/60"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <Icon className="h-4 w-4 text-foreground/70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {item.description || "Ir a la sección"}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

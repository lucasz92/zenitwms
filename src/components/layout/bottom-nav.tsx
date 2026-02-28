"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    ScanLine,
    MapPin,
    Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 5 ítems fijos para la barra inferior mobile
const BOTTOM_NAV = [
    { title: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    { title: "Inventario", href: "/dashboard/inventory", icon: Package },
    { title: "Escanear", href: "/dashboard/scanner", icon: ScanLine, accent: true },
    { title: "Ubicaciones", href: "/dashboard/locations", icon: MapPin },
    { title: "Menú", href: "/dashboard/menu", icon: Menu },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md safe-area-inset-bottom md:hidden">
            {BOTTOM_NAV.map((item) => {
                const Icon = item.icon;
                const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                if (item.accent) {
                    // Botón central de escáner — destacado
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center justify-center -mt-5"
                        >
                            <span
                                className={cn(
                                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
                                    isActive
                                        ? "bg-foreground shadow-foreground/20"
                                        : "bg-primary shadow-primary/30"
                                )}
                            >
                                <Icon className="h-6 w-6 text-primary-foreground" />
                            </span>
                            <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                                {item.title}
                            </span>
                        </Link>
                    );
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
                    >
                        <Icon
                            className={cn(
                                "h-5 w-5 transition-colors duration-200",
                                isActive ? "text-foreground" : "text-muted-foreground"
                            )}
                        />
                        <span
                            className={cn(
                                "text-[10px] font-medium transition-colors duration-200",
                                isActive ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {item.title}
                        </span>
                        {isActive && (
                            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-foreground" />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}

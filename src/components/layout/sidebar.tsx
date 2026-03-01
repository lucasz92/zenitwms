"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type UserRole, type NavItem } from "@/lib/config/nav";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap } from "lucide-react";

interface SidebarProps {
    userRole?: UserRole;
    collapsed?: boolean;
}

function NavLink({
    item,
    collapsed,
    isActive,
}: {
    item: NavItem;
    collapsed: boolean;
    isActive: boolean;
}) {
    const Icon = item.icon;

    const content = (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Link
                href={item.href}
                className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                )}
            >
                {/* Barra lateral izquierda del item activo */}
                {isActive && (
                    <motion.span
                        layoutId="activeBar"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                        style={{ background: "linear-gradient(180deg, #4169E1, #007BFF)" }}
                    />
                )}
                <Icon
                    className={cn(
                        "shrink-0 transition-transform duration-200",
                        collapsed ? "h-5 w-5" : "h-4 w-4",
                        isActive && "drop-shadow-sm"
                    )}
                />
                {!collapsed && (
                    <span className="truncate">{item.title}</span>
                )}
                {!collapsed && item.badge && (
                    <Badge
                        variant="secondary"
                        className="ml-auto shrink-0 text-xs"
                    >
                        {item.badge}
                    </Badge>
                )}
            </Link>
        </motion.div>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                    {item.title}
                    {item.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                            {item.badge}
                        </Badge>
                    )}
                </TooltipContent>
            </Tooltip>
        );
    }

    return content;
}

export function Sidebar({ userRole = "employee", collapsed = false }: SidebarProps) {
    const pathname = usePathname();
    const [zapActive, setZapActive] = useState(false);

    const triggerZap = useCallback(() => {
        setZapActive(false);
        // tiny timeout to allow re-trigger if already active
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setZapActive(true));
        });
        setTimeout(() => setZapActive(false), 1450);
    }, []);

    const filteredGroups = NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
        ),
    })).filter((group) => group.items.length > 0);

    return (
        <aside
            className={cn(
                "flex h-full flex-col border-r bg-sidebar transition-all duration-300",
                collapsed ? "w-[60px]" : "w-[240px]"
            )}
        >
            {/* Logo / Brand */}
            <div
                className={cn(
                    "flex h-14 items-center border-b px-4 shrink-0",
                    collapsed && "justify-center px-2"
                )}
            >
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <motion.div
                        onMouseEnter={triggerZap}
                        onClick={triggerZap}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm cursor-pointer select-none",
                            zapActive && "logo-zap-active"
                        )}
                        style={{
                            background: "linear-gradient(135deg, #4169E1 0%, #007BFF 100%)",
                            boxShadow: "0 0 0 2px rgba(0,123,255,0.2), 0 2px 8px rgba(65,105,225,0.35)"
                        }}
                    >
                        <Zap className={cn("h-4 w-4 text-white", zapActive && "zap-icon")} />
                    </motion.div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="text-base font-bold tracking-tight text-foreground truncate"
                            >
                                Zenit
                                <span className="text-primary font-light">WMS</span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.05
                            }
                        }
                    }}
                    className="space-y-5"
                >
                    {filteredGroups.map((group) => (
                        <motion.div
                            key={group.label}
                            variants={{
                                hidden: { opacity: 0, y: 10 },
                                visible: { opacity: 1, y: 0 }
                            }}
                        >
                            {!collapsed && (
                                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    {group.label}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.href}
                                        item={item}
                                        collapsed={collapsed}
                                        isActive={
                                            pathname === item.href ||
                                            (item.href !== "/dashboard" &&
                                                pathname.startsWith(item.href))
                                        }
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </nav>
        </aside>
    );
}

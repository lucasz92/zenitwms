"use client";

import { useState, useEffect } from "react";
import { Bell, PanelLeftClose, PanelLeftOpen, Search, Sun, Moon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sileo } from "sileo";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TopbarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
    userName?: string;
    userEmail?: string;
    userRole?: string;
}

export function Topbar({
    collapsed,
    onToggleCollapse,
    userName,
    userEmail,
    userRole,
}: TopbarProps) {
    const [darkMode, setDarkMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle("dark");
    };

    const roleLabel: Record<string, string> = {
        admin: "Administrador",
        employee: "Empleado",
        viewer: "Visita",
    };

    return (
        <header className="relative flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 backdrop-blur-sm px-4">
            {/* Borde inferior con degradado azul */}
            <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(90deg, #4169E1 0%, #007BFF 50%, transparent 100%)" }}
            />
            {/* Collapse Toggle */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Toggle sidebar"
            >
                {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                ) : (
                    <PanelLeftClose className="h-4 w-4" />
                )}
            </Button>

            {/* Search */}
            <div className="flex flex-1 items-center">
                <div className="relative max-w-md w-full hidden sm:flex">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar producto, código..."
                        className={cn(
                            "h-8 w-full rounded-md border border-input bg-muted/40 pl-8 pr-3 text-sm",
                            "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring",
                            "transition-colors"
                        )}
                    />
                    <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:flex">
                        ⌘K
                    </kbd>
                </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5">
                {/* User info — only on sm+ */}
                {userName && (
                    <div className="hidden sm:flex flex-col items-end mr-1">
                        <span className="text-xs font-medium leading-none text-foreground">
                            {userName}
                        </span>
                        {userRole && (
                            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                                {roleLabel[userRole] ?? userRole}
                            </span>
                        )}
                    </div>
                )}

                {/* Dark mode toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleDarkMode}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Cambiar tema"
                >
                    {darkMode ? (
                        <Sun className="h-4 w-4" />
                    ) : (
                        <Moon className="h-4 w-4" />
                    )}
                </Button>

                {/* Sileo Test Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => sileo.success({
                        title: "¡Efecto Sileo!",
                        description: "Las notificaciones ahora son orgánicas y fluidas.",
                        duration: 4000
                    })}
                    className="text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
                    title="Probar Sileo"
                >
                    <motion.div
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Sparkles className="h-4 w-4" />
                    </motion.div>
                </Button>

                {/* Notifications */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground"
                    aria-label="Notificaciones"
                >
                    <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                    >
                        <Bell className="h-4 w-4" />
                    </motion.div>
                    {/* Dot azul eléctrico */}
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                        style={{ background: "#007BFF" }}
                    />
                </Button>

                {/* Clerk UserButton — handles avatar, profile, sign out natively */}
                {mounted && (
                    <UserButton
                        afterSignOutUrl="/login"
                        appearance={{
                            variables: {
                                colorPrimary: "#4169E1",
                                colorBackground: "#ffffff",
                                colorText: "#2d2d2d",
                                colorTextSecondary: "#6b7280",
                                colorInputBackground: "#f3f4f6",
                                colorInputText: "#2d2d2d",
                                colorDanger: "#ef4444",
                                borderRadius: "12px",
                                fontFamily: "inherit",
                                fontSize: "14px",
                            },
                            elements: {
                                /* ── Avatar ── */
                                avatarBox:
                                    "h-8 w-8 ring-2 ring-[#4169E1]/30 hover:ring-[#4169E1]/70 ring-offset-2 ring-offset-background transition-all rounded-full",

                                /* ── Dropdown card ── */
                                userButtonPopoverCard:
                                    "shadow-2xl border border-border rounded-2xl overflow-hidden bg-background",
                                userButtonPopoverMain: "bg-background",
                                userButtonPopoverActions: "bg-background px-2 pb-2",
                                userButtonPopoverActionButton:
                                    "rounded-xl text-[#2d2d2d] hover:bg-[#eef2ff] hover:text-[#4169E1] transition-colors font-medium",
                                userButtonPopoverActionButtonIcon: "text-[#4169E1]/70",
                                userButtonPopoverActionButtonText: "text-sm",
                                userButtonPopoverFooter:
                                    "border-t border-border bg-muted/30 py-2 text-xs text-muted-foreground",

                                /* ── User preview inside dropdown ── */
                                userPreviewMainIdentifier: "font-bold text-[#2d2d2d] text-sm",
                                userPreviewSecondaryIdentifier: "text-xs text-muted-foreground",
                                userPreviewAvatarBox: "ring-2 ring-[#4169E1]/40 rounded-full",

                                /* ── UserProfile modal ── */
                                rootBox: "shadow-2xl",
                                card: "border border-border shadow-2xl rounded-2xl overflow-hidden",

                                /* Sidebar izquierdo del modal */
                                navbar: "bg-sidebar border-r border-border",
                                navbarButton:
                                    "rounded-xl font-medium text-[#2d2d2d] hover:bg-[#eef2ff] hover:text-[#4169E1] data-[active=true]:bg-[#eef2ff] data-[active=true]:text-[#4169E1]",
                                navbarButtonIcon: "text-[#4169E1]/60",

                                /* Contenido del modal */
                                pageScrollBox: "bg-background",
                                headerTitle: "text-[#2d2d2d] font-bold",
                                headerSubtitle: "text-muted-foreground text-sm",

                                /* Inputs */
                                formFieldInput:
                                    "bg-muted/50 border-2 border-border rounded-xl h-11 text-sm focus:border-[#4169E1] focus:ring-2 focus:ring-[#4169E1]/15 outline-none",
                                formFieldLabel: "text-xs font-semibold text-muted-foreground uppercase tracking-wider",

                                /* Botones del modal */
                                formButtonPrimary:
                                    "bg-[#4169E1] hover:bg-[#3558c8] text-white rounded-xl font-semibold text-sm transition-colors",
                                formButtonReset:
                                    "text-[#4169E1] hover:text-[#3558c8] font-medium text-sm",

                                /* Badge Primary */
                                badge: "bg-[#eef2ff] text-[#4169E1] border border-[#4169E1]/20 rounded-full text-[11px] font-bold",

                                /* Botón upload avatar */
                                avatarImageActionsUpload:
                                    "border-2 border-[#4169E1]/30 text-[#4169E1] hover:border-[#4169E1] rounded-xl font-medium",
                            },
                        }}
                        userProfileProps={{
                            appearance: {
                                variables: {
                                    colorPrimary: "#4169E1",
                                    colorBackground: "#ffffff",
                                    colorText: "#2d2d2d",
                                    colorTextSecondary: "#6b7280",
                                    colorInputBackground: "#f3f4f6",
                                    borderRadius: "12px",
                                    fontFamily: "inherit",
                                },
                            },
                        }}
                    />
                )}
            </div>
        </header>
    );
}

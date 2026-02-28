"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import type { UserRole } from "@/lib/config/nav";

interface DashboardShellProps {
    children: React.ReactNode;
    userName?: string;
    userEmail?: string;
    userRole?: UserRole;
    avatarUrl?: string;
}

export function DashboardShell({
    children,
    userName,
    userEmail,
    userRole,
}: DashboardShellProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-[100dvh] overflow-hidden bg-background">
            {/* Sidebar — solo visible en desktop (md+) */}
            <div className="hidden md:flex">
                <Sidebar userRole={userRole} collapsed={collapsed} />
            </div>

            {/* Main area */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                <Topbar
                    collapsed={collapsed}
                    onToggleCollapse={() => setCollapsed((v) => !v)}
                    userName={userName}
                    userEmail={userEmail}
                    userRole={userRole}
                />

                {/* Contenido — padding-bottom en mobile para la bottom nav */}
                <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6 pb-20 md:pb-6">
                    {children}
                </main>
            </div>

            {/* Bottom nav — solo visible en mobile */}
            <BottomNav />
        </div>
    );
}

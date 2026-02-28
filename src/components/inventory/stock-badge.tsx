import { cn } from "@/lib/utils";
import { getStockStatus, type Product } from "@/types/product";

interface StockBadgeProps {
    stock: number;
    minStock: number;
    showCount?: boolean;
    className?: string;
}

const STATUS_CONFIG = {
    ok: {
        label: "OK",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
    },
    low: {
        label: "Bajo",
        className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
    },
    critical: {
        label: "Crítico",
        className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
    },
    out: {
        label: "Sin stock",
        className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    },
};

export function StockBadge({ stock, minStock, showCount = true, className }: StockBadgeProps) {
    const status = getStockStatus(stock, minStock);
    const config = STATUS_CONFIG[status];

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                config.className,
                className
            )}
        >
            <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "ok" && "bg-emerald-500",
                status === "low" && "bg-amber-500",
                status === "critical" && "bg-orange-500",
                status === "out" && "bg-red-500",
            )} />
            {showCount ? stock : config.label}
        </span>
    );
}

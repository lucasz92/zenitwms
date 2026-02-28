import { Metadata } from "next";
import { getAlerts } from "@/app/actions/alerts";
import { AlertsView } from "@/components/alerts/alerts-view";
import { withTimeout } from "@/lib/utils/with-timeout";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
    title: "Alertas y Reportes",
};

export default async function AlertsPage() {
    const alerts = await withTimeout(getAlerts(), null);

    if (alerts === null) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 p-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Problemas de conexión</h2>
                <p className="text-center text-sm text-muted-foreground max-w-md">
                    No pudimos conectar con la base de datos de alertas. Por favor,
                    verifica tu conexión a internet o intenta recargar la página más tarde.
                </p>
                <div className="flex gap-2">
                    <a href="/dashboard/alerts" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        Reintentar
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Centro de Alertas
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Reportes de incidencias, mermas y códigos rotos
                </p>
            </div>

            <AlertsView initialAlerts={alerts} />
        </div>
    );
}

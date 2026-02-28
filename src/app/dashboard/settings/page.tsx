import { SettingsView } from "@/components/settings/settings-view";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Ajustes del Sistema",
};

export default function SettingsPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Panel de Control: Sistema</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Utilidades de bajo nivel: Importación y Exportación Masiva de bases de datos.
                </p>
            </div>

            <SettingsView />
        </div>
    );
}

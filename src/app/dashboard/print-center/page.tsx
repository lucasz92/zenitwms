import { PrintCenter } from "@/components/printing/print-center";

export const metadata = {
    title: "Centro de Impresión | Zenit WMS",
    description: "Generación de etiquetas y carteles A4 para pallets y ubicaciones.",
};

export default function PrintCenterPage() {
    return (
        <div className="flex h-full flex-col p-4 md:p-6 pb-20 md:pb-6 overflow-hidden min-h-[calc(100vh-5rem)]">
            <PrintCenter />
        </div>
    );
}

import { Metadata } from "next";
import { BarcodeScanner } from "@/components/scanner/barcode-scanner";

export const metadata: Metadata = {
    title: "Escáner",
};

// Página fullscreen — sin padding del shell, ocupa todo el viewport
export default function ScannerPage() {
    return (
        // -m-4 md:-m-6 cancela el padding del layout para que la cámara ocupe todo
        <div className="-m-4 md:-m-6 h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col">
            <BarcodeScanner />
        </div>
    );
}

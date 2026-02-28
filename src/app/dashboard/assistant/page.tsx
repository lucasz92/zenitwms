import { Metadata } from "next";
import { ChatInterface } from "@/components/assistant/chat-interface";

export const metadata: Metadata = {
    title: "Asistente IA",
};

export default function AssistantPage() {
    return (
        // Oculta el padding habitual del dashboard para que el chat ocupe toda la pantalla
        <div className="-m-4 md:-m-6 h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col bg-background">
            <ChatInterface />
        </div>
    );
}

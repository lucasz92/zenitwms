import { getKnowledgeDocuments } from "@/app/actions/knowledge";
import { KnowledgeView } from "@/components/knowledge/knowledge-view";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Documentación y Cerebro IA",
};

export default async function KnowledgePage() {
    const documents = await getKnowledgeDocuments();

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Cerebro IA y Protocolos</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Gestioná la base de conocimiento para la IA, carga manuales, y administra excepciones operativas.
                </p>
            </div>

            <KnowledgeView documents={documents} />
        </div>
    );
}

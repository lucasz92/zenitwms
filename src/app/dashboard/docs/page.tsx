import { getKnowledgeDocuments } from "@/app/actions/knowledge";
import { DocsView } from "@/components/docs/docs-view";
import { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

export const metadata: Metadata = {
    title: "Documentación",
};

export default async function DocsPage() {
    // Usamos el mismo action pero en la vista DocsView lo trataremos como manuales regulares
    const documents = await getKnowledgeDocuments();
    const user = await currentUser();
    const userRole = (user?.publicMetadata?.role as string) || "employee";

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Documentación del Sistema</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manuales, procedimientos de seguridad y documentación formal de la plataforma.
                </p>
            </div>

            <DocsView documents={documents} userRole={userRole} />
        </div>
    );
}

import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { knowledgeDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

export async function POST(req: Request) {
    console.log("[Chat API] Request received");
    try {
        const { messages } = await req.json();
        console.log("[Chat API] Messages count:", messages?.length);

        if (!process.env.GOOGLE_GENERATED_AI_API_KEY) {
            console.error("[Chat API] Critical: GOOGLE_GENERATED_AI_API_KEY is missing");
        }

        const coreMessages = messages.map((m: any) => {
            let contentStr = m.content || "";
            if (!contentStr && m.parts && Array.isArray(m.parts)) {
                contentStr = m.parts.map((p: any) => p.text || "").join("");
            }
            return {
                role: m.role,
                content: contentStr,
            };
        });

        // 1. Obtener contexto de la base de conocimientos (RAG Simple)
        let knowledgeContext = "";
        try {
            const docs = await db.query.knowledgeDocuments.findMany({
                where: eq(knowledgeDocuments.isActive, true),
            });
            console.log("[Chat API] Documents found:", docs.length);
            knowledgeContext = docs.map(d => `--- DOCUMENTO: ${d.title} ---\n${d.content}`).join("\n\n");
        } catch (dbError) {
            console.error("[Chat API] DB Error fetching documents:", dbError);
            // Seguimos adelante sin contexto si falla la DB
        }

        // 2. Configurar el System Prompt
        const systemPrompt = `Eres Zenit AI, el asistente inteligente del sistema de gestión de almacenes (WMS) de Zenit. 
Tu objetivo es ayudar a los operarios y administradores a gestionar el inventario, ubicaciones y movimientos.

INFORMACIÓN DE LA BASE DE CONOCIMIENTOS:
${knowledgeContext}

INSTRUCCIONES:
- Usa la información de los DOCUMENTOS de arriba para responder si es relevante.
- Si no sabes algo, admítelo cordialmente.
- Mantén un tono profesional, servicial y directo.
- Tus respuestas deben ser en formato Markdown claro.
- Si te preguntan por stock o ubicaciones de forma genérica, recuerda que tienes acceso a la base de datos.
`;

        console.log("[Chat API] Calling streamText with gemini-3-flash-preview...");
        // 3. Ejecutar Stream con Gemini
        const result = streamText({
            model: google("gemini-3-flash-preview"),
            system: systemPrompt,
            messages: coreMessages,
        });

        console.log("[Chat API] Returning stream response");
        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error("[Chat API Error]", error);
        return new Response(
            JSON.stringify({ error: "Error procesando el mensaje", details: error instanceof Error ? error.message : String(error) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

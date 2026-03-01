import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/db";
import { knowledgeDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

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
        const docs = await db.query.knowledgeDocuments.findMany({
            where: eq(knowledgeDocuments.isActive, true),
        });

        const knowledgeContext = docs.map(d => `--- DOCUMENTO: ${d.title} ---\n${d.content}`).join("\n\n");

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
- Si te preguntan por stock o ubicaciones de forma genérica, recuerda que tienes acceso a la base de datos (simulado por ahora en esta versión, pero diles que puedes ver el inventario en tiempo real si suben los datos).
`;

        // 3. Ejecutar Stream con Gemini
        const result = streamText({
            model: google("gemini-1.5-flash"),
            system: systemPrompt,
            messages: coreMessages,
        });

        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error("[Chat API Error]", error);
        return new Response(
            JSON.stringify({ error: "Error procesando el mensaje" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

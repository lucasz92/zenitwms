import { NextResponse } from "next/server";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export async function POST(req: Request) {
    try {
        const { messages } = (await req.json()) as { messages: Message[] };

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }

        const lastMessage = messages[messages.length - 1];
        const userText = lastMessage.content.toLowerCase();

        // =============== MOCK AI LOGIC ===============
        // Simulamos un retraso de procesamiento para dar la sensación de que la IA está "pensando"
        await new Promise((resolve) => setTimeout(resolve, 1500));

        let responseContent = "";

        if (userText.includes("stock crítico") || userText.includes("bajo stock")) {
            responseContent = `Actualmente hay 3 productos con stock crítico en el depósito central:

1. **TEST-01 (Cinta Métrica)** - Stock: 0 (Mínimo: 5)
2. **HRR-05 (Destornillador)** - Stock: 2 (Mínimo: 10)
3. **ELE-12 (Cable 2.5mm)** - Stock: 15 (Mínimo: 50)

¿Querés que te genere un reporte detallado para Compras?`;
        }
        else if (userText.includes("dónde") || userText.includes("ubicación") || userText.includes("10-01")) {
            responseContent = `El producto **10-01 (Martillo Galponero)** se encuentra ubicado en:

📍 **Depósito Principal**
Sector: Ferretería
Fila: A
Columna: 03
Estante: 2

Tiene un stock actual de 15 unidades.`;
        }
        else if (userText.includes("movimientos") || userText.includes("resumen")) {
            responseContent = `Hoy se registraron los siguientes movimientos principales:

- **+ 50 un** de *Tornillos T2* (Ingreso)
- **- 5 un** de *Taladro Percutor* (Salida)
- **Ajuste** de inventario en *Pasillo C* (+2 un)

El volumen general de operaciones está un 12% por debajo de la media semanal.`;
        }
        else {
            responseContent = `Como soy un prototipo de Zenit AI simulado, todavía no me conectaron a OpenAI para darte respuestas 100% dinámicas a esa pregunta. ¡Pero estoy listo para que lo hagan!

Podés probar preguntándome sobre:
- Productos con "bajo stock"
- "¿Dónde está el producto 10-01?"
- "Resumen de movimientos"`;
        }

        return NextResponse.json({
            role: "assistant",
            content: responseContent
        });

    } catch (error) {
        console.error("[Chat API Error]", error);
        return NextResponse.json(
            { error: "Error procesando el mensaje" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const productId = formData.get("productId") as string | null;

        if (!file || !productId) {
            return NextResponse.json({ error: "Faltan datos requeridos (file, productId)" }, { status: 400 });
        }

        // Usar claves de administrador (Service Role Key) para bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            console.error("Falta configurar la SUPABASE_SERVICE_ROLE_KEY en el backend.");
            return NextResponse.json({ error: "Error de configuración de Storage" }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const fileExt = file.name.split('.').pop() || "png";
        const fileName = `${productId}-${Date.now()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('products')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error("[Supabase Upload Error]", uploadError);
            return NextResponse.json({ error: "No se pudo subir el archivo al storage" }, { status: 500 });
        }

        const { data } = supabaseAdmin.storage
            .from('products')
            .getPublicUrl(filePath);

        return NextResponse.json({ url: data.publicUrl }, { status: 200 });

    } catch (error: any) {
        console.error("[API Upload Image Error]:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

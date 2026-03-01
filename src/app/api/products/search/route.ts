import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, locations } from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
        return NextResponse.json({ error: "code es requerido" }, { status: 400 });
    }

    try {
        const rows = await db
            .select({
                id: products.id,
                code: products.code,
                name: products.name,
                description: products.description,
                stock: products.stock,
                minStock: products.minStock,
                unitType: products.unitType,
                price: products.price,
                imageUrl: products.imageUrl,
                deposito: locations.warehouse,
                sector: locations.sector,
                fila: locations.row,
                columna: locations.column,
                estante: locations.shelf,
                posicion: locations.position,
                location: sql<string | null>`
          CASE
            WHEN ${locations.id} IS NOT NULL THEN
              CONCAT_WS(' / ',
                NULLIF(${locations.sector}, NULL),
                NULLIF(CONCAT(${locations.row}, '-', ${locations.column}), '-'),
                NULLIF(CONCAT('C', ${locations.shelf}), 'C')
              )
            ELSE NULL
          END
        `,
            })
            .from(products)
            .leftJoin(
                locations,
                sql`${locations.productId} = ${products.id} AND ${locations.isPrimary} = true`
            )
            .where(eq(products.code, code))
            .limit(1);

        if (rows.length === 0) {
            return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
        }

        const product = rows[0];
        return NextResponse.json({
            id: product.id,
            code: product.code,
            name: product.name,
            description: product.description,
            stock: product.stock,
            location: product.location,
            imageUrl: product.imageUrl,
            deposito: product.deposito,
            sector: product.sector,
            fila: product.fila,
            columna: product.columna,
            estante: product.estante,
            posicion: product.posicion,
        });
    } catch (err) {
        console.error("[API /products/search]", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

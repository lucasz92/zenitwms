import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sectorLayouts } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const layoutSchema = z.array(z.object({
    sectorName: z.string(),
    description: z.string().optional().nullable(),
    orderIndex: z.number().int(),
}));

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = layoutSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        const layouts = parsed.data;

        // Start transaction for atomic writes
        await db.transaction(async (tx) => {
            for (const item of layouts) {
                await tx.insert(sectorLayouts)
                    .values({
                        sectorName: item.sectorName,
                        description: item.description,
                        orderIndex: item.orderIndex,
                        updatedAt: new Date(),
                    })
                    .onConflictDoUpdate({
                        target: sectorLayouts.sectorName,
                        set: {
                            description: item.description,
                            orderIndex: item.orderIndex,
                            updatedAt: new Date(),
                        }
                    });
            }
        });

        return NextResponse.json({ success: true, count: layouts.length });

    } catch (error) {
        console.error("Error saving layout:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

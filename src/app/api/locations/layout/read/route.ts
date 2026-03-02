import { NextResponse } from "next/server";
import { getSectorsLayout } from "@/lib/db/queries/locations";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const layouts = await getSectorsLayout();

        return NextResponse.json({ layouts });
    } catch (error) {
        console.error("Error fetching layouts:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

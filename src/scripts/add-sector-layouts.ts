import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is missing in .env.local");
}

async function run() {
    console.log("Connecting to Database...");
    const client = postgres(connectionString!);
    const db = drizzle(client);

    console.log("Creating table `sector_layouts`...");

    try {
        await client`
            CREATE TABLE IF NOT EXISTS "sector_layouts" (
                "sector_name" text PRIMARY KEY NOT NULL,
                "order_index" integer DEFAULT 0 NOT NULL,
                "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            );
        `;
        console.log("Table `sector_layouts` created successfully.");

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await client.end();
    }
}

run();

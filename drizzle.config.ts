import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

if (!url) {
    throw new Error(
        "DATABASE_URL (or DATABASE_URL_DIRECT) must be set in .env.local"
    );
}

export default defineConfig({
    schema: "./src/lib/db/schema.ts",
    out: "./drizzle/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url,
    },
    verbose: true,
    strict: false,
});

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Prevent multiple connections in development (Next.js hot reload)
declare global {
    // eslint-disable-next-line no-var
    var _pgClient: postgres.Sql | undefined;
}

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
}

// Use pooler URL (port 6543) for queries — pgbouncer transaction mode
// `prepare: false` is required for pgbouncer compatibility
const client =
    global._pgClient ??
    postgres(connectionString, {
        prepare: false, // Required for Supabase pgbouncer (transaction mode)
        max: 10,        // Aumentado a 10 para evitar cuellos de botella en concurrencia SSR
        idle_timeout: 20, // Cerrar conexiones inactivas después de 20s
        connect_timeout: 10, // Timeout de conexión de 10s
    });

if (process.env.NODE_ENV !== "production") {
    global._pgClient = client;
}

export const db = drizzle(client, { schema });

export type DB = typeof db;

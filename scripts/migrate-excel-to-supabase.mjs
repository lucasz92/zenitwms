/**
 * migrate-excel-to-supabase.mjs
 *
 * Script de migración masiva desde Excel → Supabase Postgres (vía Drizzle/postgres.js)
 * Diseñado para manejar 73.000+ productos sin limitaciones del browser.
 *
 * Ventajas sobre el importador web:
 *  - Sin timeout de Server Actions (Next.js)
 *  - Sin overhead de 146 llamadas HTTP
 *  - Conexión directa a Postgres (sin PgBouncer)
 *  - Chunk processing optimizado con progress bar en consola
 *
 * USO:
 *   1. Colocar el archivo Excel en la raíz del proyecto
 *   2. Configurar ARCHIVO_EXCEL abajo con el nombre del archivo
 *   3. node scripts/migrate-excel-to-supabase.mjs
 *
 * COLUMNAS ESPERADAS (case-insensitive):
 *   CODIGO | codigo | code
 *   NOMBRE | nombre | name
 *   CANTIDAD | cantidad | stock
 *   MINIMO | minimo | minStock
 *   CATEGORIA | categoria
 *   UNIDAD | unidad | unit  (valores: un, caja, kg, lt, mt, mt2)
 *   DEPOSITO | deposito
 *   SECTOR | sector
 *   FILA | fila
 *   COLUMNA | columna
 *   ESTANTE | estante
 *   POSICION | posicion
 */

import { readFileSync } from "fs";
import { read, utils } from "xlsx";
import postgres from "postgres";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config({ path: ".env.local" });

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN — ajustar según necesidad
// ──────────────────────────────────────────────────────────────────────────────

const ARCHIVO_EXCEL = process.argv[2] || "productos.xlsx"; // Primer argumento o nombre por defecto
const HOJA = process.argv[3] || null;                       // Nombre de hoja (null = primera hoja)
const DUPLICATE_ACTION = process.argv[4] || "update";       // "update" | "skip"
const PRODUCT_CHUNK_SIZE = 1000;                            // Filas por batch de INSERT
const LOCATION_CHUNK_SIZE = 1000;

// ──────────────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL no está definida en .env.local");
    process.exit(1);
}

const sql = postgres(DATABASE_URL, {
    max: 3,               // Pool de 3 conexiones máximo
    idle_timeout: 30,
    connect_timeout: 30,
});

const VALID_UNITS = new Set(["un", "caja", "kg", "lt", "mt", "mt2"]);

function parseRow(row) {
    const code = String(
        row.codigo ?? row.code ?? row.CODIGO ?? row.Codigo ?? ""
    ).trim().toUpperCase();

    if (!code || code === "CODIGO" || code === "CODE") return null;

    const name = String(
        row.nombre ?? row.name ?? row.NOMBRE ?? row.Nombre ?? row.descripcion ?? "Sin nombre"
    ).trim();

    const stockRaw = parseInt(row.cantidad ?? row.qty ?? row.CANTIDAD ?? row.stock ?? 0);
    const stock = isNaN(stockRaw) ? 0 : Math.max(0, stockRaw);

    const minRaw = parseInt(row.minimo ?? row.minStock ?? row.MINIMO ?? row.Minimo ?? 0);
    const minStock = isNaN(minRaw) ? 0 : Math.max(0, minRaw);

    const categoria = String(row.categoria ?? row.category ?? row.CATEGORIA ?? "").trim() || null;

    const unitRaw = String(row.unidad ?? row.unit ?? row.UNIDAD ?? "un").trim().toLowerCase();
    const unit_type = VALID_UNITS.has(unitRaw) ? unitRaw : "un";

    const warehouse = String(row.deposito ?? row.DEPOSITO ?? "Principal").trim() || "Principal";
    const sector = String(row.sector ?? row.SECTOR ?? "").trim() || null;
    const row_loc = String(row.fila ?? row.FILA ?? "").trim() || null;
    const column = String(row.columna ?? row.COLUMNA ?? "").trim() || null;
    const shelf = String(row.estante ?? row.ESTANTE ?? "").trim() || null;
    const position = String(row.posicion ?? row.POSICION ?? "").trim() || null;
    const orientation = String(row.orientacion ?? row.ORIENTACION ?? "").trim() || null;
    const hasLocation = !!(sector || row_loc || column || shelf || warehouse !== "Principal");

    return { code, name, stock, min_stock: minStock, categoria, unit_type, warehouse, sector, row_loc, column, shelf, position, orientation, hasLocation };
}

function progressBar(current, total, label = "") {
    const pct = Math.floor((current / total) * 100);
    const filled = Math.floor(pct / 2);
    const bar = "█".repeat(filled) + "░".repeat(50 - filled);
    process.stdout.write(`\r[${bar}] ${pct}% — ${current.toLocaleString()}/${total.toLocaleString()} ${label}   `);
}

async function run() {
    console.log("=".repeat(65));
    console.log("  MIGRACIÓN MASIVA EXCEL → SUPABASE");
    console.log("=".repeat(65));
    console.log(`📁 Archivo  : ${ARCHIVO_EXCEL}`);
    console.log(`🔄 Duplicados: ${DUPLICATE_ACTION}`);
    console.log("");

    // ── Leer Excel ───────────────────────────────────────────────────────────
    let fileBuffer;
    try {
        fileBuffer = readFileSync(ARCHIVO_EXCEL);
    } catch (e) {
        console.error(`❌ No se pudo leer el archivo: ${ARCHIVO_EXCEL}`);
        console.error(`   Asegurate de ejecutar el script desde la raíz del proyecto.`);
        process.exit(1);
    }

    console.log("📖 Leyendo Excel...");
    const workbook = read(fileBuffer, { type: "buffer", celldates: true });
    const sheetName = HOJA || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
        console.error(`❌ Hoja "${sheetName}" no encontrada. Hojas disponibles: ${workbook.SheetNames.join(", ")}`);
        process.exit(1);
    }

    const rawData = utils.sheet_to_json(worksheet, { defval: "" });
    console.log(`📊 ${rawData.length.toLocaleString()} filas leídas de la hoja "${sheetName}"`);

    // ── Parsear filas ─────────────────────────────────────────────────────────
    console.log("🔍 Parseando filas...");
    const rows = rawData.map(parseRow).filter(Boolean);
    const skippedEmpty = rawData.length - rows.length;

    console.log(`✅ ${rows.length.toLocaleString()} filas válidas`);
    if (skippedEmpty > 0) console.log(`⚠️  ${skippedEmpty} filas ignoradas (sin código)`);
    console.log("");

    // ── Detectar duplicados ───────────────────────────────────────────────────
    console.log("🔎 Verificando códigos existentes en base de datos...");
    const allCodes = rows.map(r => r.code);

    // Dividir en chunks de 5000 para el IN query
    const existingCodes = new Set();
    const CODE_CHECK_CHUNK = 5000;
    for (let i = 0; i < allCodes.length; i += CODE_CHECK_CHUNK) {
        const chunk = allCodes.slice(i, i + CODE_CHECK_CHUNK);
        const existing = await sql`
            SELECT code FROM products WHERE code = ANY(${chunk})
        `;
        existing.forEach(r => existingCodes.add(r.code.toUpperCase()));
    }

    const toInsert = rows.filter(r => !existingCodes.has(r.code));
    const toUpdate = rows.filter(r => existingCodes.has(r.code));

    console.log(`  🆕 Nuevos     : ${toInsert.length.toLocaleString()}`);
    console.log(`  🔄 Existentes : ${toUpdate.length.toLocaleString()} (acción: ${DUPLICATE_ACTION})`);
    console.log("");

    const rowsToProcess = DUPLICATE_ACTION === "skip" ? toInsert : rows;
    let insertedCount = 0;
    let updatedCount = 0;
    const now = new Date().toISOString();

    // ── INSERT nuevos productos ───────────────────────────────────────────────
    if (toInsert.length > 0) {
        console.log(`📥 Insertando ${toInsert.length.toLocaleString()} productos nuevos...`);
        for (let i = 0; i < toInsert.length; i += PRODUCT_CHUNK_SIZE) {
            const chunk = toInsert.slice(i, i + PRODUCT_CHUNK_SIZE);
            await sql`
                INSERT INTO products (code, name, stock, min_stock, categoria, unit_type, created_at, updated_at)
                VALUES ${sql(chunk.map(r => [r.code, r.name, r.stock, r.min_stock, r.categoria, r.unit_type, now, now]))}
                ON CONFLICT (code) DO NOTHING
            `;
            insertedCount += chunk.length;
            progressBar(i + chunk.length, toInsert.length, "insertados");
        }
        console.log("");
        console.log(`   ✅ ${insertedCount.toLocaleString()} productos insertados.`);
    }

    // ── UPDATE productos existentes ───────────────────────────────────────────
    if (DUPLICATE_ACTION === "update" && toUpdate.length > 0) {
        console.log(`\n🔄 Actualizando ${toUpdate.length.toLocaleString()} productos existentes...`);
        let done = 0;
        for (let i = 0; i < toUpdate.length; i += PRODUCT_CHUNK_SIZE) {
            const chunk = toUpdate.slice(i, i + PRODUCT_CHUNK_SIZE);
            // UPDATE usando unnest para bulk update sin loop
            await sql`
                UPDATE products SET
                    name        = data.name,
                    stock       = data.stock::int,
                    min_stock   = data.min_stock::int,
                    categoria   = data.categoria,
                    unit_type   = data.unit_type::unit_type,
                    updated_at  = ${now}
                FROM (VALUES ${sql(chunk.map(r => [r.code, r.name, String(r.stock), String(r.min_stock), r.categoria, r.unit_type]))})
                    AS data(code, name, stock, min_stock, categoria, unit_type)
                WHERE products.code = data.code
            `;
            done += chunk.length;
            updatedCount += chunk.length;
            progressBar(done, toUpdate.length, "actualizados");
        }
        console.log("");
        console.log(`   ✅ ${updatedCount.toLocaleString()} productos actualizados.`);
    }

    // ── Ubicaciones ───────────────────────────────────────────────────────────
    const rowsWithLoc = rowsToProcess.filter(r => r.hasLocation);

    if (rowsWithLoc.length > 0) {
        console.log(`\n📍 Procesando ${rowsWithLoc.length.toLocaleString()} ubicaciones...`);

        // Fetch product IDs in chunks
        const locCodes = rowsWithLoc.map(r => r.code);
        const codeToId = new Map();

        for (let i = 0; i < locCodes.length; i += CODE_CHECK_CHUNK) {
            const chunk = locCodes.slice(i, i + CODE_CHECK_CHUNK);
            const prodRows = await sql`
                SELECT id, code FROM products WHERE code = ANY(${chunk})
            `;
            prodRows.forEach(p => codeToId.set(p.code.toUpperCase(), p.id));
        }

        // Build location rows
        const locRows = rowsWithLoc
            .filter(r => codeToId.has(r.code))
            .map(r => ({
                product_id: codeToId.get(r.code),
                warehouse: r.warehouse,
                sector: r.sector,
                row: r.row_loc,
                column: r.column,
                shelf: r.shelf,
                position: r.position,
                orientation: r.orientation,
                is_primary: true,
            }));

        // Delete existing locations for these products
        const productIds = [...codeToId.values()];
        console.log(`   🗑  Eliminando ubicaciones anteriores...`);
        for (let i = 0; i < productIds.length; i += CODE_CHECK_CHUNK) {
            const chunk = productIds.slice(i, i + CODE_CHECK_CHUNK);
            await sql`DELETE FROM locations WHERE product_id = ANY(${chunk})`;
        }

        // Bulk insert locations
        console.log(`   📤 Insertando ${locRows.length.toLocaleString()} ubicaciones nuevas...`);
        for (let i = 0; i < locRows.length; i += LOCATION_CHUNK_SIZE) {
            const chunk = locRows.slice(i, i + LOCATION_CHUNK_SIZE);
            await sql`
                INSERT INTO locations (product_id, warehouse, sector, row, "column", shelf, position, orientation, is_primary)
                VALUES ${sql(chunk.map(r => [r.product_id, r.warehouse, r.sector, r.row, r.column, r.shelf, r.position, r.orientation, r.is_primary]))}
            `;
            progressBar(i + chunk.length, locRows.length, "ubicaciones");
        }
        console.log("");
        console.log(`   ✅ Ubicaciones migradas.`);
    }

    await sql.end();

    console.log("");
    console.log("=".repeat(65));
    console.log("  ✅ MIGRACIÓN COMPLETADA");
    console.log("=".repeat(65));
    console.log(`  🆕 Productos insertados  : ${insertedCount.toLocaleString()}`);
    console.log(`  🔄 Productos actualizados: ${updatedCount.toLocaleString()}`);
    console.log(`  ⏭  Saltados (duplicados) : ${(rows.length - insertedCount - updatedCount).toLocaleString()}`);
    console.log(`  📍 Ubicaciones procesadas: ${rowsToProcess.filter(r => r.hasLocation).length.toLocaleString()}`);
    console.log("=".repeat(65));
}

run().catch(e => {
    console.error("\n❌ Error fatal:", e.message);
    sql.end();
    process.exit(1);
});

-- ============================================================
-- Migración: Añadir campos faltantes a la tabla `products`
-- Campos del modal original: categoria, sinonimo, proveedor,
-- observacion, y ubicación completa.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE "products"
    ADD COLUMN IF NOT EXISTS "categoria"          TEXT DEFAULT 'General',
    ADD COLUMN IF NOT EXISTS "sinonimo"           TEXT,
    ADD COLUMN IF NOT EXISTS "proveedor"          TEXT,
    ADD COLUMN IF NOT EXISTS "observacion"        TEXT,
    ADD COLUMN IF NOT EXISTS "deposito"           TEXT DEFAULT 'DEP01',
    ADD COLUMN IF NOT EXISTS "sector"             TEXT,
    ADD COLUMN IF NOT EXISTS "fila"               TEXT,
    ADD COLUMN IF NOT EXISTS "columna"            TEXT,
    ADD COLUMN IF NOT EXISTS "estante"            TEXT,
    ADD COLUMN IF NOT EXISTS "posicion"           TEXT,
    ADD COLUMN IF NOT EXISTS "orientacion"        TEXT,
    ADD COLUMN IF NOT EXISTS "ubicacion_display"  TEXT;

-- ✅ Listo.

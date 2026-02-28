-- ============================================================
-- Migración: Crear tabla `alerts` en Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Crear los ENUM types (si no existen)
DO $$ BEGIN
    CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Crear la tabla `alerts`
CREATE TABLE IF NOT EXISTS "alerts" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" TEXT,
    "product_id"      UUID REFERENCES "products"("id") ON DELETE SET NULL,
    "product_code"    TEXT,
    "product_name"    TEXT,
    "type"            TEXT NOT NULL,
    "description"     TEXT,
    "priority"        alert_priority NOT NULL DEFAULT 'medium',
    "status"          alert_status   NOT NULL DEFAULT 'pending',
    "reported_by"     TEXT,
    "resolved_at"     TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices útiles para filtros frecuentes
CREATE INDEX IF NOT EXISTS "alerts_status_idx"   ON "alerts" ("status");
CREATE INDEX IF NOT EXISTS "alerts_priority_idx" ON "alerts" ("priority");
CREATE INDEX IF NOT EXISTS "alerts_product_idx"  ON "alerts" ("product_id");

-- 4. RLS (Row Level Security) — habilitar y permitir a usuarios autenticados
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;

-- Política: todos los usuarios autenticados pueden leer y escribir alertas
CREATE POLICY "Authenticated users can manage alerts"
    ON "alerts"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- ✅ Listo. La tabla `alerts` está creada.
-- ============================================================

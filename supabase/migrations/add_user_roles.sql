-- ============================================================
-- Migración: Añadir nuevos roles ('manager', 'auditor') al ENUM 'user_role'
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Nota: ADD VALUE no puede ser usado dentro de un bloque transaccional.
-- Asegúrate de ejecutar esto de forma directa.

ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'auditor';

-- Opcional (por si necesitas un valor inicial que no está en la anterior):
-- ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'admin';
-- ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'employee';

-- ✅ Listo.

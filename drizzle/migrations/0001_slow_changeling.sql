CREATE TYPE "public"."document_type" AS ENUM('TEXT', 'MARKDOWN', 'PDF', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."transfer_item_status" AS ENUM('PENDING', 'OK', 'OVER', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('PENDING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."transfer_type" AS ENUM('INBOUND', 'REWORK', 'SCRAP');--> statement-breakpoint
CREATE TABLE "document_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"notes" text NOT NULL,
	"user" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" "document_type" DEFAULT 'TEXT' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_order_id" uuid NOT NULL,
	"product_code" text NOT NULL,
	"product_name" text NOT NULL,
	"qty_expected" integer DEFAULT 0 NOT NULL,
	"qty_received" integer DEFAULT 0 NOT NULL,
	"status" "transfer_item_status" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_order_id" uuid NOT NULL,
	"text" text NOT NULL,
	"type" text DEFAULT 'INFO' NOT NULL,
	"user" text,
	"date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" text NOT NULL,
	"type" "transfer_type" DEFAULT 'INBOUND' NOT NULL,
	"origin" text,
	"target" text,
	"reference_email" text,
	"status" "transfer_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'auditor', 'employee');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "categoria" text DEFAULT 'General';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sinonimo" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "proveedor" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "observacion" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "deposito" text DEFAULT 'DEP01';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sector" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fila" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "columna" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "estante" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "posicion" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "orientacion" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ubicacion_display" text;--> statement-breakpoint
ALTER TABLE "document_notes" ADD CONSTRAINT "document_notes_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_transfer_order_id_transfer_orders_id_fk" FOREIGN KEY ("transfer_order_id") REFERENCES "public"."transfer_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_transfer_order_id_transfer_orders_id_fk" FOREIGN KEY ("transfer_order_id") REFERENCES "public"."transfer_orders"("id") ON DELETE cascade ON UPDATE no action;
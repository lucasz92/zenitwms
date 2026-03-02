CREATE TABLE "sector_layouts" (
	"sector_name" text PRIMARY KEY NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

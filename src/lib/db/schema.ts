import {
    pgTable,
    text,
    integer,
    numeric,
    boolean,
    timestamp,
    pgEnum,
    uuid,
    primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "auditor", "employee"]);

export const unitTypeEnum = pgEnum("unit_type", [
    "un",
    "mt",
    "mt2",
    "kg",
    "lt",
    "caja",
]);

export const movementTypeEnum = pgEnum("movement_type", [
    "entry",
    "exit",
    "transfer",
    "adjustment",
]);

export const alertPriorityEnum = pgEnum("alert_priority", ["low", "medium", "high", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["pending", "in_progress", "completed"]);

// ── Tables ─────────────────────────────────────────────────────────────────

/**
 * users — Perfil interno de cada usuario (complementa Clerk)
 * El `id` es el Clerk userId (ej: "user_2abc...")
 */
export const users = pgTable("users", {
    id: text("id").primaryKey(), // Clerk userId
    email: text("email").notNull().unique(),
    name: text("name"),
    role: userRoleEnum("role").notNull().default("employee"),
    organizationId: text("organization_id"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * products — Catálogo central de productos
 */
export const products = pgTable("products", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }),
    stock: integer("stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    unitType: unitTypeEnum("unit_type").notNull().default("un"),
    imageUrl: text("image_url"),
    organizationId: text("organization_id"),
    // ─ Campos heredados del sistema anterior ─
    categoria: text("categoria").default("General"),
    sinonimo: text("sinonimo"),
    proveedor: text("proveedor"),
    observacion: text("observacion"),
    // ─ Auditoría ─
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * product_variants — Variantes de producto (talla, color, etc.)
 */
export const productVariants = pgTable("product_variants", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
        .notNull()
        .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku"),
    size: text("size"),
    color: text("color"),
    unitType: unitTypeEnum("unit_type").notNull().default("un"),
    stock: integer("stock").notNull().default(0),
    priceModifier: numeric("price_modifier", { precision: 12, scale: 2 })
        .notNull()
        .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * locations — Ubicaciones físicas en el depósito
 * Un producto puede tener múltiples ubicaciones
 */
export const locations = pgTable("locations", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id"),
    warehouse: text("warehouse").notNull().default("Principal"),
    sector: text("sector"),
    row: text("row"),
    column: text("column"),
    shelf: text("shelf"),
    position: text("position"),
    orientation: text("orientation"),
    productId: uuid("product_id").references(() => products.id, {
        onDelete: "set null",
    }),
    isPrimary: boolean("is_primary").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * inventory_movements — Historial de auditoría
 * Inmutable: no se actualiza, solo se inserta
 */
export const inventoryMovements = pgTable("inventory_movements", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id"),
    productId: uuid("product_id")
        .notNull()
        .references(() => products.id, { onDelete: "restrict" }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "restrict" }),
    type: movementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    fromLocationId: uuid("from_location_id").references(() => locations.id, {
        onDelete: "set null",
    }),
    toLocationId: uuid("to_location_id").references(() => locations.id, {
        onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * alerts — Sistema de reporte de incidencias (daños, pérdidas, códigos)
 */
export const alerts = pgTable("alerts", {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id"),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productCode: text("product_code"),
    productName: text("product_name"),
    type: text("type").notNull(),
    description: text("description"),
    priority: alertPriorityEnum("priority").notNull().default("medium"),
    status: alertStatusEnum("status").notNull().default("pending"),
    reportedBy: text("reported_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Transfer Orders (Control de Lotes / Remitos) ───────────────────────────

export const transferTypeEnum = pgEnum("transfer_type", ["INBOUND", "REWORK", "SCRAP"]);
export const transferStatusEnum = pgEnum("transfer_status", ["PENDING", "COMPLETED"]);
export const transferItemStatusEnum = pgEnum("transfer_item_status", ["PENDING", "OK", "OVER", "SHORT"]);
export const documentTypeEnum = pgEnum("document_type", ["TEXT", "MARKDOWN", "PDF", "MANUAL"]);

// ── Transfer Orders (Control de Lotes / Remitos) ───────────────────────────

// ... (se omite para brevedad el código intermedio de transfer, que ya está correcto arriba)
export const transferOrders = pgTable("transfer_orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: text("transfer_id").notNull(), // Ej: TR-00429
    type: transferTypeEnum("type").notNull().default("INBOUND"),
    origin: text("origin"), // Ej: Planta Matriz
    target: text("target"), // Ej: Stock General, Taller
    referenceEmail: text("reference_email"),
    status: transferStatusEnum("status").notNull().default("PENDING"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const transferItems = pgTable("transfer_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    transferOrderId: uuid("transfer_order_id").notNull().references(() => transferOrders.id, { onDelete: "cascade" }),
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    qtyExpected: integer("qty_expected").notNull().default(0),
    qtyReceived: integer("qty_received").notNull().default(0),
    status: transferItemStatusEnum("status").notNull().default("PENDING"),
});

export const transferLogs = pgTable("transfer_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    transferOrderId: uuid("transfer_order_id").notNull().references(() => transferOrders.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    type: text("type").notNull().default("INFO"), // INFO, USER_NOTE
    user: text("user"),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
});

// ── IA Knowledge Base / Documentation ──────────────────────────────────────

export const knowledgeDocuments = pgTable("knowledge_documents", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    content: text("content").notNull(), // Raw Text or Markdown
    type: documentTypeEnum("type").notNull().default("TEXT"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const documentNotes = pgTable("document_notes", {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    notes: text("notes").notNull(),
    user: text("user"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ many, one }) => ({
    variants: many(productVariants),
    locations: many(locations),
    movements: many(inventoryMovements),
    alerts: many(alerts),
    createdByUser: one(users, {
        fields: [products.createdBy],
        references: [users.id],
    }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
    product: one(products, {
        fields: [productVariants.productId],
        references: [products.id],
    }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
    product: one(products, {
        fields: [locations.productId],
        references: [products.id],
    }),
}));

export const inventoryMovementsRelations = relations(
    inventoryMovements,
    ({ one }) => ({
        product: one(products, {
            fields: [inventoryMovements.productId],
            references: [products.id],
        }),
        user: one(users, {
            fields: [inventoryMovements.userId],
            references: [users.id],
        }),
        fromLocation: one(locations, {
            fields: [inventoryMovements.fromLocationId],
            references: [locations.id],
        }),
        toLocation: one(locations, {
            fields: [inventoryMovements.toLocationId],
            references: [locations.id],
        }),
    })
);

export const alertsRelations = relations(alerts, ({ one }) => ({
    product: one(products, {
        fields: [alerts.productId],
        references: [products.id],
    }),
}));

export const transferOrdersRelations = relations(transferOrders, ({ many }) => ({
    items: many(transferItems),
    logs: many(transferLogs),
}));

export const transferItemsRelations = relations(transferItems, ({ one }) => ({
    order: one(transferOrders, {
        fields: [transferItems.transferOrderId],
        references: [transferOrders.id],
    }),
}));

export const transferLogsRelations = relations(transferLogs, ({ one }) => ({
    order: one(transferOrders, {
        fields: [transferLogs.transferOrderId],
        references: [transferOrders.id],
    }),
}));

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ many }) => ({
    notes: many(documentNotes),
}));

export const documentNotesRelations = relations(documentNotes, ({ one }) => ({
    document: one(knowledgeDocuments, {
        fields: [documentNotes.documentId],
        references: [knowledgeDocuments.id],
    }),
}));

// ── Type exports ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type TransferOrder = typeof transferOrders.$inferSelect;
export type NewTransferOrder = typeof transferOrders.$inferInsert;
export type TransferItem = typeof transferItems.$inferSelect;
export type NewTransferItem = typeof transferItems.$inferInsert;
export type TransferLog = typeof transferLogs.$inferSelect;
export type NewTransferLog = typeof transferLogs.$inferInsert;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;
export type DocumentNote = typeof documentNotes.$inferSelect;
export type NewDocumentNote = typeof documentNotes.$inferInsert;

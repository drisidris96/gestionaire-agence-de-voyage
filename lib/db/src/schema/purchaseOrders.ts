import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierPhone: text("supplier_phone"),
  date: text("date").notNull(),
  items: text("items").notNull().default("[]"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;

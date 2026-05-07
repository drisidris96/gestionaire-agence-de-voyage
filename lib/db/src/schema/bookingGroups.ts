import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const bookingGroupsTable = pgTable("booking_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  packageName: text("package_name").notNull(),
  departureDate: text("departure_date").notNull(),
  returnDate: text("return_date"),
  maxCapacity: integer("max_capacity").notNull().default(10),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  pricePaid: numeric("price_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  isPaid: boolean("is_paid").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BookingGroup = typeof bookingGroupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;

import { pgTable, serial, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }).notNull(),
  phone: text("phone"),
  hireDate: text("hire_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollRecordsTable = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  position: text("position").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }).notNull(),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).notNull().default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Employee = typeof employeesTable.$inferSelect;
export type PayrollRecord = typeof payrollRecordsTable.$inferSelect;

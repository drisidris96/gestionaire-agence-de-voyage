import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, payrollRecordsTable, employeesTable } from "@workspace/db";
import {
  ListPayrollResponse,
  CreatePayrollBody,
  UpdatePayrollBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapRecord(r: typeof payrollRecordsTable.$inferSelect) {
  return {
    ...r,
    baseSalary: Number(r.baseSalary),
    allowances: Number(r.allowances),
    deductions: Number(r.deductions),
    netSalary: Number(r.netSalary),
  };
}

router.get("/payroll", async (req, res): Promise<void> => {
  let rows = await db.select().from(payrollRecordsTable).orderBy(payrollRecordsTable.createdAt);
  const { employeeId, month, year } = req.query;
  if (employeeId) rows = rows.filter(r => r.employeeId === parseInt(employeeId as string, 10));
  if (month) rows = rows.filter(r => r.month === parseInt(month as string, 10));
  if (year) rows = rows.filter(r => r.year === parseInt(year as string, 10));
  res.json(ListPayrollResponse.parse(rows.map(mapRecord)));
});

router.post("/payroll", async (req, res): Promise<void> => {
  const parsed = CreatePayrollBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, parsed.data.employeeId));
  if (!employee) { res.status(404).json({ error: "Employee not found" }); return; }

  const allowances = parsed.data.allowances ?? 0;
  const deductions = parsed.data.deductions ?? 0;
  const netSalary = parsed.data.baseSalary + allowances - deductions;

  const [record] = await db.insert(payrollRecordsTable).values({
    employeeId: parsed.data.employeeId,
    employeeName: employee.name,
    position: employee.position,
    month: parsed.data.month,
    year: parsed.data.year,
    baseSalary: String(parsed.data.baseSalary),
    allowances: String(allowances),
    deductions: String(deductions),
    netSalary: String(netSalary),
    status: parsed.data.status ?? "draft",
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json(mapRecord(record));
});

router.patch("/payroll/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdatePayrollBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(payrollRecordsTable).where(eq(payrollRecordsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Record not found" }); return; }

  const baseSalary = parsed.data.baseSalary ?? Number(existing.baseSalary);
  const allowances = parsed.data.allowances ?? Number(existing.allowances);
  const deductions = parsed.data.deductions ?? Number(existing.deductions);
  const netSalary = baseSalary + allowances - deductions;

  const [record] = await db.update(payrollRecordsTable).set({
    ...parsed.data,
    baseSalary: String(baseSalary),
    allowances: String(allowances),
    deductions: String(deductions),
    netSalary: String(netSalary),
  }).where(eq(payrollRecordsTable.id, id)).returning();

  res.json(mapRecord(record));
});

router.delete("/payroll/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [r] = await db.delete(payrollRecordsTable).where(eq(payrollRecordsTable.id, id)).returning();
  if (!r) { res.status(404).json({ error: "Record not found" }); return; }
  res.sendStatus(204);
});

export default router;

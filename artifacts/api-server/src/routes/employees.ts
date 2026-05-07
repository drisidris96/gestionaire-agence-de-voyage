import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, employeesTable } from "@workspace/db";
import {
  ListEmployeesResponse,
  GetEmployeeResponse,
  CreateEmployeeBody,
  UpdateEmployeeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapEmployee(e: typeof employeesTable.$inferSelect) {
  return { ...e, baseSalary: Number(e.baseSalary) };
}

router.get("/employees", async (_req, res): Promise<void> => {
  const rows = await db.select().from(employeesTable).orderBy(employeesTable.createdAt);
  res.json(ListEmployeesResponse.parse(rows.map(mapEmployee)));
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [e] = await db.insert(employeesTable).values({
    ...parsed.data,
    baseSalary: String(parsed.data.baseSalary),
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(GetEmployeeResponse.parse(mapEmployee(e)));
});

router.get("/employees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [e] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!e) { res.status(404).json({ error: "Employee not found" }); return; }
  res.json(GetEmployeeResponse.parse(mapEmployee(e)));
});

router.patch("/employees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.baseSalary !== undefined) updateData.baseSalary = String(parsed.data.baseSalary);
  const [e] = await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, id)).returning();
  if (!e) { res.status(404).json({ error: "Employee not found" }); return; }
  res.json(GetEmployeeResponse.parse(mapEmployee(e)));
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [e] = await db.delete(employeesTable).where(eq(employeesTable.id, id)).returning();
  if (!e) { res.status(404).json({ error: "Employee not found" }); return; }
  res.sendStatus(204);
});

export default router;

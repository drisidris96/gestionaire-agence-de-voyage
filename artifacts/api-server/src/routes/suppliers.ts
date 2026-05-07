import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import { ListSuppliersResponse, CreateSupplierBody, UpdateSupplierBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/suppliers", async (_req, res): Promise<void> => {
  const rows = await db.select().from(suppliersTable).orderBy(suppliersTable.createdAt);
  res.json(ListSuppliersResponse.parse(rows));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [s] = await db.insert(suppliersTable).values({
    ...parsed.data,
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(s);
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [s] = await db.update(suppliersTable).set(parsed.data).where(eq(suppliersTable.id, id)).returning();
  if (!s) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(s);
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [s] = await db.delete(suppliersTable).where(eq(suppliersTable.id, id)).returning();
  if (!s) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;

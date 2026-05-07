import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, purchaseOrdersTable } from "@workspace/db";
import {
  ListPurchaseOrdersResponse,
  GetPurchaseOrderResponse,
  CreatePurchaseOrderBody,
  UpdatePurchaseOrderBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapOrder(o: typeof purchaseOrdersTable.$inferSelect) {
  return {
    ...o,
    totalAmount: Number(o.totalAmount),
    items: JSON.parse(o.items || "[]"),
  };
}

let orderCounter = 1;
async function generateOrderNumber(): Promise<string> {
  const rows = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.id);
  const next = (rows.length + 1).toString().padStart(4, "0");
  return `PO-${new Date().getFullYear()}-${next}`;
}

router.get("/purchase-orders", async (_req, res): Promise<void> => {
  const rows = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt);
  res.json(ListPurchaseOrdersResponse.parse(rows.map(mapOrder)));
});

router.post("/purchase-orders", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const orderNumber = parsed.data.orderNumber || await generateOrderNumber();
  const [order] = await db.insert(purchaseOrdersTable).values({
    orderNumber,
    supplierName: parsed.data.supplierName,
    supplierPhone: parsed.data.supplierPhone ?? null,
    date: parsed.data.date,
    items: JSON.stringify(parsed.data.items ?? []),
    totalAmount: String(parsed.data.totalAmount),
    status: parsed.data.status ?? "pending",
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json(GetPurchaseOrderResponse.parse(mapOrder(order)));
});

router.get("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!order) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(GetPurchaseOrderResponse.parse(mapOrder(order)));
});

router.patch("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdatePurchaseOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.items !== undefined) updateData.items = JSON.stringify(parsed.data.items);
  if (parsed.data.totalAmount !== undefined) updateData.totalAmount = String(parsed.data.totalAmount);

  const [order] = await db.update(purchaseOrdersTable).set(updateData).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.json(GetPurchaseOrderResponse.parse(mapOrder(order)));
});

router.delete("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [o] = await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!o) { res.status(404).json({ error: "Purchase order not found" }); return; }
  res.sendStatus(204);
});

export default router;

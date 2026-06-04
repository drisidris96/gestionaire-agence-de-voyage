import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, paymentsTable, bookingsTable, clientsTable } from "@workspace/db";
import {
  ListPaymentsQueryParams,
  CreatePaymentBody,
  GetPaymentParams,
  DeletePaymentParams,
  ListPaymentsResponse,
  GetPaymentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPayment(p: typeof paymentsTable.$inferSelect) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, p.bookingId));
  let clientName: string | null = null;
  if (booking) {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, booking.clientId));
    clientName = client?.fullName ?? null;
  }
  return { ...p, amount: Number(p.amount), clientName };
}

router.get("/payments", async (req, res): Promise<void> => {
  const query = ListPaymentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let payments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);

  if (query.data.bookingId) {
    payments = payments.filter((p) => p.bookingId === query.data.bookingId);
  }

  const enriched = await Promise.all(payments.map(enrichPayment));
  res.json(ListPaymentsResponse.parse(enriched));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, parsed.data.bookingId));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const totalPrice = Number(booking.totalPrice);
  const currentPaid = Number(booking.paidAmount ?? 0);
  const remainingBalance = totalPrice - currentPaid;

  if (parsed.data.amount > remainingBalance + 0.001) {
    res.status(400).json({ error: `المبلغ المدخل (${parsed.data.amount}) يتجاوز المبلغ المتبقي (${remainingBalance.toFixed(2)})` });
    return;
  }

  const [payment] = await db.insert(paymentsTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
    paymentDate: parsed.data.paymentDate ?? new Date(),
  }).returning();

  await db
    .update(bookingsTable)
    .set({
      paidAmount: sql`${bookingsTable.paidAmount} + ${String(parsed.data.amount)}`,
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, parsed.data.bookingId));

  const enriched = await enrichPayment(payment);
  res.status(201).json(GetPaymentResponse.parse(enriched));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const enriched = await enrichPayment(payment);
  res.json(GetPaymentResponse.parse(enriched));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  await db
    .update(bookingsTable)
    .set({
      paidAmount: sql`GREATEST(0, ${bookingsTable.paidAmount} - ${String(payment.amount)})`,
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, payment.bookingId));

  res.sendStatus(204);
});

export default router;

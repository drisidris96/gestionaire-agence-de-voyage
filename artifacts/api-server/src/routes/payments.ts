import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, paymentsTable, bookingsTable, clientsTable } from "@workspace/db";
import {
  ListPaymentsQueryParams,
  CreatePaymentBody,
  UpdatePaymentBody,
  UpdatePaymentParams,
  GetPaymentParams,
  DeletePaymentParams,
  ListPaymentsResponse,
  GetPaymentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPayment(p: typeof paymentsTable.$inferSelect) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, p.bookingId));
  let clientName: string | null = null;
  let totalPrice = 0;
  let paidAmount = 0;
  if (booking) {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, booking.clientId));
    clientName = client?.fullName ?? null;
    totalPrice = Number(booking.totalPrice);
    paidAmount = Number(booking.paidAmount ?? 0);
  }
  return {
    ...p,
    amount: Number(p.amount),
    clientName: p.clientNameOverride ?? clientName,
    totalPrice,
    paidAmount,
    remainingAmount: totalPrice - paidAmount,
  };
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

router.patch("/payments/:id", async (req, res): Promise<void> => {
  try {
    const params = UpdatePaymentParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const parsed = UpdatePaymentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
    if (!existing) { res.status(404).json({ error: "Payment not found" }); return; }

    const oldAmount = Number(existing.amount);
    const newAmount = parsed.data.amount ?? oldAmount;
    const newBookingId = parsed.data.bookingId ?? existing.bookingId;
    const bookingChanged = newBookingId !== existing.bookingId;

    // Validate new booking exists if changed
    if (bookingChanged) {
      const [newBooking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, newBookingId));
      if (!newBooking) { res.status(404).json({ error: "الحجز المحدد غير موجود" }); return; }
    }

    // Build typed update object for payments table
    const paymentSet: Partial<typeof paymentsTable.$inferInsert> = {};
    if (parsed.data.amount !== undefined) paymentSet.amount = String(parsed.data.amount);
    if (parsed.data.paymentDate !== undefined) paymentSet.paymentDate = parsed.data.paymentDate;
    if (parsed.data.method !== undefined) paymentSet.method = parsed.data.method;
    if (parsed.data.clientNameOverride !== undefined) paymentSet.clientNameOverride = parsed.data.clientNameOverride ?? null;
    if (parsed.data.notes !== undefined) paymentSet.notes = parsed.data.notes ?? null;
    if (parsed.data.bookingId !== undefined) paymentSet.bookingId = parsed.data.bookingId;

    if (Object.keys(paymentSet).length === 0) {
      // Nothing to update — return current state
      const [current] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
      const enriched = await enrichPayment(current);
      res.json(GetPaymentResponse.parse(enriched));
      return;
    }

    const [payment] = await db.update(paymentsTable)
      .set(paymentSet)
      .where(eq(paymentsTable.id, params.data.id))
      .returning();

    if (!payment) { res.status(404).json({ error: "Payment not found after update" }); return; }

    if (bookingChanged) {
      // Remove old amount from old booking
      await db.update(bookingsTable)
        .set({ paidAmount: sql`GREATEST(0, ${bookingsTable.paidAmount} - ${String(oldAmount)})` })
        .where(eq(bookingsTable.id, existing.bookingId));
      // Add new amount to new booking
      await db.update(bookingsTable)
        .set({ paidAmount: sql`${bookingsTable.paidAmount} + ${String(newAmount)}` })
        .where(eq(bookingsTable.id, newBookingId));
    } else if (newAmount !== oldAmount) {
      const diff = newAmount - oldAmount;
      await db.update(bookingsTable)
        .set({ paidAmount: sql`GREATEST(0, ${bookingsTable.paidAmount} + ${String(diff)})` })
        .where(eq(bookingsTable.id, existing.bookingId));
    }

    // Update booking totalPrice / serviceCost if explicitly provided
    const hasBookingPriceUpdate =
      parsed.data.bookingTotalPrice !== undefined ||
      parsed.data.bookingServiceCost !== undefined;

    if (hasBookingPriceUpdate) {
      const bookingSet: Partial<typeof bookingsTable.$inferInsert> = {};
      if (parsed.data.bookingTotalPrice !== undefined)
        bookingSet.totalPrice = String(parsed.data.bookingTotalPrice);
      if (parsed.data.bookingServiceCost !== undefined)
        bookingSet.serviceCost = String(parsed.data.bookingServiceCost);
      await db.update(bookingsTable).set(bookingSet).where(eq(bookingsTable.id, newBookingId));
    }

    const enriched = await enrichPayment(payment);
    res.json(GetPaymentResponse.parse(enriched));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `خطأ في الخادم: ${message}` });
  }
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

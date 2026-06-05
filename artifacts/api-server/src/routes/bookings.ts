import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bookingsTable, clientsTable, packagesTable, destinationsTable, paymentsTable } from "@workspace/db";
import {
  ListBookingsQueryParams,
  CreateBookingBody,
  GetBookingParams,
  UpdateBookingParams,
  UpdateBookingBody,
  DeleteBookingParams,
  ListBookingsResponse,
  GetBookingResponse,
  UpdateBookingResponse,
} from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function enrichBooking(b: typeof bookingsTable.$inferSelect) {
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, b.clientId));

  let packageName: string | null = null;
  let destinationName: string | null = null;
  if (b.packageId != null) {
    const [pkg] = await db.select({
      name: packagesTable.name,
      destinationId: packagesTable.destinationId,
    }).from(packagesTable).where(eq(packagesTable.id, b.packageId as number));
    packageName = pkg?.name ?? null;
    if (pkg?.destinationId != null) {
      const destId = pkg.destinationId as number;
      const [dest] = await db.select().from(destinationsTable).where(eq(destinationsTable.id, destId));
      destinationName = dest?.name ?? null;
    }
  }

  const payments = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(paymentsTable)
    .where(eq(paymentsTable.bookingId, b.id));

  return {
    ...b,
    clientName: client?.fullName ?? null,
    packageName,
    destinationName,
    totalPrice: Number(b.totalPrice),
    paidAmount: Number(payments[0]?.total ?? 0),
  };
}

router.get("/bookings", async (req, res): Promise<void> => {
  const query = ListBookingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let bookings = await db.select().from(bookingsTable).orderBy(bookingsTable.createdAt);

  if (query.data.clientId) {
    bookings = bookings.filter((b) => b.clientId === query.data.clientId);
  }
  if (query.data.status) {
    bookings = bookings.filter((b) => b.status === query.data.status);
  }

  const enriched = await Promise.all(bookings.map(enrichBooking));
  res.json(ListBookingsResponse.parse(enriched));
});

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { initialPaidAmount, ...bookingData } = parsed.data;

  const [booking] = await db.insert(bookingsTable).values({
    ...bookingData,
    packageId: bookingData.packageId ?? null,
    totalPrice: String(bookingData.totalPrice),
    status: bookingData.status ?? "pending",
  }).returning();

  if (initialPaidAmount && initialPaidAmount > 0) {
    await db.insert(paymentsTable).values({
      bookingId: booking.id,
      amount: String(initialPaidAmount),
      method: "cash",
      paymentDate: new Date(),
    });
    await db.update(bookingsTable).set({
      paidAmount: sql`${bookingsTable.paidAmount} + ${String(initialPaidAmount)}`,
    }).where(eq(bookingsTable.id, booking.id));
  }

  const enriched = await enrichBooking(booking);
  res.status(201).json(GetBookingResponse.parse(enriched));
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const enriched = await enrichBooking(booking);
  res.json(GetBookingResponse.parse(enriched));
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.totalPrice !== undefined) {
    updateData.totalPrice = String(parsed.data.totalPrice);
  }

  const [booking] = await db
    .update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const enriched = await enrichBooking(booking);
  res.json(UpdateBookingResponse.parse(enriched));
});

router.delete("/bookings/:id", async (req, res): Promise<void> => {
  const params = DeleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.delete(bookingsTable).where(eq(bookingsTable.id, params.data.id)).returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

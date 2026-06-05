import { Router, type IRouter } from "express";
import { db, clientsTable, bookingsTable, packagesTable, destinationsTable, paymentsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import {
  GetDashboardStatsResponse,
  GetRecentBookingsResponse,
  GetRevenueByMonthResponse,
  GetBookingsByStatusResponse,
  GetTopDestinationsResponse,
  GetTopClientsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [clientCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(clientsTable);
  const [bookingCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(bookingsTable);
  const [packageCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(packagesTable);
  const [destCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(destinationsTable);

  const revenueRows = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(paymentsTable);
  const totalRevenue = Number(revenueRows[0]?.total ?? 0);

  const statusCounts = await db
    .select({ status: bookingsTable.status, count: sql<number>`COUNT(*)::int` })
    .from(bookingsTable)
    .groupBy(bookingsTable.status);

  const byStatus = (status: string) => statusCounts.find((s) => s.status === status)?.count ?? 0;

  res.json(GetDashboardStatsResponse.parse({
    totalClients: clientCount?.count ?? 0,
    totalBookings: bookingCount?.count ?? 0,
    totalRevenue,
    pendingBookings: byStatus("pending"),
    confirmedBookings: byStatus("confirmed"),
    cancelledBookings: byStatus("cancelled"),
    completedBookings: byStatus("completed"),
    totalPackages: packageCount?.count ?? 0,
    totalDestinations: destCount?.count ?? 0,
  }));
});

router.get("/dashboard/recent-bookings", async (_req, res): Promise<void> => {
  const bookings = await db.select().from(bookingsTable).orderBy(sql`created_at DESC`).limit(10);

  const enriched = await Promise.all(bookings.map(async (b) => {
    const [clientRow] = await db.select({ fullName: clientsTable.fullName }).from(clientsTable).where(eq(clientsTable.id, b.clientId));
    let pkgRow: { name: string; destinationId: number | null } | undefined;
    if (b.packageId != null) {
      [pkgRow] = await db.select({ name: packagesTable.name, destinationId: packagesTable.destinationId }).from(packagesTable).where(eq(packagesTable.id, b.packageId as number));
    }
    let destName: string | null = null;
    if (pkgRow?.destinationId != null) {
      const destId = pkgRow.destinationId as number;
      const [destRow] = await db.select({ name: destinationsTable.name }).from(destinationsTable).where(eq(destinationsTable.id, destId));
      destName = destRow?.name ?? null;
    }
    const [paidRow] = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(paymentsTable).where(eq(paymentsTable.bookingId, b.id));
    return {
      ...b,
      clientName: clientRow?.fullName ?? null,
      packageName: pkgRow?.name ?? null,
      destinationName: destName,
      totalPrice: Number(b.totalPrice),
      paidAmount: Number(paidRow?.total ?? 0),
    };
  }));

  res.json(GetRecentBookingsResponse.parse(enriched));
});

router.get("/dashboard/revenue-by-month", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      TO_CHAR(payment_date, 'YYYY-MM') AS month,
      COALESCE(SUM(amount), 0)::float AS revenue,
      COUNT(*)::int AS bookings
    FROM payments
    WHERE payment_date >= NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
    ORDER BY month ASC
  `);

  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? [];

  const data = (rows as Array<{ month: string; revenue: string | number; bookings: string | number }>).map((r) => ({
    month: String(r.month),
    revenue: Number(r.revenue),
    bookings: Number(r.bookings),
  }));

  res.json(GetRevenueByMonthResponse.parse(data));
});

router.get("/dashboard/bookings-by-status", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ status: bookingsTable.status, count: sql<number>`COUNT(*)::int` })
    .from(bookingsTable)
    .groupBy(bookingsTable.status);

  res.json(GetBookingsByStatusResponse.parse(rows));
});

router.get("/dashboard/top-destinations", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      d.id AS "destinationId",
      d.name AS "destinationName",
      COUNT(b.id)::int AS "bookingCount",
      COALESCE(SUM(b.total_price), 0)::float AS "totalRevenue"
    FROM destinations d
    JOIN packages p ON p.destination_id = d.id
    JOIN bookings b ON b.package_id = p.id
    GROUP BY d.id, d.name
    ORDER BY "bookingCount" DESC
    LIMIT 5
  `);
  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  res.json(GetTopDestinationsResponse.parse(rows));
});

router.get("/dashboard/top-clients", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      c.id AS "clientId",
      c.full_name AS "clientName",
      COUNT(b.id)::int AS "bookingCount",
      COALESCE(SUM(b.total_price), 0)::float AS "totalSpent"
    FROM clients c
    JOIN bookings b ON b.client_id = c.id
    GROUP BY c.id, c.full_name
    ORDER BY "totalSpent" DESC
    LIMIT 5
  `);
  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];
  res.json(GetTopClientsResponse.parse(rows));
});

export default router;

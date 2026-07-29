import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// GET /investments — قائمة الأرباح والاستثمار (10% من الربح)
router.get("/investments", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      b.id                                                   AS booking_id,
      COALESCE(
        p.client_name_override,
        c.full_name,
        'عميل غير معروف'
      )                                                      AS client_name,
      b.total_price::numeric                                 AS total_price,
      COALESCE(b.service_cost, 0)::numeric                   AS service_cost,
      (b.total_price - COALESCE(b.service_cost, 0))::numeric AS profit,
      ((b.total_price - COALESCE(b.service_cost, 0)) * 0.10)::numeric AS investment,
      b.created_at
    FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    LEFT JOIN LATERAL (
      SELECT client_name_override FROM payments
      WHERE booking_id = b.id AND client_name_override IS NOT NULL AND client_name_override <> ''
      LIMIT 1
    ) p ON true
    WHERE (b.total_price - COALESCE(b.service_cost, 0)) > 0
    ORDER BY b.created_at DESC
  `);

  const data = (Array.isArray(rows) ? rows : rows.rows ?? []).map((r: any) => ({
    bookingId:    Number(r.booking_id),
    clientName:   r.client_name,
    totalPrice:   Number(r.total_price),
    serviceCost:  Number(r.service_cost),
    profit:       Number(r.profit),
    investment:   Number(r.investment),
    createdAt:    r.created_at,
  }));

  res.json(data);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, expensesTable, paymentsTable } from "@workspace/db";
import {
  ListExpensesQueryParams,
  CreateExpenseBody,
  GetExpenseParams,
  UpdateExpenseParams,
  UpdateExpenseBody,
  DeleteExpenseParams,
  ListExpensesResponse,
  GetExpenseResponse,
  UpdateExpenseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/expenses", async (req, res): Promise<void> => {
  const query = ListExpensesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let expenses = await db.select().from(expensesTable).orderBy(desc(expensesTable.date));

  if (query.data.category) {
    expenses = expenses.filter((e) => e.category === query.data.category);
  }
  if (query.data.year) {
    expenses = expenses.filter((e) => new Date(e.date).getFullYear() === query.data.year);
  }

  const mapped = expenses.map((e) => ({ ...e, amount: Number(e.amount) }));
  res.json(ListExpensesResponse.parse(mapped));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db.insert(expensesTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
  }).returning();

  res.status(201).json(GetExpenseResponse.parse({ ...expense, amount: Number(expense.amount) }));
});

router.get("/expenses/:id", async (req, res): Promise<void> => {
  const params = GetExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, params.data.id));
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(GetExpenseResponse.parse({ ...expense, amount: Number(expense.amount) }));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.amount !== undefined) {
    updateData.amount = String(parsed.data.amount);
  }

  const [expense] = await db.update(expensesTable).set(updateData).where(eq(expensesTable.id, params.data.id)).returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(UpdateExpenseResponse.parse({ ...expense, amount: Number(expense.amount) }));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id)).returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

// ─── Finance Summary ──────────────────────────────────────────────────────────
router.get("/finance/summary", async (_req, res): Promise<void> => {
  // Total revenue from payments
  const revenueRes = await db.execute(
    sql`SELECT COALESCE(SUM(amount), 0) AS total FROM payments`
  );
  const revenueRows = Array.isArray(revenueRes) ? revenueRes : revenueRes.rows ?? [];
  const totalRevenue = Number((revenueRows[0] as any)?.total ?? 0);

  // Total expenses
  const expensesRes = await db.execute(
    sql`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`
  );
  const expensesRows = Array.isArray(expensesRes) ? expensesRes : expensesRes.rows ?? [];
  const totalExpenses = Number((expensesRows[0] as any)?.total ?? 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100 * 10) / 10 : 0;

  // Monthly breakdown (last 12 months)
  const monthlyRes = await db.execute(sql`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', now()) - INTERVAL '11 months',
        date_trunc('month', now()),
        '1 month'::interval
      ) AS month
    ),
    rev AS (
      SELECT date_trunc('month', payment_date) AS month, COALESCE(SUM(amount), 0) AS revenue
      FROM payments GROUP BY 1
    ),
    exp AS (
      SELECT date_trunc('month', date) AS month, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses GROUP BY 1
    )
    SELECT
      to_char(m.month, 'YYYY-MM') AS month,
      COALESCE(r.revenue, 0)::float AS revenue,
      COALESCE(e.expenses, 0)::float AS expenses
    FROM months m
    LEFT JOIN rev r ON r.month = m.month
    LEFT JOIN exp e ON e.month = m.month
    ORDER BY m.month
  `);
  const monthlyRows = Array.isArray(monthlyRes) ? monthlyRes : monthlyRes.rows ?? [];

  // Expenses by category
  const catRes = await db.execute(sql`
    SELECT category, COALESCE(SUM(amount), 0)::float AS total
    FROM expenses GROUP BY category ORDER BY total DESC
  `);
  const catRows = Array.isArray(catRes) ? catRes : catRes.rows ?? [];

  res.json({
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    monthly: monthlyRows,
    byCategory: catRows,
  });
});

export default router;

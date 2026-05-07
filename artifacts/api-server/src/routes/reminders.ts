import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, remindersTable } from "@workspace/db";
import { ListRemindersResponse, CreateReminderBody, UpdateReminderBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reminders", async (_req, res): Promise<void> => {
  const rows = await db.select().from(remindersTable).orderBy(remindersTable.dueDate);
  res.json(ListRemindersResponse.parse(rows));
});

router.post("/reminders", async (req, res): Promise<void> => {
  const parsed = CreateReminderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [r] = await db.insert(remindersTable).values({
    ...parsed.data,
    isCompleted: parsed.data.isCompleted ?? false,
    type: parsed.data.type ?? "general",
  }).returning();
  res.status(201).json(r);
});

router.patch("/reminders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateReminderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [r] = await db.update(remindersTable).set(parsed.data).where(eq(remindersTable.id, id)).returning();
  if (!r) { res.status(404).json({ error: "Reminder not found" }); return; }
  res.json(r);
});

router.delete("/reminders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [r] = await db.delete(remindersTable).where(eq(remindersTable.id, id)).returning();
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;

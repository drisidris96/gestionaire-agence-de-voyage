import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bookingGroupsTable, groupMembersTable } from "@workspace/db";
import {
  ListGroupsResponse, CreateGroupBody, UpdateGroupBody, AddGroupMemberBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapGroup(g: typeof bookingGroupsTable.$inferSelect) {
  return { ...g, totalPrice: Number(g.totalPrice) };
}
function mapMember(m: typeof groupMembersTable.$inferSelect) {
  return { ...m, pricePaid: Number(m.pricePaid) };
}

router.get("/groups", async (_req, res): Promise<void> => {
  const rows = await db.select().from(bookingGroupsTable).orderBy(bookingGroupsTable.departureDate);
  res.json(ListGroupsResponse.parse(rows.map(mapGroup)));
});

router.post("/groups", async (req, res): Promise<void> => {
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [g] = await db.insert(bookingGroupsTable).values({
    ...parsed.data,
    totalPrice: String(parsed.data.totalPrice ?? 0),
    maxCapacity: parsed.data.maxCapacity ?? 10,
    status: parsed.data.status ?? "open",
  }).returning();
  res.status(201).json(mapGroup(g));
});

router.get("/groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [g] = await db.select().from(bookingGroupsTable).where(eq(bookingGroupsTable.id, id));
  if (!g) { res.status(404).json({ error: "Group not found" }); return; }
  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  res.json({ ...mapGroup(g), members: members.map(mapMember) });
});

router.patch("/groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateGroupBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.totalPrice !== undefined) updateData.totalPrice = String(parsed.data.totalPrice);
  const [g] = await db.update(bookingGroupsTable).set(updateData).where(eq(bookingGroupsTable.id, id)).returning();
  if (!g) { res.status(404).json({ error: "Group not found" }); return; }
  res.json(mapGroup(g));
});

router.delete("/groups/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  const [g] = await db.delete(bookingGroupsTable).where(eq(bookingGroupsTable.id, id)).returning();
  if (!g) { res.status(404).json({ error: "Group not found" }); return; }
  res.sendStatus(204);
});

router.post("/groups/:id/members", async (req, res): Promise<void> => {
  const groupId = parseInt(req.params.id, 10);
  const parsed = AddGroupMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [m] = await db.insert(groupMembersTable).values({
    groupId,
    clientName: parsed.data.clientName,
    clientPhone: parsed.data.clientPhone ?? null,
    pricePaid: String(parsed.data.pricePaid ?? 0),
    isPaid: parsed.data.isPaid ?? false,
    notes: parsed.data.notes ?? null,
  }).returning();
  res.status(201).json(mapMember(m));
});

router.delete("/groups/:id/members/:memberId", async (req, res): Promise<void> => {
  const memberId = parseInt(req.params.memberId, 10);
  const [m] = await db.delete(groupMembersTable).where(eq(groupMembersTable.id, memberId)).returning();
  if (!m) { res.status(404).json({ error: "Member not found" }); return; }
  res.sendStatus(204);
});

export default router;

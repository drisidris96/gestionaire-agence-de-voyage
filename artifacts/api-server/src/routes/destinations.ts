import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, destinationsTable } from "@workspace/db";
import {
  CreateDestinationBody,
  GetDestinationParams,
  UpdateDestinationParams,
  UpdateDestinationBody,
  DeleteDestinationParams,
  ListDestinationsResponse,
  GetDestinationResponse,
  UpdateDestinationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/destinations", async (_req, res): Promise<void> => {
  const destinations = await db.select().from(destinationsTable).orderBy(destinationsTable.createdAt);
  res.json(ListDestinationsResponse.parse(destinations));
});

router.post("/destinations", async (req, res): Promise<void> => {
  const parsed = CreateDestinationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [destination] = await db.insert(destinationsTable).values(parsed.data).returning();
  res.status(201).json(GetDestinationResponse.parse(destination));
});

router.get("/destinations/:id", async (req, res): Promise<void> => {
  const params = GetDestinationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [destination] = await db
    .select()
    .from(destinationsTable)
    .where(eq(destinationsTable.id, params.data.id));

  if (!destination) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }

  res.json(GetDestinationResponse.parse(destination));
});

router.patch("/destinations/:id", async (req, res): Promise<void> => {
  const params = UpdateDestinationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDestinationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [destination] = await db
    .update(destinationsTable)
    .set(parsed.data)
    .where(eq(destinationsTable.id, params.data.id))
    .returning();

  if (!destination) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }

  res.json(UpdateDestinationResponse.parse(destination));
});

router.delete("/destinations/:id", async (req, res): Promise<void> => {
  const params = DeleteDestinationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [destination] = await db
    .delete(destinationsTable)
    .where(eq(destinationsTable.id, params.data.id))
    .returning();

  if (!destination) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

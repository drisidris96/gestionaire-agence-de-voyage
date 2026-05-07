import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, packagesTable, destinationsTable } from "@workspace/db";
import {
  ListPackagesQueryParams,
  CreatePackageBody,
  GetPackageParams,
  UpdatePackageParams,
  UpdatePackageBody,
  DeletePackageParams,
  ListPackagesResponse,
  GetPackageResponse,
  UpdatePackageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/packages", async (req, res): Promise<void> => {
  const query = ListPackagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select({
      id: packagesTable.id,
      name: packagesTable.name,
      destinationId: packagesTable.destinationId,
      destinationName: destinationsTable.name,
      destinationCountry: destinationsTable.country,
      durationDays: packagesTable.durationDays,
      pricePerPerson: packagesTable.pricePerPerson,
      description: packagesTable.description,
      includes: packagesTable.includes,
      imageUrl: packagesTable.imageUrl,
      isActive: packagesTable.isActive,
      createdAt: packagesTable.createdAt,
    })
    .from(packagesTable)
    .leftJoin(destinationsTable, eq(packagesTable.destinationId, destinationsTable.id))
    .where(query.data.destinationId ? eq(packagesTable.destinationId, query.data.destinationId) : undefined)
    .orderBy(packagesTable.createdAt);

  const mapped = rows.map((r) => ({
    ...r,
    pricePerPerson: Number(r.pricePerPerson),
  }));

  res.json(ListPackagesResponse.parse(mapped));
});

router.post("/packages", async (req, res): Promise<void> => {
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pkg] = await db.insert(packagesTable).values({
    ...parsed.data,
    pricePerPerson: String(parsed.data.pricePerPerson),
  }).returning();

  const [dest] = await db.select().from(destinationsTable).where(eq(destinationsTable.id, pkg.destinationId));

  res.status(201).json(GetPackageResponse.parse({
    ...pkg,
    pricePerPerson: Number(pkg.pricePerPerson),
    destinationName: dest?.name ?? null,
    destinationCountry: dest?.country ?? null,
  }));
});

router.get("/packages/:id", async (req, res): Promise<void> => {
  const params = GetPackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: packagesTable.id,
      name: packagesTable.name,
      destinationId: packagesTable.destinationId,
      destinationName: destinationsTable.name,
      destinationCountry: destinationsTable.country,
      durationDays: packagesTable.durationDays,
      pricePerPerson: packagesTable.pricePerPerson,
      description: packagesTable.description,
      includes: packagesTable.includes,
      imageUrl: packagesTable.imageUrl,
      isActive: packagesTable.isActive,
      createdAt: packagesTable.createdAt,
    })
    .from(packagesTable)
    .leftJoin(destinationsTable, eq(packagesTable.destinationId, destinationsTable.id))
    .where(eq(packagesTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Package not found" });
    return;
  }

  res.json(GetPackageResponse.parse({ ...row, pricePerPerson: Number(row.pricePerPerson) }));
});

router.patch("/packages/:id", async (req, res): Promise<void> => {
  const params = UpdatePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.pricePerPerson !== undefined) {
    updateData.pricePerPerson = String(parsed.data.pricePerPerson);
  }

  const [pkg] = await db
    .update(packagesTable)
    .set(updateData)
    .where(eq(packagesTable.id, params.data.id))
    .returning();

  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }

  const [dest] = await db.select().from(destinationsTable).where(eq(destinationsTable.id, pkg.destinationId));

  res.json(UpdatePackageResponse.parse({
    ...pkg,
    pricePerPerson: Number(pkg.pricePerPerson),
    destinationName: dest?.name ?? null,
    destinationCountry: dest?.country ?? null,
  }));
});

router.delete("/packages/:id", async (req, res): Promise<void> => {
  const params = DeletePackageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pkg] = await db.delete(packagesTable).where(eq(packagesTable.id, params.data.id)).returning();
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

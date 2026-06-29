import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { GetSettingsResponse, UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULTS: Record<string, string> = {
  agencyName: "شويعر للسياحة والأسفار",
  agencyNameEn: "CHOUIAAR TRAVEL AGENCY",
  agencyLogoUrl: "/logo.jpg",
  agencyPhone: "",
  agencyEmail: "",
  agencyAddress: "",
  payrollDay: "",
};

const KEYS = Object.keys(DEFAULTS);

async function fetchSettings(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string | null> = { ...DEFAULTS };
  for (const row of rows) {
    map[row.key] = row.value ?? DEFAULTS[row.key] ?? null;
  }
  return {
    ...map,
    payrollDay: map.payrollDay ? Number(map.payrollDay) : null,
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await fetchSettings();
  res.json(GetSettingsResponse.parse(settings));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates = parsed.data as Record<string, unknown>;

  for (const key of KEYS) {
    if (updates[key] !== undefined) {
      const val = updates[key] == null ? null : String(updates[key]);
      await db
        .insert(settingsTable)
        .values({ key, value: val, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value: val, updatedAt: new Date() },
        });
    }
  }

  const settings = await fetchSettings();
  res.json(UpdateSettingsResponse.parse(settings));
});

export default router;

"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import { callService } from "@/lib/ha";

function refresh() {
  revalidatePath("/home");
  revalidatePath("/");
}

/** Adjust a climate setpoint by delta degrees from its current value. */
export async function adjustSetpoint(
  entityId: string,
  current: number,
  delta: number,
) {
  const { householdId } = await requireHousehold();
  const temperature = current + delta;
  await callService(householdId, "climate", "set_temperature", {
    entity_id: entityId,
    temperature,
  });
  refresh();
}

export async function toggleLock(entityId: string, locked: boolean) {
  const { householdId } = await requireHousehold();
  await callService(householdId, "lock", locked ? "unlock" : "lock", {
    entity_id: entityId,
  });
  refresh();
}

export async function toggleSwitch(entityId: string, on: boolean) {
  const { householdId } = await requireHousehold();
  await callService(householdId, "switch", on ? "turn_off" : "turn_on", {
    entity_id: entityId,
  });
  refresh();
}

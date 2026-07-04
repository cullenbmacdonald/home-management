import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Home Assistant REST client. SERVER-ONLY — never import this into a client
 * component. The long-lived token lives in the settings table and is only ever
 * sent from the server to the HA instance; the browser receives derived state,
 * never the token or base URL credentials.
 */

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HaConfig {
  baseUrl: string;
  token: string;
  entities: string[];
}

/** Reads config from settings; null unless both base URL and token are set. */
export async function getHaConfig(): Promise<HaConfig | null> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ["haBaseUrl", "haToken", "haEntities"]));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string | undefined
  >;
  const baseUrl = map.haBaseUrl?.trim();
  const token = map.haToken?.trim();
  if (!baseUrl || !token) return null;
  let entities: string[] = [];
  try {
    const parsed = JSON.parse(map.haEntities ?? "[]");
    if (Array.isArray(parsed)) entities = parsed.filter((e) => typeof e === "string");
  } catch {
    // malformed entity list -> treat as none configured
  }
  return { baseUrl, token, entities };
}

export async function isHaConfigured(): Promise<boolean> {
  return (await getHaConfig()) !== null;
}

type StatesResult = { ok: true; states: HaState[] } | { ok: false };

/** GET /api/states, filtered to configured entity ids. 5s timeout. */
export async function getStates(): Promise<StatesResult> {
  const cfg = await getHaConfig();
  if (!cfg) return { ok: false };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/states`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false };
    const all = (await res.json()) as HaState[];
    const wanted = new Set(cfg.entities);
    const states = cfg.entities.length
      ? all.filter((s) => wanted.has(s.entity_id))
      : all;
    return { ok: true, states };
  } catch {
    return { ok: false };
  }
}

/** POST /api/services/{domain}/{service}. Returns whether the call succeeded. */
export async function callService(
  domain: string,
  service: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const cfg = await getHaConfig();
  if (!cfg) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `${cfg.baseUrl.replace(/\/$/, "")}/api/services/${domain}/${service}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// --- Derived view: group raw states into the sections the UI renders ---------

export interface TempTile {
  entityId: string;
  name: string;
  value: string; // e.g. "71°"
}
export interface ClimateCard {
  entityId: string;
  name: string;
  setpoint: number | null;
  mode: string; // e.g. "Cooling to 71°"
}
export interface LockRow {
  entityId: string;
  name: string;
  locked: boolean;
}
export interface SwitchRow {
  entityId: string;
  name: string;
  on: boolean;
}
export interface HaView {
  temps: TempTile[];
  climates: ClimateCard[];
  locks: LockRow[];
  switches: SwitchRow[];
}

function friendly(s: HaState): string {
  const n = s.attributes?.friendly_name;
  return typeof n === "string" && n ? n : s.entity_id;
}

/** Map raw states to UI sections by domain prefix. */
export function toView(states: HaState[]): HaView {
  const view: HaView = { temps: [], climates: [], locks: [], switches: [] };
  for (const s of states) {
    const domain = s.entity_id.split(".")[0];
    if (domain === "sensor") {
      const unit = s.attributes?.unit_of_measurement;
      const suffix = typeof unit === "string" && unit.includes("F") ? "°" : "°";
      view.temps.push({
        entityId: s.entity_id,
        name: friendly(s),
        value: `${s.state}${suffix}`,
      });
    } else if (domain === "climate") {
      const setpoint =
        typeof s.attributes?.temperature === "number"
          ? (s.attributes.temperature as number)
          : Number(s.attributes?.temperature) || null;
      const action = s.attributes?.hvac_action;
      const modeWord =
        typeof action === "string" && action
          ? action.charAt(0).toUpperCase() + action.slice(1)
          : s.state.charAt(0).toUpperCase() + s.state.slice(1);
      view.climates.push({
        entityId: s.entity_id,
        name: friendly(s),
        setpoint,
        mode: setpoint != null ? `${modeWord} to ${setpoint}°` : modeWord,
      });
    } else if (domain === "lock") {
      view.locks.push({
        entityId: s.entity_id,
        name: friendly(s),
        locked: s.state === "locked",
      });
    } else if (domain === "switch") {
      view.switches.push({
        entityId: s.entity_id,
        name: friendly(s),
        on: s.state === "on",
      });
    }
  }
  return view;
}

import http from "node:http";

/**
 * Tiny in-memory Home Assistant mock for e2e. Serves canned /api/states,
 * records service calls (and mutates the canned state), and exposes /calls for
 * assertions. Requires Authorization: Bearer test-token on the HA API routes.
 *
 * Usage: startMockHa(port?) -> { server, port, reset }.
 */

const TOKEN = "test-token";

function initialStates() {
  return {
    "sensor.living_room_temp": {
      entity_id: "sensor.living_room_temp",
      state: "71",
      attributes: {
        friendly_name: "Living room",
        unit_of_measurement: "°F",
      },
    },
    "sensor.bedroom_temp": {
      entity_id: "sensor.bedroom_temp",
      state: "69",
      attributes: { friendly_name: "Bedroom", unit_of_measurement: "°F" },
    },
    "climate.mini_split": {
      entity_id: "climate.mini_split",
      state: "cool",
      attributes: {
        friendly_name: "Mini-split — Living room",
        temperature: 71,
        hvac_action: "cooling",
      },
    },
    "lock.front_door": {
      entity_id: "lock.front_door",
      state: "locked",
      attributes: { friendly_name: "Front door" },
    },
    "switch.living_room_lamp": {
      entity_id: "switch.living_room_lamp",
      state: "on",
      attributes: { friendly_name: "Living room lamp" },
    },
    "switch.entryway_light": {
      entity_id: "switch.entryway_light",
      state: "off",
      attributes: { friendly_name: "Entryway light" },
    },
  };
}

export function startMockHa(port = 8123) {
  let states = initialStates();
  let calls = [];

  const applyService = (domain, service, data) => {
    const id = data?.entity_id;
    const entity = id && states[id];
    if (!entity) return;
    if (domain === "climate" && service === "set_temperature") {
      entity.attributes.temperature = data.temperature;
    } else if (domain === "lock") {
      entity.state = service === "lock" ? "locked" : "unlocked";
    } else if (domain === "switch") {
      entity.state = service === "turn_on" ? "on" : "off";
    }
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    // Assertion endpoint — no auth.
    if (req.method === "GET" && url.pathname === "/calls") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(calls));
      return;
    }
    if (req.method === "POST" && url.pathname === "/reset") {
      states = initialStates();
      calls = [];
      res.writeHead(200);
      res.end("ok");
      return;
    }

    // Everything under /api requires the bearer token.
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${TOKEN}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "unauthorized" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/states") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(Object.values(states)));
      return;
    }

    const svc = url.pathname.match(/^\/api\/services\/([^/]+)\/([^/]+)$/);
    if (req.method === "POST" && svc) {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let data = {};
        try {
          data = body ? JSON.parse(body) : {};
        } catch {
          data = {};
        }
        const [, domain, service] = svc;
        calls.push({ domain, service, data });
        applyService(domain, service, data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([]));
      });
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, port }));
  });
}

// Allow running standalone: `node mock-ha.mjs [port]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2]) || 8123;
  startMockHa(port).then(() => console.log(`mock HA on :${port}`));
}

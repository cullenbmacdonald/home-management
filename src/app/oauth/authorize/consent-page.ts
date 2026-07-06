function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

const SCOPE_LABELS: Record<string, string> = {
  "homebase:read": "Read your household data (tasks, groceries, meals, and more)",
  "homebase:write": "Manage your to-dos, groceries, and meal plan",
};

/**
 * Plain HTML consent screen, server-rendered from a route handler (not a
 * React page) so it works as a bare document mid-OAuth-redirect. No client
 * JS required — a form POST back to /oauth/authorize is all it does.
 */
export function renderConsentPage(opts: {
  clientName: string;
  username: string;
  scope: string;
  formAction: string;
  hidden: Record<string, string>;
}): string {
  const scopes = opts.scope.split(/\s+/).filter(Boolean);
  const scopeItems = scopes
    .map((s) => `<li>${escapeHtml(SCOPE_LABELS[s] ?? s)}</li>`)
    .join("");
  const hiddenInputs = Object.entries(opts.hidden)
    .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect to Homebase</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #e7e5e4; display: flex; min-height: 100dvh; align-items: center; justify-content: center; margin: 0; padding: 24px; }
  .card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 0 60px rgba(0,0,0,0.08); }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1c1917; }
  p { color: #57534e; font-size: 14px; line-height: 1.5; }
  ul { padding-left: 20px; color: #1c1917; font-size: 14px; }
  .actions { display: flex; gap: 12px; margin-top: 24px; }
  button { flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; font-size: 15px; border: none; cursor: pointer; }
  .approve { background: #059669; color: #fff; }
  .deny { background: #f5f5f4; color: #1c1917; }
</style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(opts.clientName)} wants to connect</h1>
    <p>Signed in as <strong>${escapeHtml(opts.username)}</strong>. This app is asking for permission to:</p>
    <ul>${scopeItems}</ul>
    <form method="post" action="${escapeHtml(opts.formAction)}">
      ${hiddenInputs}
      <div class="actions">
        <button class="deny" type="submit" name="decision" value="deny">Deny</button>
        <button class="approve" type="submit" name="decision" value="approve">Allow</button>
      </div>
    </form>
  </div>
</body>
</html>`;
}

// HCVG Live-Vermittler (Cloudflare Worker, kostenloser Plan)
// Holt den Spielstand unserer Spiele vom nuScore-Live-Ticker und gibt ihn mit CORS-Freigabe
// an die App weiter. Der Ticker selbst erlaubt keinen Zugriff aus dem Browser.
// Antwort: { t: Abrufzeit (ms), leagues: { D: [...], C: [...] } }
// Zeile: [Heim, Gast, Anwurf UTC ISO, Tore H, Tore G, live, HZ H, HZ G, Spielsekunde]
// Ergebnisse werden 15 Sekunden zwischengespeichert, damit der Ticker nicht öfter gefragt wird.

const US = "HC Vorpommern-Greifswald";
const GROUPS = { D: "486919", C: "486898" };
const ORIGINS = ["https://jari-lulz.github.io", "http://localhost:8801"];
const API = "https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1";
const UA = { "User-Agent": "HCVG-Mannschafts-App (Live)" };
const DAY = 864e5;

async function league(group, ts) {
  const r = await fetch(`${API}/meetings/${group}/time/${ts}`, { headers: UA });
  if (!r.ok) throw new Error("nuScore " + r.status);
  const j = await r.json(), now = Date.now(), out = [];
  for (const m of j.meetings || []) {
    if (m.teamHome !== US && m.teamGuest !== US) continue;
    const at = Date.parse(String(m.scheduled).replace(/\+0000$/, "Z"));
    if (!(Math.abs(at - now) < 3 * DAY)) continue;
    let sec = 0;
    if (m.live) {   // Spielminute aus der Ereignisliste (größte Spielsekunde)
      try {
        const e = await (await fetch(`${API}/events/${m.meetingID}`, { headers: UA })).json();
        const list = Array.isArray(e) ? e : (e && Array.isArray(e.events) ? e.events : []);   // Antwort: { events: [...] }
        let last = null;
        for (const x of list) if (!last || +x.second > +last.second) last = x;
        // Nur verwenden, wenn das letzte Ereignis zum aktuellen Stand passt. Manche Zeitnehmer
        // tragen nur den Spielstand ein, nicht jedes Tor als Ereignis – dann wäre die Minute falsch.
        if (last && +last.pointsHome === +m.matchesHome && +last.pointsGuest === +m.matchesGuest) sec = +last.second || 0;
      } catch (_) {}
    }
    out.push([m.teamHome, m.teamGuest, new Date(at).toISOString().replace(".000", ""),
      +m.matchesHome || 0, +m.matchesGuest || 0, !!m.live, +m.halfTimeScoreHome || 0, +m.halfTimeScoreGuest || 0, sec]);
  }
  return out;
}

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { headers: { ...cors, "Access-Control-Allow-Methods": "GET" } });
    if (req.method !== "GET") return new Response("Nur GET", { status: 405, headers: cors });

    const ts = Math.floor(Date.now() / 15000) * 15;
    const key = new Request(`https://hcvg-live.cache/${ts}`);
    const cache = caches.default;
    let body = await cache.match(key).then(r => r && r.text());
    if (!body) {
      try {
        const [D, C] = await Promise.all([league(GROUPS.D, ts), league(GROUPS.C, ts)]);
        body = JSON.stringify({ t: Date.now(), leagues: { D, C } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
      }
      ctx.waitUntil(cache.put(key, new Response(body, { headers: { "Cache-Control": "max-age=20" } })));
    }
    return new Response(body, { headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  }
};

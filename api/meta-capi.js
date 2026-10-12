// Vercel Serverless Function: receives an event from the React app and forwards it to Meta Conversions API.
// URL on your site: /api/meta-capi   (the access token stays here on the server, never in the browser)
import crypto from "crypto";

const ALLOWED_EVENTS = ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase"];

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

// Normalize first, then hash (Meta's rules)
const hashEmail = (e) => (e ? sha256(String(e).trim().toLowerCase()) : undefined);
const hashName = (n) => (n ? sha256(String(n).trim().toLowerCase()) : undefined);
const hashCity = (c) => (c ? sha256(String(c).toLowerCase().replace(/[^a-z]/g, "")) : undefined);
const hashZip = (z) => (z ? sha256(String(z).replace(/\s/g, "").toLowerCase()) : undefined);
const hashPhone = (p) => {
  if (!p) return undefined;
  let d = String(p).replace(/\D/g, "");
  if (d.length === 10) d = "91" + d; // India country code
  return d.length >= 11 ? sha256(d) : undefined;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { META_PIXEL_ID, META_CAPI_TOKEN, META_API_VERSION = "v21.0", META_TEST_EVENT_CODE } = process.env;
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
    console.error("[CAPI] Missing META_PIXEL_ID or META_CAPI_TOKEN");
    return res.status(500).json({ error: "Server not configured" });
  }

  const { eventName, eventId, sourceUrl, user = {}, customData = {} } = req.body || {};
  if (!ALLOWED_EVENTS.includes(eventName) || typeof eventId !== "string" || !eventId || eventId.length > 100) {
    return res.status(400).json({ error: "Invalid event" });
  }

  // Only pass through the fields we expect
  const items = Array.isArray(customData.contents) ? customData.contents.slice(0, 50) : [];
  const safeCustom = clean({
    currency: "INR",
    value: Number(customData.value) || 0,
    content_type: "product",
    content_ids: Array.isArray(customData.content_ids) ? customData.content_ids.slice(0, 50).map(String) : undefined,
    contents: items.map((i) => ({ id: String(i.id), quantity: Number(i.quantity) || 1, item_price: Number(i.item_price) || 0 })),
    num_items: Number(customData.num_items) || undefined,
    order_id: customData.order_id ? String(customData.order_id) : undefined,
  });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress;

  const userData = clean({
    em: hashEmail(user.email),
    ph: hashPhone(user.phone),
    fn: hashName(user.firstName),
    ln: hashName(user.lastName),
    ct: hashCity(user.city),
    zp: hashZip(user.zip),
    country: sha256("in"),
    external_id: user.externalId ? sha256(String(user.externalId)) : undefined,
    // NOT hashed:
    client_ip_address: ip,
    client_user_agent: req.headers["user-agent"],
    fbp: user.fbp,
    fbc: user.fbc,
  });

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId, // must match the browser Pixel eventID
        event_source_url: sourceUrl,
        action_source: "website",
        user_data: userData,
        custom_data: safeCustom,
      },
    ],
    ...(META_TEST_EVENT_CODE && { test_event_code: META_TEST_EVENT_CODE }),
  };

  try {
    const r = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const json = await r.json();
    if (!r.ok) console.error("[CAPI] Meta error:", JSON.stringify(json));
    else console.log("[CAPI] OK", eventName, eventId, JSON.stringify(json));
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (err) {
    console.error("[CAPI] Request failed:", err.message);
    return res.status(500).json({ error: "CAPI request failed" });
  }
}

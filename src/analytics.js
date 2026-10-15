export function push(o) {
  try {
    window.dispatchEvent(new CustomEvent("dl", { detail: o })); // feeds the on-page log
  } catch { /* never break shopping because of analytics */ }
}

// React StrictMode runs effects twice in development, which duplicates events
// (e.g. two begin_checkout). Events fired from effects pass dedupe=true so an
// identical event within 400ms is dropped. Click-driven events do not use it.
let last = { k: "", t: 0 };
const isDup = (k) => { const n = Date.now(); const d = k === last.k && n - last.t < 400; last = { k, t: n }; return d; };

// GA4 event name -> Meta event name. These four also go to Meta Conversions API (server side).
const META_MAP = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase" };
const uid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
const cookie = (n) => document.cookie.split("; ").find((r) => r.startsWith(n + "="))?.split("=")[1];

// Customer details from checkout, kept for this browser session only (used to match events to Meta accounts).
export function saveCustomer(c) { try { sessionStorage.setItem("luma_customer", JSON.stringify(c)); } catch { /* ignore */ } }
const getCustomer = () => { try { return JSON.parse(sessionStorage.getItem("luma_customer")) || {}; } catch { return {}; } };
// Anonymous visitor ID, created once per browser and reused on every event (sent to Meta as external_id).
const visitorId = () => {
  try {
    let v = localStorage.getItem("luma_vid");
    if (!v) { v = uid(); localStorage.setItem("luma_vid", v); }
    return v;
  } catch { return undefined; }
};
// Sends the same event (same event_id as the browser Pixel) to our Vercel function /api/meta-capi.
function sendCapi(eventName, eventId, data, user) {
  try {
    const items = data.items || [];
    const customData = {
      currency: "INR",
      value: data.value,
      content_type: "product",
      content_ids: items.map((i) => i.item_id),
      contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity, item_price: i.price })),
      num_items: items.reduce((n, i) => n + i.quantity, 0),
    };
    if (eventName === "Purchase") customData.order_id = data.transaction_id;
    fetch("/api/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        eventId,
        sourceUrl: window.location.href,
        user: { ...(user || getCustomer()), externalId: visitorId(), fbp: cookie("_fbp"), fbc: cookie("_fbc") },
        customData,
      }),
    }).catch(() => {});
  } catch { /* never break shopping because of analytics */ }
}

// Ingest Labs (MagicPixel) Direct Tracking
function getCartId() {
  try {
    let cid = localStorage.getItem("luma_cart_id");
    if (!cid) {
      cid = "cart_" + (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      localStorage.setItem("luma_cart_id", cid);
    }
    return cid;
  } catch (_) {
    return "cart_" + Date.now();
  }
}

function sendIngest(event, data) {
  try {
    if (typeof window === "undefined" || !window._mp || typeof window.eedl !== "function") return;

    if (event === "view_item") {
      window._mp.safeExecute("evViewItem", function () {
        window.eedl("mp_view_item", {
          currency: data.currency || "INR",
          value: data.value,
          items: data.items,
          ev_source: "web"
        });
      })();
    } else if (event === "add_to_cart") {
      window._mp.safeExecute("evAddToCart", function () {
        window.eedl("mp_add_to_cart", {
          currency: data.currency || "INR",
          cart_id: getCartId(),
          value: data.value,
          items: data.items,
          ev_source: "web"
        });
      })();
    }
  } catch (err) {
    console.warn("Ingest tracking error", err);
  }
}

export function ecom(event, data, dedupe = false, opts = {}) {
  if (dedupe && isDup(event + JSON.stringify(data))) return;
  const metaName = META_MAP[event];
  const eventId = metaName ? opts.eventId || uid() : undefined;
  push({ ecommerce: null });
  push({ event, ...(eventId && { event_id: eventId }), ecommerce: { currency: "INR", ...data } });
  sendIngest(event, data);
  if (metaName) sendCapi(metaName, eventId, data, opts.user);
}
export function track(event, params = {}, dedupe = false) {
  if (dedupe && isDup(event + JSON.stringify(params))) return;
  push({ event, ...params });
}

// One item schema for every event: numeric price/quantity, stable item_id.
export const gaItem = (p, quantity = 1, extra = {}) =>
  ({ item_id: p.id, item_name: p.name, item_category: p.cat, price: p.price, quantity, ...extra });
export const sum = (items) => items.reduce((s, i) => s + i.price * i.quantity, 0);

// Dummy transaction id for practice. A real store uses the backend order number.
export const dummyTransactionId = () => `T-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

// Purchase fires once per transaction_id, even if the thank-you page is refreshed.
export function trackPurchase(o) {
  let done = [];
  try { done = JSON.parse(localStorage.getItem("luma_tracked")) || []; } catch { /* ignore */ }
  if (done.includes(o.id)) return false;
  try { localStorage.setItem("luma_tracked", JSON.stringify([...done, o.id])); } catch { /* ignore */ }
  // event_id is built from the transaction id, so the browser Pixel and the server send the SAME id.
  ecom("purchase", { transaction_id: o.id, value: o.total, tax: o.tax, shipping: o.shipping, coupon: o.coupon || undefined, items: o.items }, false, { eventId: `purchase_${o.id}`, user: o.customer });
  return true;
}

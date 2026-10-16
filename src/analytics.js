
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
 
const uid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
 
// Customer details from checkout, kept for this browser session only.
export function saveCustomer(c) { try { sessionStorage.setItem("luma_customer", JSON.stringify(c)); } catch { /* ignore */ } }
const getCustomer = () => { try { return JSON.parse(sessionStorage.getItem("luma_customer")) || {}; } catch { return {}; } };
 
// Anonymous visitor ID, created once per browser and reused on every event.
const visitorId = () => {
  try {
    let v = localStorage.getItem("luma_vid");
    if (!v) { v = uid(); localStorage.setItem("luma_vid", v); }
    return v;
  } catch { return undefined; }
};
 
// ---------------------------------------------------------------------------
// Ingest Labs (MagicPixel) direct tracking
// ---------------------------------------------------------------------------
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
 
// A new cart ID is created for the next order after a purchase.
const resetCartId = () => { try { localStorage.removeItem("luma_cart_id"); } catch { /* ignore */ } };
 
function sendIngest(event, data, opts = {}) {
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
    } else if (event === "add_payment_info") {
      window._mp.safeExecute("evAddPaymentInfo", function () {
        window.eedl("mp_add_payment_info", {
          currency: data.currency || "INR",
          cart_id: getCartId(),
          value: data.value,
          coupon: data.coupon,
          payment_type: data.payment_type,
          shipping: data.shipping,
          items: data.items,
          ev_source: "web"
        });
      })();
    } else if (event === "purchase") {
      window._mp.safeExecute("evPurchase", function () {
        const c = opts.user || getCustomer();
 
        // 1. Who bought. Fields your checkout does not collect (like state) are skipped.
        const userInfo = {
          pid: visitorId(),
          email: c.email,
          phone: c.phone,
          country: "IN",
          city: c.city,
          state: c.state,
          fName: c.firstName,
          lName: c.lastName,
          zip: c.zip,
        };
        Object.keys(userInfo).forEach((k) => userInfo[k] === undefined && delete userInfo[k]);
        window.eedl("user_info", userInfo);
 
        // 2. What they bought
        window.eedl("mp_purchase", {
          currency: data.currency || "INR",
          transaction_id: data.transaction_id,
          cart_id: getCartId(),
          value: data.value,
          coupon: data.coupon,
          shipping: data.shipping,
          tax: data.tax,
          items: (data.items || []).map((i, idx) => ({
            item_id: i.item_id,
            item_name: i.item_name,
            item_sku: i.item_sku || i.item_id, // no separate SKU in data.js, so the product ID is used
            index: idx,
            price: i.price,
            quantity: i.quantity,
            item_brand: "Luma Scents",
            item_category: i.item_category,
          })),
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
  push({ ecommerce: null });
  push({ event, ecommerce: { currency: "INR", ...data } });
  sendIngest(event, data, opts);
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
  ecom("purchase", { transaction_id: o.id, value: o.total, tax: o.tax, shipping: o.shipping, coupon: o.coupon || undefined, items: o.items }, false, { user: o.customer });
  resetCartId(); // the next order gets a fresh cart_id
  return true;
}
 

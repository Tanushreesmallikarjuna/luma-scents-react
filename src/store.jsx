import { createContext, useContext, useEffect, useState } from "react";
import { byId } from "./data";
import { ecom, gaItem } from "./analytics";

export const RATES = { WELCOME10: 0.1, SALE50: 0.5 };
const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);
const read = () => { try { return JSON.parse(localStorage.getItem("luma_cart")) || {}; } catch { return {}; } };

export function CartProvider({ children }) {
  const [cart, setCart] = useState(read);
  const [coupon, setCoupon] = useState("");
  useEffect(() => { try { localStorage.setItem("luma_cart", JSON.stringify(cart)); } catch { /* ignore */ } }, [cart]);

  const lines = Object.entries(cart).map(([id, q]) => ({ p: byId(id), q })).filter((l) => l.p);
  const count = lines.reduce((s, l) => s + l.q, 0);

  // Analytics calls sit in these handlers (fired by clicks), not inside setState updaters.
  const add = (p, n = 1) => {
    const q = (cart[p.id] || 0) + n;
    if (q > p.stock) return false; // never exceed stock
    setCart({ ...cart, [p.id]: q });
    ecom("add_to_cart", { value: p.price * n, items: [gaItem(p, n)] });
    return true;
  };
  const dec = (p) => {
    const q = cart[p.id] - 1, next = { ...cart };
    if (q < 1) delete next[p.id]; else next[p.id] = q;
    setCart(next);
    ecom("remove_from_cart", { value: p.price, items: [gaItem(p, 1)] });
  };
  const remove = (p) => {
    const q = cart[p.id], next = { ...cart };
    delete next[p.id];
    setCart(next);
    ecom("remove_from_cart", { value: p.price * q, items: [gaItem(p, q)] });
  };
  const clear = () => setCart({});

  // Demo totals. In the full-stack version the server calculates these.
  const totals = (express = false) => {
    const sub = lines.reduce((s, l) => s + l.p.price * l.q, 0);
    const disc = Math.round(sub * (RATES[coupon] || 0));
    const net = sub - disc;
    const shipping = (net >= 2000 || sub === 0 ? 0 : 99) + (express && sub ? 150 : 0);
    const tax = Math.round(net * 0.18);
    return { sub, disc, net, shipping, tax, total: net + shipping + tax };
  };
  return <Ctx.Provider value={{ lines, count, add, dec, remove, clear, coupon, setCoupon, totals }}>{children}</Ctx.Provider>;
}

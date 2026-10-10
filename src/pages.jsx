import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CATS, PRODUCTS, bySlug, inr, swatch } from "./data";
import { useCart, RATES } from "./store";
import { dummyTransactionId, ecom, gaItem, saveCustomer, track, trackPurchase } from "./analytics";

const setTitle = (t) => { document.title = t + " | Luma Scents"; };

// Shows the half price whenever the SALE50 coupon is active, so the price on screen
// always matches what the cart charges.
function Price({ p }) {
  const { coupon } = useCart();
  const sale = coupon === "SALE50";
  return (
    <span className="price">
      {inr(sale ? p.price / 2 : p.price)}
      {sale ? <span className="was">{inr(p.price)}</span> : p.was ? <span className="was">{inr(p.was)}</span> : null}
    </span>
  );
}

const PROMO = { creative_name: "sale_banner", promotion_id: "SALE50", promotion_name: "50% OFF SALE" };

export function Shop() {
  const [sp, setSp] = useSearchParams();
  const cat = sp.get("cat") || "All", q = sp.get("q") || "";
  const [sort, setSort] = useState("featured");
  const { add } = useCart();
  const nav = useNavigate();
  const ln = cat === "All" ? "All products" : cat;
  const list = useMemo(() => {
    let r = PRODUCTS.filter((p) => (cat === "All" || p.cat === cat) && (!q || (p.name + " " + p.notes).toLowerCase().includes(q.toLowerCase())));
    if (sort === "lo") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "hi") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [cat, q, sort]);
  useEffect(() => { document.title = "Luma Scents | Perfumes, candles and fragrance gifts"; }, []);
  useEffect(() => { ecom("view_promotion", PROMO, true); }, []); // banner shown
  useEffect(() => {
    if (list.length) ecom("view_item_list", { item_list_id: cat.toLowerCase().replace(/ /g, "_"), item_list_name: ln, items: list.map((p, i) => gaItem(p, 1, { index: i, item_list_name: ln })) }, true);
  }, [list]); // eslint-disable-line
  useEffect(() => { if (q) track("search", { search_term: q }, true); }, [q]);
  const pick = (p, i) => ecom("select_item", { item_list_name: ln, items: [gaItem(p, 1, { index: i, item_list_name: ln })] });
  return (
    <>
      <section className="hero">
        <h1>Scent that stays in the room.</h1>
        <p>Small-batch perfumes, candles and gifts, poured in Mysuru and named for the hour they suit best.</p>
      </section>
      <div className="promo">
        <h2>🎉 50% OFF SALE — ALL PRODUCTS</h2>
        <button className="btn" onClick={() => { ecom("select_promotion", PROMO); nav("/sale"); }}>SHOP 50% OFF</button>
      </div>
      <div className="bar">
        {CATS.map((c) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setSp(c === "All" ? {} : { cat: c })}>{c}</button>)}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          <option value="featured">Featured</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option>
        </select>
      </div>
      <div className="grid">
        {list.length ? list.map((p, i) => (
          <article className="card" key={p.id}>
            <Link className="sw" style={swatch(p)} to={`/product/${p.slug}`} onClick={() => pick(p, i)} aria-label={`View ${p.name}`}>{p.cat}</Link>
            <div className="in">
              <h3>{p.name}</h3><small>{p.notes}</small><Price p={p} />
              {p.stock ? <button className="btn" onClick={() => add(p)}>Add to cart</button> : <span className="mute">Out of stock</span>}
            </div>
          </article>
        )) : <p className="mute">No fragrances match "{q}". Clear the search or pick another category.</p>}
      </div>
    </>
  );
}

export function SalePage() {
  const { add, setCoupon } = useCart();
  const saleProducts = PRODUCTS.filter((p) => p.stock > 0);
  // Visiting the sale activates the SALE50 coupon, so the cart applies the same 50% shown here.
  useEffect(() => { setTitle("50% off sale"); setCoupon("SALE50"); }, []); // eslint-disable-line
  useEffect(() => {
    ecom("view_item_list", { item_list_id: "sale", item_list_name: "Sale", items: saleProducts.map((p, i) => gaItem(p, 1, { index: i, item_list_name: "Sale", discount: p.price / 2 })) }, true);
  }, []); // eslint-disable-line
  const pick = (p, i) => ecom("select_item", { item_list_name: "Sale", items: [gaItem(p, 1, { index: i, item_list_name: "Sale", discount: p.price / 2 })] });
  return (
    <div className="page">
      <Link className="btn ghost" to="/">Back to shop</Link>
      <h1 style={{ marginTop: 20 }}>50% OFF SALE</h1>
      <p className="mute">All products are 50% off for this promotion. The discount is applied in your cart.</p>
      <div className="grid" style={{ padding: "20px 0 0" }}>
        {saleProducts.map((p, i) => (
          <article className="card" key={p.id}>
            <Link className="sw" style={swatch(p)} to={`/product/${p.slug}`} onClick={() => pick(p, i)} aria-label={`View ${p.name}`}>{p.cat}</Link>
            <div className="in">
              <h3>{p.name}</h3><small>{p.notes}</small><Price p={p} />
              <button className="btn" onClick={() => add(p)}>Add to cart</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Product() {
  const { slug } = useParams();
  const p = bySlug(slug);
  const { add } = useCart();
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  useEffect(() => { if (p) { setTitle(p.name); ecom("view_item", { value: p.price, items: [gaItem(p, 1)] }, true); } }, [p]);
  if (!p) return <div className="page"><h2>Product not found</h2><Link className="btn" to="/">Back to shop</Link></div>;
  const addOne = () => { const ok = add(p); setMsg(ok ? "Added to cart" : "No more stock available"); return ok; };
  return (
    <div className="page">
      <Link className="btn ghost" to="/">Back to shop</Link>
      <div className="pd">
        <div className="sw big" style={swatch(p)}>{p.cat}</div>
        <div>
          <h1>{p.name}</h1>
          <p style={{ fontSize: "1.4rem" }}><Price p={p} /></p>
          <p>{p.stock ? `In stock (${p.stock} left)` : "Out of stock"}</p>
          <h3>Fragrance notes</h3><p>{p.notes}</p>
          <p className="mute">Prices exclude 18% GST. Free shipping above ₹2,000.</p>
          {p.stock > 0 && <div className="row"><button className="btn" onClick={addOne}>Add to cart</button><button className="btn ghost" onClick={() => addOne() && nav("/checkout")}>Buy now</button></div>}
          <p role="status">{msg}</p>
        </div>
      </div>
    </div>
  );
}

export function CartPage() {
  const { lines, add, dec, remove, coupon, setCoupon, totals } = useCart();
  const [code, setCode] = useState(coupon);
  const [msg, setMsg] = useState("");
  const t = totals();
  useEffect(() => { setTitle("Your cart"); if (lines.length) ecom("view_cart", { value: t.sub, items: lines.map((l) => gaItem(l.p, l.q)) }, true); }, []); // eslint-disable-line
  if (!lines.length) return <div className="page"><h2>Your cart is empty</h2><p className="mute">Add a fragrance to get started.</p><Link className="btn" to="/">Continue shopping</Link></div>;
  const apply = () => {
    const c = code.trim().toUpperCase();
    if (c === "" || RATES[c]) { setCoupon(c); setMsg(c ? `${RATES[c] * 100}% off applied` : "Coupon removed"); } else setMsg("That code is not valid");
  };
  return (
    <div className="page">
      <h2>Your cart</h2>
      {lines.map((l) => (
        <div className="line" key={l.p.id}>
          <b>{l.p.name}</b><span>{inr(l.p.price * l.q)}</span>
          <span className="qty"><button onClick={() => dec(l.p)} aria-label="Decrease quantity">−</button>{l.q}<button onClick={() => add(l.p)} aria-label="Increase quantity">+</button></span>
          <button className="chip" onClick={() => remove(l.p)}>Remove</button>
        </div>
      ))}
      <div className="tot">
        <div><span>Subtotal</span><span>{inr(t.sub)}</span></div>
        {t.disc > 0 && <div><span>Discount ({coupon})</span><span>−{inr(t.disc)}</span></div>}
        <div><span>Shipping</span><span>{t.shipping ? inr(t.shipping) : "Free"}</span></div>
        <div><span>GST 18%</span><span>{inr(t.tax)}</span></div>
        <div className="g"><span>Total</span><span>{inr(t.total)}</span></div>
      </div>
      <div className="row" style={{ margin: "16px 0" }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon (try WELCOME10)" aria-label="Coupon code" />
        <button className="btn ghost" onClick={apply}>Apply</button>
      </div>
      <p role="status" className="mute">{msg}</p>
      <div className="row"><Link className="btn ghost" to="/">Continue shopping</Link><Link className="btn" to="/checkout">Proceed to checkout</Link></div>
    </div>
  );
}

export function Checkout() {
  const { lines, totals, coupon, clear } = useCart();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [ship, setShip] = useState("Standard");
  const [customer, setCustomer] = useState({});
  const t = totals(ship === "Express");
  const items = lines.map((l) => gaItem(l.p, l.q));
  useEffect(() => { setTitle("Checkout"); if (lines.length) ecom("begin_checkout", { value: t.net, coupon: coupon || undefined, items }, true); }, []); // eslint-disable-line
  if (!lines.length) return <div className="page"><h2>Your cart is empty</h2><Link className="btn" to="/">Continue shopping</Link></div>;
  const shipSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const m = f.get("m");
    const [firstName, ...rest] = String(f.get("n")).trim().split(/\s+/);
    const c = { email: f.get("e"), phone: f.get("ph"), firstName, lastName: rest.join(" "), zip: f.get("z"), city: f.get("c") };
    setCustomer(c); saveCustomer(c); // used only to match events to Meta accounts (hashed on the server)
    setShip(m); setStep(2);
    ecom("add_shipping_info", { value: t.net, coupon: coupon || undefined, shipping_tier: m, items });
  };
  const paySubmit = (e) => {
    e.preventDefault();
    const pay = new FormData(e.target).get("p");
    ecom("add_payment_info", { value: t.net, coupon: coupon || undefined, payment_type: pay, items });
    // Demo only: a real store confirms payment on the server (Razorpay signature + webhook) before this step.
    const order = { id: dummyTransactionId(), total: t.total, tax: t.tax, shipping: t.shipping, coupon, items, pay, customer };
    try { localStorage.setItem("luma_order", JSON.stringify(order)); } catch { /* ignore */ }
    clear();
    nav("/thanks", { replace: true });
  };
  return (
    <div className="page">
      <h2>Checkout</h2>
      <div className="steps"><span>{step === 1 ? <b>1 Shipping</b> : "1 Shipping"}</span><span>{step === 2 ? <b>2 Payment</b> : "2 Payment"}</span></div>
      {step === 1 ? (
        <form onSubmit={shipSubmit}>
          <label>Full name<input name="n" required autoComplete="name" /></label>
          <label>Email<input name="e" type="email" required autoComplete="email" /></label>
          <label>Phone<input name="ph" type="tel" required pattern="[0-9]{10}" inputMode="numeric" autoComplete="tel-national" title="10-digit mobile number" /></label>
          <label>Address<input name="a" required autoComplete="street-address" /></label>
          <label>City<input name="c" required /></label>
          <label>PIN code<input name="z" required pattern="[0-9]{6}" inputMode="numeric" title="6-digit PIN code" /></label>
          <label>Shipping method<select name="m"><option value="Standard">Standard (3 to 5 days)</option><option value="Express">Express (1 to 2 days, +₹150)</option></select></label>
          <button className="btn">Continue to payment</button>
        </form>
      ) : (
        <form onSubmit={paySubmit}>
          <label>Payment method<select name="p"><option>UPI</option><option>Card</option><option>Cash on delivery</option></select></label>
          <p className="mute">Demo only: no payment is collected and no card details are stored.</p>
          <button className="btn">Pay {inr(t.total)}</button>
        </form>
      )}
      <div className="tot" style={{ maxWidth: 520, marginTop: 22 }}>
        {lines.map((l) => <div key={l.p.id}><span>{l.p.name} × {l.q}</span><span>{inr(l.p.price * l.q)}</span></div>)}
        {t.disc > 0 && <div><span>Discount ({coupon})</span><span>−{inr(t.disc)}</span></div>}
        <div className="g"><span>Total</span><span>{inr(t.total)}</span></div>
      </div>
    </div>
  );
}

export function Thanks() {
  const [o] = useState(() => { try { return JSON.parse(localStorage.getItem("luma_order")); } catch { return null; } });
  // Fires once per transaction_id: refreshing this page will not send a second purchase.
  useEffect(() => { setTitle("Order confirmed"); if (o) trackPurchase(o); }, [o]);
  if (!o) return <div className="page"><h2>No recent order</h2><Link className="btn" to="/">Back to shop</Link></div>;
  return (
    <div className="page">
      <h2>Thank you, order confirmed</h2>
      <p>Transaction ID: <b>{o.id}</b></p>
      <p className="mute">Total {inr(o.total)}. Refresh this page and check the dataLayer log: no second purchase event is sent.</p>
      <Link className="btn" to="/">Continue shopping</Link>
    </div>
  );
}

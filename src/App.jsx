import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "./store";
import { track } from "./analytics";
import { Shop, SalePage, Product, CartPage, Checkout, Thanks } from "./pages";

function PageViews() {
  const l = useLocation();
  // SPA page_view: fires on every route change, once (dedupe guards StrictMode).
  useEffect(() => { track("page_view", { page_path: l.pathname, page_title: document.title, page_location: window.location.href }, true); }, [l.pathname]);
  return null;
}

function Header() {
  const { count } = useCart();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [ev, setEv] = useState([]);
  useEffect(() => {
    const h = (e) => { if (e.detail.ecommerce !== null) setEv((v) => [e.detail, ...v].slice(0, 40)); };
    window.addEventListener("dl", h);
    return () => window.removeEventListener("dl", h);
  }, []);
  return (
    <>
      <header>
        <Link to="/" className="logo">Luma Scents</Link>
        <form className="s" role="search" onSubmit={(e) => { e.preventDefault(); nav(q ? `/?q=${encodeURIComponent(q.trim())}` : "/"); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search fragrances" aria-label="Search products" />
        </form>
        <button className="btn ghost" onClick={() => setOpen(!open)}>dataLayer</button>
        <Link className="btn" to="/cart">Cart ({count})</Link>
      </header>
      {open && <div id="log" aria-live="polite">{ev.length ? ev.map((e, i) => <div key={i}>{JSON.stringify(e)}</div>) : "No events yet."}</div>}
    </>
  );
}

export default function App() {
  return (
    <>
      <PageViews />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/sale" element={<SalePage />} />
          <Route path="/product/:slug" element={<Product />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/thanks" element={<Thanks />} />
          <Route path="*" element={<div className="page"><h2>Page not found</h2><Link className="btn" to="/">Back to shop</Link></div>} />
        </Routes>
      </main>
      <footer><span>Luma Scents is a fictional brand for practice.</span><span>Demo checkout: no real payment is taken.</span></footer>
    </>
  );
}

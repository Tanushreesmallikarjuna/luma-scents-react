import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "./store";
import { inr } from "./data";
import { ecom, gaItem } from "./analytics";
export default function CartDrawer() {
  const {
    lines,
    add,
    dec,
    remove,
    totals,
    drawer,
    setDrawer,
    coupon,
  } = useCart();

  const { pathname } = useLocation();
  const t = totals();

  const close = () => setDrawer(false);

  // Close drawer whenever page changes
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  // Escape closes drawer + prevents background scrolling
  useEffect(() => {
    if (!drawer) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setDrawer(false);
      }
    };

    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  /*
   * ❌ INTENTIONAL BUG
   *
   * Every time `drawer` changes, this effect runs again.
   *
   * A new checkout listener is attached.
   *
   * BUT there is NO cleanup.
   *
   * Therefore old listeners remain attached.
   */
    useEffect(() => {
    const checkoutButton = document.querySelector("#drawer-checkout");
    if (!checkoutButton) return;

    const handleCheckout = () => {
      console.log("🔥 PURCHASE EVENT FIRED");
      ecom("checkout", {
        transaction_id: "LUMA-1001",
        value: t.net,
        items: lines.map((l) => gaItem(l.p, l.q)),
      });
    };

    console.log("⚠️ Checkout listener ATTACHED");
    checkoutButton.addEventListener("click", handleCheckout);
    return () => {
      console.log("🧹 Checkout listener REMOVED");
      checkoutButton.removeEventListener("click", handleCheckout);
    };
    // ❌ BUG: missing removeEventListener() cleanup
  }, [drawer, t.net]);

    
      // Simulate sending event to tracking system
    

  return (
    <>
      {/* Background overlay */}
      <div
        className={"scrim" + (drawer ? " on" : "")}
        onClick={close}
        aria-hidden="true"
      />

      {/* Cart drawer */}
      <aside
        className={"drawer" + (drawer ? " on" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        aria-hidden={!drawer}
      >
        <div className="dh">
          <h2>Your cart</h2>

          <button
            className="chip"
            onClick={close}
            aria-label="Close cart"
          >
            Close
          </button>
        </div>

        {lines.length ? (
          <>
            {/* Cart items */}
            <div className="dl">
              {lines.map((l) => (
                <div className="line" key={l.p.id}>
                  <b>{l.p.name}</b>

                  <span>
                    {inr(l.p.price * l.q)}
                  </span>

                  <span className="qty">
                    <button
                      onClick={() => dec(l.p)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>

                    {l.q}

                    <button
                      onClick={() =>
                        add(l.p, 1, false)
                      }
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </span>

                  <button
                    className="chip"
                    onClick={() => remove(l.p)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="df">
              <div
                className="tot"
                style={{ margin: 0 }}
              >
                <div>
                  <span>Subtotal</span>
                  <span>{inr(t.sub)}</span>
                </div>

                {t.disc > 0 && (
                  <div>
                    <span>
                      Discount ({coupon})
                    </span>

                    <span>
                      −{inr(t.disc)}
                    </span>
                  </div>
                )}

                <div className="g">
                  <span>
                    Total before GST and shipping
                  </span>

                  <span>
                    {inr(t.net)}
                  </span>
                </div>
              </div>

              <div
                className="row"
                style={{ marginTop: 14 }}
              >
                <Link
                  className="btn ghost"
                  to="/cart"
                  onClick={close}
                >
                  View cart
                </Link>

                {/* CHECKOUT BUTTON */}
                <Link
                  id="drawer-checkout"
                  className="btn"
                  to="/checkout"
                  onClick={close}
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="dl">
            <p className="mute">
              Your cart is empty.
            </p>

            <Link
              className="btn"
              to="/"
              onClick={close}
            >
              Continue shopping
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

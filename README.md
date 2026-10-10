# Luma Scents (React + Vite demo storefront)

Front-end only: shop, product pages, cart, demo checkout, and GA4 ecommerce dataLayer events.
No backend, no real payments. Transaction IDs are dummy ones like `T-1712345678901-4821`.

## Run
    npm install
    # edit .env and put your GTM container ID in VITE_GTM_ID (optional)
    npm run dev

Click "dataLayer" in the header to see every event live, even without GTM.

## Events
page_view, view_item_list, select_item, view_item, add_to_cart, remove_from_cart, view_cart,
begin_checkout, add_shipping_info, add_payment_info, purchase, search.

## GTM
Create Data Layer Variables for ecommerce.items, ecommerce.value, ecommerce.transaction_id,
ecommerce.tax, ecommerce.shipping. Add one Custom Event trigger per event name, and one GA4 Event tag
per trigger (or enable "Send Ecommerce data" > Data Layer). The GA4 Measurement ID goes in GTM only.
Test with GTM Preview and GA4 DebugView.

## Meta Conversions API (server side)
`api/meta-capi.js` is a Vercel Serverless Function. The React app sends ViewContent, AddToCart,
InitiateCheckout and Purchase to it, and it forwards them to Meta with hashed customer data.
Each event carries an `event_id` that is also pushed to the dataLayer, so GTM can pass it to the
Meta Pixel tag as Event ID and Meta deduplicates browser + server events.

Vercel > Settings > Environment Variables: META_PIXEL_ID, META_CAPI_TOKEN, VITE_GTM_ID
(and META_TEST_EVENT_CODE while testing). Redeploy after changing them.
`/api` does not run under `npm run dev`; test on the deployed site.

# Apparel platform frontend

The React application includes the clothing storefront, browser 3D T-shirt customizer, mixed cart, rental bookings, cash checkout, customer account, owner screens, tailor production workflow, and administration.

## Setup

~~~powershell
npm install
npm start
~~~

Development uses http://localhost:5001 by default. Set REACT_APP_API_BASE_URL in a local environment file when the backend is hosted elsewhere; see .env.example. Production defaults to same-origin API requests, so configure a reverse proxy for API and authorized upload routes, or provide the backend origin at build time. The backend CORS_ORIGINS must include the frontend origin.

API URL construction, media URL normalization, bearer-token handling, and authenticated file downloads are centralized in src/config/api.js. MediaImage and useMediaUrl fetch private artwork with authorization and release temporary browser URLs.

## Buyer branding

Open Admin Hub -> Site Settings as an administrator to configure the store name, logo, colors, homepage content, contact details, and social links. Values are loaded from the backend at runtime and survive restarts; a branding change does not require a frontend rebuild.

The default installation is called "Your Store". BrandingProvider supplies the public settings to all storefront, rental, legal, and reporting components. SiteBrand provides a shared logo/name display with a text fallback. Reports escape configured names when generating HTML and use a safe slug for download filenames.

The contact page uses the configured business contact details. Its form opens an email draft in the visitor's email application; it does not claim that a server message has been sent.

This is a separate installation for each buyer. Business rules, payment methods, external integrations, and legal content remain separate from display branding.

## Cash ordering

Checkout supports custom designs, ready-made clothing, and confirmed rental bookings. It requests authoritative prices from the server and submits explicit item types and IDs, the reviewed total, and an idempotency key. A network retry keeps the same key. Buy Now checks out only the selected item and leaves the main cart intact.

Only cash on delivery and cash on collection are offered. Collection requires contact information; delivery also requires an address. The confirmation means the order was placed and cash is due, not that a payment was processed.

The account order table shows saved item details, payment status, and fulfillment status separately. Administrators record cash receipts in Cash Payment Management. Outfit owners record rental receipts in Manage Bookings. Tailors use the assigned CustomOrder workflow, including saved 3D configuration previews.

The dark design studio supports separate front, back, and sleeve colours, collar/cuff trim, up to eight artwork layers, single graphics or repeating/half-panel patterns, and up to two front/back messages. The flat placement guide and live 3D garment share the same texture projection. Layers support movement, scale/density, rotation, ordering, undo/redo, and PNG preview download. Existing presets, private uploads, garment sizes and quantities remain available. Legacy front-only designs open in the new editor.

Version 2 stores each panel, placement, pattern and message. Server pricing charges each artwork layer at its preset/upload price and each message at the configured text price (zero by default). Checkout stores an independent snapshot for the assigned tailor; later cart edits do not change it. The placement view is a visual guide, not a sewing pattern, production-ready print file, or cloth simulation. Colours and placement require production review.

All routes use the shared AppShell navigation, footer, typography, controls and responsive page frame. Route metadata lives in src/config/pages.json. Legacy styles are scoped to their page and placed in the app-legacy cascade layer; shared components use app-components. Keep new page styles scoped and avoid adding duplicate headers, footers, or main landmarks. The customizer intentionally uses a dark workspace.

The editorial interface uses a splash at /, the public home at /home, an About page at /about, and the contact/FAQ page at /contact. The signed-in /userHome also uses the home layout. The rental landing page at /rentalHome uses the same editorial theme and footer, with category search linked to /outfits and actual rental inventory cards shared with the catalogue. Reservation dates are selected on the outfit detail page. Home collection cards and category filters use real inventory. Editorial photography is decorative style inspiration; its generated assets and exact prompts are documented in src/assets/editorial/asset-metadata.json. The shared footer includes the supplied developer logo and credit.

Black, charcoal, and off-white form the default appearance. Site Settings -> Colour theme can switch to custom saved brand colours without changing installation identity. Shared workspace controls use the same visual language. Functional garment colours and artwork retain their real colours. Framer Motion handles route entrances, scroll reveals, and FAQ transitions with reduced-motion preferences respected. The Syne display font is bundled locally.

The shop at /outlet and the product/rental detail pages at /outlet/:id and /outfit-details/:id share the editorial page frame, product galleries, form controls, and expanded footer. Product detail photographs retain their actual colours. Gallery controls support keyboard use and reduced motion. Shop filters preserve server parameters and reset to the unfiltered collection. Booking uploads, cash checkout, cart selections, and product reviews keep their existing API contracts. Rental specifications and features come from the outfit record.

Public registration offers Customer and Applicant accounts. Staff access is provisioned by an administrator. Protected routes recognize account type and the owner/admin roles.

## Verification

~~~powershell
$env:CI = 'true'
npm test -- --watchAll=false --runInBand
npm run build
~~~

Tests cover saved buyer branding, logo publishing, report escaping, role routing, mixed-cart request construction, Buy Now isolation, cart cleanup, and cash collection retries. The production build still reports existing repository lint warnings and outdated Browserslist data; dependency modernization is separate work.

For transaction requirements, backend setup, payment semantics, and deployment considerations, see ../backend/README.md.

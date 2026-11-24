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

The current 3D renderer supports one front artwork placement. The server stores the canonical configuration and an independent snapshot on checkout. Later cart edits do not change the production order.

Public registration offers Customer and Applicant accounts. Staff access is provisioned by an administrator. Protected routes recognize account type and the owner/admin roles.

## Verification

~~~powershell
$env:CI = 'true'
npm test -- --watchAll=false --runInBand
npm run build
~~~

Tests cover saved buyer branding, logo publishing, report escaping, role routing, mixed-cart request construction, Buy Now isolation, cart cleanup, and cash collection retries. The production build still reports existing repository lint warnings and outdated Browserslist data; dependency modernization is separate work.

For transaction requirements, backend setup, payment semantics, and deployment considerations, see ../backend/README.md.

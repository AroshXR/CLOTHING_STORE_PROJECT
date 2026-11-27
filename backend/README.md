# Apparel platform backend

The existing Express/Mongoose backend remains the application server. React handles the storefront, rental screens, administration, and browser-based 3D rendering. Checkout, pricing, stock reservation, booking availability, and production transitions are controlled on the server.

## Setup

Run commands from this directory.

~~~powershell
npm install
node init-local-auth.js
npm start
~~~

The initialization helper preserves existing local settings in the ignored .env.local file, generates a JWT secret if missing, and leaves only comments in the tracked .env file. On a new checkout, configure .env.local using .env.example. The server loads .env.local before .env; deployment environment variables take precedence. Never commit either file containing credentials.

Required settings are MONGODB_URI and JWT_SECRET. PORT defaults to 5001. CORS_ORIGINS is a comma-separated list of allowed frontend origins, defaulting to http://localhost:3000. ImageKit is needed for outfit image publishing; SMTP settings are needed for email and scheduled rental reminders.

Checkout, rental reservation, assignment, production transitions, cancellation, and cash receipt use MongoDB transactions. Use an Atlas cluster or a replica set, including a local single-node replica set. A standalone MongoDB server cannot support these operations; the API returns a clear 503 response rather than writing a partial checkout.

Changing JWT_SECRET invalidates existing sessions. Sign in again after initializing a previously unconfigured secret.

## Buyer customization

Each buyer runs an independent installation with its own database, environment credentials, JWT secret, and uploads. This release provides configuration for one store per installation; it does not share customer data between buyers.

An administrator opens Admin Hub -> Site Settings to publish the site name, tagline, logo, header/accent colors, homepage heading/description, business description, contact information, and social links. Changes are stored in the SiteSettings collection and apply without rebuilding the frontend. Fresh installations use the neutral name "Your Store" and leave contact information blank.

For a fresh buyer installation, configure its database and credentials, then run npm run create-admin in an interactive terminal. The command prompts for an administrator identity and a hidden password, stores a hash, and refuses to modify an existing account. It does not add a public staff-registration endpoint.

Distribute source and .env.example to buyers, excluding operational .env.local files, uploaded customer documents/artwork, database exports, and node_modules. Let each installation generate its own credentials and upload directories.

GET /site-settings exposes only display settings. PUT /site-settings requires an administrator and validates allowed fields, URLs, and colors. Upload a logo through the existing image uploader; it becomes public only when explicitly published in site settings. Another customer's private artwork cannot be published as the store logo.

appearanceMode selects monochrome (the default editorial black/white theme) or custom (saved primary/accent colours). Existing installations without this field receive the monochrome default; names, logos, contact details, and saved custom colours are preserved.

The same saved identity is used in navigation, footer, legal-page identity/contact links, report headers/download names, and inventory/rental email branding. The browser title, description, favicon, and web manifest use the installation settings. Set PUBLIC_SITE_URL and PUBLIC_API_URL to the deployed HTTPS origins when using separate hosts or a reverse proxy.

SMTP credentials remain server environment settings. Inventory alerts use STOCK_ALERT_EMAIL, falling back to the installation's EMAIL_USER or SMTP_USER; no original developer inbox is used. Legal terms, business rules, catalog, and integrations still need to be configured for each buyer's operation.

## Application structure

- app.js loads configuration, connects to MongoDB, starts HTTP/Socket.IO, and schedules reminders.
- createApp.js builds the HTTP application without opening a database connection or starting jobs. Integration tests use this factory.
- Routes and controllers provide authentication, role checks, account ownership, request handling, and response formatting.
- services/pricingService.js canonicalizes the supported T-shirt configuration and calculates authoritative prices and totals.
- services/checkoutService.js owns checkout, immutable order snapshots, inventory reservation, linked production records, idempotency, cash status, and unpaid cancellation.
- services/bookingService.js owns rental reservation, date overlap checks, booking edits, and collection receipts.
- CustomOrder is the production record. Order is the sales line. PaymentDetails is the invoice/payment arrangement. OrderStatus retains production history.
- Upload records associate uploaded artwork with its owner. Private images, booking documents, and application resumes are served through authorized endpoints.
- Publicly published product images may be read without authentication. Other uploaded artwork requires ownership, an associated customer order, or administrator access.
- Recruitment Socket.IO events require an authenticated administrator.

## Cash checkout contract

Online card payments are disabled. No new card numbers, expiry dates, or CVVs are accepted or stored. Legacy card fields are excluded from payment API responses.

1. POST /payment/quote with an authenticated bearer token and the requested items, shippingMethod, and giftWrap.
2. Display the returned items, subtotal, tax, shipping, giftWrapFee, and total.
3. POST /payment with deliveryDetails, the same item selection/options, and expectedTotal from the quote. Send a stable Idempotency-Key header for every retry of the same request.
4. The server re-reads availability and prices inside the transaction. A changed total or unavailable item returns 409; obtain and review a new quote before submitting again.

Example request body (replace IDs with actual owned/available records):

~~~json
{
  "items": [
    { "kind": "custom", "id": "000000000000000000000001", "quantity": 1 },
    { "kind": "product", "id": "000000000000000000000002", "quantity": 2, "size": "M", "color": "Blue" },
    { "kind": "booking", "id": "000000000000000000000003", "quantity": 1 }
  ],
  "deliveryDetails": {
    "firstName": "Example",
    "lastName": "Customer",
    "email": "customer@example.com",
    "phone": "0771234567"
  },
  "shippingMethod": "collection",
  "giftWrap": false,
  "expectedTotal": 0
}
~~~

The example total is a placeholder; use the returned quote total. Home delivery also requires address, city, state, zipCode, and country. A booking must belong to the caller, be confirmed, and have no existing payment arrangement. Rental-only checkout is collection only.

The transaction creates one payment arrangement and one sales order per line. Custom lines also create a linked production record and an initial history entry. Product stock is reserved atomically. Purchased designs are retained with inCart=false; order snapshots remain independent of later design edits or deletion.

The design studio accepts version 2 configurations with front/back/sleeve colours, trim colour, up to eight independently priced artwork layers, transforms and repeat styles, and up to two front/back text layers. Text pricing is configured through customTextPrice (zero by default). The server validates all placements, panel names and layer IDs, authorizes every private upload, and recalculates prices. Existing version 1 front-only designs remain compatible. Checkout stores the complete immutable configuration for production, and administrators can review its private artwork. The browser placement guide does not generate sewing patterns or production-ready print files. Checkout never trusts a submitted user ID, design price, subtotal, tax, or shipping cost.

Idempotency keys are scoped to the authenticated account. A retry returns the original result; reusing the key for a different request returns 409.

## Cash receipt and fulfillment

A newly placed cash order is pending payment. Administrators use PATCH /payment/:id/status with processing, completed, or cancelled. Completed means the cash has been received; it does not mark production or delivery complete.

Outfit owners record their own rental cash receipt through POST /api/booking/:id/record-payment. This completes the rental line's payment, starts its fulfillment, and completes the parent payment only when all lines are paid. A mixed invoice remains processing while another line is unpaid.

An unpaid invoice may be cancelled only before production/fulfillment has started. Cancellation retains order and production history, releases stock once, and clears unpaid rental arrangements. Partial cash receipt blocks cancellation. There is no refund workflow in this release. DELETE /payment/:id is a backward-compatible cancellation alias; it does not delete history.

Products removed by administrators are archived so pending orders can still release reserved stock. Rental outfits are also archived rather than deleting booking references.

## Production workflow and permissions

The canonical routes are under /api/custom-orders:

- Customers: GET /my and access to their own order details.
- Administrators: list orders and PATCH /:id/status directly.
- Valid progression: pending -> in_progress -> completed -> delivered.
- Sales fulfillment status follows production; payment status remains separate.

Public registration permits Customer and Applicant accounts. Administrator accounts must be provisioned by an administrator; existing administrators remain valid. Outfit listing keeps the existing authenticated owner-onboarding flow. User, applicant, booking, production, and upload endpoints enforce applicable ownership or staff access.

Production is managed through Admin Hub -> Custom Orders. The separate staff assignment feature and its account type, dashboard, models, and endpoints have been removed. Existing accounts of the retired type cannot sign in or use previously issued sessions; administrators can change their account type through User Management. Historical assignment records remain in the database. Older orders in assigned/accepted states are displayed as pending and can enter production directly without a migration.

## Pricing configuration

Customizer prices come from the stored administrator configuration, falling back to config/commerce.js. Shipping, gift wrap, and the existing tax rule are centralized in that file. Current display prices remain USD and the configured tax rate remains 8%; confirm the business's actual currency, charges, and tax configuration before a public launch.

## Verification

~~~powershell
npm test
~~~

Tests start a separate temporary MongoDB replica set, use loopback-only connections and a dedicated database name, and never load .env or connect to MONGODB_URI. They cover ownership and roles, websocket authentication, mixed checkout, server pricing, immutable snapshots, transaction rollback, retry idempotency, cash receipt, cancellation, production transitions, private artwork, concurrent stock reservations, and overlapping rentals.

mongodb-memory-server downloads a MongoDB test binary on its first run. To use an already installed compatible mongod executable:

~~~powershell
$env:MONGOMS_SYSTEM_BINARY = 'C:\path\to\mongod.exe'
npm test
~~~

The older root-level test-payment and debug scripts predate the checkout contract. Use the isolated test suite above for regression checks.

## Existing data and deployment

No production database migration, live checkout, provider operation, or deployment is performed by the tests. Existing records remain readable; older sales records without snapshots are not automatically reconstructed. Back up the database before any explicit migration. Historical collections and indexes are not dropped automatically; do not run syncIndexes against a live database without review.

Credentials previously tracked in .env remain in Git history even after moving local values. Rotate those provider/database credentials before sharing that history or deploying publicly. Existing dependency audit findings also require a separate compatibility review; this change does not apply breaking dependency upgrades.

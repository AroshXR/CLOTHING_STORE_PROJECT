const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'isolated-integration-test-secret-never-used-in-production';
const createApp = require('../createApp');
const User = require('../models/User');
const Design = require('../models/ClothCustomizerModel');
const Product = require('../models/ClothingItemModel');
const Booking = require('../models/Booking');
const Outfit = require('../models/Outfit');
const Payment = require('../models/PaymentDetailsModel');
const Order = require('../models/OrderModel');
const Production = require('../models/CustomOrder');
const Tailor = require('../models/Tailor');
let replica, server, sockets, base, people;
const uploaded = [];
const delivery = { firstName: 'Test', lastName: 'Customer', email: 'test@example.com', phone: '0771234567', address: '1 Test Road', city: 'Colombo', state: 'Western', zipCode: '00100', country: 'Sri Lanka' };
const token = user => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
async function request(method, url, user, body, headers = {}) {
  const response = await fetch(base + url, { method, headers: {
    ...(user ? { Authorization: 'Bearer ' + token(user) } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...headers
  }, body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined });
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  return { status: response.status, data };
}
before(async () => {
  replica = await MongoMemoryReplSet.create({ binary: { downloadDir: path.join(os.tmpdir(), 'platform-mongodb-test-binaries') }, replSet: { count: 1 } });
  const uri = replica.getUri();
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:/);
  await mongoose.connect(uri, { dbName: 'platform-priority-tests' });
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  sockets = require('../utils/socket').initSocket(server);
}, { timeout: 300000 });
beforeEach(async () => {
  assert.equal(mongoose.connection.name, 'platform-priority-tests');
  assert.equal(mongoose.connection.host, '127.0.0.1');
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  const roles = [['customer', 'Customer', 'customer'], ['other', 'Customer', 'customer'], ['admin', 'Admin', 'admin'], ['owner', 'Customer', 'owner'], ['tailor', 'Tailor', 'customer'], ['otherTailor', 'Tailor', 'customer']];
  people = {};
  for (const [name, type, role] of roles) people[name] = await User.create({ username: name, address: 'Test address', email: name + '@example.com', password: 'unused-test-password-hash', type, role });
});
after(async () => {
  if (sockets) await new Promise(resolve => sockets.close(resolve));
  if (server?.listening) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await mongoose.disconnect();
  if (replica) await replica.stop();
  for (const filename of uploaded) {
    assert.match(filename, /^image-[\w-]+\.png$/);
    fs.rmSync(path.join(__dirname, '..', 'uploads', filename), { force: true });
  }
});
async function design(user = people.customer) {
  return Design.create({ userId: user._id, clothingType: 'tshirt', nickname: 'My shirt', color: '#ffffff', size: 'M', quantity: 1, totalPrice: 0.01 });
}
async function fixtures() {
  const custom = await design();
  const product = await Product.create({ name: 'Ready-made shirt', price: 30, stock: 5, sizes: ['M'], colors: ['Blue'], status: 'active' });
  const outfit = await Outfit.create({ owner: people.owner._id, brand: 'Test', model: 'Suit', image: 'https://example.com/outfit.jpg', condition: 'Good', category: 'Suit', material: 'Cotton', color: 'Black', size: 'M', pricePerDay: 60, location: 'Colombo', description: 'Rental outfit' });
  const booking = await Booking.create({ outfit: outfit._id, user: people.customer._id, owner: people.owner._id, reservationDate: '2030-01-01', returnDate: '2030-01-03', price: 120, phone: '0771234567', email: 'test@example.com', document: 'test-only-document', status: 'confirmed' });
  const items = [{ kind: 'custom', id: String(custom._id), quantity: 1 }, { kind: 'product', id: String(product._id), quantity: 2, size: 'M', color: 'Blue' }, { kind: 'booking', id: String(booking._id), quantity: 1 }];
  return { custom, product, booking, items };
}
async function bodyFor(items, user = people.customer) {
  const quote = await request('POST', '/payment/quote', user, { items, shippingMethod: 'standard', giftWrap: false });
  assert.equal(quote.status, 200, JSON.stringify(quote.data));
  return { items, deliveryDetails: delivery, shippingMethod: 'standard', giftWrap: false, expectedTotal: quote.data.data.total };
}

test('administration requires authentication and an administrator role', async () => {
  for (const [method, route] of [['GET', '/users'], ['POST', '/clothing'], ['GET', '/payment'], ['GET', '/analytics/overview'], ['GET', '/supplier/suppliers'], ['GET', '/inventory'], ['POST', '/jobs']]) {
    assert.equal((await request(method, route, null, method === 'POST' ? {} : undefined)).status, 401, route);
    assert.equal((await request(method, route, people.customer, method === 'POST' ? {} : undefined)).status, 403, route);
  }
  assert.equal((await request('GET', '/users/' + people.other._id, people.customer)).status, 403);
  assert.equal((await request('GET', '/users/' + people.customer._id, people.customer)).status, 200);
  assert.equal((await request('POST', '/register', null, { username: 'forged', address: 'Test address', email: 'forged@example.com', password: 'Password123', type: 'Admin' })).status, 403);
});

test('recruitment websocket rejects unauthenticated visitors and customer accounts', async () => {
  async function connect(user) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(base.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket');
      const timer = setTimeout(() => { socket.close(); reject(new Error('Socket handshake timed out')); }, 5000);
      socket.onmessage = event => {
        const message = String(event.data);
        if (message.startsWith('0')) socket.send('40' + JSON.stringify(user ? { token: token(user) } : {}));
        else if (message.startsWith('40') || message.startsWith('44')) {
          clearTimeout(timer); socket.close(); resolve(message.startsWith('40'));
        }
      };
      socket.onerror = () => { clearTimeout(timer); socket.close(); reject(new Error('Websocket failed')); };
    });
  }
  assert.equal(await connect(null), false);
  assert.equal(await connect(people.customer), false);
  assert.equal(await connect(people.admin), true);
});

test('saved designs use server prices and enforce account ownership', async () => {
  const saved = await request('POST', '/cloth-customizer', people.customer, { userId: String(people.other._id), clothingType: 'tshirt', nickname: 'Priced shirt', color: '#ffffff', size: 'L', quantity: 2, totalPrice: 0.01 });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.data.totalPrice, 56);
  assert.equal(saved.data.data.userId, String(people.customer._id));
  assert.equal((await request('GET', '/cloth-customizer/' + saved.data.data._id, people.other)).status, 404);
  assert.equal((await request('PUT', '/cloth-customizer/' + saved.data.data._id, people.customer, { quantity: -1 })).status, 400);
});

test('installation branding is public to read, admin-only to edit, and persists across app instances', async () => {
  const defaults = await request('GET', '/site-settings', null);
  assert.equal(defaults.status, 200);
  assert.equal(defaults.data.data.name, 'Your Store');
  assert.equal((await request('PUT', '/site-settings', null, { name: 'New name' })).status, 401);
  assert.equal((await request('PUT', '/site-settings', people.customer, { name: 'New name' })).status, 403);
  const settings = { ...defaults.data.data, name: 'Thread & Needle', contactEmail: 'help@example.com', logoUrl: 'https://example.com/logo.png', primaryColor: '#334455', heroTitle: 'Make it yours' };
  const updated = await request('PUT', '/site-settings', people.admin, settings);
  assert.equal(updated.status, 200, JSON.stringify(updated.data));
  assert.deepEqual(updated.data.data, settings);
  const publicResponse = await request('GET', '/site-settings', null);
  assert.equal(publicResponse.data.data.name, 'Thread & Needle');
  assert.equal(publicResponse.data.data.updatedBy, undefined);
  assert.equal(publicResponse.data.data._id, undefined);
  const second = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => second.once('listening', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + second.address().port + '/site-settings');
    assert.equal((await response.json()).data.name, 'Thread & Needle');
  } finally { second.closeAllConnections(); await new Promise(resolve => second.close(resolve)); }
  const manifest = await fetch(base + '/site-settings/manifest.webmanifest', { headers: { Origin: 'http://localhost:3000' } });
  const metadata = await manifest.json();
  assert.equal(metadata.name, 'Thread & Needle');
  assert.equal(metadata.start_url, 'http://localhost:3000/');
  assert.equal(metadata.icons[0].src, 'https://example.com/logo.png');
  const emailBrand = await require('../services/siteSettingsService').getEmailBranding();
  assert.equal(emailBrand.name, 'Thread &amp; Needle');
});

test('buyers can retain the monochrome theme or explicitly select their custom brand colours', async () => {
  const initial = await request('GET', '/site-settings'); assert.equal(initial.data.data.appearanceMode, 'monochrome');
  const response = await request('PUT', '/site-settings', people.admin, { ...require('../config/siteDefaults'), appearanceMode: 'custom', primaryColor: '#333333', accentColor: '#eeeeee' });
  assert.equal(response.status, 200); assert.equal(response.data.data.appearanceMode, 'custom');
  assert.equal((await request('GET', '/site-settings')).data.data.appearanceMode, 'custom');
  assert.equal((await request('PUT', '/site-settings', people.admin, { appearanceMode: 'unknown' })).status, 400);
});

test('the buyer bootstrap creates a hashed admin account and never promotes an existing account', async () => {
  const { createAdmin } = require('../create-admin');
  const password = 'BuyerAdminTestPassword';
  const account = await createAdmin({ username: 'buyer-admin', email: 'buyer@example.com', address: 'Store address', password });
  assert.equal(account.type, 'Admin');
  assert.equal(account.role, 'admin');
  assert.notEqual(account.password, password);
  assert.equal(await require('bcryptjs').compare(password, account.password), true);
  await assert.rejects(createAdmin({ username: 'replacement', email: people.customer.email, address: 'Store address', password }), /already uses/);
  assert.equal((await User.findById(people.customer._id)).type, 'Customer');
});

test('branding settings reject unsafe URLs, invalid theme colors and unexpected configuration', async () => {
  for (const settings of [{ name: '' }, { logoUrl: 'javascript:alert(1)' }, { websiteUrl: 'data:text/html,unsafe' }, { primaryColor: 'red; background:url(x)' }, { socialLinks: { instagram: 'javascript:alert(1)' } }, { name: 'Store\nInjected header' }, { smtpPassword: 'should-not-be-accepted' }]) {
    assert.equal((await request('PUT', '/site-settings', people.admin, settings)).status, 400, JSON.stringify(settings));
  }
  assert.equal((await request('GET', '/site-settings', null)).data.data.name, 'Your Store');
});

test('an admin can publish its own logo without exposing another customer artwork', async () => {
  async function upload(user) {
    const form = new FormData();
    form.append('image', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVqkAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'logo.png');
    const response = await request('POST', '/upload/image', user, form);
    assert.equal(response.status, 200); uploaded.push(response.data.data.filename);
    return response.data.data.url;
  }
  const privateArtwork = await upload(people.customer), logoUrl = await upload(people.admin);
  assert.equal((await request('PUT', '/site-settings', people.admin, { logoUrl: privateArtwork })).status, 403);
  assert.equal((await request('PUT', '/site-settings', people.admin, { logoUrl: base + privateArtwork })).status, 403);
  assert.equal((await request('GET', logoUrl, null)).status, 401);
  assert.equal((await request('PUT', '/site-settings', people.admin, { name: 'Buyer store', logoUrl })).status, 200);
  assert.equal((await request('GET', logoUrl, null)).status, 200);
  assert.equal((await request('GET', privateArtwork, null)).status, 401);
  assert.equal((await request('PUT', '/site-settings', people.admin, { name: 'Buyer store', logoUrl: '' })).status, 200);
  assert.equal((await request('GET', logoUrl, null)).status, 401);
});

test('mixed cash checkout preserves snapshots, creates production, reserves stock and is idempotent', async () => {
  const f = await fixtures(), body = await bodyFor(f.items), key = 'mixed-checkout-idempotency-key';
  body.userId = String(people.other._id); body.orderDetails = { total: 0.01 };
  const response = await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': key });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.data.totalOrders, 3);
  assert.equal(await Payment.countDocuments(), 1); assert.equal(await Order.countDocuments(), 3); assert.equal(await Production.countDocuments(), 1);
  assert.equal((await Product.findById(f.product._id)).stock, 3);
  assert.equal((await Booking.findById(f.booking._id)).paymentStatus, 'pending');
  assert.equal((await Design.findById(f.custom._id)).inCart, false);
  assert.equal((await Payment.findOne()).userId.toString(), people.customer._id.toString());
  const order = await Order.findOne({ itemType: 'custom' });
  assert.equal(order.itemSnapshot.unitPrice, 25);
  const production = await Production.findOne(); assert.equal(String(production.salesOrderId), String(order._id));
  const replay = await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': key });
  assert.equal(replay.status, 200); assert.equal(replay.data.data.replayed, true);
  assert.equal(await Order.countDocuments(), 3); assert.equal((await Product.findById(f.product._id)).stock, 3);
  assert.equal((await request('DELETE', '/cloth-customizer/' + f.custom._id, people.customer)).status, 200);
  assert.equal((await Order.findById(order._id)).itemSnapshot.design.nickname, 'My shirt');
  const mine = await request('GET', '/orders/my', people.customer);
  assert.equal(mine.status, 200); assert.equal(mine.data.data.length, 3);
});

test('a failed production write rolls back the entire checkout', async () => {
  const f = await fixtures(); const items = [f.items[1], f.items[0], f.items[2]], body = await bodyFor(items);
  const original = Production.create;
  Production.create = async () => { throw new Error('Injected persistence failure'); };
  try { assert.equal((await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'rollback-checkout-attempt' })).status, 500); }
  finally { Production.create = original; }
  assert.equal(await Payment.countDocuments(), 0); assert.equal(await Order.countDocuments(), 0);
  assert.equal((await Product.findById(f.product._id)).stock, 5);
  assert.equal((await Design.findById(f.custom._id)).inCart, true);
});

test('checkout rejects stale totals, unsupported card payments and another customer booking', async () => {
  const f = await fixtures(), body = await bodyFor(f.items);
  const headers = { 'Idempotency-Key': 'validation-checkout-attempt' };
  assert.equal((await request('POST', '/payment', people.customer, { ...body, expectedTotal: 0.01 }, headers)).status, 409);
  assert.equal((await request('POST', '/payment', people.customer, { ...body, paymentMethod: 'card', paymentDetails: { cardDetails: { cvv: '123' } } }, headers)).status, 400);
  assert.equal((await request('POST', '/payment/quote', people.other, { items: [f.items[2]] })).status, 404);
  assert.equal(await Payment.countDocuments(), 0);
});

test('production routes enforce assignment and status transitions while retaining payment state', async () => {
  const item = await design(), body = await bodyFor([{ kind: 'custom', id: String(item._id), quantity: 1 }]);
  assert.equal((await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'production-checkout-attempt' })).status, 201);
  const production = await Production.findOne(), tailor = await Tailor.create({ userId: people.tailor._id, name: 'Assigned tailor' });
  await Tailor.create({ userId: people.otherTailor._id, name: 'Other tailor' });
  assert.equal((await request('PATCH', '/api/custom-orders/' + production._id + '/assign', people.customer, { tailorId: String(tailor._id) })).status, 403);
  assert.equal((await request('PATCH', '/api/custom-orders/' + production._id + '/assign', people.admin, { tailorId: String(tailor._id) })).status, 200);
  assert.equal((await request('GET', '/api/custom-orders/assigned', people.tailor)).data.data.length, 1);
  assert.equal((await request('GET', '/api/custom-orders/' + production._id, people.other)).status, 404);
  assert.equal((await request('PATCH', '/api/custom-orders/' + production._id + '/status', people.otherTailor, { status: 'accepted' })).status, 403);
  assert.equal((await request('PATCH', '/api/custom-orders/' + production._id + '/status', people.tailor, { status: 'delivered' })).status, 409);
  for (const status of ['accepted', 'in_progress', 'completed', 'delivered']) assert.equal((await request('PATCH', '/api/custom-orders/' + production._id + '/status', people.tailor, { status })).status, 200);
  const order = await Order.findOne(); assert.equal(order.fulfillmentStatus, 'delivered'); assert.equal(order.paymentStatus, 'pending');
  assert.equal((await request('PATCH', '/payment/' + order.PaymentID + '/status', people.admin, { status: 'completed' })).status, 200);
  assert.equal((await Order.findOne()).paymentStatus, 'completed');
});

test('cash cancellation restores inventory once and releases rental payment arrangements', async () => {
  const f = await fixtures(), body = await bodyFor(f.items);
  const placed = await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'cancel-checkout-attempt' });
  assert.equal(placed.status, 201);
  const endpoint = '/payment/' + placed.data.data.paymentId;
  assert.equal((await request('DELETE', endpoint, people.customer)).status, 403);
  assert.equal((await request('DELETE', endpoint, people.admin)).status, 200);
  assert.equal((await request('DELETE', endpoint, people.admin)).status, 200);
  assert.equal((await Product.findById(f.product._id)).stock, 5);
  assert.equal((await Booking.findById(f.booking._id)).paymentStatus, 'unpaid');
  assert.equal((await Production.findOne()).status, 'cancelled');
  assert.equal(await Order.countDocuments(), 3);
});

test('only the owning outfit owner can record cash collection', async () => {
  const f = await fixtures(), body = await bodyFor([f.items[2]]);
  assert.equal((await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'collection-checkout-attempt' })).status, 201);
  const endpoint = '/api/booking/' + f.booking._id + '/record-payment';
  assert.equal((await request('POST', endpoint, people.customer, {})).status, 403);
  assert.equal((await request('POST', endpoint, people.owner, {})).status, 200);
  assert.equal((await Booking.findById(f.booking._id)).paymentStatus, 'paid');
  assert.equal((await Payment.findOne()).status, 'completed');
});

test('partial cash collection blocks cancellation and admin receipt preserves fulfillment', async () => {
  const f = await fixtures(), body = await bodyFor(f.items);
  const placed = await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'partial-cash-checkout-attempt' });
  assert.equal(placed.status, 201);
  assert.equal((await request('POST', '/api/booking/' + f.booking._id + '/record-payment', people.owner, {})).status, 200);
  const payment = await Payment.findOne();
  assert.equal(payment.status, 'processing');
  assert.equal((await request('DELETE', '/payment/' + payment._id, people.admin)).status, 409);
  assert.equal((await Booking.findById(f.booking._id)).paymentStatus, 'paid');
  assert.equal((await Product.findById(f.product._id)).stock, 3);
  assert.equal((await request('PATCH', '/payment/' + payment._id + '/status', people.admin, { status: 'completed' })).status, 200);
  assert.equal((await Order.findOne({ itemType: 'custom' })).fulfillmentStatus, 'pending');
  const stats = await request('GET', '/payment/statistics', people.admin);
  assert.equal(stats.status, 200);
  assert.equal(stats.data.data.totalRevenue, payment.orderDetails.total);
  assert.equal(stats.data.data.averageOrderValue, payment.orderDetails.total);
  assert.equal(stats.data.data.statusDistribution.completed, 1);
});

test('archiving a purchased product preserves its stock record for cancellation', async () => {
  const f = await fixtures(), body = await bodyFor([f.items[1]]);
  const placed = await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'archive-stock-checkout-attempt' });
  assert.equal(placed.status, 201);
  assert.equal((await request('DELETE', '/clothing/' + f.product._id, people.admin)).status, 200);
  assert.equal((await Product.findById(f.product._id)).status, 'archived');
  assert.equal((await request('GET', '/clothing/' + f.product._id, null)).status, 404);
  assert.equal((await request('DELETE', '/payment/' + placed.data.data.paymentId, people.admin)).status, 200);
  assert.equal((await Product.findById(f.product._id)).stock, 5);
});

test('product fulfillment progresses independently from cash and blocks late cancellation', async () => {
  const f = await fixtures(), body = await bodyFor([f.items[1]]);
  const placed = await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'fulfillment-checkout-attempt' });
  assert.equal(placed.status, 201);
  const order = await Order.findOne(), endpoint = '/orders/' + order._id + '/fulfillment';
  assert.equal((await request('PATCH', endpoint, people.customer, { status: 'in_progress' })).status, 403);
  assert.equal((await request('PATCH', endpoint, people.admin, { status: 'delivered' })).status, 409);
  assert.equal((await request('PATCH', endpoint, people.admin, { status: 'in_progress' })).status, 200);
  assert.equal((await request('DELETE', '/payment/' + placed.data.data.paymentId, people.admin)).status, 409);
  assert.equal((await request('PATCH', endpoint, people.admin, { status: 'completed' })).status, 200);
  assert.equal((await request('PATCH', endpoint, people.admin, { status: 'delivered' })).status, 200);
  assert.equal((await Order.findById(order._id)).paymentStatus, 'pending');
});

test('static admin routes are reachable before parameter routes', async () => {
  assert.equal((await request('GET', '/inventory/export-csv', people.admin)).status, 200);
  assert.equal((await request('GET', '/api/booking/upcoming-returns', people.owner)).status, 200);
});

test('owner reports are scoped to the authenticated owner even when another owner is requested', async () => {
  const f = await fixtures();
  await Booking.create({ outfit: f.booking.outfit, user: people.other._id, owner: people.other._id, reservationDate: '2030-02-01', returnDate: '2030-02-03', price: 500, phone: '0771234567', email: 'other@example.com', document: 'test-only-document', status: 'confirmed' });
  assert.equal((await request('GET', '/api/booking/owner/report', people.customer)).status, 403);
  const result = await request('GET', '/api/booking/owner/report?owner=' + people.other._id, people.owner);
  assert.equal(result.status, 200);
  assert.equal(result.data.reportData.summary.totalBookings, 1);
  assert.equal(result.data.reportData.bookings[0]._id, String(f.booking._id));
  assert.equal(result.data.reportData.bookings[0].user.password, undefined);
});

test('private artwork cannot be accessed or reused by another account', async () => {
  const form = new FormData();
  form.append('image', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVqkAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'test.png');
  const upload = await request('POST', '/upload/image', people.customer, form);
  assert.equal(upload.status, 200, JSON.stringify(upload.data)); uploaded.push(upload.data.data.filename);
  const url = upload.data.data.url;
  assert.equal((await request('GET', url, null)).status, 401);
  assert.equal((await request('GET', url, people.other)).status, 404);
  assert.equal((await request('GET', url, people.customer)).status, 200);
  const body = { clothingType: 'tshirt', color: '#ffffff', size: 'M', quantity: 1, selectedDesign: { id: 'uploaded', preview: url, isCustomUpload: true } };
  assert.equal((await request('POST', '/cloth-customizer', people.other, body)).status, 403);
  assert.equal((await request('POST', '/cloth-customizer', people.customer, body)).status, 201);
});

const studioInput = () => ({ designVersion: 2, clothingType: 'tshirt', nickname: 'Four-sided original', color: '#263238', size: 'L', quantity: 2,
  panelColors: { front: '#263238', back: '#880e4f', leftSleeve: '#263238', rightSleeve: '#4db6ac' }, trimColor: '#ffffff',
  placedDesigns: ['front','back','leftSleeve','rightSleeve'].map((side, index) => ({ id: 1, layerId: 'art-' + index, side, preview: '/static/media/print-1.test.jpg', price: .01, mode: index === 0 ? 'half-left' : 'repeat', rotation: 27, repeat: 4, size: 95, position: { x: 20, y: -10 } })),
  lettering: [{ layerId: 'message', side: 'back', text: 'My own idea', color: '#ffffff', font: 'mono', size: 10, rotation: -4, position: { x: 0, y: 30 } }], totalPrice: .01 });

test('studio designs persist every panel and use server prices for all artwork and lettering', async () => {
  await require('../models/CustomizerPricesModel').create({ ...require('../config/commerce').defaultPrices, customTextPrice: 2.5 });
  const response = await request('POST', '/cloth-customizer', people.customer, studioInput());
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const saved = response.data.data;
  assert.equal(saved.totalPrice, 181); // (25 base + 3 size + 4 x 15 artwork + 2.50 text) x 2
  assert.equal(saved.designVersion, 2); assert.equal(saved.placedDesigns.length, 4);
  assert.equal(saved.panelColors.back, '#880e4f'); assert.equal(saved.trimColor, '#ffffff');
  assert.equal(saved.placedDesigns[0].mode, 'half-left'); assert.equal(saved.placedDesigns[3].rotation, 27);
  assert.equal(saved.placedDesigns[1].repeat, 4); assert.equal(saved.lettering[0].font, 'mono');
  const updated = await request('PUT', '/cloth-customizer/' + saved._id, people.customer, { lettering: [], placedDesigns: [], quantity: 1 });
  assert.equal(updated.status, 200); assert.equal(updated.data.data.totalPrice, 28); assert.equal(updated.data.data.selectedDesign, null);
});

test('studio validation rejects unsupported panels, duplicate layers, invalid transforms and excessive artwork', async () => {
  const cases = [
    input => { input.placedDesigns[1].side = 'hood'; },
    input => { input.placedDesigns[1].layerId = input.placedDesigns[0].layerId; },
    input => { input.placedDesigns[0].rotation = 999; },
    input => { input.placedDesigns[0].repeat = 0; },
    input => { input.panelColors.back = 'red'; },
    input => { input.lettering[0].side = 'leftSleeve'; },
    input => { input.lettering[0].text = 'a'.repeat(41); },
    input => { input.placedDesigns = Array.from({length: 9}, (_, index) => ({ ...input.placedDesigns[0], layerId: 'art-' + index })); }
  ];
  for (const mutate of cases) { const input = studioInput(); mutate(input); assert.equal((await request('POST', '/cloth-customizer', people.customer, input)).status, 400); }
  assert.equal(await Design.countDocuments(), 0);
});

test('back artwork stays private and survives checkout as an immutable production snapshot', async () => {
  const form = new FormData();
  form.append('image', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVqkAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'test.png');
  const upload = await request('POST', '/upload/image', people.customer, form); assert.equal(upload.status, 200); uploaded.push(upload.data.data.filename);
  const url = upload.data.data.url, input = studioInput();
  input.placedDesigns[1] = { ...input.placedDesigns[1], preview: url, isCustomUpload: true };
  assert.equal((await request('POST', '/cloth-customizer', people.other, input)).status, 403);
  const saved = await request('POST', '/cloth-customizer', people.customer, input); assert.equal(saved.status, 201, JSON.stringify(saved.data));
  const body = await bodyFor([{ kind: 'custom', id: saved.data.data._id, quantity: 2 }]);
  assert.equal((await request('POST', '/payment', people.customer, body, { 'Idempotency-Key': 'studio-snapshot-checkout-test' })).status, 201);
  const production = await Production.findOne(), tailor = await Tailor.create({ userId: people.tailor._id, name: 'Studio tailor' });
  assert.equal((await request('PATCH', '/api/custom-orders/' + production._id + '/assign', people.admin, { tailorId: String(tailor._id) })).status, 200);
  await request('DELETE', '/cloth-customizer/' + saved.data.data._id, people.customer);
  const snapshot = (await Order.findOne()).itemSnapshot;
  assert.equal(snapshot.designVersion, 2); assert.equal(snapshot.design.panelColors.back, '#880e4f'); assert.equal(snapshot.design.lettering[0].text, 'My own idea');
  assert.equal(production.design.designMeta.placedDesigns[1].preview, url);
  assert.equal((await request('GET', url, people.tailor)).status, 200);
  assert.equal((await request('GET', url, people.otherTailor)).status, 404);
});

test('concurrent checkout cannot oversell the last item', async () => {
  const product = await Product.create({ name: 'Last shirt', price: 10, stock: 1, status: 'active' });
  const items = [{ kind: 'product', id: String(product._id), quantity: 1 }];
  const a = await bodyFor(items, people.customer), b = await bodyFor(items, people.other);
  const results = await Promise.all([
    request('POST', '/payment', people.customer, a, { 'Idempotency-Key': 'last-item-customer-attempt' }),
    request('POST', '/payment', people.other, b, { 'Idempotency-Key': 'last-item-other-attempt' })
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  assert.equal((await Product.findById(product._id)).stock, 0);
  assert.equal(await Payment.countDocuments(), 1); assert.equal(await Order.countDocuments(), 1);
});

test('concurrent reservations for the same outfit dates create one booking', async () => {
  const { booking, items } = await fixtures();
  await Booking.deleteMany({});
  const body = { outfit: String(booking.outfit), reservationDate: '2030-03-01', returnDate: '2030-03-03', phone: '0771234567', email: 'test@example.com' };
  const service = require('../services/bookingService');
  const results = await Promise.allSettled([
    service.create(people.customer, body, { path: 'isolated-test-document' }),
    service.create(people.other, body, { path: 'isolated-test-document' })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
  assert.equal(await Booking.countDocuments(), 1);
  assert.ok(items.length);
});

test('legacy card fields are excluded from payment responses', async () => {
  const document = { userId: people.customer._id, status: 'pending', paymentDetails: { method: 'card', cardDetails: { cardNumber: 'sensitive-test-value', cvv: '123' } }, orderDetails: { total: 20 }, createdAt: new Date() };
  const { insertedId } = await Payment.collection.insertOne(document);
  const mine = await request('GET', '/payment/' + insertedId, people.customer);
  assert.equal(mine.status, 200); assert.equal(mine.data.data.paymentDetails.cardDetails, undefined);
  const all = await request('GET', '/payment', people.admin);
  assert.equal(all.status, 200); assert.equal(all.data.data[0].paymentDetails.cardDetails, undefined);
  assert.equal((await request('GET', '/payment/' + insertedId, people.other)).status, 404);
});

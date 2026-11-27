const mongoose = require('mongoose');
const { createHash, randomUUID } = require('crypto');
const HttpError = require('../utils/HttpError');
const pricing = require('./pricingService');
const { taxRate } = require('../config/commerce');
const { normalizeStatus } = require('../config/production');
const defaults = {
  Design: require('../models/ClothCustomizerModel'), Product: require('../models/ClothingItemModel'),
  Booking: require('../models/Booking'), Outfit: require('../models/Outfit'),
  Payment: require('../models/PaymentDetailsModel'), Order: require('../models/OrderModel'),
  Production: require('../models/CustomOrder'), History: require('../models/OrderStatus')
};
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const clone = value => JSON.parse(JSON.stringify(value));

function normalizeItems(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100) throw new HttpError(400, 'Your cart must contain between 1 and 100 items');
  const seen = new Set();
  return input.map(item => {
    if (!item || !['custom', 'product', 'booking'].includes(item.kind) || !validId(item.id)) throw new HttpError(400, 'Invalid cart item');
    const result = { kind: item.kind, id: item.id.toLowerCase(), quantity: pricing.quantity(item.quantity ?? 1) };
    if (item.kind === 'booking' && result.quantity !== 1) throw new HttpError(400, 'Rental bookings cannot have multiple quantities');
    for (const field of ['size', 'color']) if (item[field] != null) {
      if (typeof item[field] !== 'string' || item[field].length > 50) throw new HttpError(400, 'Invalid item option');
      result[field] = item[field];
    }
    const key = [result.kind, result.id, result.size, result.color].join(':');
    if (seen.has(key)) throw new HttpError(400, 'Duplicate cart item');
    seen.add(key);
    return result;
  });
}
function deliveryDetails(input = {}, collection = false) {
  const limits = { firstName: 50, lastName: 50, email: 254, phone: 25, address: 200, city: 50, state: 50, zipCode: 10, country: 50 };
  const result = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (collection && ['address', 'city', 'state', 'zipCode', 'country'].includes(key) && !input[key]) continue;
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].trim().length > limit) throw new HttpError(400, 'A valid ' + key + ' is required');
    result[key] = input[key].trim();
  }
  result.email = result.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new HttpError(400, 'Invalid email address');
  if (!/^\+?[\d\s()-]{10,25}$/.test(result.phone) || result.phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'Invalid phone number');
  return result;
}
async function runTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } catch (error) {
    if (error.code === 20 || /Transaction numbers are only allowed|does not support retryable writes/i.test(error.message)) {
      throw new HttpError(503, 'Checkout requires a MongoDB replica set or Atlas cluster with transaction support');
    }
    throw error;
  } finally { await session.endSession(); }
}

function createCheckoutService({ models = defaults, transaction = runTransaction, getPrices = pricing.getPrices } = {}) {
  const read = (Model, id, session) => {
    const query = Model.findById(id);
    return session ? query.session(session) : query;
  };
  async function quote(userId, request, session) {
    const items = normalizeItems(request.items), prices = await getPrices(session), snapshots = [];
    for (const item of items) {
      if (item.kind === 'custom') {
        const design = await read(models.Design, item.id, session);
        if (!design || String(design.userId) !== String(userId)) throw new HttpError(404, 'Custom design not found');
        if (design.inCart === false) throw new HttpError(409, 'This design is no longer in your cart');
        const calculated = pricing.priceCustomization({ ...(design.toObject ? design.toObject() : design), quantity: item.quantity }, prices);
        snapshots.push({ kind: 'custom', sourceId: design._id, name: calculated.design.nickname,
          quantity: item.quantity, unitPrice: calculated.unitPrice, totalPrice: calculated.design.totalPrice,
          size: calculated.design.size, color: calculated.design.color, designVersion: calculated.design.designVersion,
          imageUrl: calculated.design.selectedDesign?.preview, design: clone(calculated.design) });
      } else if (item.kind === 'product') {
        const product = await read(models.Product, item.id, session);
        if (!product || product.status !== 'active') throw new HttpError(404, 'Clothing item is not available');
        for (const field of ['size', 'color']) {
          const options = product[field === 'size' ? 'sizes' : 'colors'] || [];
          if (options.length && !options.includes(item[field])) throw new HttpError(400, 'Select an available ' + field + ' for ' + product.name);
        }
        const variant = product.variants?.length ? product.variants.find(v => (!v.size || v.size === item.size) && (!v.color || v.color === item.color)) : null;
        if (product.variants?.length && !variant) throw new HttpError(400, 'This clothing variation is not available');
        if (product.stock < item.quantity || (variant && variant.stock < item.quantity)) throw new HttpError(409, 'Not enough stock for ' + product.name);
        const unitPrice = pricing.priceValue(Number(product.price) + Number(variant?.priceDelta || 0));
        snapshots.push({ kind: 'product', sourceId: product._id, name: product.name, quantity: item.quantity,
          size: item.size, color: item.color, variantId: variant?._id, imageUrl: product.imageUrl,
          unitPrice, totalPrice: pricing.money(unitPrice * item.quantity) });
      } else {
        const booking = await read(models.Booking, item.id, session);
        if (!booking || String(booking.user) !== String(userId)) throw new HttpError(404, 'Booking not found');
        if (booking.status !== 'confirmed') throw new HttpError(409, 'Only confirmed bookings can be checked out');
        if (['pending', 'paid'].includes(booking.paymentStatus)) throw new HttpError(409, 'This booking already has a payment arrangement');
        const outfit = await read(models.Outfit, String(booking.outfit), session);
        if (!outfit) throw new HttpError(404, 'Rental outfit not found');
        snapshots.push({ kind: 'booking', sourceId: booking._id, name: outfit.brand + ' ' + outfit.model, quantity: 1,
          unitPrice: pricing.priceValue(booking.price), totalPrice: pricing.priceValue(booking.price),
          size: outfit.size, color: outfit.color, imageUrl: outfit.image,
          rentalPeriod: { reservationDate: booking.reservationDate, returnDate: booking.returnDate } });
      }
    }
    return { items: snapshots, ...pricing.totals(snapshots, request.shippingMethod, request.giftWrap ?? false) };
  }
  async function existingCheckout(userId, key, fingerprint) {
    const payment = await models.Payment.findOne({ userId, checkoutKey: key }).select('+requestFingerprint');
    if (!payment) return null;
    if (payment.requestFingerprint !== fingerprint) throw new HttpError(409, 'This checkout key was already used for a different order');
    const orders = await models.Order.find({ PaymentID: String(payment._id), AdminID: userId });
    return { paymentId: payment._id, status: payment.status, total: payment.orderDetails.total,
      orders: orders.map(order => ({ orderId: order.OrderID, _id: order._id, itemName: order.itemSnapshot?.name, quantity: order.quantity, price: order.Price })),
      totalOrders: orders.length, replayed: true };
  }
  async function checkout(userId, request, key) {
    if (typeof key !== 'string' || !/^[\w-]{16,128}$/.test(key)) throw new HttpError(400, 'A valid Idempotency-Key header is required');
    const items = normalizeItems(request.items);
    const shippingMethod = items.every(item => item.kind === 'booking') ? 'collection' : request.shippingMethod || 'standard';
    if (typeof request.expectedTotal !== 'number' || !Number.isFinite(request.expectedTotal)) throw new HttpError(400, 'Review the checkout quote before placing your order');
    const normalized = {
      items, deliveryDetails: deliveryDetails(request.deliveryDetails, shippingMethod === 'collection'),
      shippingMethod, giftWrap: request.giftWrap ?? false, expectedTotal: request.expectedTotal,
      giftMessage: String(request.giftMessage || '').trim().slice(0, 500)
    };
    if (request.paymentDetails?.cardDetails || (request.paymentMethod && !['cash_on_delivery', 'cash_on_collection'].includes(request.paymentMethod))) {
      throw new HttpError(400, 'Only cash on delivery or collection is available');
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const replay = await existingCheckout(userId, key, fingerprint);
    if (replay) return replay;
    try {
      return await transaction(async session => {
        const calculated = await quote(userId, normalized, session);
        if (pricing.money(normalized.expectedTotal) !== calculated.total) throw new HttpError(409, 'Prices have changed. Please review the updated total before placing your order.');
        const [payment] = await models.Payment.create([{
          userId, checkoutKey: key, requestFingerprint: fingerprint, deliveryDetails: normalized.deliveryDetails,
          shippingDetails: { method: calculated.shippingMethod, cost: calculated.shipping },
          paymentDetails: { method: calculated.shippingMethod === 'collection' ? 'cash_on_collection' : 'cash_on_delivery' },
          orderDetails: { subtotal: calculated.subtotal, tax: calculated.tax, giftWrap: calculated.giftWrap,
            giftWrapFee: calculated.giftWrapFee, total: calculated.total, cartItems: calculated.items },
          giftMessage: normalized.giftMessage, status: 'pending'
        }], { session });
        const orders = [];
        for (const item of calculated.items) {
          if (item.kind === 'product') {
            const filter = { _id: item.sourceId, status: 'active', stock: { $gte: item.quantity } }, increment = { stock: -item.quantity };
            if (item.variantId) {
              filter.variants = { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } } };
              increment['variants.$.stock'] = -item.quantity;
            }
            const reserved = await models.Product.updateOne(filter, { $inc: increment }, { session });
            if (reserved.modifiedCount !== 1) throw new HttpError(409, 'Stock changed for ' + item.name + '; please review your cart');
          } else if (item.kind === 'booking') {
            const reserved = await models.Booking.updateOne({ _id: item.sourceId, user: userId, status: 'confirmed', paymentStatus: { $nin: ['pending', 'paid'] } },
              { $set: { paymentStatus: 'pending', paymentMethod: 'cash_on_collection', paymentId: payment._id, collectionAmount: pricing.money(item.totalPrice + pricing.money(item.totalPrice * taxRate)) } }, { session });
            if (reserved.modifiedCount !== 1) throw new HttpError(409, 'Booking payment arrangement changed; please refresh');
          } else {
            const reserved = await models.Design.updateOne({ _id: item.sourceId, userId, inCart: { $ne: false } }, { $set: { inCart: false } }, { session });
            if (reserved.modifiedCount !== 1) throw new HttpError(409, 'Your customization cart changed; please refresh');
          }
          const [order] = await models.Order.create([{
            OrderID: 'ORD-' + randomUUID(), AdminID: userId, PaymentID: String(payment._id), ItemID: String(item.sourceId),
            DesignID: item.kind === 'custom' ? item.sourceId : undefined, ProductID: item.kind === 'product' ? item.sourceId : undefined,
            BookingID: item.kind === 'booking' ? item.sourceId : undefined, itemType: item.kind, itemSnapshot: clone(item),
            quantity: item.quantity, Price: item.totalPrice,
            CustomerName: normalized.deliveryDetails.firstName + ' ' + normalized.deliveryDetails.lastName,
            status: 'pending', paymentStatus: 'pending', fulfillmentStatus: 'pending'
          }], { session });
          if (item.kind === 'custom') {
            const [production] = await models.Production.create([{
              customerId: userId, sourceDesignId: item.sourceId, salesOrderId: order._id, paymentId: payment._id,
              config: { clothingType: item.design.clothingType, size: item.size, color: item.color, quantity: item.quantity, notes: item.name },
              design: { designImageUrl: item.imageUrl, designMeta: clone(item.design) },
              previewGallery: item.imageUrl ? [item.imageUrl] : [], price: item.totalPrice, status: 'pending'
            }], { session });
            await models.Order.updateOne({ _id: order._id }, { $set: { CustomOrderID: production._id } }, { session });
            await models.History.create([{ customOrderId: production._id, clothCustomizerId: item.sourceId, status: 'pending', createdBy: userId }], { session });
          }
          orders.push({ orderId: order.OrderID, _id: order._id, itemName: item.name, quantity: item.quantity, price: item.totalPrice });
        }
        return { paymentId: payment._id, status: 'pending', total: calculated.total, orders, totalOrders: orders.length, replayed: false };
      });
    } catch (error) {
      if (error.code === 11000) { const previous = await existingCheckout(userId, key, fingerprint); if (previous) return previous; }
      throw error;
    }
  }
  async function updatePaymentStatus(id, status, actorId) {
    if (!validId(id) || !['processing', 'completed', 'cancelled'].includes(status)) throw new HttpError(400, 'Invalid payment status');
    return transaction(async session => {
      const payment = await read(models.Payment, id, session);
      if (!payment) throw new HttpError(404, 'Payment not found');
      if (payment.status === status) return payment;
      if (!['pending', 'processing'].includes(payment.status)) throw new HttpError(409, 'This payment can no longer be changed');
      const orders = await models.Order.find({ PaymentID: id }).session(session);
      if (status === 'cancelled') {
        if (orders.some(order => order.paymentStatus === 'completed')) throw new HttpError(409, 'Cash has already been received for part of this order. A received payment cannot be cancelled.');
        const paidBooking = await models.Booking.exists({ paymentId: payment._id, paymentStatus: 'paid' }).session(session);
        if (paidBooking) throw new HttpError(409, 'Cash has already been received for a rental in this order.');
        for (const order of orders) {
          if (normalizeStatus(order.fulfillmentStatus || 'pending') !== 'pending') throw new HttpError(409, 'An order is already in production or fulfilled');
          const item = order.itemSnapshot;
          if (item?.kind === 'product') {
            const filter = { _id: item.sourceId }, increment = { stock: item.quantity };
            if (item.variantId) { filter['variants._id'] = item.variantId; increment['variants.$.stock'] = item.quantity; }
            await models.Product.updateOne(filter, { $inc: increment }, { session });
          }
          if (item?.kind === 'booking') await models.Booking.updateOne({ _id: item.sourceId, paymentId: payment._id },
            { $set: { paymentStatus: 'unpaid' }, $unset: { paymentId: 1, paymentMethod: 1, collectionAmount: 1 } }, { session });
        }
        const productions = await models.Production.find({ paymentId: payment._id }).session(session);
        await models.Production.updateMany({ paymentId: payment._id }, { $set: { status: 'cancelled' } }, { session });
        for (const production of productions) {
          await models.History.create([{ customOrderId: production._id, clothCustomizerId: production.sourceDesignId, status: 'cancelled', createdBy: actorId || payment.userId, note: 'Cash payment arrangement cancelled' }], { session });
        }
      } else if (status === 'completed') {
        await models.Booking.updateMany({ paymentId: payment._id }, { $set: { paymentStatus: 'paid' } }, { session });
      }
      await models.Payment.updateOne({ _id: id, status: payment.status }, { $set: { status }, $unset: { 'paymentDetails.cardDetails': 1 } }, { session });
      const changes = { paymentStatus: status === 'processing' ? 'pending' : status };
      if (status === 'cancelled') Object.assign(changes, { status: 'cancelled', fulfillmentStatus: 'cancelled' });
      await models.Order.updateMany({ PaymentID: id }, { $set: changes }, { session });
      payment.status = status;
      return payment;
    });
  }
  return { quote, checkout, updatePaymentStatus };
}
module.exports = { ...createCheckoutService(), createCheckoutService, normalizeItems, deliveryDetails, runTransaction };

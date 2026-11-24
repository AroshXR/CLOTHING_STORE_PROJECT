const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    OrderID: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    CreatedAt: {
        type: Date,
        default: Date.now
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    PaymentID: {
        type: String,
        required: true,
        trim: true
    },
    DesignID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClothCustomizer',
        required: function () { return this.itemType === 'custom'; }
    },
    Price: {
        type: Number,
        required: true,
        min: 0
    },
    AdminID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Made optional in case user is not logged in
    },
    ItemID: {
        type: String,
        required: true,
        trim: true
    },
    CustomerName: {
        type: String,
        required: false,
        trim: true,
        maxlength: 120
    },
    status: {
        type: String,
        enum: ["pending", "processing", "completed", "cancelled", "failed"],
        default: "pending"
    },
    itemType: { type: String, enum: ['custom', 'product', 'booking'], default: 'custom' },
    ProductID: { type: Schema.Types.ObjectId, ref: 'ClothingItem' },
    BookingID: { type: Schema.Types.ObjectId, ref: 'Booking' },
    CustomOrderID: { type: Schema.Types.ObjectId, ref: 'CustomOrder' },
    itemSnapshot: { type: require('./schemas/OrderItemSnapshot'), immutable: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'cancelled', 'failed'], default: 'pending' },
    fulfillmentStatus: { type: String, enum: ['pending', 'assigned', 'accepted', 'in_progress', 'completed', 'delivered', 'cancelled'], default: 'pending' }
});

module.exports = mongoose.model(
    "Order",
    orderSchema
);



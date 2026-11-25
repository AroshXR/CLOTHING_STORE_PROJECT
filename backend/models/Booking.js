const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema({
    outfit: {type: ObjectId, ref: "Outfit", required : true },  // WHAT is being rented
    user: {type: ObjectId, ref: "User", required : true },  // WHO is renting
    owner: {type: ObjectId, ref: "User", required : true },  // WHO owns the outfit
    reservationDate: {type: Date,required:true},
    returnDate: {type: Date, required: true},
    status : {type: String, enum: ["pending", "confirmed" , "cancelled"], default:"pending"},
    price: {type: Number, required: true, min: 0},
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid'], default: 'unpaid' },
    paymentId: { type: ObjectId, ref: 'PaymentDetails' },
    paymentMethod: { type: String, enum: ['cash_on_collection'] },
    collectionAmount: { type: Number, min: 0 },
    phone: {type: String, required: true},
    email: {type: String, required: true},
    document: {type: String, required: true} // Path to uploaded document  (from multer)


}, { timestamps: true });

bookingSchema.index({ outfit: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema );

module.exports = Booking;

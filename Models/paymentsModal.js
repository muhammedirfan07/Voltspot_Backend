// paymentsModal.js — UPDATED
// Changes:
//   1. Added "refunded" to status enum (cancelBooking sets this)
//   2. paymentDate now defaults to Date.now and is no longer required
//      (webhook writes the doc without a manual paymentDate)

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "evstations",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,   // ← was required:true, now defaults to now
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      // ← added "refunded" — cancelBooking sets payment.status = "refunded"
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Payments = mongoose.model("Payments", paymentSchema);
module.exports = Payments;
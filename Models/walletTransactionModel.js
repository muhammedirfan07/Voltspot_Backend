const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  type:      { type: String, enum: ["credit", "debit"], required: true },
  amount:    { type: Number, required: true },
  reason:    { type: String },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
}, { timestamps: true });

const wallets= mongoose.model("WalletTransaction", walletTransactionSchema);
module.exports =wallets
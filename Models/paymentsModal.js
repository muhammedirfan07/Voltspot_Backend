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
    bookingId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Booking"
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"], 
      default: "pending",
    },
  },
  { timestamps: true } 
);


const Payments = mongoose.model("Payments", paymentSchema);

module.exports = Payments;
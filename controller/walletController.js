const WalletTransaction = require("../Models/walletTransactionModel");
const Payments          = require("../Models/paymentsModal");

exports.getWalletSummary = async (req, res) => {
  console.log("inside getWalletSummary 💳");
  try {
    const userId = req.userId; 

    // All wallet credits refunds and debits payments
    const transactions = await WalletTransaction.find({ userId })
      .populate("bookingId", "bookingId slotNumber duration")
      .sort({ createdAt: -1 });

    const credits = transactions.filter((t) => t.type === "credit");
    const debits  = transactions.filter((t) => t.type === "debit");

    const walletBalance =
      debits.reduce((s,  t) => s + t.amount, 0)-
      credits.reduce((s, t) => s + t.amount, 0) 
     

      console.log(" transaction of refund=",transactions);
      

    // Real Stripe payment records both completed and refunded
    const payments = await Payments.find({
      userId,
      status: { $in: ["completed", "refunded"] },
    })
      .populate("stationId", "stationName city")
      .populate("bookingId", "bookingId slotNumber duration")
      .sort({ createdAt: -1 });
      console.log("payments =" ,payments);
      

    res.status(200).json({
      walletBalance: Math.max( walletBalance),
      totalSpent:    payments
                       .filter((p) => p.status === "completed")
                       .reduce((s, p) => s + p.amount, 0),
      totalRefund:   credits.reduce((s, t) => s + t.amount, 0),
      payments,          
      refunds: credits,  
    });
  } catch (err) {
    console.error("getWalletSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
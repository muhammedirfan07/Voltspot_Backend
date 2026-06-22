// walletController.js
const WalletTransaction = require("../Models/walletTransactionModel");
const Payments = require("../Models/paymentsModal");

exports.getWalletSummary = async (req, res) => {
    console.log( " inside the wallets controller---");   
  try {
    const userId = req.user?.id;

    const transactions = await WalletTransaction.find({ userId })
      .populate("bookingId", "bookingId slotNumber duration")
      .sort({ createdAt: -1 });

    const credits = transactions.filter(t => t.type === "credit");
    const debits  = transactions.filter(t => t.type === "debit");

    const walletBalance = credits.reduce((s, t) => s + t.amount, 0)
                        - debits.reduce((s, t) => s + t.amount, 0);  

    const payments = await Payments.find({ userId, status: "completed" })
      .populate("stationId", "stationName city")
      .populate("bookingId", "bookingId slotNumber duration")
      .sort({ createdAt: -1 });

    res.status(200).json({
      walletBalance: Math.max(0, walletBalance),   
      totalSpent:   debits.reduce((s, t) => s + t.amount, 0),
      totalRefund:  credits.reduce((s, t) => s + t.amount, 0),
      payments,
      refunds: credits,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
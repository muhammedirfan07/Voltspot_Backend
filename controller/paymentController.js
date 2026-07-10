// paymentController.js — FIXED
const { default: Stripe } = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Payments          = require("../Models/paymentsModal");
const WalletTransaction = require("../Models/walletTransactionModel");
const Booking           = require("../Models/bookingModel");

// ── Create Stripe checkout session ───────────────────────────────────────────
exports.makePayment = async (req, res) => {
  try {
    console.log("inside makePayment 🤑");
    const { userId, stationId, price, bookingId } = req.body;
    console.log("payment data:", req.body);
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required for payment" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode:        "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/payment-failed`,
      line_items: [{
        price_data: {
          currency:     "inr",
          product_data: {
            name:        "EV Charging Slot",
            description: `Station: ${stationId}`,
          },
          unit_amount: Math.round(price * 100), 
        },
        quantity: 1,
      }],
      metadata: {
        userId:    String(userId),
        stationId: String(stationId),
        bookingId: String(bookingId),   
      },
    });

    console.log("Stripe session created:", session.id);
    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error("makePayment error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── Stripe Webhook ───────────────────────────────────────────────────────────
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET  
    );
  } catch (err) {
    console.error(" Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Webhook received:", event.type);

  // ── checkout.session.completed ───────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, stationId, bookingId } = session.metadata || {};
    const amount          = session.amount_total / 100; 
    const paymentIntentId = session.payment_intent;

    console.log(" metadata:", { userId, stationId, bookingId });

    try {
      // Guard against duplicate webhook retries
      const existing = await Payments.findOne({ transactionId: paymentIntentId });
      if (existing) {
        console.log(" Duplicate webhook — already recorded");
        return res.json({ received: true });
      }

      // 1. Save payment record
      const payment = new Payments({
        userId,
        stationId,
        bookingId: bookingId || null,
        amount,
        paymentDate:   new Date(),
        transactionId: paymentIntentId || session.id,
        status:        "completed",
      });
      await payment.save();
      console.log(" Payment saved:", payment._id);

      // 2. Record wallet debit
      await new WalletTransaction({
        userId,
        type:      "debit",
        amount,
        reason:    `Payment for booking #${bookingId || "—"}`,
        bookingId: bookingId || null,
      }).save();
      console.log(" Wallet debit saved");

      // 3. Confirm booking + remove TTL expiry so MongoDB doesn't delete it
      if (bookingId) {
        const updated = await Booking.findByIdAndUpdate(
          bookingId,
          {
            status:    "confirmed",
            $unset:    { expiresAt: "" },  
          },
          { new: true }
        );
        if (updated) {
          console.log(" Booking confirmed:", updated._id, "status:", updated.status);
        } else {
          console.log(" Booking not found for id:", bookingId);
        }
      }

    } catch (err) {
      console.error(" Error in webhook handler:", err);
    }
  }

  // ── charge.refunded ──────────────────────────────────────────────────────
  if (event.type === "charge.refunded") {
    const paymentIntentId = event.data.object.payment_intent;
    try {
      const payment = await Payments.findOne({ transactionId: paymentIntentId });
      if (payment && payment.status !== "refunded") {
        payment.status = "refunded";
        await payment.save();
        console.log(" Payment marked refunded:", payment._id);
      }
    } catch (err) {
      console.error(" Error updating refund:", err);
    }
  }

  res.json({ received: true });
};
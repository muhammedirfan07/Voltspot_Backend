// ─── YOUR UPDATED paymentController.js (full file) ───────────────────────────
// Keeps your existing makePayment and adds stripeWebhook below it.

const { default: Stripe } = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Payments          = require("../Models/paymentsModal");
const WalletTransaction = require("../Models/walletTransactionModel");
const Booking           = require("../Models/bookingModel");

// ─ create Stripe checkout session ──────────────────────────────────
exports.makePayment = async (req, res) => {
  try {
    console.log("inside makePayment 🤑");
    const { userId, stationId, price, bookingId } = req.body;
    console.log("payment data:", req.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode:        "payment",
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/payment-failed`,
      line_items: [
        {
          price_data: {
            currency:     "inr",
            product_data: {
              name:        "EV Charging Slot",
              description: `Charging Station ID: ${stationId}`,
            },
            unit_amount: price * 100, 
          },
          quantity: 1,
        },
      ],
      metadata: { userId, stationId, bookingId: bookingId ? String(bookingId) : "" },
    });

    res.status(200).json({ id: session.id });
     console.log("Stripe session created:", session.id);
  } catch (error) {
    console.error("makePayment error:",  error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── New: Stripe webhook — records payment + wallet debit after checkout ───────
// IMPORTANT: mount this route with express.raw() BEFORE express.json() in app.js
// Example in app.js:
//   app.post("/stripe-webhook", express.raw({ type: "application/json" }), paymentController.stripeWebhook);
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
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── checkout.session.completed → record payment + wallet debit ─────────────
if (event.type === "checkout.session.completed") {
  const session = event.data.object;
  const { userId, stationId, bookingId } = session.metadata || {};
  
  // ADD THESE LOGS
  console.log("🔔 Webhook metadata received:", session.metadata);
  console.log("🔔 bookingId from metadata:", bookingId);
  
  const amount = session.amount_total / 100;
  const paymentIntentId = session.payment_intent;

  try {
    const existing = await Payments.findOne({ transactionId: paymentIntentId });
    if (!existing) {
      const payment = new Payments({
        userId,
        stationId,
        bookingId: bookingId || null,
        amount,
        paymentDate: new Date(),
        transactionId: paymentIntentId || session.id,
        status: "completed",
      });
      await payment.save();
      console.log("✅ Payment saved:", payment._id);

      const debit = new WalletTransaction({
        userId,
        type: "debit",
        amount,
        reason: `Payment for booking #${bookingId || "—"}`,
        bookingId: bookingId || null,
      });
      await debit.save();
      console.log("✅ Wallet debit saved");
      await Booking.findByIdAndUpdate(bookingId, {
      status: "confirmed",
      $unset: { expiresAt: "" }
    });

      if (bookingId) {
        const updated = await Booking.findByIdAndUpdate(
          bookingId,
          { status: "confirmed", $unset: { expiresAt: "" } },
          { new: true }  // ← returns updated doc
        );
        console.log("✅ Booking confirmed:", updated?._id, "status:", updated?.status);
      } else {
        console.log("❌ No bookingId in metadata — booking NOT confirmed");
      }
    } else {
      console.log("⚠️ Duplicate webhook — payment already recorded");
    }
  } catch (err) {
    console.error("❌ Error in webhook handler:", err);
  }
}

  // ── charge.refunded → mark payment as refunded ─────────────────────────────
  if (event.type === "charge.refunded") {
    const charge          = event.data.object;
    const paymentIntentId = charge.payment_intent;

    try {
      const payment = await Payments.findOne({ transactionId: paymentIntentId });
      if (payment && payment.status !== "refunded") {
        payment.status = "refunded";
        await payment.save();
        console.log("Payment marked refunded via webhook:", payment._id);
      }
    } catch (err) {
      console.error("Error updating refund via webhook:", err);
    }
  }

  res.json({ received: true });
};
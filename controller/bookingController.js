const Booking = require("../Models/bookingModel");
const evstations = require("../Models/evChargingStationModel");
const Payments = require("../Models/paymentsModal");
const WalletTransaction = require("../Models/walletTransactionModel");
const { default: Stripe } = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -----------------------------get available slot ---------------------------------------------

exports.getAvailableSlots = async (req, res) => {
  console.log("inside the avilable sloat...✔️✔️");
  try {
    const { stationId, startTime, duration } = req.query;

    if (!stationId || !startTime || !duration) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const endTime = new Date(
      new Date(startTime).getTime() + duration * 60 * 60 * 1000,
    );
    const start = new Date(startTime);

    const bookedSlots = await Booking.find({
      stationId,
      status: { $in: ["confirmed", "pending"] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: start } }],
    }).select("slotNumber");

    const bookedSlotNumbers = bookedSlots.map((booking) => booking.slotNumber);

    const station = await evstations
      .findById(stationId)
      .select("availableSlots");
    if (!station) return res.status(404).json({ message: "Station not found" });

    const allSlots = Array.from(
      { length: station.availableSlots },
      (_, i) => i + 1,
    );
    const availableSlots = allSlots.filter(
      (slot) => !bookedSlotNumbers.includes(slot),
    );

    res.status(200).json({ availableSlots });
    console.log("slot:", availableSlots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------- booking slot ----------------------------------------------------
exports.bookSlot = async (req, res) => {
  try {
    console.log("inside the booking sloat..💜💜");
    const { userId, stationId, slotNumber, startTime, duration } = req.body;

    if (!userId || !stationId || !slotNumber || !startTime || !duration)
      return res.status(400).json({ message: "Missing required fields" });

    if (duration < 1 || duration > 10)
      return res
        .status(400)
        .json({ message: "Duration must be between 1 and 10 hours" });

    const endTime = new Date(
      new Date(startTime).getTime() + duration * 60 * 60 * 1000,
    );

    const existingBooking = await Booking.findOne({
      stationId,
      slotNumber,
      status: { $in: ["confirmed", "pending"] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    if (existingBooking)
      return res.status(400).json({
        message: `Slot already booked for this time ${existingBooking.duration} hours`,
      });

    const station = await evstations.findById(stationId);
    if (!station) return res.status(404).json({ message: "Station not found" });

    const totalPrice = station.pricePerHour * duration;

    const newBooking = new Booking({
      userId,
      stationId,
      slotNumber,
      startTime,
      duration,
      totalPrice,
      endTime,
      status: "pending",
    });

    await newBooking.save();
    console.log("✅ New booking saved, _id:", newBooking._id);
    res
      .status(200)
      .json({ message: "Slot booked successfully", booking: newBooking });
  } catch (error) {
    console.error("Error booking slot:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------- Cancel booking & Stripe refund -----------------------------------------
exports.cancelBooking = async (req, res) => {
  console.log("inside cancelBooking controller 🔴");
  try {
    const { bookingId } = req.params;
    const userId = req.userId;

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 15 min after no cancel--
    const bookedAt = new Date(booking.createdAt);
    const diffMinutes = (Date.now() - bookedAt.getTime()) / (1000 * 60);
    if (diffMinutes > 15) {
      return res
        .status(400)
        .json({ message: "Cancellation window has expired (15 minutes)" });
    }
    if (String(booking.userId) !== String(userId))
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this booking" });

    if (booking.status === "canceled")
      return res.status(400).json({ message: "Booking already cancelled" });

    // 2. Find associated completed payment
    const payment = await Payments.findOne({
      bookingId: booking._id,
      status: "completed",
    });

    let refundAmount = booking.totalPrice;
    let stripeRefundId = null;

    if (payment && payment.transactionId) {
      try {
        let chargeId = payment.transactionId;

        // If stored as checkout session id (cs_...)
        if (chargeId.startsWith("cs_")) {
          const session = await stripe.checkout.sessions.retrieve(chargeId);
          chargeId = session.payment_intent;
        }

        // If payment intent (pi_...), get the latest charge
        if (chargeId && chargeId.startsWith("pi_")) {
          const pi = await stripe.paymentIntents.retrieve(chargeId);
          chargeId = pi.latest_charge;
        }

        if (chargeId) {
          const refund = await stripe.refunds.create({
            charge: chargeId,
            amount: Math.round(refundAmount * 100),
          });
          stripeRefundId = refund.id;
          console.log("Stripe refund created:", refund.id);
        }
      } catch (stripeErr) {
        console.error("Stripe refund error:", stripeErr.message);
      }

      payment.status = "refunded";
      await payment.save();
    }

    //  Add wallet credit
    const walletCredit = new WalletTransaction({
      userId,
      type: "credit",
      amount: refundAmount,
      reason: stripeRefundId
        ? `Refund for booking #${booking.bookingId} (Stripe: ${stripeRefundId})`
        : `Refund for booking #${booking.bookingId}`,
      bookingId: booking._id,
    });
    await walletCredit.save();

    //  Mark booking canceled
    booking.status = "canceled";
    await booking.save();

    res.status(200).json({
      message: "Booking cancelled. Refund will reflect in your wallet.",
      refundAmount,
      stripeRefundId,
    });
  } catch (err) {
    console.error("cancelBooking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------- Rebook: check slot availability before rebooking --------------------------------
exports.rebookCheck = async (req, res) => {
  console.log("inside rebookCheck controller 🔄");
  try {
    const { stationId, slotNumber, duration } = req.body;

    if (!stationId || !slotNumber || !duration)
      return res.status(400).json({ message: "Missing required fields" });

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    const conflict = await Booking.findOne({
      stationId,
      slotNumber,
      status: "confirmed",
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });

    if (conflict)
      return res.status(409).json({
        message: `Slot ${slotNumber} is already booked. Please choose another slot.`,
      });

    res.status(200).json({
      message: "Slot available. Proceed to payment.",
      available: true,
    });
  } catch (err) {
    console.error("rebookCheck error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------- view booking history -------------------------------------------------
exports.getBookingHistory = async (req, res) => {
  console.log("inside the booking history..📃📃");
  try {
    const { userId } = req.query;
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const bookings = await Booking.find({ userId })
      .populate("stationId", "stationName city state chargingType")
      .sort({ createdAt: -1 })
      .select(
        "stationId slotNumber startTime endTime duration totalPrice status bookingId createdAt",
      );
    console.log("booking history =", bookings);

    if (!bookings.length)
      return res.status(404).json({ message: "No booking history found" });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Error fetching booking history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------------------- get all bookings (admin) --------------------------------------------
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("stationId");
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ----------------------------- filter bookings -----------------------------------------------------
exports.filterBookings = async (req, res) => {
  try {
    const { city, state, chargingType, vehicleType } = req.query;
    let filter = {};

    if (chargingType || vehicleType) {
      const stations = await evstations.find({ chargingType, vehicleType });
      filter.stationId = { $in: stations.map((s) => s._id) };
    }

    if (city) filter.city = city;
    if (state) filter.state = state;

    const bookings = await Booking.find(filter).populate("stationId");
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

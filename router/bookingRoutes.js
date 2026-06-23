const express = require("express");
const router = express.Router();
const bookingController = require("../controller/bookingController");
const UserAuthoMiddleware = require("../middleware/UserAuthoMiddleare");

// check the avilale sloast --------------------------------
router.get("/user/slots",UserAuthoMiddleware,bookingController.getAvailableSlots)
// Routes for bookings---------------------------------------------
router.post("/user/booking",UserAuthoMiddleware,bookingController.bookSlot)
// Get all bookings---------------------------------------------
router.get("/veiw-allBooking",UserAuthoMiddleware, bookingController.getBookingHistory);

// Filtering bookings by city, state, charging type, or vehicle type---------------------------------------------
router.get("/filterBooking", bookingController.filterBookings);

 //Cancel booking & Stripe refund 
  router.put("/user/booking/:bookingId/cancel", UserAuthoMiddleware, bookingController.cancelBooking);

 // Check slot availability before rebooking
  router.post("/user/rebook-check", UserAuthoMiddleware, bookingController.rebookCheck)
  ;
module.exports = router;

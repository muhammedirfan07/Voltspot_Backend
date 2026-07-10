const patners =require("../Models/PatnerModal")
const evstations = require("../Models/evChargingStationModel");
const jwt =require("jsonwebtoken")
const bcrypt =require("bcrypt")
const generateVerificationCode =require("../util/generateVerificationCode")
const {WelcomeEmail, SendVerificationCode} =require("../Emails/sendEmail");
const notifications = require("../Models/notificationModal");
const RatingAndReview = require("../Models/ratingandReviews");
const Booking = require("../Models/bookingModel"); 
 const Payments = require("../Models/paymentsModal");
 const WalletTransaction = require("../Models/walletTransactionModel"); 

//patner register -------------------------
exports.patnersRegisterController =async(req,res)=>{
    console.log(("inside the  patnersRegisterController.....🫴🫴🫳"));
     const {StationName,email,password,address}=req.body
     console.log(req.body)
     try{
         const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)){
                return res.status(400).json({ statuse:false, message:" invalid email formate"})
            }
            console.log(email);
            const existing= await patners.findOne({email})
            console.log("existing user:",existing)
            if(existing){
                res.status(406).json({status:false, message:" alreadry existing please login..."})   
            }else{
                // bycrpy
                const hashPassword = bcrypt.hashSync(password, 10);
                //verifation code
                const verificationCode =generateVerificationCode()
                const newPaters = new patners({
                    StationName
                    ,email
                    ,password:hashPassword,
                    verificationCode:verificationCode
                    ,address})
                await newPaters.save()
                SendVerificationCode(newPaters.email,verificationCode)
                res.status(200).json({message:" succcessfully registerd ",status:true, patner:newPaters })
            } 
     }catch(err){
        res.status(404).json(err)
     }
    
}

//partner login --------------------------
exports.patnerLoginController = async (req, res) => {
    console.log("Inside the patnerLoginController..🙌🙌🙌");
    const { email, password } = req.body;

    try {
        const existingPatner = await patners.findOne({ email });
        console.log("Found Partner:", existingPatner);

        if (!existingPatner) {
            return res.status(400).json({ status: "failed", message: "Invalid Credentials. Try again!" });
        }

        // Compare the password
        const isPasswordValid = await bcrypt.compare(password, existingPatner.password);
        if (!isPasswordValid) {
            return res.status(406).json({ status: "failed", message: "Incorrect Email/Password. Try again!" });
        }

        // Check if email is verified
        if (!existingPatner.isVerified) {
            return res.status(406).json({ status: "failed", message: "Email is not Verified. Try again!" });
        }
            
         // Generate JWT token
         const tokenPayload = {
            partnerId: existingPatner._id, 
            role: "partner"
        };
        console.log("Token Payload:", tokenPayload);

        // Generate JWT token
        const PartnerToken = jwt.sign(
            tokenPayload,
            process.env.JWTPASSWORD,
            { expiresIn: "7d" } // Token expires in 7 days
        );

        return res.status(200).json({
            status: "success",
            partner: existingPatner,
            PartnerToken
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ status: "failed", message: "Something went wrong. Try again later." });
    }
};

//profile information-------------------------
exports.getPartnerProfileController = async (req, res) => {
    console.log("inside getPartnerProfileController...👤👤👤");
    try {
        const partnerId = req.partnerId;
 
        const partner = await patners.findById(partnerId).select("-password -verificationCode");
        if (!partner) {
            return res.status(404).json({ status: false, message: "Partner not found" });
        }
 
        // All stations owned by this partner
        const stations = await evstations.find({ partnerId }).select("_id");
        const stationIds = stations.map((s) => s._id);
        const stationCount = stationIds.length;
 
        // Swap in your real Booking model path here — this stays 0 if it's not found yet
        let bookingCount = 0;
        try {
            const Booking = require("../Models/bookingModel");
            bookingCount = await Booking.countDocuments({ stationId: { $in: stationIds } });
        } catch (e) {
            console.warn("Booking model not wired up for profile stats yet:", e.message);
        }

        // Average rating across ALL reviews on ALL of this partner's stations
        // (a straight average of every review, not an average-of-per-station-averages)
        let avgRating = 0;
        let ratingCount = 0;
 
        if (stationIds.length > 0) {
            const ratingAgg = await RatingAndReview.aggregate([
                { $match: { station: { $in: stationIds } } },
                {
                    $group: {
                        _id: null,
                        avgRating: { $avg: "$rating" },
                        count: { $sum: 1 },
                    },
                },
            ]);
 
            if (ratingAgg.length > 0) {
                avgRating = Math.round(ratingAgg[0].avgRating * 10) / 10; // round to 1 decimal
                ratingCount = ratingAgg[0].count;
            }
        }
 
        res.status(200).json({
            status: true,
            partner,
            stats: {
                stations: stationCount,
                bookings: bookingCount,
                rating: avgRating,
                ratingCount, 
            },
        });
    } catch (error) {
        res.status(500).json({ status: false, message: "Error fetching profile", error: error.message });
    }
};

//patner registre verify email controller----------------------------------------------
exports. verifyEmailController= async(req,res)=>{
    console.log("inside the verify email contoller...📩📩📩📩");
    const {code}=req.body
    try {
        // const verificationCode = generateVerificationCode()
        const verifedPatenr =await patners.findOne({
            verificationCode:code
        })
        if(!verifedPatenr){
            return res.status(406).json({status:false,message:"expared the time..."})
        }
        verifedPatenr.isVerified=true,
        verifedPatenr.verificationCode=undefined
        verifedPatenr.expiresAt =undefined
        await verifedPatenr.save()
        //send welcome email --------------
        await WelcomeEmail(verifedPatenr.email,verifedPatenr.StationName)
        console.log("==========================================");
        console.log("email verify succesfull");
        console.log("=========================================="); 
        return res.status(200).json({success:true,message:"Email verifed successfully ..📨📨📨"})
    } catch (error) {
      res.status(404).json(err)
    }
}

exports.checkPtnerAuthoContoller =async(req,res)=>{
   console.log("inside the checkPtnerAuthoContoller...✔️✔️✔️")
    try{
        const checkAutho= await patners.findById(req.partnerId)
        if(!checkAutho){
            return res.status(400).json({success:false,message:"patner is no founded"})
        }else{
            res.status(200).json({success:true, partner: { ...checkAutho._doc, password: undefined }})
        }
    }catch(err){
        return res.status(400).json({success:false,message:"patner is no founded"})
    }

}
//resent otp-------------------------------
exports.reSendPartnerController = async (req, res) => {
    console.log("Inside the re-send email --");
    const { email } = req.body;
    try {
        const partner = await patners.findOne({ email });
        if (!partner) {
            return res.status(404).json({ status: false, message: "Partner not found" });
        }
        if (partner.isVerified) { 
            return res.status(400).json({ status: false, message: "Already verified" });
        }
        const verificationCode = generateVerificationCode();
        partner.verificationCode = verificationCode;
        await partner.save();
        SendVerificationCode(email, verificationCode);
        return res.status(200).json({ status: true, message: "OTP Resent successfully" }); // ✅ res not partner
    } catch (error) {
        res.status(500).json({ status: false, message: "Something went wrong" });
    }
};

//get all patners--------------------
exports.viewAllPatnersController =async(req,res)=>{
    console.log("inside the ViewAll Patener Controller...😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️")
    try{
        const allPartners =await patners.aggregate([
            {
                   $match:{isVerified:true}
            },
            { 
                $lookup:{
                    from:"evstations",
                    localField:"_id",
                    foreignField:"partnerId",
                    as:"stations"
                }
                },
                {
                    $addFields:{
                        stationCount:{$size:"$stations"}
                    },
                },
                {
                    $project:{
                        password:0,
                        verificationCode:0,
                        stations:0
                    }
                }
        ])
        res.status(200).json(allPartners)
        console.log("all partners=",allPartners);
        
    }catch(err){
        res.status(404).json(err)
    }
}

//get the all count of patners---------------------
exports.getAllPatnerCount =async(req,res)=>{
    console.log("inside the all user cound.......");
    try{
        const numberOfPatner = await patners.countDocuments({})
        res.status(200).json({conunt:numberOfPatner})
    }catch(err){
        res.json(err)
    }
    
}

// get notification approved and rejected-----------------------
exports.getallNotifiaction= async (req,res)=>{
    console.log("inside the  get notification ..");
    try {
        const notification = await notifications.find({ partnerId: req.partnerId }).populate("stationId", "stationName");
        console.log("notifications :",notification);
    res.status(200).json(notification);   
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error });
    }
}

// delect a notifications---------------------------------
exports.deleteNotification = async (req, res) => {
    console.log("Inside deleteNotification...");
    try {
      const { id } = req.params;
      const deletedNotification = await notifications.findByIdAndDelete(id);
      if (!deletedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting notification", error });
    }
  };

// delect all notifations -------------
exports.deleteAllNotifications = async (req, res) => {
    console.log("Inside deleteAllNotifications...");
    try {
      const { partnerId } = req;
      await notifications.deleteMany({ partnerId });
      res.status(200).json({ message: "All notifications deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting notifications", error });
    }
  };

// -----------------------------------------------------------------------------
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const pctChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10; 
};

// -------------------------- Booking Charts stats ---------------------------
exports.getPartnerBookingChartStats = async (req, res) => {
  console.log("inside getPartnerBookingChartStats...📊📊📊");
  try {
    const partnerId = req.partnerId;

    // All of this partner's stations (need vehicleType/availableSlots for later calcs)
    const stations = await evstations
      .find({ partnerId })
      .select("_id stationName vehicleType availableSlots status");
    const stationIds = stations.map((s) => s._id);

    // Nothing to aggregate yet — return a clean empty shape instead of erroring
    if (stationIds.length === 0) {
      return res.status(200).json({
        status: true,
        stats: {
          bookings7d: { count: 0, changePercent: 0 },
          revenue7d: { amount: 0, changePercent: 0 },
          activeStations: { count: 0, totalSlots: 0 },
          avgRating: { rating: 0, ratingCount: 0 },
        },
        bookingsLast7Days: [],
        revenueLast7Days: [],
        slotUtilizationByStation: [],
        vehicleMix: [],
        monthlyTrend: [],
      });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000); // today + 6 back = 7 day window
    const fourteenDaysAgo = new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const notCanceled = { status: { $ne: "canceled" } };

    const [
      bookings7dCount,
      bookingsPrev7dCount,
      revenueAgg,
      revenuePrevAgg,
      activeStationsCount,
      ratingAgg,
      bookingsByDay,
      revenueByDay,
      bookingsThisWeekByStation,
      vehicleMixAgg,
      monthlyBookingTrend,
      monthlyRevenueTrend,
    ] = await Promise.all([
      // bookings this week / previous week (for the % change badge)
      Booking.countDocuments({ stationId: { $in: stationIds }, ...notCanceled, createdAt: { $gte: sevenDaysAgo } }),
      Booking.countDocuments({
        stationId: { $in: stationIds },
        ...notCanceled,
        createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
      }),

      // revenue = actual money collected via Stripe, not booking.totalPrice
      Payments.aggregate([
        { $match: { stationId: { $in: stationIds }, status: "completed", paymentDate: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payments.aggregate([
        {
          $match: {
            stationId: { $in: stationIds },
            status: "completed",
            paymentDate: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      evstations.countDocuments({ partnerId, status: "approved" }),

      RatingAndReview.aggregate([
        { $match: { station: { $in: stationIds } } },
        { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),

      // day-by-day series for the two line/area charts
      Booking.aggregate([
        { $match: { stationId: { $in: stationIds }, ...notCanceled, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      ]),
      Payments.aggregate([
        { $match: { stationId: { $in: stationIds }, status: "completed", paymentDate: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } }, total: { $sum: "$amount" } } },
      ]),

      // per-station booking counts this week -> utilization %
      Booking.aggregate([
        { $match: { stationId: { $in: stationIds }, ...notCanceled, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: "$stationId", count: { $sum: 1 } } },
      ]),

      // vehicle mix donut — join back to station for its vehicleType
      Booking.aggregate([
        { $match: { stationId: { $in: stationIds }, ...notCanceled } },
        { $lookup: { from: "evstations", localField: "stationId", foreignField: "_id", as: "station" } },
        { $unwind: "$station" },
        { $group: { _id: "$station.vehicleType", count: { $sum: 1 } } },
      ]),

      // monthly trend (last 6 months)
      Booking.aggregate([
        { $match: { stationId: { $in: stationIds }, ...notCanceled, createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
      ]),
      Payments.aggregate([
        { $match: { stationId: { $in: stationIds }, status: "completed", paymentDate: { $gte: sixMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$paymentDate" } }, total: { $sum: "$amount" } } },
      ]),
    ]);

    // ---- stat cards ----
    const revenue7d = revenueAgg[0]?.total || 0;
    const revenuePrev7d = revenuePrevAgg[0]?.total || 0;
    const totalSlots = stations.reduce((sum, s) => sum + (s.availableSlots || 0), 0);
    const avgRating = ratingAgg[0] ? Math.round(ratingAgg[0].avgRating * 10) / 10 : 0;
    const ratingCount = ratingAgg[0]?.count || 0;

    // ---- fill in the 7-day series so missing days show as 0, not gaps ----
    const bookingsMap = Object.fromEntries(bookingsByDay.map((d) => [d._id, d.count]));
    const revenueMap = Object.fromEntries(revenueByDay.map((d) => [d._id, d.total]));

    const bookingsLast7Days = [];
    const revenueLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = DAY_LABELS[d.getDay()];
      bookingsLast7Days.push({ date: key, day: label, count: bookingsMap[key] || 0 });
      revenueLast7Days.push({ date: key, day: label, amount: revenueMap[key] || 0 });
    }

    // ---- slot utilization by station ----
    const bookingCountMap = Object.fromEntries(bookingsThisWeekByStation.map((b) => [String(b._id), b.count]));
    const slotUtilizationByStation = stations
      .map((s) => {
        const bookingsCount = bookingCountMap[String(s._id)] || 0;
        const maxPossible = (s.availableSlots || 1) * 7; // 1 slot ~ 1 booking/day ceiling
        const utilizationPercent = Math.min(100, Math.round((bookingsCount / maxPossible) * 1000) / 10);
        return { stationId: s._id, stationName: s.stationName, utilizationPercent };
      })
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    // ---- vehicle mix ----
    const vehicleMix = vehicleMixAgg.map((v) => ({ vehicleType: v._id, count: v.count }));

    // ---- monthly trend (merge booking count + revenue per month) ----
    const monthRevenueMap = Object.fromEntries(monthlyRevenueTrend.map((m) => [m._id, m.total]));
    const monthlyTrend = monthlyBookingTrend
      .map((m) => ({ month: m._id, bookings: m.count, revenue: monthRevenueMap[m._id] || 0 }))
      .sort((a, b) => (a.month > b.month ? 1 : -1));

    res.status(200).json({
      status: true,
      stats: {
        bookings7d: { count: bookings7dCount, changePercent: pctChange(bookings7dCount, bookingsPrev7dCount) },
        revenue7d: { amount: revenue7d, changePercent: pctChange(revenue7d, revenuePrev7d) },
        activeStations: { count: activeStationsCount, totalSlots },
        avgRating: { rating: avgRating, ratingCount },
      },
      bookingsLast7Days,
      revenueLast7Days,
      slotUtilizationByStation,
      vehicleMix,
      monthlyTrend,
    });
  } catch (error) {
    console.error("getPartnerBookingChartStats error:", error);
    res.status(500).json({ status: false, message: "Error fetching chart stats", error: error.message });
  }
};

// -------------------------- Payments Page overview --------------------------
exports.getPartnerPaymentsOverview = async (req, res) => {
  console.log("inside getPartnerPaymentsOverview...💳💳💳");
  try {
    const partnerId = req.partnerId;

    const stations = await evstations
      .find({ partnerId })
      .select("_id stationName availableSlots status");
    const stationIds = stations.map((s) => s._id);

    // Nothing to show yet — clean empty shape
    if (stationIds.length === 0) {
      return res.status(200).json({
        status: true,
        stats: { stationCount: 0, totalSlots: 0, occupiedNow: 0, revenueToday: 0, refundsToday: 0 },
        stationSlotStatus: [],
        revenueLast7Days: [],
      });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const notCanceled = { status: { $ne: "canceled" } };
    // Adjust this regex if your actual refund reason string differs
    const refundReasonMatch = { reason: { $regex: /refund/i } };

    const [
      activeBookings,
      revenueTodayAgg,
      refundsTodayAgg,
      revenueByDay,
      refundsByDay,
    ] = await Promise.all([
      // bookings that are occupying a slot RIGHT NOW (startTime <= now <= endTime)
      Booking.find({
        stationId: { $in: stationIds },
        ...notCanceled,
        startTime: { $lte: now },
        endTime: { $gte: now },
      }).select("stationId slotNumber"),

      Payments.aggregate([
        { $match: { stationId: { $in: stationIds }, status: "completed", paymentDate: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // refunds today — wallet credits tied to this partner's bookings
      WalletTransaction.aggregate([
        { $match: { type: "credit", ...refundReasonMatch, createdAt: { $gte: todayStart } } },
        { $lookup: { from: "bookings", localField: "bookingId", foreignField: "_id", as: "booking" } },
        { $unwind: "$booking" },
        { $match: { "booking.stationId": { $in: stationIds } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      Payments.aggregate([
        { $match: { stationId: { $in: stationIds }, status: "completed", paymentDate: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } }, total: { $sum: "$amount" } } },
      ]),

      // refunds by day (last 7 days) — same wallet-credit-via-booking join
      WalletTransaction.aggregate([
        { $match: { type: "credit", ...refundReasonMatch, createdAt: { $gte: sevenDaysAgo } } },
        { $lookup: { from: "bookings", localField: "bookingId", foreignField: "_id", as: "booking" } },
        { $unwind: "$booking" },
        { $match: { "booking.stationId": { $in: stationIds } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" } } },
      ]),
    ]);

    // ---- group occupied slot numbers per station ----
    const occupiedMap = {};
    activeBookings.forEach((b) => {
      const key = String(b.stationId);
      if (!occupiedMap[key]) occupiedMap[key] = new Set();
      occupiedMap[key].add(b.slotNumber);
    });

    let occupiedNow = 0;
    const stationSlotStatus = stations.map((s) => {
      const total = s.availableSlots || 0;
      const occupiedSet = occupiedMap[String(s._id)] || new Set();
      const occupiedCount = occupiedSet.size;
      occupiedNow += occupiedCount;

      const slots = [];
      for (let i = 1; i <= total; i++) {
        slots.push({ slotNumber: i, occupied: occupiedSet.has(i) });
      }

      return {
        stationId: s._id,
        stationName: s.stationName,
        totalSlots: total,
        occupiedCount,
        freeCount: total - occupiedCount,
        slots,
      };
    });

    const totalSlots = stations.reduce((sum, s) => sum + (s.availableSlots || 0), 0);
    const revenueToday = revenueTodayAgg[0]?.total || 0;
    const refundsToday = refundsTodayAgg[0]?.total || 0;

    // ---- fill in 7-day revenue + refunds series so missing days show 0 ----
    const revenueMap = Object.fromEntries(revenueByDay.map((d) => [d._id, d.total]));
    const refundsMap = Object.fromEntries(refundsByDay.map((d) => [d._id, d.total]));

    const revenueLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = DAY_LABELS[d.getDay()];
      revenueLast7Days.push({
        date: key,
        day: label,
        revenue: revenueMap[key] || 0,
        refunds: refundsMap[key] || 0,
      });
    }

    res.status(200).json({
      status: true,
      stats: {
        stationCount: stations.length,
        totalSlots,
        occupiedNow,
        revenueToday,
        refundsToday,
      },
      stationSlotStatus,
      revenueLast7Days,
    });
  } catch (error) {
    console.error("getPartnerPaymentsOverview error:", error);
    res.status(500).json({ status: false, message: "Error fetching payments overview", error: error.message });
  }
};




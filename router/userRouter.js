const express = require("express")
const UserController =require("../controller/userController")
const ratingController =require("../controller/ratingController")
const paymentController =require("../controller/paymentController")
const chartAndGraphController =require("../controller/chartAndGraphController")
const walletController =require("../controller/walletController")
const UserAuthoMiddleware=require("../middleware/UserAuthoMiddleare")
const multerMiddleware =require("../middleware/multerMiddleware")
const router = new express.Router()

//register user and admin-------------
router.post("/Register",UserController.UserRegisterController)
// login user & admin -----------------------
router.post("/login",UserController.UserLoginController)
// google authentication 
router.post("/google-login",UserController.GoogleLoginController);

// get all user details - in admin dashboard----------
router.get("/admin/allUsers",UserController.getAllUearsDetails)
//get all number of users  - in admin dashboard---------
router.get("/admin/UserCount",UserController.getAllUserCount)
//get user details  - in admin dashboard---------
router.get("/user/userDetails/:id",UserAuthoMiddleware,UserController.singleUserDetails)
//forgot passwords -----------------------
router.post("/forgot-password",UserController.forgotPassword)
router.get("/resent-password/:token",UserController.VerifyResetTokenController)
router.post("/resent-password/:token",UserController.ResetPasswordController)


// add rating and views
router.post("/addreview",UserAuthoMiddleware,ratingController.addRatingAndReviews)
// add rating and views
router.get("/viewreview",UserAuthoMiddleware,ratingController.getallReviws)

//
router.put(
    "/user/updateProfile",UserAuthoMiddleware,multerMiddleware.single("profileImage"),UserController.updateUserProfile)

// user payment-----------
router.post("/user/payment",paymentController.makePayment)

// admin page chart and graph 
router.get("/admin/chart",chartAndGraphController.getChartData)
//wallet
router.get("/wallet-summary",UserAuthoMiddleware,walletController.getWalletSummary)

module.exports=router
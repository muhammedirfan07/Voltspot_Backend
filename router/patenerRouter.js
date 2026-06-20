const express =require("express")
const patnersController =require("../controller/patnersController")
const PatnerAuthMiddleware = require("../middleware/PatnerAuthMiddleware")

const router= new express.Router()


// partnerRegister --------------------------------------------------------------------------
router.post("/patner/patnerRegister",patnersController.patnersRegisterController)
// Verify partners email --------------------------------------------------------------------------
router.post("/patner/verfiyemail",patnersController.verifyEmailController)
// re-sent OTP--------------------------------------------------------------------------------------
router.post('/patner/resendOtp',patnersController.reSendPartnerController)
//partner login ----------------------------------------------------------------------------
router.post("/patner/patnerlogin",patnersController.patnerLoginController)
//path check authorized or not use middleware----------------------------------------------
router.get("/patner/checkPather-autho",PatnerAuthMiddleware,patnersController.checkPtnerAuthoContoller)
//get all patners details-------------------------------------------------------------------
router.get("/admin/viewAllPatener",patnersController.viewAllPatnersController)
// get number of patners---------------------------------------------------------------------
router.get("/admin/patnerCount",patnersController.getAllPatnerCount)

// notification get 
router.get ("/notifications",PatnerAuthMiddleware,patnersController.getallNotifiaction)
// delete single notification
router.delete("/notifications/:id", PatnerAuthMiddleware, patnersController.deleteNotification);
// delete all notifications
router.delete("/notifications", PatnerAuthMiddleware, patnersController.deleteAllNotifications);








module.exports=router
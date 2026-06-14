const express = require('express')
const vehicleController = require('../controller/vehcileController')
 const UserAuthoMiddleare =require('../middleware/UserAuthoMiddleare')
const router = new express.Router()

// add new vehicles router
router.post("/createVehicle",UserAuthoMiddleare,vehicleController.CreateVehicle)

//view all vehicle
router.get("/viewVehicle",UserAuthoMiddleare,vehicleController.ViewVehicle)
// view single vehicle
router.get("/singleVehicle/:useId",UserAuthoMiddleare,vehicleController.ViewVehicle)
// update vehicle data
router.put("/updateVehicle/:id",UserAuthoMiddleare,vehicleController.UpdateVehicle)
// delete vehicle data ..
router.delete("/removeVehicle/:id",UserAuthoMiddleare,vehicleController.RemoveVehicle)

module.exports=router   
const Vehicles = require("../Models/vechileModal");
const { all } = require("../router/bookingRoutes");

// add vehicles details----
exports.CreateVehicle = async (req, res) => {
  console.log("inside the create vehicle controller ...");
  try {
    const { vehicleName, RegisterNumber, chargingTypes, batteryCapacity } = req.body;
    const userId = req.userId;
    console.log("user Id =", userId);

    const existingVehicle = await Vehicles.findOne({ RegisterNumber });
    console.log("existingVehicle =",existingVehicle);
    

    if (existingVehicle) {
      return res.status(409).json({ message: "Vehicle already added" });
    }
    const newVehicle = new Vehicles({
      userId,        
      vehicleName,
      RegisterNumber,
      chargingTypes,
      batteryCapacity
    });

    await newVehicle.save();
    return res.status(201).json({ message: "Vehicle added successfully", vehicle: newVehicle });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// all vehicles views
exports.ViewVehicle =async (req,res)=>{
  console.log( " inside the view all vehicle..");
  try {
     const userId = req.userId 
    const allVechiles = await Vehicles.find({userId})
    res.status(200).json(allVechiles)
    console.log("all Vehicles =",allVechiles);
  } catch (error) {
    res.status(403).json(error)
  }
  
}

//  single vehicle views
exports.ViewSingleVehicle =async (req,res)=>{
  console.log( " inside the view all vehicle..");
  try {
    const Vehicle = await Vehicles.findById({userId})
    console.log("Fetching User with ID:", userId);
    if(!Vehicle){
      res.status(405).json({message:"user id is not get"})
    }
    res.status(200).json(Vehicle)
    console.log("all Vehicles =",Vehicle);
  } catch (error) {
    res.status(403).json({ error: error.message })
  }
  
}

//  update 

exports.UpdateVehicle =async(req,res)=>{
  console.log("inside the update vehicles..");
  try {
    
  } catch (error) {
     res.status(406).json({ error: error.message })
    
  }
  
}

const Vehicles = require("../Models/vechileModal");
const { all } = require("../router/bookingRoutes");

// add vehicles details----
exports.CreateVehicle = async (req, res) => {
  console.log("inside the create vehicle controller ...");
  try {
    const { vehicleName, RegisterNumber, chargingTypes, batteryCapacity } =
      req.body;
    const userId = req.userId;
    console.log("user Id =", userId);

    const existingVehicle = await Vehicles.findOne({ RegisterNumber });
    console.log("existingVehicle =", existingVehicle);

    if (existingVehicle) {
      return res.status(409).json({ message: "Vehicle already added" });
    }
    const newVehicle = new Vehicles({
      userId,
      vehicleName,
      RegisterNumber,
      chargingTypes,
      batteryCapacity,
    });

    await newVehicle.save();
    return res
      .status(201)
      .json({ message: "Vehicle added successfully", vehicle: newVehicle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// all vehicles views
exports.ViewVehicle = async (req, res) => {
  console.log(" inside the view all vehicle..");
  try {
    const userId = req.userId;
    const allVechiles = await Vehicles.find({ userId });
    res.status(200).json(allVechiles);
    console.log("all Vehicles =", allVechiles);
  } catch (error) {
    res.status(403).json(error);
  }
};

//  single vehicle views
exports.ViewSingleVehicle = async (req, res) => {
  console.log(" inside the view all vehicle..");
  try {
    const Vehicle = await Vehicles.findById({ userId });
    console.log("Fetching User with ID:", userId);
    if (!Vehicle) {
      res.status(405).json({ message: "user id is not get" });
    }
    res.status(200).json(Vehicle);
    console.log("all Vehicles =", Vehicle);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

//  update vehicle data
exports.UpdateVehicle = async (req, res) => {
  console.log("inside the update vehicles..");
  try {
    const { vehicleName, RegisterNumber, chargingTypes, batteryCapacity } =
      req.body;
    const updateData = {
      vehicleName,
      RegisterNumber,
      chargingTypes,
      batteryCapacity,
    };
    const id = req.params.id;
    const existingUpdateData = await Vehicles.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );
    if (!existingUpdateData) {
      return res.status(403).json({ message: "update data not found" });
    } else {
      res.status(200).json(existingUpdateData);
    }
  } catch (error) {
    res.status(406).json({ error: error.message });
  }
};

// delete vehicle data
exports.RemoveVehicle = async (req, res) => {
  console.log(" enter the remove vehicle controller..");
  try {
    const id = req.params.id;
    console.log("id=", id);
    const removeVehicle = await Vehicles.findByIdAndDelete(id);
    if (!removeVehicle)
      return res.status(404).json({ message: "Station not found" });
    res.status(200).json({ message: " delete data .." });
  } catch (error) {
    res.status(406).json({ error: error.message });
  }
};

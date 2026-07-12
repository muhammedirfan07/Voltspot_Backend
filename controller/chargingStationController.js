const evstations = require("../Models/evChargingStationModel");
const notifications = require("../Models/notificationModal");
const { io, connectedPartners } = require("../Socket.io/socketConfig");
// Utility function to validate latitude and longitude
const isValidCoordinates = (longitude, latitude) => {
  const lon = parseFloat(longitude);
  const lat = parseFloat(latitude);
  return (
    !isNaN(lon) &&
    !isNaN(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

// Utility function to validate URL format
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

//---------------------------------------------Add a new charging station (Form Data)--------------------------------------------------------------------------
exports.addChargingStation = async (req, res) => {
  console.log("inside addChargingStation.....⚡⚡⚡⚡⚡⚡");

  try {
    const {
      stationName,
      longitude,
      latitude,
      mapUrl,
      pricePerHour,
      availableSlots,
      chargingType,
      vehicleType,
      city,
      state,
    } = req.body;

    const partnerId = req.partnerId;
    console.log("Partner Id:", partnerId);
    console.log(req.body);

    // Validate longitude and latitude format
    if (!isValidCoordinates(longitude, latitude)) {
      return res
        .status(400)
        .json({ message: "Invalid longitude or latitude format" });
    }

    // Validate URL format
    if (!isValidUrl(mapUrl)) {
      return res.status(400).json({ message: "Invalid mapUrl format" });
    }
    // Get image path from uploaded file
    const image = req.file ? req.file.path : null;

    // Find the last station to get the next stationId
    const lastStation = await evstations.findOne().sort({ stationId: -1 });
    const newStationId = lastStation ? lastStation.stationId + 1 : 1;

    const newStation = new evstations({
      stationId: newStationId,
      stationName,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      image,
      mapUrl,
      pricePerHour,
      availableSlots,
      chargingType,
      vehicleType,
      city,
      state,
      partnerId,
    });
    console.log("newStation:", newStation);

    await newStation.save();
    res
      .status(200)
      .json({ message: "Charging station added successfully", newStation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//---------------------------------------------------Get All Charging Stations to admin ---------------------------------------------------------------------------------
exports.getAllStations = async (req, res) => {
  console.log("inside getAllStations.....🚗🚗🚗🚗🚗🚗");

  try {
    const Allstations = await evstations.find({});
    res.status(200).json(Allstations);
    console.log("Allstations:", Allstations);
  } catch (error) {
    res.status(500).json(error);
  }
};
//   ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//-----------------------------------------Get a Single Charging Station by ID-------------------------------------------------------------------------------
exports.getStationById = async (req, res) => {
  console.log("inside getStationById.....😊😊😊");
  try {
    const evstation = await evstations.findById(req.params.id);
    console.log("Fetching station with ID:", req.params.id);
    if (!evstation)
      return res.status(404).json({ message: "Station not found" });

    res.status(200).json(evstation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//---------------------------------------------------get  patners all stations--------------------------------------------------------------------------------
exports.getPartnerStations = async (req, res) => {
  console.log("inside getPartnerStations.....😊😊😊");
  try {
    const partnerId = req.partnerId;
    console.log("Partner Id:", partnerId);
    const partnerStations = await evstations.find({ partnerId });
    res.status(200).json(partnerStations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//-----------------------------------------------------------Update a Charging Station-----------------------------------------------------------------------
exports.updateStation = async (req, res) => {
  console.log("inside updateStation.....⚡⚡⚡🚗🚗");

  try {
    const {
      stationName,
      longitude,
      latitude,
      mapUrl,
      pricePerHour,
      availableSlots,
      chargingType,
      vehicleType,
      city,
      state,
    } = req.body;

    const station = await evstations.findById(req.params.id);
    if (!station) return res.status(404).json({ message: "Station not found" });

    const updateData = {
      stationName,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      mapUrl,
      pricePerHour,
      availableSlots,
      chargingType,
      vehicleType,
      city,
      state,
    };

    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedStation = await evstations.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (!updatedStation) {
      return res.status(404).json({ message: "Station not found" });
    } else {
      res.status(200).json(updatedStation);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//------------------------------------------------------------------Delete a Charging Station-----------------------------------------------------------------
exports.deleteStation = async (req, res) => {
  console.log(" inside the delectStaion.....😶😶");
  const id = req.params.id;
  console.log("id:", id);

  try {
    const deletedStation = await evstations.findByIdAndDelete(id);
    if (!deletedStation)
      return res.status(404).json({ message: "Station not found" });
    res.status(200).json({ message: "Station deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//-------------------------------------------- Filter Stations by City, State, Charging Type, and Vehicle Type--------------------------------------------------
exports.filterStations = async (req, res) => {
  console.log("inside the filter Stations..😊😊");

  try {
    const { city, state, chargingType, vehicleType } = req.query;
    console.log("req.query :", req.query);
    const filter = { status: "approved" };

    if (city) filter.city = new RegExp(`^${city.trim()}$`, "i");
    if (state) filter.state = new RegExp(`^${state.trim()}$`, "i");
    if (chargingType)
      filter.chargingType = new RegExp(`^${chargingType.trim()}$`, "i");
    if (vehicleType)
      filter.vehicleType = new RegExp(`^${vehicleType.trim()}$`, "i");

    const filteredStations = await evstations.find(filter);
    res.status(200).json(filteredStations);
    console.log("filteredStations", filteredStations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//-----------------------------------------------Approve &Rejection -----------------------------------------------------------------------------------------------
exports.approveAndRejectStaion = async (req, res) => {
  const io = req.io;
  console.log("Inside the approve station controller🫂🫂🫂");

  try {
    const { status, rejectionReason } = req.body;
    const stationId = req.params.id;
    console.log("Station ID:", stationId);
    const station = await evstations.findById(stationId);
    console.log("Station details:", station);

    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    station.status = status;
    station.rejectionReason =
      status === "rejected"
        ? rejectionReason ||
          "Your station is rejected for some reasons. Please inquire with us."
        : undefined;
    await station.save();

    // Build the correct message for both outcomes
    const notificationMessage =
      status === "approved"
        ? `Your station "${station.stationName}" has been approved.`
        : `Your station "${station.stationName}" has been rejected. Reason: ${station.rejectionReason}`;

    // Create a notification for the partner
    const newnotification = new notifications({
      partnerId: station.partnerId,
      stationId: station._id,
      message: notificationMessage,
      status: status,
    });
    console.log("Station Partner ID:", station.partnerId);
    console.log("new notification:", newnotification);

    await newnotification.save();

    res.status(200).json({
      message: "Station status updated successfully",
      station,
      notification: newnotification,
    });
  } catch (error) {
    console.error("Error updating station status:", error);
    res.status(500).json({
      message: "Error updating station status",
      error: error.message || error,
    });
  }
};

/// ----------------------------------------------- view all approved staion in users------------------------------------------------------------------------------
exports.viewAllStation = async (req, res) => {
  console.log("inside the view all sttionas...");
  try {
    const allStions = await evstations.find({ status: "approved" });
    res.status(200).json(allStions);
    console.log(allStions);
  } catch (err) {
    res.status(404).json({ message: "error the geting sations", err });
  }
};
//-------------------------------------------------total ev station conunt ------------------------------------------------------------------------------------
exports.getAllStationCount = async (req, res) => {
  console.log("inside the all stattion count.......");
  try {
    const numberOfStations = await evstations.countDocuments({});
    res.status(200).json({ conunt: numberOfStations });
  } catch (err) {
    res.json(err);
  }
};

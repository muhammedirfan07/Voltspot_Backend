const mongoose = require("mongoose")


const VehicleDataSchema = new mongoose.Schema({
   userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true
   },
   vehicleName :{
          type:String,
          required:true
   },
   RegisterNumber:{
          type:String,
          unique:true,
          required:true
   },
  chargingTypes: {
         type:String,
         enum:["slow", "fast", "superfast"],
         required:true
  },
  batteryCapacity:{
         type:Number,
         required:true
  },
 
   
})

const Vehicles = mongoose.model("vehicles",VehicleDataSchema)
module.exports = Vehicles
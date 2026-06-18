const mongoose = require("mongoose")

const patnersSchema =new mongoose.Schema({
    StationName:{
        type:String,
        required:true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    isVerified:{
        type:Boolean,
        default:false,
        required:true
    },
    verificationCode:{
       type :String
    },role: {
        type: String,
        default: "partner", 
    }

},{timestamps:true})

const patners =mongoose.model("patners",patnersSchema)
module.exports=patners
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
    },
    role: {
        type: String,
        default: "partner", 
    },
    expiresAt :{
        type:Date,
        default :()=>new Date(Date.now()+10*60*1000)
    }
},{timestamps:true})
patnersSchema.index({expiresAt:1},{exprireAfterSeonds:0})
const patners =mongoose.model("patners",patnersSchema)
module.exports=patners
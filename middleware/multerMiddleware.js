const multer= require('multer') 
const cloudinary = require("../Config/cloudinary")
const {CloudinaryStorage}=require('multer-storage-cloudinary')

const storage = new CloudinaryStorage({
    cloudinary:cloudinary,
    params:{
        folder:'voltspot',
        allowed_formate:['jpg','jpeg','png']
    }
})


const multerMiddleware =multer({
    storage
})
module.exports = multerMiddleware
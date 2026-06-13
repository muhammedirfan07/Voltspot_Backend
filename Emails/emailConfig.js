
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host:"smtp.gmail.com",
    service:process.env.SERVICE,
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  console.log("---Email access working----   ");



  transporter.verify((error,success)=>{
    if(error){
      console.log(error);
      
    }else{
      console.log("ready to message😍😍😍");
      console.log(success);
      
      
    }
  })
  module.exports=transporter
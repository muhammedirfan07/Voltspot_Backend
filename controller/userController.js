const users = require("../Models/UserModal");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sendForgotPasswordEmail } = require("../Emails/sendEmail");


//register================================================================================================================================================
exports.UserRegisterController = async (req, res) => {
  console.log("Inside UserRegisterController...😍😍");
  const { fullName, email, password, confirmPassword, role } = req.body;

  try {
    // Validate input fields
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(401).json({ error: "All fields are required" });
    }
    // Validate email format using RegEx
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Ensure passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Check if user already exists
    const existUser = await users.findOne({ email });
    if (existUser) {
      return res
        .status(406)
        .json({ error: "Account already exists, please log in 💕💕" });
    }

    // Set user role (default: 'user')
    const newUser = new users({
      fullName,
      email,
      password,
      role: role || "user",
    });

    // Save the user
    await newUser.save();
    res
      .status(200)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Server error", details: error.message });
  }
};
//=====================================================================================================================================================

// login =============================================================================================================================================
exports.UserLoginController = async (req, res) => {
  console.log("Inside UserLoginController...😎😎");

  const { email, password } = req.body;

  try {
    const existUser = await users.findOne({ email });

    if (!existUser) {
      return res
        .status(406)
        .json({ message: "Incorrect Email/Password. Try again!" });
    }

    // Check if the user is an admin
    if (existUser.role === "admin") {
      // Admin login without bcrypt password hashing
      if (password !== existUser.password) {
        return res
          .status(400)
          .json({ message: "Incorrect Email/Password. Try again!" });
      }
    } else {
      // User login (with bcrypt password hashing)
      let passwordMatching = await bcrypt.compare(password, existUser.password);
      if (!passwordMatching) {
        return res
          .status(400)
          .json({ message: "Incorrect Email/Password. Try again!" });
      }
    }

    // Generate token
    const token = jwt.sign(
      { userId: existUser._id, role: existUser.role },
      process.env.JWTPASSWORD,
      { expiresIn: "7d" },
    );  
    console.log(`Token: ${token}`);
    res.status(200).json({ user: existUser, token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
// ======================================================================================================================================================
//forgot password ============================================
exports.forgotPassword = async (req, res) => {
  console.log("Inside ForgotPasswordController...📧");
  const { email } = req.body;
  console.log("email=", req.body);

  try {
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const existUser = await users.findOne({ email });
    console.log("exist=", existUser);

    if (!existUser) {
      return res
        .status(404)
        .json({ error: "No account found with this email" });
    }
    const resetToken = jwt.sign(
      { userId: existUser._id, purpose: "reset-password" },
      process.env.JWTPASSWORD,
      { expiresIn: "15m" },
    );
    console.log("Reset token =", resetToken);
    const resetLink = `${process.env.CLIENT_URL}/resent-password/${resetToken}`;
    console.log(resetLink);

    await sendForgotPasswordEmail(resetLink, existUser);
    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("ForgotPasswordController Error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};
// Verify token before showing reset form =========
exports.VerifyResetTokenController = async (req, res) => {
  console.log("Inside VerifyResetTokenController...🔍");
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWTPASSWORD);

    if (decoded.purpose !== "reset-password") {
      return res.status(400).json({ error: "Invalid token" });
    }

    res.status(200).json({ message: "Token valid" });
  } catch (error) {
    return res.status(400).json({ error: "Reset link is invalid or expired" });
  }
};

// resend Password ===============================
exports.ResetPasswordController = async (req, res) => {
  console.log("Inside ResetPasswordController...🔑");
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  try {
    if (!newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ error: "Both password fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWTPASSWORD);
    } catch (err) {
      return res
        .status(400)
        .json({ error: "Reset link is invalid or expired" });
    }

    if (decoded.purpose !== "reset-password") {
      return res.status(400).json({ error: "Invalid token" });
    }

    const existUser = await users.findById(decoded.userId);
    console.log("existedUSer-resend password  =", existUser);

    if (!existUser) {
      return res.status(404).json({ error: "User not found" });
    }

    existUser.password = newPassword;
    await existUser.save();

    res
      .status(200)
      .json({ message: "Password reset successful. Please log in." });
  } catch (error) {
    console.error("ResetPasswordController Error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

//get all user details====================================================================================================================================
exports.getAllUearsDetails = async (req, res) => {
  console.log("inside  getAllUears....");
  try {
    const allUsers = await users.find({ role: "user" });

    res.status(200).json(allUsers);
  } catch (error) {
    res.status(200).json(error);
  }
};
//=======================================================================================================================================================
exports.GoogleLoginController = async (req, res) => {
  console.log(" inside the google authentication controller--");
  const { fullName, email, googleId } = req.body;
  console.log("req.body =", req.body);

  try {
    let user = await users.findOne({ email });
    console.log("user ==", user);

    if (!user) {
      user = await users.create({
        fullName,
        email,
        googleId: email,
      });
    }
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWTPASSWORD,
      {
        expiresIn: "7d",
      },
    );
    console.log("token =", token);

    res.status(200).json({
      user,
      token,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// get number of user count==============================================================================================================================
exports.getAllUserCount = async (req, res) => {
  console.log("inside the all user cound.......");
  try {
    const numberOfUsers = await users.countDocuments({ role: "user" });
    res.status(200).json({ conunt: numberOfUsers });
  } catch (err) {
    res.json(err);
  }
};

// get single user details  uses authentication and id==============================================================================================================================
exports.singleUserDetails = async (req, res) => {
  console.log("inside the user details controller ..👤👤👤");

  try {
    const userId = req.userId;
    console.log("userid :", userId);

    const userDetails = await users.findById(userId);
    res.status(200).json(userDetails);
    console.log("user Details :", userDetails);
  } catch (error) {
    res.status(406).json(error);
  }
};
// update user profile (phone + profileImage)
exports.updateUserProfile = async (req, res) => {
  console.log("inside updateUserProfile...📝");
  try {
    const userId = req.userId;
    const { fullName, phone } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (req.file) {
      updateData.profileImage = `uploads/${req.file.filename}`;
    }

    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true },
    );
    res
      .status(200)
      .json({ message: "Profile updated successfully", user: updatedUser });
    console.log("updateData =", updateData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

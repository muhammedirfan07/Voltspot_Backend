const jwt = require("jsonwebtoken");

const PatnerAuthMiddleware = (req, res, next) => {
    console.log("inside the partner middleware 😶😶");
    
    const PartnerToken = req.headers["authorization"]?.split(" ")[1]; // Use optional chaining to prevent errors
    if (!PartnerToken) return res.status(401).json({ message: "Token is missing" });

    try {
        const response = jwt.verify(PartnerToken, process.env.JWTPASSWORD);
        
        if (response.role !== "partner") {
            return res.status(403).json({ message: "Access denied for non-partners" });
        }

        req.partnerId = response.partnerId;// Ensure correct key name
        console.log("Partner Id:", req.partnerId);
        
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid partner authorization" });
    }
};

module.exports = PatnerAuthMiddleware;

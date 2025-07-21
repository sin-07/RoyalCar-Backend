import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next)=>{
    const authHeader = req.headers.authorization;
    
    if(!authHeader){
        return res.json({success: false, message: "No authorization header provided"})
    }
    
    // Handle Bearer token format
    let token;
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7); // Remove 'Bearer ' prefix
    } else {
        token = authHeader; // Direct token
    }
    
    if(!token){
        return res.json({success: false, message: "No token provided"})
    }
    
    try {
        // Use jwt.verify instead of jwt.decode for proper verification
        const userId = jwt.verify(token, process.env.JWT_SECRET);
        
        if(!userId){
            return res.json({success: false, message: "Invalid token"})
        }
        
        // Check if this is an admin token (starts with "admin_")
        if(userId.toString().startsWith("admin_")){
            // Create admin user object
            const adminUser = {
                _id: userId,
                email: "aniket.singh9322@gmail.com",
                role: "owner",
                name: "Admin"
            };
            req.user = adminUser;
            console.log("Auth middleware - Admin authenticated:", adminUser.email, "Role:", adminUser.role);
            next();
            return;
        }
        
        // For regular users, find in database
        const user = await User.findById(userId).select("-password");
        
        if(!user){
            return res.json({success: false, message: "User not found"})
        }
        
        req.user = user;
        console.log("Auth middleware - User authenticated:", user.email, "Role:", user.role);
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);
        return res.json({success: false, message: "Token verification failed"})
    }
}
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import "dotenv/config";
import User from "./models/User.js";

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error("MONGODB_URI not found in environment variables");
        }
        
        await mongoose.connect(mongoURI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
};

// Create admin user
const createAdminUser = async () => {
    try {
        console.log("Creating admin user...");
        
        const adminEmail = "aniket.singh9322@gmail.com";
        const adminPassword = "Vicky@123";
        
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (existingAdmin) {
            console.log("Admin user already exists!");
            console.log("Updating admin role...");
            
            // Update existing user to have owner role
            existingAdmin.role = "owner";
            await existingAdmin.save();
            
            console.log("✅ Admin user role updated successfully!");
            console.log("Admin Details:");
            console.log(`- Email: ${existingAdmin.email}`);
            console.log(`- Name: ${existingAdmin.name}`);
            console.log(`- Role: ${existingAdmin.role}`);
            console.log(`- Created: ${existingAdmin.createdAt}`);
        } else {
            console.log("Creating new admin user...");
            
            // Hash the password
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            
            // Create new admin user
            const adminUser = new User({
                name: "Admin Aniket",
                email: adminEmail,
                password: hashedPassword,
                role: "owner"
            });
            
            await adminUser.save();
            
            console.log("✅ Admin user created successfully!");
            console.log("Admin Details:");
            console.log(`- Email: ${adminUser.email}`);
            console.log(`- Name: ${adminUser.name}`);
            console.log(`- Role: ${adminUser.role}`);
            console.log(`- Created: ${adminUser.createdAt}`);
        }
        
        console.log("\n🎉 Admin setup completed!");
        console.log("You can now login with:");
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        
    } catch (error) {
        console.error("❌ Error creating admin user:", error.message);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log("Database connection closed");
        process.exit(0);
    }
};

// Main execution
const main = async () => {
    console.log("🚀 Starting admin user creation process...");
    await connectDB();
    await createAdminUser();
};

main().catch((error) => {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
});

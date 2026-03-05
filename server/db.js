const mongoose = require("mongoose");
require("dotenv").config();

async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("❌ MONGODB_URI is not set. Create a server/.env file with your Atlas connection string.");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB Atlas");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    }
}

module.exports = connectDB;

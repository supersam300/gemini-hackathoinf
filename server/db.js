const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn("⚠️ MONGODB_URI is not set. Database features will be unavailable.");
        return;
    }

    try {
        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB Atlas");
    } catch (err) {
        console.warn("⚠️ MongoDB connection failed. Database features will be unavailable. Error:", err.message);
    }
}

module.exports = connectDB;

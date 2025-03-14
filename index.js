require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { authMiddleware } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Required to parse JSON requests

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => console.error("MongoDB connection error:", err));

// Import and use leaderboard routes
const leaderboardRoutes = require("./routes/leaderboard");
app.use("/leaderboard", authMiddleware, leaderboardRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
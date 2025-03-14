const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// Define Mongoose schema and model
const playerSchema = new mongoose.Schema({
    playerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    score: { type: Number, required: true, min: 0 }, // Prevent negative scores
    createdAt: { type: Date, default: Date.now },
});

// Index for faster sorting in high-traffic scenarios
playerSchema.index({ score: -1 });
const Player = mongoose.model("Player", playerSchema);

// Submit a player's score (handles duplicate submissions & only updates if higher)
router.post("/", async (req, res) => {
    try {
        const { playerId, name, score } = req.body;

        if (!playerId || !name || score == null) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (typeof score !== "number" || score < 0) {
            return res.status(400).json({ error: "Invalid score value" });
        }

        const player = await Player.findOneAndUpdate(
            { playerId },
            { $max: { score }, name }, // Update only if the new score is higher
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: "Score submitted successfully", player });
    } catch (error) {
        console.error("Error submitting score:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch the top scores (optimized for high traffic)
router.get("/top", async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Prevent excessive queries

        const topPlayers = await Player.find()
            .sort({ score: -1 })
            .limit(limit)
            .select("playerId name score"); // Only fetch necessary fields

        res.status(200).json(topPlayers);
    } catch (error) {
        console.error("Error fetching top scores:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Retrieve a player's ranking efficiently
router.get("/rank/:playerId", async (req, res) => {
    try {
        const { playerId } = req.params;
        const player = await Player.findOne({ playerId }).select("playerId name score");

        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        // Efficiently count players with a higher score
        const rank = await Player.countDocuments({ score: { $gt: player.score } }) + 1;

        res.status(200).json({ player, rank });
    } catch (error) {
        console.error("Error retrieving player rank:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Handle API rate limiting (optional: for high traffic)
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: { error: "Too many requests. Please try again later." }
});

router.use(limiter); // Apply rate limiter to all leaderboard routes

module.exports = router;
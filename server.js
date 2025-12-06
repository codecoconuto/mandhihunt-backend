// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Check if API Key exists
if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.error("❌ ERROR: Missing GOOGLE_MAPS_API_KEY in .env");
  process.exit(1);
}

// -------------------------------
// Helper: Map Google Place Object
// -------------------------------
function mapPlace(place, index, baseUrl) {
  return {
    id: place.place_id || `manual-${index}`,
    name: place.name,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    vicinity: place.vicinity,
    rating: place.rating || 0,
    user_ratings_total: place.user_ratings_total || 0,
    photo_reference: place.photos?.[0]?.photo_reference || null,
    photo_url: place.photos?.[0]?.photo_reference
      ? `${baseUrl}/api/photo?ref=${place.photos[0].photo_reference}`
      : null,
  };
}

// -------------------------------
// Google Photo API Route
// -------------------------------
app.get("/api/photo", async (req, res) => {
  const { ref } = req.query;

  if (!ref) return res.status(400).send("Missing photo_reference");

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${ref}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    res.set("Content-Type", "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Failed to fetch photo:", err);
    res.status(500).send("Failed to fetch photo");
  }
});

// -------------------------------
// Main Place Search Route
// -------------------------------
app.get("/api/places", async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng parameters required" });
  }

  const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=restaurant&keyword=mandi&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(googleUrl);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.json([]);
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const places = data.results.map((p, i) => mapPlace(p, i, baseUrl));

    res.json(places);
  } catch (err) {
    console.error("❌ Error fetching places:", err);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

// -------------------------------
// Start Server
// -------------------------------
app.listen(PORT, () => {
  console.log(`🚀 MandhiHunt Backend running on http://localhost:${PORT}`);
});

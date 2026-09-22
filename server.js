const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/weather', async (req, res) => {
  try {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: 'city query param required' });

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch weather' });
    }

    const data = await response.json();

    // Return a cleaned subset
    res.json({
      city: data.name,
      country: data.sys?.country,
      temp: data.main?.temp,
      feels_like: data.main?.feels_like,
      description: data.weather?.[0]?.description,
      humidity: data.main?.humidity,
      wind_speed: data.wind?.speed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Weather Proxy API running on port ${PORT}`);
});
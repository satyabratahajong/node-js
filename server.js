require("dotenv").config();
const axios = require("axios");

const city = process.argv[2];

if (!city) {
  console.log("Usage: node weather.js <city>");
  process.exit(1);
}

async function getWeather(city) {
  try {
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: city,
          appid: process.env.OPENWEATHER_API_KEY,
          units: "metric",
        },
      }
    );

    const { name, main, weather } = response.data;

    console.log(`Weather in ${name}`);
    console.log(`Temperature: ${main.temp}°C`);
    console.log(`Feels like: ${main.feels_like}°C`);
    console.log(`Condition: ${weather[0].description}`);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("City not found.");
    } else {
      console.log("Failed to fetch weather:", error.message);
    }
  }
}

getWeather(city);

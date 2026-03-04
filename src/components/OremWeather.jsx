// src/components/OremWeather.jsx
import { Card, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import NearMeIcon from "@mui/icons-material/NearMe";
import { Temporal } from "@js-temporal/polyfill";
globalThis.Temporal = Temporal;

// Daytime weather icons
const weatherIconsDay = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️❄️",
  51: "🌦️",
  61: "🌧️",
  71: "❄️",
  80: "🌦️",
  95: "⛈️",
};

// Nighttime weather icons
const weatherIconsNight = {
  0: "🌙",
  1: "🌙✨",
  2: "🌙⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️❄️",
  51: "🌦️",
  61: "🌧️",
  71: "❄️",
  80: "🌦️",
  95: "⛈️",
};

// Weather description labels
const weatherLabels = {
  0: "Clear Sky",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime Fog",
  51: "Light Drizzle",
  61: "Rain",
  71: "Snow",
  80: "Rain Showers",
  95: "Thunderstorm",
};

// Moon phase calculator
function getMoonPhase(date = new Date()) {
  const lunarCycle = 29.53058867;
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14));
  const diff = (date - knownNewMoon) / 86400000;
  const phase = ((diff % lunarCycle) + lunarCycle) % lunarCycle;

  if (phase < 1.84566) return "🌑";
  if (phase < 5.53699) return "🌒";
  if (phase < 9.22831) return "🌓";
  if (phase < 12.91963) return "🌔";
  if (phase < 16.61096) return "🌕";
  if (phase < 20.30228) return "🌖";
  if (phase < 23.99361) return "🌗";
  return "🌘";
}

export default function OremWeather({ lat = 40.30592, lon = -111.70692 }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let timer;

    async function fetchWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature,apparent_temperature,weathercode,windspeed,winddirection,cloudcover,pressure_msl,visibility,dewpoint_2m,is_day&timezone=GMT`
        );

        const data = await res.json();
        const cw = data.current;

        const readingInstant = Temporal.Instant.from(cw.time + "Z");

        setWeather({
          ...cw,
          readingInstant,
        });

        const nextInstant = readingInstant.add({ seconds: cw.interval });
        const now = Temporal.Now.instant();
        let delayMs = nextInstant.epochMilliseconds - now.epochMilliseconds;
        delayMs = Math.max(delayMs, 5000);

        timer = setTimeout(fetchWeather, delayMs);
      } catch (err) {
        console.error("Weather fetch error:", err);
        timer = setTimeout(fetchWeather, 60000);
      }
    }

    fetchWeather();
    return () => clearTimeout(timer);
  }, [lat, lon]);

  if (!weather) return null;

  const isNight = weather.is_day === 0;

  let weatherIcon;
  if (isNight && weather.weathercode < 3) {
    weatherIcon = getMoonPhase();
  } else if (isNight) {
    weatherIcon = weatherIconsNight[weather.weathercode] || "❓";
  } else {
    weatherIcon = weatherIconsDay[weather.weathercode] || "❓";
  }

  const tempF = ((weather.temperature * 9) / 5 + 32).toFixed(0);
  const feelsF = ((weather.apparent_temperature * 9) / 5 + 32).toFixed(0);
  const dewF = ((weather.dewpoint_2m * 9) / 5 + 32).toFixed(0);
  const visMiles = (weather.visibility / 1609.34).toFixed(1);
  const windMph = (weather.windspeed * 0.621371).toFixed(0);

  return (
    <Card elevation={1} sx={{ p: 2 }}>
      <CardHeader
        title={`${weatherIcon} ${
          weatherLabels[weather.weathercode] || "Unknown"
        } — ${tempF}°F`}
        subheader={new Date(
          weather.readingInstant.epochMilliseconds
        ).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}
        sx={{ pb: 0, textAlign: "center" }}
      />

      <CardContent>
        <Grid container justifyContent="space-around">
          <Grid>
            {" "}
            <Typography>Feels like: {feelsF}°F</Typography>
            <Typography>
              Wind:{" "}
              <NearMeIcon
                sx={{
                  fontSize: "1rem",
                  verticalAlign: "middle",
                  transform: `rotate(${weather.winddirection + 180}deg)`,
                }}
              />{" "}
              {windMph} mph
            </Typography>
            <Typography>Cloud cover: {weather.cloudcover}%</Typography>
          </Grid>
          <Grid>
            {" "}
            <Typography>Visibility: {visMiles} miles</Typography>
            <Typography>Dew point: {dewF}°F</Typography>
            <Typography>Pressure: {weather.pressure_msl} hPa</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

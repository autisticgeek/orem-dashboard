// src/components/TemperatureChart.jsx
import { useEffect, useState } from "react";
import { Card, CardContent } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { Temporal } from "@js-temporal/polyfill";

export default function TemperatureChart({ lat = 40.30592, lon = -111.70692, hoursToShow = 10 }) {
  const [hours, setHours] = useState([]);
  const [tempsF, setTempsF] = useState([]);

  useEffect(() => {
    let timer;

    async function loadHourly() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=America%2FDenver`;
        const res = await fetch(url);
        const data = await res.json();

        // Get current time in local timezone
        const now = new Date();

        // Find the first future hour
        const startIndex = data.hourly.time.findIndex(t => {
          const tDate = new Date(t + ":00"); // ensure seconds
          return tDate >= now;
        });

        // Slice the next hoursToShow hours
        const times = data.hourly.time.slice(startIndex, startIndex + hoursToShow);
        const tempsC = data.hourly.temperature_2m.slice(startIndex, startIndex + hoursToShow);

        // Format hour labels
        const hourLabels = times.map(t =>
          new Date(t + ":00").toLocaleTimeString([], { hour: "numeric", hour12: true })
        );

        const tempsF = tempsC.map(c => Math.round((c * 9) / 5 + 32));

        setHours(hourLabels);
        setTempsF(tempsF);

        // --- Schedule next refresh at top of next hour ---
        const nextHour = new Date();
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(nextHour.getHours() + 1);
        const delay = nextHour - new Date(); // milliseconds until next hour
        timer = setTimeout(loadHourly, delay);
      } catch (err) {
        console.error("Hourly temp fetch error:", err);
        timer = setTimeout(loadHourly, 60000); // retry in 1 min
      }
    }

    loadHourly();
    return () => clearTimeout(timer);
  }, [lat, lon, hoursToShow]);

  if (!tempsF.length) return null;

  const xValues = hours.map((_, i) => i);
  const yMin = Math.min(...tempsF) - 0.5;
  const yMax = Math.max(...tempsF) + 0.5;

  return (
    <Card elevation={1}>
      <CardContent>
        <LineChart
          height={250}
          grid={{ vertical: true, horizontal: true }}
          disableAxisListener
          xAxis={[{ data: xValues, valueFormatter: i => hours[i] }]}
          yAxis={[{ min: yMin, max: yMax, width: 40, valueFormatter: f => `${f}°F` }]}
          series={[{ data: tempsF, showMark: false, color: "#1976d2" }]}
        />
      </CardContent>
    </Card>
  );
}
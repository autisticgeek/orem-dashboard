// src/components/TemperatureChart.jsx
import { Card, CardHeader, CardContent } from "@mui/material";
import { useState, useEffect } from "react";
import { LineChart } from "@mui/x-charts/LineChart";

export default function TemperatureChart({
  lat = 40.30592,
  lon = -111.70692,
  hoursToShow = 10,
}) {
  const [hours, setHours] = useState([]);
  const [tempsF, setTempsF] = useState([]);

  useEffect(() => {
    let timer;

    async function loadHourly() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=America%2FDenver`;
        const res = await fetch(url);

        const data = await res.json();
        const times = data.hourly.time.slice(0, hoursToShow);
        const tempsC = data.hourly.temperature_2m.slice(0, hoursToShow);

        const hourLabels = times.map((t) =>
          new Date(t).toLocaleTimeString([], {
            hour: "numeric",
            hour12: true,
          })
        );

        const tempsF = tempsC.map((c) => Math.round((c * 9) / 5 + 32));

        setHours(hourLabels);
        setTempsF(tempsF);

        timer = setTimeout(loadHourly, 10 * 60 * 1000);
      } catch (err) {
        console.error("Hourly temp fetch error:", err);
        timer = setTimeout(loadHourly, 60000);
      }
    }

    loadHourly();
    return () => clearTimeout(timer);
  }, [lat, lon, hoursToShow]);

  if (tempsF.length === 0) return null;

  const xValues = hours.map((_, i) => i);
  const yMin = Math.min(...tempsF) - 1;
  const yMax = Math.max(...tempsF) + 1;

  return (
    <Card elevation={1}>
      <CardContent >
        <LineChart
          height={250}
          grid={{ vertical: true, horizontal: true }}
          disableAxisListener
          xAxis={[
            {
              data: xValues,
              valueFormatter: (i) => hours[i],
            },
          ]}
          yAxis={[
            {
              min: yMin,
              max: yMax,
              width: 40,
              valueFormatter: (f) => `${f}°F`,
            },
          ]}
          series={[
            {
              data: tempsF,
              showMark: false,
              color: "#1976d2",
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

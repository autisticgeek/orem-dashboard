// src/components/UtahNewsDispatch.jsx
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  CardHeader,
  ListItem,
  ListItemText,
  List,
} from "@mui/material";
import { Temporal } from "@js-temporal/polyfill";

function toLocalDate(pubDate) {
  try {
    if (!pubDate) return "";

    // Browser parses RSS (RFC-822) reliably
    const jsDate = new Date(pubDate);

    if (isNaN(jsDate.getTime())) {
      console.error("Invalid date:", pubDate);
      return pubDate;
    }

    // Convert to ISO for Temporal
    const iso = jsDate.toISOString();

    const instant = Temporal.Instant.from(iso);

    // Correct API: timeZoneId(), not timeZone()
    const zoned = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());

    return zoned.toLocaleString();
  } catch (e) {
    console.error("Date conversion error:", e, pubDate);
    return pubDate;
  }
}

const PROXY_URL = import.meta.env.VITE_WORKER_URL;
const API_KEY = import.meta.env.VITE_WORKER_KEY;

export default function UtahNewsDispatch() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadFeed() {
      if (!active) return;
      const url = `${PROXY_URL}/cors?url=https://utahnewsdispatch.com/feed/localFeed/`;
      const res = await fetch(url, {
        headers: {
          "x-autisticgeek-key": API_KEY,
        },
      });

      const text = await res.text();

      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");

      const entries = Array.from(xml.querySelectorAll("item")).map((item) => {
        const author =
          item.getElementsByTagNameNS(
            "http://purl.org/dc/elements/1.1/",
            "creator"
          )[0]?.textContent ?? "";
        return {
          id: item.querySelector("guid")?.textContent.split("p=")[1] ?? "",
          title: item.querySelector("title")?.textContent ?? "",
          link: item.querySelector("link")?.textContent ?? "",
          pubDate:
            toLocalDate(item.querySelector("pubDate")?.textContent) ?? "",
          author,
        };
      });

      setItems(entries.slice(0, 4));
    }

    loadFeed();
    const interval = setInterval(loadFeed, 60 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card elevation={1} sx={{ p: 2 }}>
      <CardHeader
        title="Utah News Dispatch"
        sx={{ pb: 0, textAlign: "center" }}
      />
      <CardContent sx={{ pt: 0, display: "flex", justifyContent: "center" }}>
        <List dense>
          {items.map((item) => (
            <ListItem
              key={item?.id}
              sx={{
                cursor: "pointer",
                "&:hover .MuiTypography-root": { textDecoration: "underline" },
              }}
              onClick={() => window.open(item.link, "_blank", "noopener")}
            >
              <ListItemText
                primary={item?.title}
                secondary={`${item?.author} — ${item?.pubDate}`}
                slotProps={{
                  primary: { variant: "body1" },
                  secondary: { variant: "body2" },
                }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

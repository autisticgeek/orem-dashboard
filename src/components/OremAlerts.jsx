import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Typography,
  Link,
} from "@mui/material";
import { Temporal } from "@js-temporal/polyfill";

function toLocalDate(pubDate) {
  try {
    if (!pubDate) return "";
    const jsDate = new Date(pubDate);
    if (isNaN(jsDate.getTime())) return pubDate;
    const iso = jsDate.toISOString();
    const instant = Temporal.Instant.from(iso);
    const zoned = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
    return zoned.toLocaleString();
  } catch {
    return pubDate;
  }
}

const PROXY_URL = import.meta.env.VITE_WORKER_URL;
const API_KEY = import.meta.env.VITE_WORKER_KEY;

export default function OremAlerts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function loadFeed() {
      const url = `${PROXY_URL}/cors?url=https://orem.gov/feed/`;
      const res = await fetch(url, {
        headers: { "x-autisticgeek-key": API_KEY },
      });

      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");

      const entries = Array.from(xml.querySelectorAll("item")).map((item) => {
        const author =
          item.getElementsByTagNameNS(
            "http://purl.org/dc/elements/1.1/",
            "creator"
          )[0]?.textContent ?? "";

        const categories = Array.from(item.querySelectorAll("category")).map(
          (c) => c.textContent.trim()
        );

        return {
          id: item.querySelector("guid")?.textContent.split("p=")[1] ?? "",
          title: item.querySelector("title")?.textContent ?? "",
          link: item.querySelector("link")?.textContent ?? "",
          category: categories[0] ?? "",
          author,
          pubDate: toLocalDate(item.querySelector("pubDate")?.textContent),
        };
      });

      setItems(entries.slice(0, 4));
    }

    loadFeed();
    const interval = setInterval(loadFeed, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card elevation={1} sx={{ p: 2 }}>
      <CardHeader
        title="Orem City Alerts"
        sx={{ pb: 0, textAlign: "center" }}
      />
      <CardContent sx={{ pt: 0 }}>
        <List dense>
          {items.map((item) => (
            <ListItem
              key={item.id}
              disableGutters
              sx={{
                cursor: "pointer",
                "&:hover .MuiTypography-root": {
                  textDecoration: "underline",
                },
              }}
              onClick={() => window.open(item.link, "_blank", "noopener")}
            >
              <ListItemText
                primary={item.title}
                secondary={`${item.category} — ${item.author} — ${item.pubDate}`}
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

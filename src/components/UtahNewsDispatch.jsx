// src/components/UtahNewsDispatch.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  ListItem,
  ListItemText,
  List,
  Button,
  Box,
  ButtonGroup,
} from "@mui/material";
import { Temporal } from "@js-temporal/polyfill";
import { QRCodeSVG } from "qrcode.react";

import { speakParagraph } from "../tts/engine";

// Detect stream mode
const path = window.location.pathname;
const isStream = path === "/stream";

const PROXY_URL = import.meta.env.VITE_WORKER_URL;
const API_KEY = import.meta.env.VITE_WORKER_KEY;

// Utility
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// Normalize text for TTS
function normalizeParagraph(text) {
  if (typeof text !== "string") {
    console.warn("normalizeParagraph received NON-STRING:", text);
    return "";
  }

  return (
    text
      .replace(/\s+/g, " ") // collapse whitespace

      // Political prefixes
      .replace(/\bR[-–—]\s*/g, "Republican ")
      .replace(/\bD[-–—]\s*/g, "Democrat ")

      // Gov. → Governor
      .replace(/\bGov\.\s*/gi, "Governor ")

      // Places
      .replace(/\bSt\. George\b/gi, "Saint George")
      .replace(/\bU\.S\.(?=\W|$)/gi, "U.S.")

      // Months
      .replace(/\bJan\.\b/gi, "January")
      .replace(/\bFeb\.\b/gi, "February")
      .replace(/\bMar\.\b/gi, "March")
      .replace(/\bApr\.\b/gi, "April")
      .replace(/\bJun\.\b/gi, "June")
      .replace(/\bJul\.\b/gi, "July")
      .replace(/\bAug\.\b/gi, "August")
      .replace(/\bSep\.\b/gi, "September")
      .replace(/\bSept\.\b/gi, "September")
      .replace(/\bOct\.\b/gi, "October")
      .replace(/\bNov\.\b/gi, "November")
      .replace(/\bDec\.\b/gi, "December")

      .trim()
  );
}

// Extract REAL paragraphs from HTML
function cleanArticle(html) {
  const div = document.createElement("div");
  div.innerHTML = html;

  // Remove junk elements
  div
    .querySelectorAll(
      "figure, img, figcaption, iframe, script, style, noscript, blockquote, aside"
    )
    .forEach((el) => el.remove());

  div
    .querySelectorAll("div.wp-block-embed, div.wp-block-image")
    .forEach((el) => el.remove());

  // Extract REAL paragraphs
  const paragraphs = [];

  div.querySelectorAll("p").forEach((p) => {
    const text = p.textContent.trim();

    if (!text) return;
    if (/^(SUPPORT|SUBSCRIBE|DONATE|READ MORE|CLICK HERE)/i.test(text)) return;

    paragraphs.push(text);
  });

  return paragraphs;
}

// Fallback browser TTS
async function speakFallback(text) {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve(0);
    window.speechSynthesis.speak(utterance);
  });
}

export default function UtahNewsDispatch() {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isReading, setIsReading] = useState(false);

  const readingRef = useRef(false);
  const itemsRef = useRef([]);

  // Keep latest items for async reading
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // -----------------------------
  // Fetch RSS feed
  // -----------------------------
  const loadFeed = useCallback(async () => {
    const url = `${PROXY_URL}/cors?url=https://utahnewsdispatch.com/feed/localFeed/`;
    const res = await fetch(url, {
      headers: { "x-autisticgeek-key": API_KEY },
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

      const encoded =
        item.getElementsByTagName("content:encoded")[0]?.textContent ??
        item.querySelector("description")?.textContent ??
        "";

      return {
        id: item.querySelector("guid")?.textContent.split("p=")[1] ?? "",
        title: item.querySelector("title")?.textContent ?? "",
        link: item.querySelector("link")?.textContent ?? "",
        pubDate: toLocalDate(item.querySelector("pubDate")?.textContent),
        author,
        content: encoded,
      };
    });

    setItems(entries.slice(0, 5));
  }, []);

  // -----------------------------
  // Unified speak() wrapper
  // -----------------------------
  async function speakParagraphWithCache(articleId, paragraphIndex, text) {
    const normalized = normalizeParagraph(text);

    if (!normalized) return 0;

    if (isStream) {
      try {
        const duration = await speakParagraph(
          articleId,
          paragraphIndex,
          normalized
        );
        return duration;
      } catch (err) {
        console.warn("VITS paragraph failed, falling back:", err);
      }
    }

    return speakFallback(normalized);
  }

  // -----------------------------
  // Read articles
  // -----------------------------
  const readAll = useCallback(() => {
    if (itemsRef.current.length === 0) return;

    window.speechSynthesis.cancel();
    readingRef.current = true;
    setIsReading(true);

    let articleIndex = 0;

    const speakArticle = async () => {
      if (!readingRef.current) return;
      const list = itemsRef.current;

      if (articleIndex >= list.length) {
        if (isStream) {
          await loadFeed();
          await wait(3000);
          articleIndex = 0;
          speakArticle();
          return;
        } else {
          readingRef.current = false;
          setIsReading(false);
          setActiveId(null);
          return;
        }
      }

      const article = list[articleIndex];
      const paragraphs = cleanArticle(article.content);

      let paragraphIndex = 0;

      const speakParagraphLoop = async () => {
        if (!readingRef.current) return;

        if (paragraphIndex >= paragraphs.length) {
          setActiveId(null);
          articleIndex++;
          setTimeout(speakArticle, 4000);
          return;
        }

        setActiveId(article.id);

        const duration = await speakParagraphWithCache(
          article.id,
          paragraphIndex,
          paragraphs[paragraphIndex]
        );

        paragraphIndex++;
        setTimeout(speakParagraphLoop, duration * 1000 || 0);
      };

      speakParagraphLoop();
    };

    speakArticle();
  }, [loadFeed]);

  // -----------------------------
  // Stop reading
  // -----------------------------
  const stopReading = () => {
    if (isStream) return;
    readingRef.current = false;
    window.speechSynthesis.cancel();
    setActiveId(null);
    setIsReading(false);
  };

  // -----------------------------
  // Initial load
  // -----------------------------
  useEffect(() => {
    loadFeed();
    if (!isStream) {
      const interval = setInterval(loadFeed, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [loadFeed]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <Card elevation={1} sx={{ p: 2 }}>
      <CardHeader
        title="Utah News Dispatch"
        sx={{ pb: 0, textAlign: "center" }}
      />

      {isStream && (
        <Box sx={{ textAlign: "center", my: 1 }}>
          <QRCodeSVG value="https://utahnewsdispatch.com/donate/?utm_source=orem.pinyon.dev" />
        </Box>
      )}

      <Box sx={{ textAlign: "center", mb: 1 }}>
        {isStream && !isReading && (
          <Button variant="contained" onClick={readAll}>
            ▶ Start News Stream
          </Button>
        )}
        {!isStream && (
          <ButtonGroup>
            {!isReading ? (
              <Button variant="contained" onClick={readAll}>
                Read All Articles
              </Button>
            ) : (
              <Button variant="outlined" color="error" onClick={stopReading}>
                Stop Reading
              </Button>
            )}
            <Button
              variant="contained"
              href="https://utahnewsdispatch.com/donate/?utm_source=orem.pinyon.dev"
            >
              Donate to UND
            </Button>
          </ButtonGroup>
        )}
      </Box>

      <CardContent sx={{ pt: 0, display: "flex", justifyContent: "center" }}>
        <List dense>
          {items.map((item) => (
            <ListItem
              key={item.id}
              sx={{
                cursor: "pointer",
                background:
                  item.id === activeId ? "rgba(0,150,255,0.15)" : "inherit",
                borderRadius: 1,
                "&:hover .MuiTypography-root": {
                  textDecoration: "underline",
                },
              }}
              onClick={() =>
                window.open(`${item.link}?utm_source=orem.pinyon.dev`, "_blank")
              }
            >
              <ListItemText
                primary={item.title}
                secondary={`${item.author} — ${item.pubDate}`}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

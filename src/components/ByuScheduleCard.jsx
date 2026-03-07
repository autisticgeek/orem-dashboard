import { Fragment, useEffect, useState, useRef } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import ICAL from "ical.js"; // npm install ical.js
import { Temporal } from "@js-temporal/polyfill";

const PROXY_URL = import.meta.env.VITE_WORKER_URL;
const API_KEY = import.meta.env.VITE_WORKER_KEY;

function getNextNDates(n = 7) {
  const today = Temporal.Now.plainDateISO();
  return Array.from({ length: n }, (_, i) => today.add({ days: i }));
}

function isSameDay(d1, d2) {
  return Temporal.PlainDate.compare(d1, d2) === 0;
}

export default function ByuScheduleCard() {
  const [games, setGames] = useState(null);
  const midnightTimeoutRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const url = `${PROXY_URL}/cors?url=https://calendar.byu.edu/iCal/Export/10`;
        const res = await fetch(url, {
          headers: {
            "x-autisticgeek-key": API_KEY,
          },
        });
        const text = await res.text();

        const jcal = ICAL.parse(text);
        const comp = new ICAL.Component(jcal);
        const vevents = comp.getAllSubcomponents("vevent");

        const next3Days = getNextNDates(3);

        const events = vevents
          .map((event) => {
            const e = new ICAL.Event(event);
            const jsDate = e.startDate.toJSDate();
            const date = Temporal.PlainDate.from({
              year: jsDate.getFullYear(),
              month: jsDate.getMonth() + 1,
              day: jsDate.getDate(),
            });
            const time = jsDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return {
              summary: e.summary,
              date,
              time,
              location: e.location || "TBD",
            };
          })
          .filter((ev) => next3Days.some((d) => isSameDay(ev.date, d)))
          .sort((a, b) => Temporal.PlainDate.compare(a.date, b.date));

        setGames(events);
      } catch (err) {
        console.error(err);
      }
    };

    load();

    // Schedule refresh at next midnight
    const scheduleMidnightRefresh = () => {
      const now = Temporal.Now.zonedDateTimeISO();
      const tomorrowMidnight = now
        .add({ days: 1 })
        .with({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      const msUntilMidnight = Math.round(
        tomorrowMidnight.epochMilliseconds - now.epochMilliseconds
      );

      midnightTimeoutRef.current = setTimeout(() => {
        load();
        scheduleMidnightRefresh(); // reschedule next day
      }, msUntilMidnight);
    };

    scheduleMidnightRefresh();

    return () => {
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current);
      }
    };
  }, []);

  if (!games) return null;

  const formatGame = (g) => {
    const dateStr = g.date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
    });

    return (
      <ListItem disableGutters>
        <ListItemText
          primary={g.summary}
          secondary={`${dateStr} • ${g.location} • ${g.time}`}
          slotProps={{
            primary: { variant: "body1" },
            secondary: { variant: "body2" },
          }}
        />
      </ListItem>
    );
  };

  return (
    <Card elevation={1} sx={{ p: 2 }}>
      <CardHeader
        title="BYU Upcoming Games"
        sx={{ pb: 0, textAlign: "center" }}
      />
      <CardContent sx={{ pt: 0, display: "flex", justifyContent: "center" }}>
        <List
          dense
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            rowGap: 1,
            columnGap: 2,
          }}
        >
          {games.length
            ? games.map((g, i) => <Fragment key={i}>{formatGame(g)}</Fragment>)
            : "No upcoming games in the next 7 days"}
        </List>
      </CardContent>
    </Card>
  );
}

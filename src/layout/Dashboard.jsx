import { Container } from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import ByuScheduleCard from "../components/ByuScheduleCard.jsx";
import UvuScheduleCard from "../components/UvuScheduleCard.jsx";
import UtahNewsDispatch from "../components/UtahNewsDispatch.jsx";
import OremAlerts from "../components/OremAlerts.jsx";
import OremWeather from "../components/OremWeather.jsx";
import TemperatureChart from "../components/TemperatureChart.jsx";
import StreamQR from "../components/StreamQR.jsx";

const path = window.location.pathname;
const isStream = path === "/stream";

// Default module registry
const modules = [
  {
    id: 1,
    title: "BYU Upcoming Games",
    component: ByuScheduleCard,
  },
  {
    id: 2,
    title: "UtahNewsDispatch",
    component: UtahNewsDispatch,
  },
  {
    id: 3,
    title: "Orem ALERTS",
    component: OremAlerts,
  },
  {
    id: 4,
    title: "UVU Upcoming Games",
    component: UvuScheduleCard,
  },
  {
    id: 5,
    title: "Orem Weather",
    component: OremWeather,
  },
  {
    id: 6,
    title: "Temperature Chart",
    component: TemperatureChart,
  },
];

export default function Dashboard() {
  return (
    <Container sx={{ pt: 2 }} maxWidth="xl">
      <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
        {modules
          // eslint-disable-next-line no-unused-vars
          .map(({ id, component: Component, props }) => (
            <Component key={id} order={id} id={id} {...props} />
          ))}
        {isStream && <StreamQR />}
      </Masonry>
    </Container>
  );
}

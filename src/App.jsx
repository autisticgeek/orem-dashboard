// src/App.jsx
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Dashboard from "./layout/Dashboard.jsx";
const isDev = import.meta.env.DEV;

const theme = createTheme({
  palette: {
    mode: "dark",
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
      xxl: 2000,
    },
  },
});

export default function App() {
  return (
    <>
      {isDev && <title>Orem Dev</title>}
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Dashboard />
      </ThemeProvider>
    </>
  );
}

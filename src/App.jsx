// src/App.jsx
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Dashboard from "./layout/Dashboard.jsx";

const theme = createTheme({
  palette: {
    mode: "dark",
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Dashboard />
    </ThemeProvider>
  );
}

// src/components/StreamQR.jsx
import { Card, CardContent } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

export default function StreamQR() {
  return (
    <Card elevation={1} sx={{ textAlign: "center" }}>
      <CardContent>
        <QRCodeSVG value="https://orem.pinyon.dev" />
      </CardContent>
    </Card>
  );
}

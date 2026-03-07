// src/components/StreamQR.jsx
import { Card, CardContent, CardHeader } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

export default function StreamQR() {
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <Card elevation={1} sx={{ textAlign: "center" }}>
        <CardHeader title="This dashboard" />
        <CardContent>
          <QRCodeSVG value="https://orem.pinyon.dev" />
        </CardContent>
      </Card>
    </>
  );
}

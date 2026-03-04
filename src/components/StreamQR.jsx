// src/components/StreamQR.jsx
import { Card, CardHeader, CardContent } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";

export default function StreamQR() {
  return (
    <Card elevation={1} sx={{ p: 2, textAlign: "center" }}>
      <CardContent>
        <QRCodeSVG value="https://orem.pinyon.dev" />
        {/* <QRCode
          value="https://orem.pinyon.dev"
          size={200}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={true}
        /> */}
      </CardContent>
    </Card>
  );
}

import "./globals.css";
import "./dashboard.css";

export const metadata = {
  title: "AIRFAIR — Real-Time Airfare Price Index & Predictive Booking",
  description:
    "An institutional airfare intelligence dashboard monitoring airfare price inflation, detecting price surges, and forecasting domestic flight price trends across India.",
  keywords: [
    "Airfare Price Index",
    "India Flight Analytics",
    "Aviation Intelligence",
    "Flight Price Forecasting",
    "Auto Booking"
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}

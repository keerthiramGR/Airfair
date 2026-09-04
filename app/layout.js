import "./globals.css";
import "./dashboard.css";

export const metadata = {
  title: "AIRFAIR — AI-Powered Real-Time Airfare Price Index for India | SIH 2026",
  description:
    "A professional government and analytics-style airfare intelligence dashboard monitoring airfare inflation, detecting price surges, and analyzing domestic flight price trends across India.",
  keywords: [
    "Airfare Price Index",
    "India Flight Analytics",
    "DGCA Airfare Intelligence",
    "Aviation Price Monitoring",
    "Smart India Hackathon 2026",
    "PS 26056"
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

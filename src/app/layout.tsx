import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus FnB BMS | Malaysia Edition",
  description:
    "100% Vercel Serverless Business Management System for Malaysian F&B Chains. Native LHDN MyInvois e-Invoicing, 6% SST, 10% Service Charge, and Offline-First PWA.",
  applicationName: "Nexus FnB BMS",
  authors: [{ name: "Nexus Engineering Team" }],
  keywords: [
    "F&B POS",
    "Malaysia F&B",
    "LHDN MyInvois",
    "SST 6%",
    "Vercel Serverless",
    "Restaurant POS",
    "QSR Kiosk",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents unintended zoom on commercial POS touch screens
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Homebase",
  description: "Home management for our apartment",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Homebase" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#047857",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#e7e5e4] font-sans text-[#1c1917]">
        {children}
      </body>
    </html>
  );
}

/**
 * Root HTML layout shared by every page.
 * Next.js requires this application entry file to be named layout.tsx.
 */

import type { Metadata } from "next";
import type { Viewport } from "next";
import { Rajdhani, Space_Grotesk } from "next/font/google";
import { TapHapticsController } from "@/features/app-feedback/components/tap-haptics-controller";
import "@/styles/dropzone-application.css";

// Swap these font imports if you want the app to feel more Apple-like, OnePlus-like, or arcade-like.
const display = Rajdhani({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  // Browser tab title and search/share description live here.
  title: "Dropzone | Apex Rank Tracker",
  description: "Track your Apex Legends rank, RP progress, friends, and current ranked map.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable}`}>
        <TapHapticsController />
        {children}
      </body>
    </html>
  );
}

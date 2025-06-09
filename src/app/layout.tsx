import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zero Cash Date",
  description: "Calculate your Zero Cash Date (ZCD) - A beautiful financial calculator to determine when you'll run out of money based on your starting amount, burn rate, inflation, and growth.",
  openGraph: {
    title: "Zero Cash Date Calculator",
    description: "Calculate when you'll run out of money with this beautiful financial calculator",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Zero Cash Date Calculator - Money with wings illustration",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zero Cash Date Calculator",
    description: "Calculate when you'll run out of money with this beautiful financial calculator",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

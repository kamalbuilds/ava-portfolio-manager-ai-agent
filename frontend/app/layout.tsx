/* eslint-disable @typescript-eslint/no-unused-vars */
import { Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { MainLayout } from "@/components/layouts/MainLayout";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 2,
  minimumScale: 1,
  userScalable: true,
  themeColor: "#000033",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body
        className={`${inter.className} bg-dark-navy min-h-screen antialiased`}
      >
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}

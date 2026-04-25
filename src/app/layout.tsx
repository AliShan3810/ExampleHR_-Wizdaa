import type { Metadata } from "next";
import localFont from "next/font/local";
import { MSWProvider } from "@/components/MSWProvider";
import { StoreProvider } from "@/components/StoreProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Example HR — Time off",
  description:
    "Employee time-off balances and requests with HCM-backed mock APIs, manager approvals, and optimistic updates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans text-slate-900 antialiased`}
      >
        <MSWProvider>
          <StoreProvider>{children}</StoreProvider>
        </MSWProvider>
      </body>
    </html>
  );
}

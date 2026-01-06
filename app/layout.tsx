import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IsItUp - Uptime Monitor",
  description: "Monitor your websites and services. Get notified when they go down.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

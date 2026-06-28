import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Client — Postman Clone",
  description: "A functional Postman-style API client.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

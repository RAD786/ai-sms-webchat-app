import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Revnex Lead Capture Platform",
  description:
    "Unified lead capture SaaS for service businesses with modular channels for missed-call SMS and future chatbot workflows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${sans.variable} ${display.variable}`}>
        <body className="font-[family-name:var(--font-sans)] text-ink antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}


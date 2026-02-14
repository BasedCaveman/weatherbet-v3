import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReownProvider } from "../lib/auth/ReownProvider";
import { TranslationProvider } from "../hooks/useTranslation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WeatherBet - Bet on Weather in Your City",
  description: "Place bets on weather outcomes in cities worldwide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReownProvider>
          <TranslationProvider>
            {children}
          </TranslationProvider>
        </ReownProvider>
      </body>
    </html>
  );
}

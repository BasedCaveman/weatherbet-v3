import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ["latin"] });

// Dynamically import ReownProvider with SSR disabled
const ReownProvider = dynamic(
  () => import('@/lib/auth/ReownProvider').then(mod => mod.ReownProvider),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "WeatherBet - Bet on Weather in Your City",
  description: "Place bets on weather outcomes in capital cities worldwide. Simple, secure, and transparent.",
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
          {children}
        </ReownProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Roboto_Mono, Roboto } from "next/font/google";
import "./globals.css";
import ClientLayoutShell from "./components/ClientLayoutShell";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
});

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "GetSolutions - AI-Powered Problem Solving Platform",
  description: "Get instant solutions to your problems with our AI-powered platform. Chat, solve, and learn with advanced artificial intelligence technology.",
  keywords: "AI solutions, problem solving, artificial intelligence, chat AI, GetSolutions",
  authors: [{ name: "Fazil" }],
  openGraph: {
    title: "GetSolutions - AI-Powered Problem Solving Platform",
    description: "Get instant solutions to your problems with our AI-powered platform.",
    url: "https://getsolutions.vercel.app",
    siteName: "GetSolutions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GetSolutions - AI-Powered Problem Solving Platform",
    description: "Get instant solutions to your problems with our AI-powered platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons&display=swap&v=2" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap&v=2" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://getsolutions.vercel.app" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`${inter.variable} ${robotoMono.variable} ${roboto.variable} antialiased`}>
        <ClientLayoutShell>
          {children}
        </ClientLayoutShell>
        <Analytics />
      </body>
    </html>
  );
}

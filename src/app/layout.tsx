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
  metadataBase: new URL("https://angelvdevil.com"),
  title: "Angel vs Devil — Can You Trap an Angel?",
  description:
    "Play the Devil and try to trap an angel on an infinite grid. A browser game based on Conway's Angel Problem from combinatorial game theory.",
  keywords: [
    "angel problem",
    "conway",
    "combinatorial game theory",
    "math game",
    "strategy game",
    "browser game",
    "infinite grid",
  ],
  authors: [{ name: "Angel vs Devil" }],
  openGraph: {
    title: "Angel vs Devil — Can You Trap an Angel?",
    description:
      "Play the Devil and try to trap an angel on an infinite grid. Based on Conway's Angel Problem.",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Angel vs Devil game — golden angel on a dark grid surrounded by red blocked cells",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Angel vs Devil — Can You Trap an Angel?",
    description:
      "Play the Devil and try to trap an angel on an infinite grid. Based on Conway's Angel Problem.",
    images: ["/og-image.svg"],
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#ededed]">
        {children}
      </body>
    </html>
  );
}

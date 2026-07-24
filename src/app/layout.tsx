import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "./context/AuthProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Whistr — Honest feedback, anonymously.";
const description =
  "Whistr gives you a link to collect anonymous feedback. Where your identity stays a secret.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ),
  title,
  description,
  applicationName: "Whistr",
  openGraph: {
    title,
    description,
    siteName: "Whistr",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

// Set the theme before paint to avoid a flash of the wrong palette.
const themeInit = `
(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen flex flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <AuthProvider>
          <Navbar />
          <main id="main-content" className="flex-1 flex flex-col">
            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

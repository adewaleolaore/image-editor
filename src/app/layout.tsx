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
  title: "YouTube Arsenal - AI-Powered Content Creation Suite",
  description: "Complete YouTube content creation toolkit with AI-powered transcript analysis, thumbnail generation, viral clip detection, and smart content optimization tools.",
  keywords: [
    "YouTube", "content creation", "AI", "thumbnails", "transcripts", 
    "video analysis", "viral clips", "YouTube optimization", "Gemini AI"
  ],
  authors: [{ name: "YouTube Arsenal" }],
  openGraph: {
    title: "YouTube Arsenal - AI Content Creation Suite",
    description: "Transform your YouTube content with AI-powered tools for thumbnails, transcripts, and viral clip detection.",
    type: "website",
    url: "https://youtube-arsenal.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Arsenal - AI Content Creation Suite",
    description: "Transform your YouTube content with AI-powered tools for thumbnails, transcripts, and viral clip detection.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

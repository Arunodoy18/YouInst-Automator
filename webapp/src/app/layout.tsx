import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import "@/lib/validateEnv"; // Validates environment on server startup

export const metadata: Metadata = {
  title: "YouInst Automator — AI Content Studio",
  description: "Fully automated AI-powered YouTube Shorts & Instagram Reels generation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

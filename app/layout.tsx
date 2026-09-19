import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./immersive.css";
import { PWARegister } from "./pwa-register";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  return {
    metadataBase: base,
    title: "Serena — Cuidado conversacional com IA",
    description: "Um espaço seguro de escuta, reflexão e apoio conversacional com inteligência artificial.",
    manifest: "/manifest.webmanifest",
    applicationName: "Serena",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Serena" },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/icon-192.png" },
    openGraph: { title: "Serena", description: "Cuidado conversacional com IA. Um espaço seguro para conversar.", images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "Serena", description: "Cuidado conversacional com IA.", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<PWARegister /></body></html>;
}

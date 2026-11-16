import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Myanmar } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import InstallPrompt from "@/components/pwa/InstallPrompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  variable: "--font-noto-myanmar",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "NweNyeinHill Monastery",
    template: "%s | NweNyeinHill Monastery",
  },
  description:
    "NweNyeinHill Monastery — Dhamma teachings, history, activities, chants, and an e-book library.",
  applicationName: "NweNyeinHill Monastery",
  appleWebApp: {
    capable: true,
    title: "NweNyeinHill",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7F1D1D" },
    { media: "(prefers-color-scheme: dark)", color: "#450A0A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoMyanmar.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}

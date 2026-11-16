import type { Metadata } from "next";
import { Inter, Noto_Sans_Myanmar } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoMyanmar.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

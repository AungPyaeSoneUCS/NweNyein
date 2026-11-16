import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NweNyeinHill Monastery",
    short_name: "NweNyeinHill",
    description:
      "Dhamma teachings, monastery history, activities, chants, and an e-book library from NweNyeinHill Monastery.",
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#FAF8F5",
    theme_color: "#7F1D1D",
    categories: ["education", "lifestyle"],
    icons: [
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Knowledge",
        short_name: "Knowledge",
        description: "Dhamma teachings and reflections",
        url: "/knowledge",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Library",
        short_name: "Library",
        description: "E-books and documents",
        url: "/library",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Songs",
        short_name: "Songs",
        description: "Dhamma songs and chants",
        url: "/songs",
        icons: [{ src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}

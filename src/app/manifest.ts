import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Homebase",
    short_name: "Homebase",
    description: "Home management for our apartment",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f8",
    theme_color: "#059669",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

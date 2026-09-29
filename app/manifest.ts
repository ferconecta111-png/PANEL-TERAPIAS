import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Panel de Terapeutas",
    short_name: "Panel",
    description: "Agenda, pacientes y pagos — panel de administración para las terapeutas.",
    start_url: "/panel",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

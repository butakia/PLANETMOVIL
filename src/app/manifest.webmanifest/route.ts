export function GET() {
  return Response.json({
    name: "Planet Movil",
    short_name: "Planet Movil",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5fb",
    theme_color: "#1e3a8a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  });
}

import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const image = "https://forge-workout-log.z-hangtian.chatgpt.site/og.png";
  const title = "Forge — Guided Workout Log";
  const description = "A mobile-first guided workout log powered by your live seven-day Google Sheets program.";
  return {
    title,
    description,
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: { title, description, images:[{ url:image, width:1200, height:630, alt:"Forge — Show up. Move forward." }] },
    twitter: { card:"summary_large_image", title, description, images:[image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

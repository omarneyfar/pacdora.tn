import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "FoldView | 3D Carton Preview",
  description: "A simple 3D carton preview MVP with uploadable exterior faces and view-only share links."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

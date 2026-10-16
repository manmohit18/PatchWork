import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patchwork",
  description: "Plan work together and see what needs attention.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}

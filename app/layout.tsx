import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Kalshi Tail Lab | TAMID Quant",
  description: "Walk-forward tail strategy research, ingestion and backtests.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

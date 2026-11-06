import type { Metadata } from "next";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import NoContractBanner from "@/components/NoContractBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenomeChain",
  description: "Patient-sovereign genome + health records on WorldChain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="pt-14">
        <Providers>
          <Nav />
          <NoContractBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}

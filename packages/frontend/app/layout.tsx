import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import NoContractBanner from "@/components/NoContractBanner";
import "./globals.css";

const MiniKitProvider = dynamic(() => import("@/components/MiniKitProvider"), { ssr: false });
const AnonRpcStatus = dynamic(() => import("@/components/AnonRpcStatus"), { ssr: false });

export const metadata: Metadata = {
  title: "GenomeChain",
  description: "Patient-sovereign genome + health records on WorldChain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="pt-14">
        <Providers>
          <MiniKitProvider>
            <Nav />
            <NoContractBanner />
            {children}
            <AnonRpcStatus />
          </MiniKitProvider>
        </Providers>
      </body>
    </html>
  );
}

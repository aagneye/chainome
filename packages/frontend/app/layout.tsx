import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import NoContractBanner from "@/components/NoContractBanner";
import "./globals.css";

const MiniKitProvider = dynamic(() => import("@/components/MiniKitProvider"), { ssr: false });
const AnonRpcStatus = dynamic(() => import("@/components/AnonRpcStatus"), { ssr: false });

export const metadata: Metadata = {
  title: "Chainome",
  description: "Patient-sovereign genomic data marketplace on WorldChain. Sign in with World ID, upload your genome, earn 500 GNM tokens, and control who accesses your data.",
  metadataBase: new URL("https://chainome.vercel.app"),
  openGraph: {
    title: "Chainome",
    description: "Your genome. Your data. Your future. Patient-sovereign genomic marketplace on WorldChain.",
    url: "https://chainome.vercel.app",
    siteName: "Chainome",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chainome",
    description: "Your genome. Your data. Your future. Patient-sovereign genomic marketplace on WorldChain.",
  },
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

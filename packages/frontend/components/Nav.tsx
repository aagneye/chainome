"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMiniKitAddress } from "@/hooks/useMiniKitAddress";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/genome",    label: "Genome" },
  { href: "/records",   label: "Records" },
  { href: "/consent",   label: "Consent" },
  { href: "/studies",   label: "Studies" },
];

export function Nav() {
  const pathname = usePathname();
  const address = useMiniKitAddress();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-genome-border bg-genome-navy/80 backdrop-blur">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold text-genome-teal mr-2">Chainome</Link>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm transition ${
              pathname === href ? "text-genome-teal" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {label}
          </Link>
        ))}
        {address && (
          <div className="ml-auto text-xs text-gray-400 font-mono">
            {address.slice(0, 6)}…{address.slice(-4)}
          </div>
        )}
      </div>
    </nav>
  );
}

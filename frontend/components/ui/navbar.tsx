"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NetworkStatus } from "./network";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Hide navbar on deck page
  if (pathname === "/deck") return null;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "https://ava-portfolio-manager-ai-agent.vercel.app/blog", label: "Blog" },
    { href: "https://ava-portfolio-manager-ai-agent.vercel.app/whitepaper", label: "Whitepaper" },
  ];

  return (
    <nav className="fixed w-full z-50 top-0">
      <div className="backdrop-blur-lg bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold gradient-text">
                  Ava
                </span>
              </Link>
              <Link
                href="https://x.com/0xkamal7"
                target="_blank"
                className="flex"
              >
                <Image
                  src="/placeholder-avatar4.png"
                  alt="Ava the AI Agent"
                  width={32}
                  height={32}
                  className="rounded-full hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>

            {/* Add NetworkStatus in the middle */}
            <div className="hidden lg:flex items-center justify-center flex-1">
              <NetworkStatus />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="nav-link">
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-white p-2"
              >
                <span className="sr-only">Open menu</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      isOpen
                        ? "M6 18L18 6M6 6l12 12"
                        : "M4 6h16M4 12h16M4 18h16"
                    }
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link block px-3 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

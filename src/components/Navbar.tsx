"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  MapPin,
  Search,
  Upload,
  BarChart3,
  Heart,
  Menu,
  X,
  LogIn,
  LogOut,
  User,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Discover", icon: MapPin },
  { href: "/search", label: "Search", icon: Search },
  { href: "/upload", label: "Snapshot", icon: Upload },
  { href: "/saved", label: "Saved", icon: Heart },
  { href: "/dashboard", label: "Impact", icon: BarChart3 },
];

export default function Navbar() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-shadow">
              H
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
              HappeningMY
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User size={16} className="text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-200 hover:shadow-blue-300 transition-all"
              >
                <LogIn size={14} />
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 rounded-lg"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 pt-3 mt-2">
              {user ? (
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg w-full transition-all"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    signInWithGoogle();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg w-full transition-all"
                >
                  <LogIn size={18} />
                  Sign In with Google
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

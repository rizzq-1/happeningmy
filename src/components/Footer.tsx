import Link from "next/link";
import { MapPin, Github, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                H
              </div>
              <span className="text-lg font-bold text-white">HappeningMY</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Discover what&apos;s happening in Malaysia. Powered by Google AI
              for smarter event discovery.
            </p>
          </div>

          {/* Discover */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Discover</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Live Map
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-white transition-colors">
                  Search Events
                </Link>
              </li>
              <li>
                <Link href="/upload" className="hover:text-white transition-colors">
                  Snapshot-to-Event
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Impact Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Cities */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Cities</h4>
            <ul className="space-y-2.5 text-sm">
              {["Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Kota Kinabalu"].map(
                (city) => (
                  <li key={city}>
                    <Link
                      href={`/search?city=${encodeURIComponent(city)}`}
                      className="hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <MapPin size={12} />
                      {city}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Powered By */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">
              Powered By
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>Gemini 1.5 Flash</li>
              <li>Vertex AI</li>
              <li>Google Maps Platform</li>
              <li>Firebase</li>
              <li>Google Cloud Run</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            © {new Date().getFullYear()} HappeningMY. Built for Malaysia 🇲🇾
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              Made with <Heart size={12} className="text-red-500" /> in KL
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              <Github size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

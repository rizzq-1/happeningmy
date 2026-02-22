import { HappeningEvent, EventCategory } from "./types";

// ══════════════════════════════════════════════════════════════
// WhatsOnKL.com Scraper
// ══════════════════════════════════════════════════════════════

// ── Category keyword mapping ────────────────────────────────
const CATEGORY_KEYWORDS: [string[], EventCategory][] = [
  [["music", "concert", "gig", "jazz", "dj", "band", "live", "🎶", "🎵", "🎸", "🎷", "🎤", "🎹"], "music"],
  [["art", "gallery", "exhibition", "theatre", "theater", "dance", "paint", "museum", "📸", "🎨"], "arts"],
  [["food", "drink", "restaurant", "bar", "culinary", "cooking", "brunch", "dinner", "tasting", "cafe", "🍜", "🍕", "🍸", "🍷"], "food"],
  [["sport", "run", "marathon", "fitness", "gym", "football", "badminton", "⚽", "🏃"], "sports"],
  [["tech", "code", "hack", "software", "ai", "data", "startup", "developer", "💻"], "tech"],
  [["business", "networking", "entrepreneur", "conference", "summit", "career", "💼"], "business"],
  [["workshop", "learning", "seminar", "training", "class", "course", "education", "quiz", "trivia", "📚"], "education"],
  [["wellness", "yoga", "meditation", "health", "mental", "mindful", "spa", "retreat", "🧘", "🧗"], "wellness"],
  [["culture", "heritage", "history", "tradition", "festival", "craft", "🏛"], "culture"],
  [["charity", "fundrais", "volunteer", "donation", "ngo", "❤️"], "charity"],
  [["night", "club", "party", "rave", "nightlife", "caliente", "🔥", "🪩"], "nightlife"],
  [["family", "kids", "children", "parent", "👨‍👩‍👧"], "family"],
  [["outdoor", "hike", "trek", "nature", "camp", "adventure", "park", "🌿"], "outdoor"],
  [["community", "meetup", "social", "gathering", "market", "🤝", "🎉"], "community"],
];

function inferCategory(text: string): EventCategory {
  const lower = text.toLowerCase();
  for (const [keywords, cat] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return "community";
}

// ── Malaysian cities with coordinates ───────────────────────
const MY_CITY_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  "kuala lumpur": { lat: 3.139, lng: 101.6869, state: "W.P. Kuala Lumpur" },
  "petaling jaya": { lat: 3.1073, lng: 101.6067, state: "Selangor" },
  "pj": { lat: 3.1073, lng: 101.6067, state: "Selangor" },
  "george town": { lat: 5.4164, lng: 100.3327, state: "Penang" },
  "penang": { lat: 5.4164, lng: 100.3327, state: "Penang" },
  "johor bahru": { lat: 1.4927, lng: 103.7414, state: "Johor" },
  "ipoh": { lat: 4.5975, lng: 101.0901, state: "Perak" },
  "malacca": { lat: 2.1896, lng: 102.2501, state: "Melaka" },
  "melaka": { lat: 2.1896, lng: 102.2501, state: "Melaka" },
  "shah alam": { lat: 3.0733, lng: 101.5185, state: "Selangor" },
  "kota kinabalu": { lat: 5.9804, lng: 116.0735, state: "Sabah" },
  "kuching": { lat: 1.5535, lng: 110.3593, state: "Sarawak" },
  "subang jaya": { lat: 3.0565, lng: 101.5851, state: "Selangor" },
  "bangsar": { lat: 3.1283, lng: 101.6717, state: "W.P. Kuala Lumpur" },
  "mont kiara": { lat: 3.171, lng: 101.651, state: "W.P. Kuala Lumpur" },
  "bukit bintang": { lat: 3.1466, lng: 101.7108, state: "W.P. Kuala Lumpur" },
  "klcc": { lat: 3.1588, lng: 101.7119, state: "W.P. Kuala Lumpur" },
  "cheras": { lat: 3.1073, lng: 101.7533, state: "W.P. Kuala Lumpur" },
  "damansara": { lat: 3.1379, lng: 101.6157, state: "Selangor" },
  "ttdi": { lat: 3.1333, lng: 101.6297, state: "W.P. Kuala Lumpur" },
  "atria": { lat: 3.1326, lng: 101.6271, state: "Selangor" },
  "zepp kl": { lat: 3.1430, lng: 101.7110, state: "W.P. Kuala Lumpur" },
};

function resolveCityCoords(text: string) {
  const lower = text.toLowerCase();
  for (const [name, data] of Object.entries(MY_CITY_COORDS)) {
    if (lower.includes(name)) {
      const display = name.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
      return { city: display, ...data };
    }
  }
  return { city: "Kuala Lumpur", lat: 3.139, lng: 101.6869, state: "W.P. Kuala Lumpur" };
}

// ── Google Maps Geocoding ───────────────────────────────────
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeVenue(venue: string): Promise<{ lat: number; lng: number } | null> {
  if (!venue || venue === "See website") return null;

  // Check cache first
  const cacheKey = venue.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey) ?? null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "your_google_maps_api_key") return null;

  try {
    const address = `${venue}, Kuala Lumpur, Malaysia`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=my`;
    const res = await fetch(url);
    if (!res.ok) { geocodeCache.set(cacheKey, null); return null; }

    const data = await res.json();
    if (data.status === "OK" && data.results?.length > 0) {
      const loc = data.results[0].geometry.location;
      const coords = { lat: loc.lat, lng: loc.lng };
      geocodeCache.set(cacheKey, coords);
      return coords;
    }
    geocodeCache.set(cacheKey, null);
    return null;
  } catch {
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

// ── Month name → number ─────────────────────────────────────
const MONTH_MAP: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
  jan: "01", feb: "02", mar: "03", apr: "04",
  jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// ── Parse emoji-structured event text ───────────────────────
function parseEventText(text: string) {
  // 📅 Sunday, 10 May → date
  // 🕝 8:00 PM or ⏰ 9PM → time
  // 📍 Zepp KL @zeppkualalumpur → venue
  // 🎟️ From RM 250 or 🎟️ RM10 or 🎟️ Free → price
  // 🔗 www.example.com → link

  let date: string | undefined;
  let time: string | undefined;
  let venue: string | undefined;
  let price: string | undefined;
  let link: string | undefined;

  // Date: 📅 <dayname>, <day> <month> [<year>]
  const dateMatch = text.match(/📅\s*(?:\w+,?\s*)?(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const monthStr = dateMatch[2].toLowerCase();
    const month = MONTH_MAP[monthStr];
    const year = dateMatch[3] || "2026"; // default to current year
    if (month) {
      date = `${year}-${month}-${day}`;
    }
  }

  // Time: 🕝 or ⏰ <time>
  const timeMatch = text.match(/[🕝⏰]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/);
  if (timeMatch) {
    let timeStr = timeMatch[1].trim();
    // Parse to 24h format
    const isPM = /pm/i.test(timeStr);
    const isAM = /am/i.test(timeStr);
    timeStr = timeStr.replace(/\s*(AM|PM|am|pm)/, "");

    if (!timeStr.includes(":")) {
      timeStr += ":00";
    }
    const [h, m] = timeStr.split(":").map(Number);
    let hour = h;
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    time = `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Venue: 📍 <venue text> (stop at next emoji or newline)
  const venueMatch = text.match(/📍\s*([^📅🕝⏰🎟🔗\n]+)/);
  if (venueMatch) {
    venue = venueMatch[1].replace(/@\w+/g, "").trim();
  }

  // Price: 🎟️ <price text>
  const priceMatch = text.match(/🎟️?\s*([^📅🕝⏰📍🔗\n]+)/);
  if (priceMatch) {
    price = priceMatch[1].trim();
  }

  // Link: 🔗 <url>
  const linkMatch = text.match(/🔗\s*((?:https?:\/\/)?[\w.-]+\.\w+[\w./\-?=&]*)/);
  if (linkMatch) {
    link = linkMatch[1].startsWith("http") ? linkMatch[1] : `https://${linkMatch[1]}`;
  }

  return { date, time, venue, price, link };
}

// ── Scraped event from WhatsOnKL ────────────────────────────
interface WhatsOnKLEvent {
  title: string;
  url: string;
  imageUrl?: string;
  fullText: string; // raw text with emojis
}

// ── Scrape event detail page ────────────────────────────────
async function scrapeDetailPage(url: string): Promise<{ fullText: string; imageUrl?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { fullText: "" };
    const html = await res.text();

    // Extract main content text (inside <main> or article, or the post content)
    const contentMatch =
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      html.match(/<div[^>]*class="[^"]*(?:entry-content|post-content|content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    let fullText = "";
    if (contentMatch) {
      fullText = contentMatch[1]
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Extract image
    const imgMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/wp-content\/uploads\/[^"']+\.(?:jpg|jpeg|png|webp)/i);
    const imageUrl = imgMatch
      ? imgMatch[1] || (imgMatch[0].startsWith("http") ? imgMatch[0] : `https://whatsonkl.com/${imgMatch[0]}`)
      : undefined;

    return { fullText, imageUrl };
  } catch {
    return { fullText: "" };
  }
}

// ── Parse listing from homepage HTML ────────────────────────
function parseListingPage(html: string): WhatsOnKLEvent[] {
  const events: WhatsOnKLEvent[] = [];
  const seen = new Set<string>();

  // WhatsOnKL uses <h1> tags with <a> links for each event card
  // Pattern: <h1...><a href="...">Title</a></h1> followed by text snippet
  const headingRegex = /<h[12][^>]*>\s*<a[^>]*href=["'](https?:\/\/whatsonkl\.com\/[^"']+)["'][^>]*>\s*([\s\S]*?)\s*<\/a>\s*<\/h[12]>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();

    if (!title || seen.has(url)) continue;
    // Skip non-event pages
    if (url.includes("/about") || url.includes("/pricing") || url.includes("/contact")) continue;
    seen.add(url);

    // Try to find a text snippet near this heading
    const afterHeading = html.slice(match.index + match[0].length, match.index + match[0].length + 500);
    const snippetMatch = afterHeading.match(/([^<]*(?:📅|📍|🎟|🕝|⏰)[^<]*)/);

    events.push({
      title,
      url,
      fullText: snippetMatch ? `${title} ${snippetMatch[1]}` : title,
    });
  }

  // Fallback: match links to whatsonkl.com event slugs
  if (events.length === 0) {
    const linkRegex = /href=["'](https?:\/\/whatsonkl\.com\/(?![#?])[^"']+)["'][^>]*>\s*([^<]+)/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const url = linkMatch[1];
      const title = linkMatch[2].trim();

      if (!title || title.length < 3 || seen.has(url)) continue;
      if (url.includes("/about") || url.includes("/pricing") || url.includes("/contact") || url.includes("/wp-content")) continue;

      seen.add(url);
      events.push({ title, url, fullText: title });
    }
  }

  return events;
}

// ── Map to HappeningEvent ───────────────────────────────────
async function mapToHappeningEvent(ev: WhatsOnKLEvent, parsed: ReturnType<typeof parseEventText>, index: number): Promise<HappeningEvent> {
  const category = inferCategory(`${ev.title} ${ev.fullText}`);
  const venueText = `${parsed.venue || ""} ${ev.fullText}`;
  const cityInfo = resolveCityCoords(venueText);
  const now = new Date().toISOString();
  const isFree = !parsed.price || parsed.price.toLowerCase().includes("free");

  // Try geocoding the venue for precise coordinates
  const geocoded = await geocodeVenue(parsed.venue || ev.title);
  const lat = geocoded?.lat ?? cityInfo.lat;
  const lng = geocoded?.lng ?? cityInfo.lng;

  const sdgGoals: number[] = [];
  if (["education", "tech"].includes(category)) sdgGoals.push(4);
  if (["business"].includes(category)) sdgGoals.push(8);
  if (["community", "culture", "charity", "outdoor", "family"].includes(category)) sdgGoals.push(11);

  // Clean title: remove leading emoji
  const cleanTitle = ev.title.replace(/^[\p{Emoji}\p{Emoji_Component}\s]+/u, "").trim() || ev.title;

  return {
    id: `wkl-${index}-${Date.now()}`,
    title: ev.title,
    description: ev.fullText.slice(0, 300) || `Event from WhatsOnKL: ${cleanTitle}`,
    date: parsed.date || now.slice(0, 10),
    time: parsed.time || "20:00",
    venue: parsed.venue || "See website",
    address: parsed.venue || cityInfo.city,
    city: cityInfo.city,
    state: cityInfo.state,
    lat,
    lng,
    category,
    tags: [category, isFree ? "free" : "paid", "whatsonkl"],
    imageUrl: ev.imageUrl || "/placeholder-event.jpg",
    price: isFree ? "Free" : parsed.price || "See website",
    isFree,
    organizer: "WhatsOnKL",
    website: parsed.link || ev.url,
    attendeeCount: 0,
    sdgGoals,
    status: "published",
    source: "web",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Main fetch function ─────────────────────────────────────
export async function fetchWhatsOnKLEvents(options?: {
  page?: number;
  fetchDetails?: boolean;
}): Promise<{ events: HappeningEvent[]; totalCount: number }> {
  const page = options?.page || 1;
  const fetchDetails = options?.fetchDetails ?? true;

  // Build URL (page 1 = homepage, page 2+ = paginated)
  const url =
    page > 1
      ? `https://whatsonkl.com/?query-33e9b2f4=${page}`
      : "https://whatsonkl.com/";

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch WhatsOnKL (${res.status})`);
  }

  const html = await res.text();
  const listings = parseListingPage(html);

  if (listings.length === 0) {
    return { events: [], totalCount: 0 };
  }

  // Fetch detail pages to get full event info (emoji data + images)
  if (fetchDetails) {
    // Fetch in batches of 5 to be polite
    for (let i = 0; i < listings.length; i += 5) {
      const batch = listings.slice(i, i + 5);
      const details = await Promise.all(batch.map((ev) => scrapeDetailPage(ev.url)));
      for (let j = 0; j < batch.length; j++) {
        if (details[j].fullText) {
          batch[j].fullText = details[j].fullText;
        }
        if (details[j].imageUrl) {
          batch[j].imageUrl = details[j].imageUrl;
        }
      }
    }
  }

  // Map events with geocoded coordinates (batch of 5 to limit API calls)
  const events: HappeningEvent[] = [];
  for (let i = 0; i < listings.length; i += 5) {
    const batch = listings.slice(i, i + 5);
    const mapped = await Promise.all(
      batch.map((ev, j) => {
        const parsed = parseEventText(ev.fullText);
        return mapToHappeningEvent(ev, parsed, i + j);
      })
    );
    events.push(...mapped);
  }

  return { events, totalCount: events.length };
}

// ── No sections needed — WhatsOnKL is a single listing ──────
export const WHATSONKL_PAGES = [
  { id: "1", label: "Latest (Page 1)" },
  { id: "2", label: "Page 2" },
  { id: "3", label: "Page 3" },
  { id: "4", label: "Page 4" },
  { id: "5", label: "Page 5" },
  { id: "6", label: "Page 6" },
  { id: "7", label: "Page 7" },
  { id: "8", label: "Page 8" },
  { id: "9", label: "Page 9" },
  { id: "10", label: "Page 10" },
  { id: "11", label: "Page 11" },
  { id: "12", label: "Page 12" },
  { id: "13", label: "Page 13" },
  { id: "14", label: "Page 14" },
  { id: "15", label: "Page 15" },
  { id: "16", label: "Page 16" },
  { id: "17", label: "Page 17" },
  { id: "18", label: "Page 18" },
  { id: "19", label: "Page 19" },
  { id: "20", label: "Page 20" },
];

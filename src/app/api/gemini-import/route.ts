import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const maxDuration = 60;

const EVENTS_COLLECTION = "events";

// ── Malaysian city coordinates ──────────────────────────────
const MY_CITY_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  "kuala lumpur": { lat: 3.139, lng: 101.6869, state: "W.P. Kuala Lumpur" },
  "petaling jaya": { lat: 3.1073, lng: 101.6067, state: "Selangor" },
  "george town": { lat: 5.4164, lng: 100.3327, state: "Penang" },
  "penang": { lat: 5.4164, lng: 100.3327, state: "Penang" },
  "johor bahru": { lat: 1.4927, lng: 103.7414, state: "Johor" },
  "ipoh": { lat: 4.5975, lng: 101.0901, state: "Perak" },
  "melaka": { lat: 2.1896, lng: 102.2501, state: "Melaka" },
  "shah alam": { lat: 3.0733, lng: 101.5185, state: "Selangor" },
  "kota kinabalu": { lat: 5.9804, lng: 116.0735, state: "Sabah" },
  "kuching": { lat: 1.5535, lng: 110.3593, state: "Sarawak" },
  "subang jaya": { lat: 3.0565, lng: 101.5851, state: "Selangor" },
  "bangsar": { lat: 3.1283, lng: 101.6717, state: "W.P. Kuala Lumpur" },
  "bukit bintang": { lat: 3.1466, lng: 101.7108, state: "W.P. Kuala Lumpur" },
  "klcc": { lat: 3.1588, lng: 101.7119, state: "W.P. Kuala Lumpur" },
  "damansara": { lat: 3.1379, lng: 101.6157, state: "Selangor" },
  "cyberjaya": { lat: 2.9213, lng: 101.6559, state: "Selangor" },
  "putrajaya": { lat: 2.9264, lng: 101.6964, state: "W.P. Putrajaya" },
  "langkawi": { lat: 6.35, lng: 99.8, state: "Kedah" },
};

function resolveCityCoords(text: string) {
  const lower = (text || "").toLowerCase();
  for (const [name, data] of Object.entries(MY_CITY_COORDS)) {
    if (lower.includes(name)) {
      const display = name.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
      return { city: display, ...data };
    }
  }
  return { city: "Kuala Lumpur", lat: 3.139, lng: 101.6869, state: "W.P. Kuala Lumpur" };
}

// ── Google Maps Geocoding for venue-level precision ─────────
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeVenue(
  venue: string,
  city: string,
  address?: string
): Promise<{ lat: number; lng: number } | null> {
  const parts = [venue, address, city, "Malaysia"].filter(Boolean).join(", ");
  const cacheKey = parts.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey) ?? null;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "your_google_maps_api_key") return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts)}&key=${apiKey}&region=my`;
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

// ── Category → emoji map (used as imageUrl for Gemini events) ──
const CATEGORY_EMOJI: Record<string, string> = {
  music: "🎵", arts: "🎨", food: "🍜", sports: "⚽", tech: "💻",
  community: "🤝", education: "📚", business: "💼", wellness: "🧘",
  culture: "🏛️", charity: "❤️", nightlife: "🌙", family: "👨‍👩‍👧‍👦", outdoor: "🌿",
};

// ── Gemini search prompt ────────────────────────────────────
const SEARCH_PROMPT = `You are a Malaysian event discovery assistant. Search the web for REAL upcoming events in Malaysia.

For the given search query, find 8-12 REAL events that you can verify from actual sources like:
- Eventbrite Malaysia
- TimeOut KL
- Peatix
- Facebook Events
- Official event websites
- Tourism Malaysia
- Klook
- TicketMelon

For EACH event, return a JSON object. Return ONLY a valid JSON array (no markdown, no backticks, no explanation).

Each event object must have:
{
  "title": "Real event name",
  "description": "2-3 sentence description based on real information",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (24h format, default 20:00 if unknown)",
  "endTime": "HH:MM or null",
  "venue": "Actual venue name",
  "address": "Real street address",
  "city": "Malaysian city",
  "state": "Malaysian state",
  "category": "One of: music, arts, food, sports, tech, community, education, business, wellness, culture, charity, nightlife, family, outdoor",
  "tags": ["relevant", "tags", "max-5"],
  "price": "e.g. 'RM 50', 'From RM 30', or 'Free'",
  "isFree": true/false,
  "organizer": "Real organizer name",
  "website": "Real URL to event page or null",
  "sdgGoals": [relevant SDG numbers: 4=Education, 8=Economic Growth, 11=Sustainable Communities],
  "confidence": 0.0 to 1.0 (how certain you are this is a real upcoming event),
  "source": "Where you found it (e.g. 'eventbrite', 'peatix', 'official-site')"
}

IMPORTANT:
- Only include events you are confident are REAL and UPCOMING (2026 or late 2025 onwards).
- Do not invent fake events. If you can't find enough real ones, return fewer.
- Include the actual event page URL in the website field.
- confidence should be high (>0.7) only if you found it on a real event listing site.
- Current date: ${new Date().toISOString().slice(0, 10)}`;

// ── Gemini search result type ───────────────────────────────
interface GeminiEventResult {
  title: string;
  description: string;
  date: string;
  time: string;
  endTime?: string | null;
  venue: string;
  address: string;
  city: string;
  state: string;
  category: string;
  tags: string[];
  price: string;
  isFree: boolean;
  organizer: string;
  website?: string | null;
  sdgGoals: number[];
  confidence: number;
  source: string;
}

// ── GET: Search for events via Gemini ───────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("q") || "upcoming events in Kuala Lumpur 2026";

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") {
    return NextResponse.json(
      { error: "GOOGLE_AI_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0.2 },
    });

    const prompt = `${SEARCH_PROMPT}\n\nSearch query: "${searchQuery}"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const events: GeminiEventResult[] = JSON.parse(cleaned);
    if (!Array.isArray(events)) {
      return NextResponse.json({ events: [], totalCount: 0 });
    }

    // Filter low-confidence results and add coordinates
    const filtered = events.filter((ev) => (ev.confidence ?? 0) >= 0.4);

    const enriched = await Promise.all(
      filtered.map(async (ev) => {
        const cityInfo = resolveCityCoords(`${ev.city || ""} ${ev.venue || ""} ${ev.address || ""}`);
        const geo = await geocodeVenue(ev.venue || "", ev.city || cityInfo.city, ev.address);
        return {
          ...ev,
          imageUrl: CATEGORY_EMOJI[ev.category?.toLowerCase()] || "📌",
          lat: geo?.lat ?? cityInfo.lat,
          lng: geo?.lng ?? cityInfo.lng,
          state: ev.state || cityInfo.state,
          city: ev.city || cityInfo.city,
        };
      })
    );

    return NextResponse.json({
      events: enriched,
      totalCount: enriched.length,
      source: "gemini-web-search",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[gemini-import] Search error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST: Import Gemini-found events into Firestore ─────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events: rawEvents } = body as { events: GeminiEventResult[] };

    if (!rawEvents || rawEvents.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, message: "No events to import." });
    }

    // Check for duplicates by title
    const titles = rawEvents.map((e) => e.title);
    const existingTitles = new Set<string>();

    for (let i = 0; i < titles.length; i += 10) {
      const batch = titles.slice(i, i + 10);
      const snap = await getDocs(
        query(collection(db, EVENTS_COLLECTION), where("title", "in", batch))
      );
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.title) existingTitles.add(data.title);
      });
    }

    let imported = 0;
    let skipped = 0;

    for (const raw of rawEvents) {
      if (existingTitles.has(raw.title)) {
        skipped++;
        continue;
      }

      const cityInfo = resolveCityCoords(`${raw.city || ""} ${raw.venue || ""} ${raw.address || ""}`);
      const geo = await geocodeVenue(raw.venue || "", raw.city || cityInfo.city, raw.address);
      const now = Timestamp.now();

      const event = {
        title: raw.title || "Untitled Event",
        description: raw.description || "",
        date: raw.date || new Date().toISOString().slice(0, 10),
        time: raw.time || "20:00",
        endTime: raw.endTime || null,
        venue: raw.venue || "See website",
        address: raw.address || cityInfo.city,
        city: raw.city || cityInfo.city,
        state: raw.state || cityInfo.state,
        lat: geo?.lat ?? cityInfo.lat,
        lng: geo?.lng ?? cityInfo.lng,
        category: raw.category || "community",
        tags: [...(raw.tags || []), "gemini-imported"],
        imageUrl: CATEGORY_EMOJI[raw.category?.toLowerCase()] || "📌",
        price: raw.price || "See website",
        isFree: raw.isFree ?? true,
        organizer: raw.organizer || "Unknown",
        website: raw.website || null,
        attendeeCount: 0,
        sdgGoals: raw.sdgGoals || [11],
        status: "pending",
        source: "ai-extracted",
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, EVENTS_COLLECTION), event);
      imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      total: rawEvents.length,
      message: `Imported ${imported} events (${skipped} duplicates skipped). Events are pending admin approval.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[gemini-import] Import error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebase-admin";
import { SEED_EVENTS } from "@/lib/constants";
import { HappeningEvent } from "@/lib/types";

const EVENTS_COLLECTION = "events";

// ── Malaysian venue/area coordinates for fast lookup ────────
const VENUE_COORDS: Record<string, { lat: number; lng: number }> = {
  "klcc": { lat: 3.1588, lng: 101.7119 },
  "bukit bintang": { lat: 3.1466, lng: 101.7108 },
  "bangsar": { lat: 3.1283, lng: 101.6717 },
  "mont kiara": { lat: 3.171, lng: 101.651 },
  "petaling jaya": { lat: 3.1073, lng: 101.6067 },
  "pj": { lat: 3.1073, lng: 101.6067 },
  "george town": { lat: 5.4164, lng: 100.3327 },
  "penang": { lat: 5.4164, lng: 100.3327 },
  "johor bahru": { lat: 1.4927, lng: 103.7414 },
  "jb": { lat: 1.4927, lng: 103.7414 },
  "ipoh": { lat: 4.5975, lng: 101.0901 },
  "malacca": { lat: 2.1896, lng: 102.2501 },
  "melaka": { lat: 2.1896, lng: 102.2501 },
  "shah alam": { lat: 3.0733, lng: 101.5185 },
  "kota kinabalu": { lat: 5.9804, lng: 116.0735 },
  "kuching": { lat: 1.5535, lng: 110.3593 },
  "subang jaya": { lat: 3.0565, lng: 101.5851 },
  "damansara": { lat: 3.1379, lng: 101.6157 },
  "cheras": { lat: 3.1073, lng: 101.7533 },
  "ttdi": { lat: 3.1333, lng: 101.6297 },
  "cyberjaya": { lat: 2.9213, lng: 101.6559 },
  "putrajaya": { lat: 2.9264, lng: 101.6964 },
  "sunway": { lat: 3.0733, lng: 101.6067 },
  "mid valley": { lat: 3.1178, lng: 101.6775 },
  "pavilion": { lat: 3.149, lng: 101.7134 },
  "suria klcc": { lat: 3.1588, lng: 101.7119 },
  "kuala lumpur": { lat: 3.139, lng: 101.6869 },
  "kl": { lat: 3.139, lng: 101.6869 },
  "selangor": { lat: 3.0733, lng: 101.5185 },
  "publika": { lat: 3.1709, lng: 101.6636 },
  "the bee": { lat: 3.1709, lng: 101.6636 },
  "dataran merdeka": { lat: 3.148, lng: 101.6935 },
  "batu caves": { lat: 3.2379, lng: 101.684 },
  "axiata arena": { lat: 3.0565, lng: 101.5851 },
  "stadium bukit jalil": { lat: 3.0555, lng: 101.6912 },
  "merdeka 118": { lat: 3.1415, lng: 101.7007 },
  "zepp kl": { lat: 3.143, lng: 101.711 },
  "istana budaya": { lat: 3.1714, lng: 101.7027 },
  "dewan filharmonik": { lat: 3.1588, lng: 101.7126 },
};

/** Geocode a venue name using the static lookup, then optionally Google Geocoding API */
async function geocodeVenue(venue: string, city: string): Promise<{ lat: number; lng: number }> {
  const text = `${venue} ${city}`.toLowerCase();

  // Static lookup
  for (const [name, coords] of Object.entries(VENUE_COORDS)) {
    if (text.includes(name)) return coords;
  }

  // Try Google Geocoding API
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== "your_google_maps_api_key") {
    try {
      const address = `${venue}, ${city}, Malaysia`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=my`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && data.results?.length > 0) {
          const loc = data.results[0].geometry.location;
          return { lat: loc.lat, lng: loc.lng };
        }
      }
    } catch { /* fallback below */ }
  }

  // Fallback to city center
  for (const [name, coords] of Object.entries(VENUE_COORDS)) {
    if (city.toLowerCase().includes(name)) return coords;
  }
  return { lat: 3.139, lng: 101.6869 }; // KL default
}

/** Fetch events from Firestore, falling back to seed data. */
async function getLocalEvents(): Promise<HappeningEvent[]> {
  try {
    const snapshot = await adminDb
      .collection(EVENTS_COLLECTION)
      .where("status", "==", "published")
      .limit(100)
      .get();
    if (snapshot.empty) {
      console.warn("[/api/search] Firestore returned 0 published events, using seed data");
      return SEED_EVENTS;
    }
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as HappeningEvent[];
    return events.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  } catch (error) {
    console.error("[/api/search] Firestore query failed:", error);
    return SEED_EVENTS;
  }
}

/**
 * POST /api/search
 * AI-powered event search using Gemini with Google Search grounding.
 *
 * Gemini searches the web for real Malaysian events matching the user's
 * natural-language query, then returns structured JSON results alongside
 * any matching local (seed) events.
 */

const SEARCH_PROMPT = `You are an event discovery assistant for Malaysia. The user is looking for events.

Search the web for REAL upcoming events in Malaysia matching the user's query. Only include events you can verify from real sources like Eventbrite, TimeOut KL, Ticketmaster, Facebook Events, or official event websites.

Return ONLY valid JSON with this structure:
{
  "aiSummary": "Brief 1-2 sentence summary of what you found",
  "events": [
    {
      "title": "Exact event name",
      "description": "2-3 sentence description",
      "date": "YYYY-MM-DD",
      "time": "HH:MM (24h)",
      "venue": "Exact venue name",
      "address": "Full address",
      "city": "City name",
      "state": "Malaysian state",
      "category": "one of: music, arts, food, sports, tech, community, education, business, wellness, culture, charity, nightlife, family, outdoor",
      "tags": ["relevant", "tags"],
      "price": "RM XX or Free",
      "isFree": true/false,
      "organizer": "Organizer name",
      "website": "FULL URL starting with https:// to the event page or ticket page"
    }
  ],
  "searchContext": "Sources you found these events from"
}

CRITICAL RULES:
- Every event MUST have a valid "website" URL starting with https:// pointing to a real webpage.
- Every "venue" must be a real place in Malaysia with a specific name (not generic like "Various locations").
- Only return events you are confident are real. Do NOT hallucinate or make up events.
- Dates must be from today onward.
- Return 3-6 events maximum.
- Return ONLY the JSON, no markdown, no extra text.`;

export async function POST(request: NextRequest) {
  try {
    const { query: userQuery } = await request.json();

    if (!userQuery || typeof userQuery !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // ── Search local Firestore events ────────────────────────
    const allLocalEvents = await getLocalEvents();
    const normalizedQuery = userQuery.toLowerCase();
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);

    const localResults = allLocalEvents
      .map((event) => {
        const text = `${event.title} ${event.description} ${event.tags.join(" ")} ${event.venue} ${event.city} ${event.category}`.toLowerCase();
        const matchCount = queryWords.filter((w) => text.includes(w)).length;
        return { event, matchCount };
      })
      .filter(({ matchCount }) => matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .map(({ event }) => event);

    // ── Call Gemini with Google Search grounding ─────────────
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key") {
      return NextResponse.json({
        results: localResults,
        webResults: [],
        aiSummary: localResults.length > 0
          ? `Found ${localResults.length} matching events in our database.`
          : "Configure GOOGLE_AI_API_KEY to enable AI-powered web search.",
        total: localResults.length,
        query: userQuery,
        engine: "local",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      // @ts-expect-error - Google Search grounding tool
      tools: [{ googleSearch: {} }],
    });

    const result = await model.generateContent(
      `${SEARCH_PROMPT}\n\nUser query: "${userQuery}"\nToday's date: ${new Date().toISOString().split("T")[0]}\nLocation context: Malaysia`
    );

    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        results: localResults,
        webResults: [],
        aiSummary: localResults.length > 0
          ? `Found ${localResults.length} matching events in our database.`
          : "No events found matching your query. Try different keywords.",
        total: localResults.length,
        query: userQuery,
        engine: "gemini-no-results",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Geocode and normalize web results
    const webResults = await Promise.all(
      (parsed.events || []).map(async (evt: Record<string, unknown>, i: number) => {
        const venue = String(evt.venue || "TBA");
        const city = String(evt.city || "Kuala Lumpur");
        const coords = await geocodeVenue(venue, city);
        const website = String(evt.website || "");

        return {
          id: `web-${i + 1}-${Date.now()}`,
          title: evt.title || "Untitled Event",
          description: evt.description || "",
          date: evt.date || "2026-03-01",
          time: evt.time || "00:00",
          venue,
          address: evt.address || `${venue}, ${city}`,
          city,
          state: evt.state || "W.P. Kuala Lumpur",
          lat: coords.lat,
          lng: coords.lng,
          category: evt.category || "community",
          tags: (evt.tags as string[]) || [],
          imageUrl: "",
          price: evt.price || "TBA",
          isFree: evt.isFree ?? false,
          organizer: evt.organizer || "Various",
          website: website.startsWith("http") ? website : (website ? `https://${website}` : ""),
          attendeeCount: 0,
          sdgGoals: [],
          status: "published",
          source: "web",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Filter out web results with no valid website URL
    const validWebResults = webResults.filter(
      (e: { website: string }) => e.website && e.website.startsWith("https://")
    );

    return NextResponse.json({
      results: localResults,
      webResults: validWebResults,
      aiSummary: parsed.aiSummary || "Here's what I found from searching the web.",
      searchContext: parsed.searchContext || "",
      total: localResults.length + validWebResults.length,
      query: userQuery,
      engine: "gemini-search",
    });
  } catch (error) {
    console.error("Search error:", error);

    // Fallback to local search on error
    let userQuery = "";
    try {
      const body = await request.clone().json();
      userQuery = body.query || "";
    } catch { /* ignore */ }

    const fallbackEvents = await getLocalEvents();
    const normalizedQuery = userQuery.toLowerCase();
    const localResults = fallbackEvents.filter((event) => {
      const text = `${event.title} ${event.description} ${event.tags.join(" ")} ${event.venue} ${event.city} ${event.category}`.toLowerCase();
      return normalizedQuery.split(/\s+/).some((w: string) => w.length > 1 && text.includes(w));
    });

    return NextResponse.json({
      results: localResults,
      webResults: [],
      aiSummary: localResults.length > 0
        ? `Found ${localResults.length} matching events in our database.`
        : "Search encountered an issue. Try a different query.",
      total: localResults.length,
      query: userQuery,
      engine: "local-fallback",
    });
  }
}

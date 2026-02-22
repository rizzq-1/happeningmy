import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SEED_EVENTS } from "@/lib/constants";
import { HappeningEvent } from "@/lib/types";

const EVENTS_COLLECTION = "events";

/** Fetch events from Firestore, falling back to seed data. */
async function getLocalEvents(): Promise<HappeningEvent[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(eventsRef, orderBy("date", "asc"), limit(100));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return SEED_EVENTS;
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as HappeningEvent[];
  } catch {
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

const SEARCH_PROMPT = `You are an event discovery assistant for Malaysia. The user is searching for events happening in Malaysia.

Given the user's query, search the web and find real, upcoming events in Malaysia that match their request.

Return ONLY a valid JSON object with this exact structure:
{
  "aiSummary": "A brief 1-2 sentence summary of what you found, written conversationally",
  "events": [
    {
      "id": "web-1",
      "title": "Event name",
      "description": "2-3 sentence description of the event",
      "date": "YYYY-MM-DD (best estimate if exact date unclear)",
      "time": "HH:MM (24h format, use 00:00 if unknown)",
      "venue": "Venue name",
      "address": "Full address",
      "city": "City in Malaysia",
      "state": "Malaysian state",
      "category": "one of: music, arts, food, sports, tech, community, education, business, wellness, culture, charity, nightlife, family, outdoor",
      "tags": ["relevant", "tags"],
      "price": "Price string like 'RM 50' or 'Free'",
      "isFree": true/false,
      "organizer": "Organizer name if known",
      "website": "URL source if available",
      "source": "web"
    }
  ],
  "searchContext": "Brief note about what sources you found this from"
}

Important rules:
- Find 3-8 real events if possible. If you can't find real events, suggest well-known recurring events in Malaysia that match the vibe.
- Focus on events in Malaysia only.
- All dates should be upcoming (from February 2026 onward).
- Be creative interpreting vibe-based queries (e.g., "chill weekend plans" → cafes, art exhibitions, yoga).
- Always return valid JSON, nothing else.`;

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // ── Search local Firestore events ────────────────────────
    const allLocalEvents = await getLocalEvents();
    const normalizedQuery = query.toLowerCase();
    const localResults = allLocalEvents.filter((event) => {
      const text = `${event.title} ${event.description} ${event.tags.join(" ")} ${event.venue} ${event.city} ${event.category}`.toLowerCase();
      const words = normalizedQuery.split(/\s+/);
      return words.some((w) => text.includes(w));
    });

    // ── Call Gemini with Google Search grounding ─────────────
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key") {
      return NextResponse.json({
        results: localResults,
        webResults: [],
        aiSummary: "Configure GOOGLE_AI_API_KEY to enable AI-powered web search.",
        total: localResults.length,
        query,
        engine: "local-fallback",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      // @ts-expect-error - Google Search grounding tool
      tools: [{ googleSearch: {} }],
    });

    const result = await model.generateContent(
      `${SEARCH_PROMPT}\n\nUser query: "${query}"\nCurrent date: ${new Date().toISOString().split("T")[0]}\nLocation context: Malaysia`
    );

    const text = result.response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        results: localResults,
        webResults: [],
        aiSummary: "AI search returned no structured results. Showing local matches.",
        total: localResults.length,
        query,
        engine: "gemini-fallback",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize web results to match our event structure
    const webResults = (parsed.events || []).map((evt: Record<string, unknown>, i: number) => ({
      id: evt.id || `web-${i + 1}`,
      title: evt.title || "Untitled Event",
      description: evt.description || "",
      date: evt.date || "2026-03-01",
      time: evt.time || "00:00",
      venue: evt.venue || "TBA",
      address: evt.address || "",
      city: evt.city || "Kuala Lumpur",
      state: evt.state || "W.P. Kuala Lumpur",
      lat: 3.139 + (Math.random() - 0.5) * 0.1,
      lng: 101.6869 + (Math.random() - 0.5) * 0.1,
      category: evt.category || "community",
      tags: evt.tags || [],
      imageUrl: "",
      price: evt.price || "TBA",
      isFree: evt.isFree ?? false,
      organizer: evt.organizer || "Various",
      website: evt.website || "",
      attendeeCount: 0,
      sdgGoals: [],
      status: "published",
      source: "web",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      results: localResults,
      webResults,
      aiSummary: parsed.aiSummary || "Here's what I found from searching the web.",
      searchContext: parsed.searchContext || "",
      total: localResults.length + webResults.length,
      query,
      engine: "gemini-search",
    });
  } catch (error) {
    console.error("Search error:", error);

    // Fallback to local search on error
    const { query } = await request.clone().json().catch(() => ({ query: "" }));
    const fallbackEvents = await getLocalEvents();
    const normalizedQuery = (query || "").toLowerCase();
    const localResults = fallbackEvents.filter((event) => {
      const text = `${event.title} ${event.description} ${event.tags.join(" ")} ${event.venue} ${event.city} ${event.category}`.toLowerCase();
      return normalizedQuery.split(/\s+/).some((w: string) => text.includes(w));
    });

    return NextResponse.json({
      results: localResults,
      webResults: [],
      aiSummary: "AI search encountered an error. Showing local matches instead.",
      total: localResults.length,
      query,
      engine: "error-fallback",
    });
  }
}

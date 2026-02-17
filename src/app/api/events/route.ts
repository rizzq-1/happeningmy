import { NextRequest, NextResponse } from "next/server";
import { SEED_EVENTS } from "@/lib/constants";

// ── GET: Fetch events (with optional query params) ──────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  const isFree = searchParams.get("isFree");
  const q = searchParams.get("q");

  let events = [...SEED_EVENTS];

  if (q) {
    const query = q.toLowerCase();
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.tags.some((t) => t.includes(query)) ||
        e.city.toLowerCase().includes(query)
    );
  }

  if (category) {
    events = events.filter((e) => e.category === category);
  }

  if (city) {
    events = events.filter((e) => e.city === city);
  }

  if (isFree !== null) {
    events = events.filter((e) => e.isFree === (isFree === "true"));
  }

  return NextResponse.json({ events, total: events.length });
}

// ── POST: Create a new event ────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // In production, this would save to Firestore
    const newEvent = {
      id: `evt-${Date.now()}`,
      ...body,
      attendeeCount: body.attendeeCount || 0,
      status: body.status || "published",
      source: body.source || "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ event: newEvent, message: "Event created" }, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

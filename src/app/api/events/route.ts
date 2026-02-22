import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SEED_EVENTS } from "@/lib/constants";

const EVENTS_COLLECTION = "events";

// ── GET: Fetch events from Firestore (with optional filters) ─
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  const isFree = searchParams.get("isFree");
  const q = searchParams.get("q");

  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (category) {
      constraints.push(where("category", "==", category));
    }
    if (city) {
      constraints.push(where("city", "==", city));
    }
    if (isFree !== null) {
      constraints.push(where("isFree", "==", isFree === "true"));
    }

    constraints.push(orderBy("date", "asc"));
    constraints.push(limit(100));

    const fireQuery = query(eventsRef, ...constraints);
    const snapshot = await getDocs(fireQuery);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let events: any[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fall back to seed data when Firestore is empty
    if (events.length === 0) {
      events = [...SEED_EVENTS];
    }

    // In-memory text search (Firestore doesn't support full-text search)
    if (q) {
      const search = q.toLowerCase();
      events = events.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) =>
          e.title?.toLowerCase().includes(search) ||
          e.description?.toLowerCase().includes(search) ||
          (e.tags || []).some((t: string) => t.toLowerCase().includes(search)) ||
          e.city?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ events, total: events.length });
  } catch (error) {
    console.error("Firestore GET error:", error);
    // Fall back to seed data on error
    let events = [...SEED_EVENTS];
    if (q) {
      const search = q.toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(search) ||
          e.description.toLowerCase().includes(search) ||
          e.tags.some((t) => t.includes(search)) ||
          e.city.toLowerCase().includes(search)
      );
    }
    return NextResponse.json({ events, total: events.length });
  }
}

// ── POST: Create a new event in Firestore ───────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventData = {
      ...body,
      attendeeCount: body.attendeeCount || 0,
      status: body.status || "published",
      source: body.source || "manual",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), eventData);

    return NextResponse.json(
      { event: { id: docRef.id, ...eventData }, message: "Event saved to Firestore" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Firestore POST error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

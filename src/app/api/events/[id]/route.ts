import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENTS_COLLECTION = "events";

// ── GET: Fetch a single event ───────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const snap = await getDoc(doc(db, EVENTS_COLLECTION, id));
    if (!snap.exists()) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ event: { id: snap.id, ...snap.data() } });
  } catch (error) {
    console.error("GET event error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

// ── PATCH: Update event fields (admin edit) ─────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Only allow safe fields to be updated
    const ALLOWED_FIELDS = [
      "title",
      "description",
      "date",
      "time",
      "endDate",
      "endTime",
      "venue",
      "address",
      "city",
      "state",
      "lat",
      "lng",
      "category",
      "tags",
      "imageUrl",
      "price",
      "isFree",
      "organizer",
      "website",
      "status",
      "sdgGoals",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updatedAt = Timestamp.now();

    const docRef = doc(db, EVENTS_COLLECTION, id);
    await updateDoc(docRef, updates);

    return NextResponse.json({ message: "Event updated.", id, updated: Object.keys(updates) });
  } catch (error) {
    console.error("PATCH event error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// ── DELETE: Remove an event from Firestore ──────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
    return NextResponse.json({ message: "Event deleted.", id });
  } catch (error) {
    console.error("DELETE event error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

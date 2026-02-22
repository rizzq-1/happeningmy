import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENTS_COLLECTION = "events";

// ── PATCH: Approve a pending event (set status → published) ─
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    await updateDoc(docRef, {
      status: "published",
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ message: "Event approved and published.", id });
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json({ error: "Failed to approve event" }, { status: 500 });
  }
}

// ── DELETE: Reject/remove a pending event ───────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
    return NextResponse.json({ message: "Event rejected and deleted.", id });
  } catch (error) {
    console.error("Reject error:", error);
    return NextResponse.json({ error: "Failed to reject event" }, { status: 500 });
  }
}

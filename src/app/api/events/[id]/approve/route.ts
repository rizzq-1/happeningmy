import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const EVENTS_COLLECTION = "events";

// ── PATCH: Approve a pending event (set status → published) ─
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await adminDb.collection(EVENTS_COLLECTION).doc(id).update({
      status: "published",
      updatedAt: FieldValue.serverTimestamp(),
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
    await adminDb.collection(EVENTS_COLLECTION).doc(id).delete();
    return NextResponse.json({ message: "Event rejected and deleted.", id });
  } catch (error) {
    console.error("Reject error:", error);
    return NextResponse.json({ error: "Failed to reject event" }, { status: 500 });
  }
}

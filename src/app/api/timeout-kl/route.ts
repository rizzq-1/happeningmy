import { NextRequest, NextResponse } from "next/server";
import { fetchWhatsOnKLEvents } from "@/lib/timeout-kl";
import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Allow extra time for scraping detail pages
export const maxDuration = 60;

const EVENTS_COLLECTION = "events";

// ── GET: Preview events from WhatsOnKL ──────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;

  try {
    const result = await fetchWhatsOnKLEvents({ page, fetchDetails: true });

    return NextResponse.json({
      events: result.events,
      totalCount: result.totalCount,
      source: "whatsonkl",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST: Import WhatsOnKL events into Firestore ────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page } = body as { page?: number };

    // 1. Fetch from WhatsOnKL
    const result = await fetchWhatsOnKLEvents({ page, fetchDetails: true });

    if (result.events.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        total: 0,
        message: "No events found on WhatsOnKL.",
      });
    }

    // 2. Check for duplicates by title
    const titles = result.events.map((e) => e.title);
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

    // 3. Insert new events
    let imported = 0;
    let skipped = 0;

    for (const event of result.events) {
      if (existingTitles.has(event.title)) {
        skipped++;
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...data } = event;
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      await addDoc(collection(db, EVENTS_COLLECTION), {
        ...cleaned,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      total: result.totalCount,
      message: `Imported ${imported} events from WhatsOnKL (${skipped} duplicates skipped).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

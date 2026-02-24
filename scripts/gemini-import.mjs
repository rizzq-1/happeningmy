// Gemini Web Event Importer
// Uses Gemini with Google Search grounding to find and import Malaysian events
// Run with: node --env-file=.env.local scripts/gemini-import.mjs [query]
//
// Examples:
//   node --env-file=.env.local scripts/gemini-import.mjs
//   node --env-file=.env.local scripts/gemini-import.mjs "music festivals KL March 2026"
//   node --env-file=.env.local scripts/gemini-import.mjs "charity events Penang"
//   node --env-file=.env.local scripts/gemini-import.mjs "tech meetups Cyberjaya"

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as readline from "node:readline";

// ── Config ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "happeningdb");

const geminiKey = process.env.GOOGLE_AI_API_KEY;
if (!geminiKey) {
  console.error("ERROR: Missing GOOGLE_AI_API_KEY in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { temperature: 0.2 },
});

// ── Malaysian city coordinates ──────────────────────────────
const MY_CITY_COORDS = {
  "kuala lumpur": { lat: 3.139, lng: 101.6869, state: "W.P. Kuala Lumpur" },
  "petaling jaya": { lat: 3.1073, lng: 101.6067, state: "Selangor" },
  "pj": { lat: 3.1073, lng: 101.6067, state: "Selangor" },
  "george town": { lat: 5.4164, lng: 100.3327, state: "Penang" },
  "penang": { lat: 5.4164, lng: 100.3327, state: "Penang" },
  "johor bahru": { lat: 1.4927, lng: 103.7414, state: "Johor" },
  "ipoh": { lat: 4.5975, lng: 101.0901, state: "Perak" },
  "melaka": { lat: 2.1896, lng: 102.2501, state: "Melaka" },
  "malacca": { lat: 2.1896, lng: 102.2501, state: "Melaka" },
  "shah alam": { lat: 3.0733, lng: 101.5185, state: "Selangor" },
  "kota kinabalu": { lat: 5.9804, lng: 116.0735, state: "Sabah" },
  "kuching": { lat: 1.5535, lng: 110.3593, state: "Sarawak" },
  "subang jaya": { lat: 3.0565, lng: 101.5851, state: "Selangor" },
  "bangsar": { lat: 3.1283, lng: 101.6717, state: "W.P. Kuala Lumpur" },
  "mont kiara": { lat: 3.171, lng: 101.651, state: "W.P. Kuala Lumpur" },
  "bukit bintang": { lat: 3.1466, lng: 101.7108, state: "W.P. Kuala Lumpur" },
  "klcc": { lat: 3.1588, lng: 101.7119, state: "W.P. Kuala Lumpur" },
  "damansara": { lat: 3.1379, lng: 101.6157, state: "Selangor" },
  "cyberjaya": { lat: 2.9213, lng: 101.6559, state: "Selangor" },
  "putrajaya": { lat: 2.9264, lng: 101.6964, state: "W.P. Putrajaya" },
  "cheras": { lat: 3.1073, lng: 101.7533, state: "W.P. Kuala Lumpur" },
  "ampang": { lat: 3.1512, lng: 101.7654, state: "Selangor" },
  "setapak": { lat: 3.1894, lng: 101.7125, state: "W.P. Kuala Lumpur" },
  "kepong": { lat: 3.2093, lng: 101.6346, state: "W.P. Kuala Lumpur" },
  "nilai": { lat: 2.8117, lng: 101.7998, state: "Negeri Sembilan" },
  "seremban": { lat: 2.7297, lng: 101.9381, state: "Negeri Sembilan" },
  "alor setar": { lat: 6.1248, lng: 100.3677, state: "Kedah" },
  "langkawi": { lat: 6.3500, lng: 99.8000, state: "Kedah" },
  "kota bharu": { lat: 6.1256, lng: 102.2385, state: "Kelantan" },
  "kuala terengganu": { lat: 5.3117, lng: 103.1324, state: "Terengganu" },
  "miri": { lat: 4.3995, lng: 114.0089, state: "Sarawak" },
  "sibu": { lat: 2.3000, lng: 111.8500, state: "Sarawak" },
  "sandakan": { lat: 5.8402, lng: 118.1179, state: "Sabah" },
};

function resolveCityCoords(text) {
  const lower = (text || "").toLowerCase();
  for (const [name, data] of Object.entries(MY_CITY_COORDS)) {
    if (lower.includes(name)) {
      const display = name
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
      return { city: display, ...data };
    }
  }
  return { city: "Kuala Lumpur", lat: 3.139, lng: 101.6869, state: "W.P. Kuala Lumpur" };
}

// ── Default search queries for broad coverage ───────────────
const DEFAULT_QUERIES = [
  "upcoming events in Kuala Lumpur 2026",
  "music concerts festivals Malaysia 2026",
  "food festivals Malaysia 2026",
  "tech meetups hackathons Kuala Lumpur 2026",
  "art exhibitions galleries Kuala Lumpur Penang 2026",
  "charity community events Malaysia 2026",
  "sports marathon runs Malaysia 2026",
  "nightlife parties Kuala Lumpur 2026",
  "family kids events Malaysia 2026",
  "wellness yoga retreats Malaysia 2026",
];

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
  "imageUrl": "Real image URL from the event page or null",
  "sdgGoals": [relevant SDG numbers: 4=Education, 8=Economic Growth, 11=Sustainable Communities],
  "confidence": 0.0 to 1.0 (how certain you are this is a real upcoming event),
  "source": "Where you found it (e.g. 'eventbrite', 'timeout-kl', 'peatix', 'official-site')"
}

IMPORTANT:
- Only include events you are confident are REAL and UPCOMING (2026 or late 2025 onwards).
- Do not invent fake events. If you can't find enough real ones, return fewer.
- Include the actual event page URL in the website field.
- confidence should be high (>0.7) only if you found it on a real event listing site.
- Current date: ${new Date().toISOString().slice(0, 10)}`;

// ── Run a Gemini search for events ──────────────────────────
async function searchEvents(searchQuery) {
  try {
    const prompt = `${SEARCH_PROMPT}\n\nSearch query: "${searchQuery}"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const events = JSON.parse(cleaned);
    if (!Array.isArray(events)) return [];
    return events;
  } catch (err) {
    console.warn(`    Search failed for "${searchQuery}": ${err.message}`);
    return [];
  }
}

// ── Check for duplicate events in Firestore ─────────────────
async function isDuplicate(title) {
  try {
    const q = query(collection(db, "events"), where("title", "==", title));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false; // If we can't check, allow the import
  }
}

// ── Build a Firestore-ready event document ──────────────────
function buildEvent(raw) {
  const now = new Date().toISOString();
  const cityInfo = resolveCityCoords(
    `${raw.city || ""} ${raw.venue || ""} ${raw.address || ""}`
  );

  return {
    title: raw.title || "Untitled Event",
    description: raw.description || "",
    date: raw.date || now.slice(0, 10),
    time: raw.time || "20:00",
    endTime: raw.endTime || null,
    venue: raw.venue || "See website",
    address: raw.address || cityInfo.city,
    city: raw.city || cityInfo.city,
    state: raw.state || cityInfo.state,
    lat: cityInfo.lat,
    lng: cityInfo.lng,
    category: raw.category || "community",
    tags: [...(raw.tags || []), "gemini-imported"],
    imageUrl: raw.imageUrl || "/placeholder-event.jpg",
    price: raw.price || "See website",
    isFree: raw.isFree ?? true,
    organizer: raw.organizer || "Unknown",
    website: raw.website || null,
    attendeeCount: 0,
    sdgGoals: raw.sdgGoals || [11],
    status: "pending", // Admin must approve imported events
    source: "ai-extracted",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Interactive CLI ─────────────────────────────────────────
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function printEvent(ev, index) {
  const free = ev.isFree ? "FREE" : ev.price || "?";
  console.log(
    `    ${String(index + 1).padStart(2)}. ${ev.title}`
  );
  console.log(
    `        📅 ${ev.date}  🕐 ${ev.time}  📍 ${ev.venue}, ${ev.city}`
  );
  console.log(
    `        🎟️  ${free}  |  🏷️  ${ev.category}  |  📊 confidence: ${ev.confidence ?? "?"}`
  );
  if (ev.website) console.log(`        🔗 ${ev.website}`);
  console.log();
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log("\n🔍 Gemini Web Event Importer for HappeningMY");
  console.log("   Searches the web for real Malaysian events and imports them to Firestore.\n");

  // Get search queries
  const customQuery = process.argv.slice(2).join(" ");
  let queries;

  if (customQuery) {
    queries = [customQuery];
    console.log(`   Custom search: "${customQuery}"\n`);
  } else {
    console.log("   No query provided. Choose a mode:\n");
    console.log("   1) Auto — Run all default searches (broad coverage)");
    console.log("   2) Interactive — Enter your own search queries");
    console.log("   3) Pick categories — Choose which event types to search\n");

    const mode = await ask("   Enter choice (1/2/3): ");

    if (mode === "2") {
      queries = [];
      console.log("\n   Enter search queries (one per line, empty line to finish):\n");
      while (true) {
        const q = await ask("   > ");
        if (!q) break;
        queries.push(q);
      }
      if (queries.length === 0) {
        console.log("   No queries entered. Exiting.");
        process.exit(0);
      }
    } else if (mode === "3") {
      const categories = [
        "music concerts festivals",
        "food festivals markets",
        "tech meetups hackathons",
        "art exhibitions galleries",
        "charity community volunteer",
        "sports marathon fitness",
        "nightlife parties clubs",
        "family kids events",
        "wellness yoga retreats",
        "business networking conferences",
        "education workshops seminars",
        "culture heritage festivals",
      ];
      console.log("\n   Select categories (comma-separated numbers):\n");
      categories.forEach((c, i) => console.log(`   ${i + 1}) ${c}`));
      const picks = await ask("\n   Enter numbers (e.g. 1,3,5): ");
      const indices = picks.split(",").map((n) => parseInt(n.trim()) - 1);
      queries = indices
        .filter((i) => i >= 0 && i < categories.length)
        .map((i) => `${categories[i]} Malaysia 2026`);
      if (queries.length === 0) queries = DEFAULT_QUERIES.slice(0, 3);
    } else {
      queries = DEFAULT_QUERIES;
    }
  }

  // Search for events
  console.log(`\n   Running ${queries.length} search(es)...\n`);
  const allEvents = [];
  const seenTitles = new Set();

  for (const q of queries) {
    console.log(`   🔎 "${q}"`);
    const results = await searchEvents(q);
    console.log(`      Found ${results.length} events\n`);

    for (const ev of results) {
      // Deduplicate by title
      const key = (ev.title || "").toLowerCase().trim();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      // Filter low-confidence results
      if ((ev.confidence ?? 0) < 0.4) continue;

      allEvents.push(ev);
    }

    // Rate-limit between queries
    await sleep(1000);
  }

  if (allEvents.length === 0) {
    console.log("   No events found. Try different search terms.");
    process.exit(0);
  }

  // Display results
  console.log(`\n   ✅ Found ${allEvents.length} unique events:\n`);
  allEvents.forEach((ev, i) => printEvent(ev, i));

  // Confirm import
  const answer = await ask(
    `   Import all ${allEvents.length} events to Firestore? (y/n/select): `
  );

  let toImport;

  if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
    toImport = allEvents;
  } else if (answer.toLowerCase().startsWith("s") || answer.toLowerCase() === "select") {
    const picks = await ask(
      "   Enter event numbers to import (comma-separated, e.g. 1,3,5-8): "
    );
    toImport = parseSelection(picks, allEvents);
  } else {
    console.log("   Import cancelled.");
    process.exit(0);
  }

  // Import to Firestore
  console.log(`\n   Importing ${toImport.length} events to Firestore...\n`);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const raw of toImport) {
    // Check for duplicates
    const dupe = await isDuplicate(raw.title);
    if (dupe) {
      console.log(`    ⏭️  Skip (duplicate): ${raw.title}`);
      skipped++;
      continue;
    }

    const event = buildEvent(raw);
    try {
      const ref = await addDoc(collection(db, "events"), event);
      console.log(`    ✓ ${event.title} → ${ref.id}`);
      imported++;
    } catch (err) {
      console.error(`    ✗ ${event.title}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n   Done!`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n   Events are imported with status "pending" — approve them in the dashboard.\n`);
  process.exit(0);
}

// ── Helpers ─────────────────────────────────────────────────
function parseSelection(input, events) {
  const selected = [];
  const parts = input.split(",").map((s) => s.trim());
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end && i <= events.length; i++) {
        if (i >= 1) selected.push(events[i - 1]);
      }
    } else {
      const n = parseInt(part);
      if (n >= 1 && n <= events.length) selected.push(events[n - 1]);
    }
  }
  return selected;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main();

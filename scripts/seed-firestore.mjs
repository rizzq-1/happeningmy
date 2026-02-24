// Scrape WhatsOnKL events, enrich with Gemini, and seed Firestore
// Run with: node --env-file=.env.local scripts/seed-firestore.mjs [pages]
// Example:  node --env-file=.env.local scripts/seed-firestore.mjs 3

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  console.error("Missing GOOGLE_AI_API_KEY in .env.local");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const PAGES_TO_SCRAPE = parseInt(process.argv[2] || "3", 10);
const BATCH_SIZE = 5; // concurrent detail-page fetches
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// ── Malaysian city coordinates ──────────────────────────────
const MY_CITY_COORDS = {
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
  "mont kiara": { lat: 3.171, lng: 101.651, state: "W.P. Kuala Lumpur" },
  "bukit bintang": { lat: 3.1466, lng: 101.7108, state: "W.P. Kuala Lumpur" },
  "klcc": { lat: 3.1588, lng: 101.7119, state: "W.P. Kuala Lumpur" },
  "damansara": { lat: 3.1379, lng: 101.6157, state: "Selangor" },
  "cyberjaya": { lat: 2.9213, lng: 101.6559, state: "Selangor" },
};

function resolveCityCoords(text) {
  const lower = (text || "").toLowerCase();
  for (const [name, data] of Object.entries(MY_CITY_COORDS)) {
    if (lower.includes(name)) {
      const display = name.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
      return { city: display, ...data };
    }
  }
  return { city: "Kuala Lumpur", lat: 3.139, lng: 101.6869, state: "W.P. Kuala Lumpur" };
}

// ── Step 1: Scrape listing pages from WhatsOnKL ─────────────
function parseListingPage(html) {
  const events = [];
  const seen = new Set();

  // Match headings with links
  const headingRegex =
    /<h[12][^>]*>\s*<a[^>]*href=["'](https?:\/\/whatsonkl\.com\/[^"']+)["'][^>]*>\s*([\s\S]*?)\s*<\/a>\s*<\/h[12]>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    if (!title || seen.has(url)) continue;
    if (url.includes("/about") || url.includes("/pricing") || url.includes("/contact")) continue;
    seen.add(url);
    events.push({ title, url });
  }

  // Fallback: match links to event slugs
  if (events.length === 0) {
    const linkRegex =
      /href=["'](https?:\/\/whatsonkl\.com\/(?![#?])[^"']+)["'][^>]*>\s*([^<]+)/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const url = linkMatch[1];
      const title = linkMatch[2].trim();
      if (!title || title.length < 3 || seen.has(url)) continue;
      if (/\/(about|pricing|contact|wp-content)/.test(url)) continue;
      seen.add(url);
      events.push({ title, url });
    }
  }

  return events;
}

async function fetchListingPage(page) {
  const url = page > 1
    ? `https://whatsonkl.com/?query-33e9b2f4=${page}`
    : "https://whatsonkl.com/";
  console.log(`  Fetching listing page ${page}: ${url}`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Listing page ${page} returned ${res.status}`);
  return res.text();
}

// ── Step 2: Scrape detail pages ─────────────────────────────
async function scrapeDetailPage(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return { fullText: "", imageUrl: null };
    const html = await res.text();

    // Extract main content
    const contentMatch =
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      html.match(/<div[^>]*class="[^"]*(?:entry-content|post-content|content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    let fullText = "";
    if (contentMatch) {
      fullText = contentMatch[1]
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Extract og:image
    const imgMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    const imageUrl = imgMatch ? imgMatch[1] : null;

    return { fullText: fullText.slice(0, 3000), imageUrl };
  } catch {
    return { fullText: "", imageUrl: null };
  }
}

// ── Step 3: Use Gemini to extract structured event data ─────
const GEMINI_PROMPT = `You are an expert event data extractor for Malaysian events.
Given raw scraped text from an event page, extract a structured JSON object.

Return ONLY a valid JSON object (no markdown, no backticks) with these fields:
{
  "title": "Event title",
  "description": "2-3 sentence description",
  "date": "YYYY-MM-DD (best guess from context, use 2026 if year unclear)",
  "time": "HH:MM in 24h format (default 20:00 if unknown)",
  "endTime": "HH:MM or null",
  "venue": "Venue name",
  "address": "Street address if available",
  "city": "Malaysian city",
  "state": "Malaysian state",
  "category": "One of: music, arts, food, sports, tech, community, education, business, wellness, culture, charity, nightlife, family, outdoor",
  "tags": ["relevant", "tags"],
  "price": "e.g. 'RM 50' or 'Free'",
  "isFree": true/false,
  "organizer": "Organizer name or 'WhatsOnKL'",
  "website": "URL or null",
  "sdgGoals": [relevant SDG numbers from 4=Education, 8=Economic Growth, 11=Sustainable Communities],
  "confidence": 0.0 to 1.0
}

If information is missing, make reasonable inferences for a Malaysian event. Default city to "Kuala Lumpur" if unclear.`;

async function extractWithGemini(title, rawText, sourceUrl) {
  try {
    const prompt = `${GEMINI_PROMPT}\n\nEvent title: ${title}\nSource URL: ${sourceUrl}\n\nRaw scraped text:\n${rawText.slice(0, 2500)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn(`    Gemini extraction failed for "${title}": ${err.message}`);
    return null;
  }
}

// ── Step 4: Build HappeningEvent and save to Firestore ──────
function buildEvent(extracted, imageUrl, sourceUrl, index) {
  const now = new Date().toISOString();
  const cityInfo = resolveCityCoords(
    `${extracted.city || ""} ${extracted.venue || ""} ${extracted.address || ""}`
  );

  return {
    title: extracted.title || "Untitled Event",
    description: extracted.description || "",
    date: extracted.date || now.slice(0, 10),
    time: extracted.time || "20:00",
    endTime: extracted.endTime || null,
    venue: extracted.venue || "See website",
    address: extracted.address || cityInfo.city,
    city: extracted.city || cityInfo.city,
    state: extracted.state || cityInfo.state,
    lat: cityInfo.lat,
    lng: cityInfo.lng,
    category: extracted.category || "community",
    tags: [...(extracted.tags || []), "scraped", "whatsonkl"],
    imageUrl: imageUrl || "/placeholder-event.jpg",
    price: extracted.price || "See website",
    isFree: extracted.isFree ?? true,
    organizer: extracted.organizer || "WhatsOnKL",
    website: extracted.website || sourceUrl,
    attendeeCount: 0,
    sdgGoals: extracted.sdgGoals || [11],
    status: "published",
    source: "web",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Main ────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🕷️  WhatsOnKL Scraper + Gemini Enrichment`);
  console.log(`   Scraping ${PAGES_TO_SCRAPE} page(s)...\n`);

  // 1. Scrape listing pages
  const allListings = [];
  for (let p = 1; p <= PAGES_TO_SCRAPE; p++) {
    try {
      const html = await fetchListingPage(p);
      const listings = parseListingPage(html);
      console.log(`    Found ${listings.length} events on page ${p}`);
      allListings.push(...listings);
    } catch (err) {
      console.error(`    Page ${p} failed: ${err.message}`);
    }
    // Be polite — wait between pages
    if (p < PAGES_TO_SCRAPE) await sleep(1000);
  }

  console.log(`\n  Total listings found: ${allListings.length}\n`);
  if (allListings.length === 0) {
    console.log("  No events found. Exiting.");
    process.exit(0);
  }

  // 2. Fetch detail pages in batches
  console.log("  Fetching detail pages...");
  const detailData = [];
  for (let i = 0; i < allListings.length; i += BATCH_SIZE) {
    const batch = allListings.slice(i, i + BATCH_SIZE);
    const details = await Promise.all(batch.map((ev) => scrapeDetailPage(ev.url)));
    detailData.push(...details);
    if (i + BATCH_SIZE < allListings.length) await sleep(1000);
  }
  console.log(`    Fetched ${detailData.length} detail pages\n`);

  // 3. Extract with Gemini and seed Firestore
  console.log("  Extracting with Gemini & seeding Firestore...\n");
  let seeded = 0;
  let failed = 0;

  for (let i = 0; i < allListings.length; i++) {
    const listing = allListings[i];
    const detail = detailData[i];
    const rawText = detail.fullText || listing.title;

    // Skip if no meaningful content
    if (rawText.length < 20) {
      console.log(`    Skip (too short): ${listing.title}`);
      failed++;
      continue;
    }

    // Extract structured data with Gemini
    const extracted = await extractWithGemini(listing.title, rawText, listing.url);
    if (!extracted) {
      failed++;
      continue;
    }

    // Build event document and save
    const event = buildEvent(extracted, detail.imageUrl, listing.url, i);
    try {
      const ref = await addDoc(collection(db, "events"), event);
      console.log(`    ✓ ${event.title} → ${ref.id}`);
      seeded++;
    } catch (err) {
      console.error(`    ✗ ${event.title}: ${err.message}`);
      failed++;
    }

    // Rate-limit Gemini calls
    if (i < allListings.length - 1) await sleep(500);
  }

  console.log(`\n  Done! Seeded: ${seeded} | Failed: ${failed} | Total: ${allListings.length}`);
  process.exit(0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

seed();

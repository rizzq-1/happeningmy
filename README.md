# 🇲🇾 HappeningMY — AI-Powered Event Discovery for Malaysia

> **Discover, explore, and share events across Malaysia — powered by Google AI, Maps, and Firebase.**

---
## Live site

Want to access the live site? Just open:

https://happening-my.vercel.app/

You can use the deployed app directly without running anything locally.

## Live site

Want to access the live site? Just open:

https://happening-my.vercel.app/

You can use the deployed app directly without running anything locally.


## Project Overview

Malaysia has a vibrant events scene — from music festivals in KL to tech meetups in Cyberjaya and cultural celebrations in Penang — but discovering them is fragmented across dozens of platforms, social media pages, and physical posters. There is no single, intelligent hub for Malaysian event discovery.

**HappeningMY** solves this by combining **Google AI (Gemini)**, **Google Maps**, and **Firebase** into a unified platform that can:

- **Extract event details from poster images** using Gemini's multimodal vision — just upload a flyer and AI does the rest.
- **Search the web for real events** using Gemini with Google Search grounding, returning structured, verified results from sources like Eventbrite, TimeOut KL, and Peatix.
- **Visualize events on a live interactive map** with Google Maps Advanced Markers and heatmap overlays showing community engagement hotspots.
- **Track social impact** through an SDG dashboard aligned with UN Sustainable Development Goals 4 (Education), 8 (Economic Growth), and 11 (Sustainable Communities).

---

## Google Tech Integration

HappeningMY is built entirely on the Google ecosystem. Here's how each technology is used:

### 🤖 Gemini AI (Google AI Studio) — `@google/generative-ai`

| Feature | How Gemini is Used |
|---|---|
| **Poster-to-Event Extraction** | Users upload an event poster/flyer image. Gemini 2.0 Flash analyzes it with multimodal vision and extracts structured JSON data — title, date, time, venue, price, category, SDG alignment, and more — all from a single image. (`/api/extract`) |
| **AI-Powered Semantic Search** | Natural-language queries like *"outdoor food markets in Penang this weekend"* are processed by Gemini with Google Search grounding. It searches the real web, identifies verified events from platforms like Eventbrite and TimeOut KL, and returns structured results with confidence scores. (`/api/search`) |
| **Gemini Web Importer** | Admins can use the dashboard to search for events across the web via Gemini, preview results with geocoded locations, and bulk-import them into the database — each tagged with its source and confidence level. (`/api/gemini-import`) |
| **Content Moderation** | AI-extracted events are set to "pending" status and reviewed before publishing, ensuring quality control over AI-generated content. |

### 🗺️ Google Maps Platform — `@googlemaps/js-api-loader`, `@vis.gl/react-google-maps`

| Feature | How Maps is Used |
|---|---|
| **Interactive Event Map** | Events are displayed on an Advanced Markers–powered map centered on Malaysia. Each marker shows the event's category emoji and opens detail info on click. |
| **Heatmap Visualization** | A toggleable heatmap layer shows event density and community engagement hotspots across Malaysian cities. |
| **Venue Geocoding** | The Google Maps Geocoding API converts venue names and addresses into precise lat/lng coordinates, so events appear at their actual location rather than just the city center. Used across the poster extraction pipeline, web scraper, and Gemini importer. |
| **Places & Venue Validation** | Venue addresses are validated against Google's Places data for accuracy. |

### 🔥 Firebase — `firebase` SDK v12

| Service | How It's Used |
|---|---|
| **Cloud Firestore** | Primary database for all event data, stored in a named database (`happeningdb`). Supports real-time queries, filtering by status/category/city, and duplicate detection during imports. |
| **Firebase Authentication** | Google One-Tap sign-in via `signInWithPopup`. Admin roles are enforced by email allowlist. Only authenticated users can upload posters; only admins can access the dashboard. |
| **Cloud Storage** | Uploaded poster images are stored in Firebase Storage and served via persistent URLs for event cards. |


---

## Impact and Purpose

### How AI Integration Improves Efficiency

| Without HappeningMY | With HappeningMY |
|---|---|
| Manually browse 10+ platforms to find events | One semantic search finds verified events across all sources |
| Receive a poster → manually type all details into a form | Upload poster → Gemini extracts everything in seconds |
| Event locations are text-only addresses | Every event is geocoded and plotted on a live map |
| No way to measure community impact | SDG dashboard tracks education, economic, and community impact |
| Admins manually curate event databases | Gemini Web Importer bulk-discovers and imports real events with one click |

### AI-Driven Decision-Making

- **Confidence Scoring**: Every AI-discovered event includes a confidence score (0.0–1.0) based on source reliability, so admins can prioritize verified events.
- **Smart Categorization**: Gemini automatically assigns one of 14 event categories and relevant SDG goals, enabling automated filtering and impact reporting without human tagging.
- **Duplicate Detection**: Import pipelines check existing titles in Firestore before adding, preventing data pollution.

### Automation at Scale

- **Poster Extraction Pipeline**: What once required manual data entry for each event now takes a single image upload — Gemini handles title, date, time, venue, address, price, category, tags, and SDG alignment automatically.
- **Web-Scale Event Discovery**: The Gemini Web Importer can search, preview, and import dozens of events in a single dashboard session — each geocoded to its actual venue.

### Social Impact Tracking

HappeningMY tracks contributions toward three UN Sustainable Development Goals:

- **SDG 4 — Quality Education**: Educational events, workshops, and skill-building sessions.
- **SDG 8 — Decent Work & Economic Growth**: Job fairs, networking events, and entrepreneurship meetups.
- **SDG 11 — Sustainable Cities & Communities**: Community events, cultural festivals, and urban sustainability initiatives.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| AI/ML | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| Maps | Google Maps JavaScript API, Geocoding API (`@googlemaps/js-api-loader`) |
| Database | Cloud Firestore (named database: `happeningdb`) |
| Auth | Firebase Authentication (Google provider) |
| Storage | Firebase Cloud Storage |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with these APIs enabled:
  - Google AI Studio (Gemini API)
  - Maps JavaScript API
  - Geocoding API
- A Firebase project with Firestore, Auth, and Storage enabled


### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app. 

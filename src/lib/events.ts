import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { HappeningEvent, SearchFilters } from "./types";
import { SEED_EVENTS } from "./constants";

const EVENTS_COLLECTION = "events";

// ── Get all events (with optional filters) ──────────────────
export async function getEvents(filters?: SearchFilters): Promise<HappeningEvent[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const constraints: Parameters<typeof query>[1][] = [];

    if (filters?.category) {
      constraints.push(where("category", "==", filters.category));
    }
    if (filters?.city) {
      constraints.push(where("city", "==", filters.city));
    }
    if (filters?.isFree !== undefined) {
      constraints.push(where("isFree", "==", filters.isFree));
    }

    constraints.push(orderBy("date", "asc"));
    constraints.push(limit(100));

    const q = query(eventsRef, ...constraints);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return SEED_EVENTS;
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as HappeningEvent[];
  } catch {
    // Fallback to seed data when Firebase is not configured
    return filterSeedEvents(filters);
  }
}

// ── Get a single event by ID ────────────────────────────────
export async function getEventById(id: string): Promise<HappeningEvent | null> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as HappeningEvent;
    }

    // Fallback to seed
    return SEED_EVENTS.find((e) => e.id === id) || null;
  } catch {
    return SEED_EVENTS.find((e) => e.id === id) || null;
  }
}

// ── Create a new event ──────────────────────────────────────
export async function createEvent(event: Omit<HappeningEvent, "id">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
      ...event,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

// ── Update an event ─────────────────────────────────────────
export async function updateEvent(id: string, data: Partial<HappeningEvent>): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

// ── Delete an event ─────────────────────────────────────────
export async function deleteEvent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, EVENTS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
}

// ── Upload image to Firebase Storage ────────────────────────
export async function uploadEventImage(file: File, eventId: string): Promise<string> {
  const storageRef = ref(storage, `events/${eventId}/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

// ── Upload poster for AI extraction ─────────────────────────
export async function uploadPoster(file: File): Promise<string> {
  const timestamp = Date.now();
  const storageRef = ref(storage, `posters/${timestamp}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

// ── Local filter fallback ───────────────────────────────────
function filterSeedEvents(filters?: SearchFilters): HappeningEvent[] {
  let events = [...SEED_EVENTS];

  if (!filters) return events;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.venue.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q)
    );
  }

  if (filters.category) {
    events = events.filter((e) => e.category === filters.category);
  }

  if (filters.city) {
    events = events.filter((e) => e.city === filters.city);
  }

  if (filters.isFree !== undefined) {
    events = events.filter((e) => e.isFree === filters.isFree);
  }

  if (filters.dateFrom) {
    events = events.filter((e) => e.date >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    events = events.filter((e) => e.date <= filters.dateTo!);
  }

  return events;
}

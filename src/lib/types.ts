export interface HappeningEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  category: EventCategory;
  tags: string[];
  imageUrl: string;
  posterUrl?: string;
  price: string;
  isFree: boolean;
  organizer: string;
  organizerUid?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  attendeeCount: number;
  maxCapacity?: number;
  sdgGoals: number[];
  status: "draft" | "pending" | "published" | "cancelled";
  source: "manual" | "ai-extracted" | "api" | "web";
  createdAt: string;
  updatedAt: string;
}

export type EventCategory =
  | "music"
  | "arts"
  | "food"
  | "sports"
  | "tech"
  | "community"
  | "education"
  | "business"
  | "wellness"
  | "culture"
  | "charity"
  | "nightlife"
  | "family"
  | "outdoor";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  interests: EventCategory[];
  savedEvents: string[];
  attendedEvents: string[];
  createdAt: string;
}

export interface GeminiExtractionResult {
  title: string;
  description: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  category: EventCategory;
  tags: string[];
  price: string;
  isFree: boolean;
  organizer: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  sdgGoals: number[];
  confidence: number;
}

export interface SearchFilters {
  query?: string;
  category?: EventCategory;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  isFree?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface SDGMetric {
  goal: number;
  title: string;
  description: string;
  eventCount: number;
  attendeeImpact: number;
  trend: number;
  color: string;
}

export interface DashboardStats {
  totalEvents: number;
  totalAttendees: number;
  totalOrganizers: number;
  aiExtractedEvents: number;
  citiesCovered: number;
  avgAccuracy: number;
}

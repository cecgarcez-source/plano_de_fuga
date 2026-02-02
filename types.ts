export type BudgetLevel = 'low' | 'medium' | 'high';
export type TransportType = 'plane' | 'car' | 'bus';

export interface PrebookedHotel {
  name: string;
  checkIn: string;
  checkOut: string;
}

export interface TripPreferences {
  origin: string;
  destination: string;
  isSurpriseDestination: boolean;
  startDate: string;
  endDate: string;
  departureTime: string;
  returnTime: string;
  duration: number;
  travelers: number;
  budget: BudgetLevel;
  transport: TransportType;
  selectedProfiles: string[];
  prebookedAccommodation: PrebookedHotel[];
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  location: string;
  estimatedCost: number;
  actualCost?: number;
}

export interface MarketingTip {
  type: 'hotel_affiliate' | 'infoproduct' | 'tour_affiliate';
  title: string;
  description: string;
  ctaText: string;
  url: string; // Placeholder for the actual link
  contextTrigger: string; // Why this was suggested
}

export interface DayPlan {
  day: number;
  theme: string;
  locationBase: string;
  accommodation: string;
  activities: Activity[];
  actualCosts?: {
    accommodation?: number;
    food?: number;
    transport?: number;
  };
  logisticsTip?: MarketingTip; // Contextual logistic tip (Hotel/Transport)
}

export interface CostBreakdown {
  accommodation: number;
  food: number;
  activities: number;
  transport: number;
  total: number;
  currency: string;
}

export interface ItineraryResult {
  destinationTitle: string;
  destinationDescription: string;
  coordinates: { lat: number; lng: number };
  justification: string;
  costBreakdown: CostBreakdown;
  days: DayPlan[];
  hotelSuggestions: Array<{
    name: string;
    category: string;
    priceRange: string;
    description: string;
  }>;
  premiumTips: MarketingTip[]; // High-level monetization tips (E-books, etc)
}

export interface SavedPlan extends ItineraryResult {
  id: string;
  createdAt: string;
  originalPreferences: TripPreferences;
  coverUrl?: string;
  isPaidExport?: boolean;
}

export interface VisitedPlace {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  dateAdded: string;
}

export interface User {
  username: string;
  fullName: string; // Added Full Name
  email: string;
  avatarUrl?: string | null;
  subscriptionTier?: 'free' | 'premium';
}

export interface UserProfile {
  id: string; // matches auth.user.id
  full_name?: string;
  bio?: string;
  travel_style: string[];
  interests: string[];
  dietary_restrictions?: string;
  subscription_tier?: 'free' | 'premium';
  total_trips_created?: number;
  currency_preference?: string;
}

export enum AppStep {
  INTRO = 0,
  LOGIN = 1,
  DASHBOARD = 2,
  DETAILS = 3,
  PROFILES = 4,
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  COMPARE = 'COMPARE',
  PRICING = 'PRICING',
  USER_PROFILE = 'USER_PROFILE'
}
// Types for the Kino XII API. Shapes were checked against live responses
// (filter-options, sessions, movie detail, seat map) and the Swagger examples.

export type Slug = string;
export type ISODate = string; // "2026-10-01"
export type ISODateTime = string; // "2026-10-01T10:00:00+00:00"
export type Lari = number; // plain number: 24, 14.5

export interface ApiResponse<T> {
  data: T;
}

// ---------- Catalogue ----------
export interface Format {
  id: number;
  slug: Slug;
  name: string;
  priceUplift: Lari;
}

export interface Language {
  id: number;
  slug: Slug;
  name: string;
}

export interface Genre {
  id: number;
  slug: Slug;
  name: string;
}

export interface AgeRating {
  code: string; // "G" | "PG" | "12+" | "16+" | "18+"
  minAge: number;
  description: string;
}

export interface VenueRef {
  id: number;
  slug: Slug;
  name: string;
  city: string;
}

export interface Venue extends VenueRef {
  formats: Format[];
}

export interface Movie {
  id: number;
  slug: string;
  title: string;
  kind: string;
  runtimeMinutes: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: ISODate;
  isComingSoon: boolean;
  isNotified: boolean;
  isFeatured: boolean;
  fromPrice: Lari | null;
  ageRating: AgeRating;
  genres: Genre[];
  formats?: Format[];
}

export interface MovieDetail extends Movie {
  synopsis: string | null;
  director: string | null;
  cast: string | null; // comma separated
  formats: Format[];
  availableDates?: ISODate[];
}

// ---------- Filter options ----------
export interface TicketTypeOption {
  id: number;
  slug: string; // adult | child | student
  name: string;
  priceRatio: number;
  note: string | null;
  blockedFromRatingAge: number | null; // child: 16
}

export interface FilterOptions {
  venues: Venue[];
  formats: Format[];
  languages: Language[];
  timeBands: { id: TimeBand; label: string }[];
  sorts: { id: string; label: string }[];
  ticketTypes: TicketTypeOption[];
  ageRatings: AgeRating[];
  maxSeatsPerOrder: number;
  holdMinutes: number;
}

// ---------- Sessions ----------
export type TimeBand = 'morning' | 'afternoon' | 'evening';

export interface Hall {
  id: number;
  name: string;
  venue?: VenueRef;
}

export interface Session {
  id: number;
  startsAt: ISODateTime;
  date: ISODate;
  time: string;
  timeBand: TimeBand;
  price: Lari;
  seatsLeft: number;
  isSoldOut: boolean;
  hall: Hall;
  venue: VenueRef;
  format: Format;
  language: Language;
  movie?: Movie;
}

export interface SessionsQuery {
  date: ISODate;
  venues: Slug[];
  formats: Slug[];
  languages: Slug[];
  bands: TimeBand[];
  search: string;
  sort: string;
  page: number;
}

export interface SessionGroup {
  movie: Movie;
  sessions: Session[];
}

export interface SessionsMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  totalSessions: number;
  totalMovies: number;
  date: ISODate;
}

export interface SessionsResponse {
  data: SessionGroup[];
  meta: SessionsMeta;
}

export interface VenueSessionGroup {
  venue: VenueRef;
  sessions: Session[];
}

// ---------- Seat map ----------
export type SeatState = 'available' | 'sold' | 'held' | 'unavailable';

export interface Seat {
  id: number;
  code: string;
  label: string;
  state: SeatState;
  aisleAfter: boolean;
  isMine: boolean;
}

export interface SeatRow {
  label: string;
  seats: Seat[];
}

export interface SeatSection {
  name: string;
  rows: SeatRow[];
}

export interface SeatMap {
  sessionId: number;
  hall: Hall;
  sections: SeatSection[];
}

// ---------- Booking ----------
export interface HoldRequest {
  seats: { seatId: number; ticketType: string }[];
}

export interface HeldSeat {
  seatId: number;
  code: string;
  ticketType: { slug: string; name: string };
  price: Lari;
}

export interface SeatHold {
  holdId: string;
  sessionId: number;
  expiresAt: ISODateTime;
  secondsRemaining: number;
  isLive: boolean;
  subtotal: Lari;
  seats: HeldSeat[];
}

export interface OrderRequest {
  holdId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export interface Ticket {
  id: number;
  seatCode: string;
  ticketType: { slug: string; name: string };
  price: Lari;
}

export interface Order {
  id: number;
  reference: string;
  status: string; // "paid" | "refunded"
  totalPrice: Lari;
  paidAt: ISODateTime;
  refundedAt: ISODateTime | null;
  isUpcoming: boolean;
  isRefundable: boolean;
  cardLastFour: string;
  contact: { fullName: string; email: string; mobileNumber: string };
  session: Session & { movie?: Movie };
  tickets: Ticket[];
}

export type TicketsFilter = 'upcoming' | 'past';

// ---------- Auth / profile ----------
export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  fullName: string | null;
  mobileNumber: string | null;
  dateOfBirth: ISODate | null;
  age: number | null;
  preferredVenue: Venue | null;
  profileComplete: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  avatar?: File | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ProfileRequest {
  fullName: string;
  mobileNumber: string;
  dateOfBirth: ISODate;
  preferredVenueId?: number | null;
}

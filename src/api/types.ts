// Kino XII API types, taken from the Swagger docs (OAS 1.0.0).
// Fields marked "// VERIFY" were cut off in the docs PDF. Confirm them with one
// real response from "Try it out" before relying on them.

// ---------- Shared ----------
export type Slug = string;
export type ISODate = string;      // "2026-10-01"
export type ISODateTime = string;  // "2026-10-01T10:00:00+00:00"
export type Lari = number;         // plain number: 24, 14.5

export interface ApiResponse<T> {
  data: T;
}

// ---------- Catalogue ----------
export interface Format {
  id: number;
  slug: Slug;          // "standard" | "max" | "atmos" | ...
  name: string;        // "MAX"
  priceUplift: Lari;   // added on top of the session base price
}

export interface Language {
  id: number;
  slug: Slug;          // "georgian-dub" | ...
  name: string;        // "Georgian Dub"
}

export interface Genre {
  id: number;
  slug: Slug;
  name: string;
}

export interface AgeRating {
  code: string;        // "G" | "PG" | "12+" | "16+" | "18+"
  minAge: number;      // 16
  description: string; // explanation shown on the film page
}

export interface VenueRef {
  id: number;
  slug: Slug;
  name: string;
  city: string;
}

export interface Venue extends VenueRef {
  formats: Format[];   // what this venue can actually show -> narrows the format filter
}

export interface Movie {
  id: number;
  slug: string;
  title: string;
  kind: "film" | string; // VERIFY: likely "film" | "event" (home page lists films AND events)
  runtimeMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: ISODate;
  isComingSoon: boolean;
  isNotified: boolean;   // already pressed "Notify Me"
  isFeatured: boolean;
  fromPrice: Lari | null; // VERIFY: likely null for coming-soon titles
  ageRating: AgeRating;
  genres: Genre[];
}

// VERIFY: GET /movies/{movie} returns extra fields for the details page
export interface MovieDetail extends Movie {
  description: string;   // VERIFY
  director: string;      // VERIFY
  cast: string[];        // VERIFY: may be objects
  formats: Format[];     // seen in the /tickets example
}

// ---------- Filter options ----------
// Only `venues` was visible in the docs; the other keys are named per the docs text.
export interface TicketTypeOption {
  slug: "adult" | "student" | "child" | string;
  name: string;
  ratio: number;          // VERIFY name: 1 / 0.75 / 0.6
  blockedMinAge?: number; // VERIFY: child blocked when movie minAge >= 16
}

export interface FilterOptions {
  venues: Venue[];
  formats: Format[];                                  // VERIFY
  languages: Language[];                              // VERIFY
  bands: { slug: "morning" | "afternoon" | "evening"; name: string }[]; // VERIFY
  sorts: { slug: string; name: string }[];            // VERIFY (default "time_asc")
  ticketTypes: TicketTypeOption[];                    // VERIFY
  ageRatings: AgeRating[];                            // VERIFY
  maxSeatsPerOrder: number;                           // 3
  holdMinutes: number;                                // 8
}

// ---------- Sessions ----------
export type TimeBand = "morning" | "afternoon" | "evening";

export interface Hall {
  id: number;
  name: string;          // "B"
  venue?: VenueRef;
}

export interface Session {
  id: number;
  startsAt: ISODateTime;
  date: ISODate;
  time: string;          // "10:00"
  timeBand: TimeBand;
  price: Lari;
  seatsLeft: number;     // live: excludes sold AND held seats
  isSoldOut: boolean;    // show disabled, never hide
  hall: Hall;
  venue: VenueRef;
  format: Format;
  language: Language;
  movie?: Movie;         // present on GET /sessions/{id}
}

export interface SessionsQuery {
  date?: ISODate;        // single value, defaults to today
  venues?: Slug[];       // sent as venues[]=a&venues[]=b
  formats?: Slug[];
  languages?: Slug[];
  bands?: TimeBand[];
  search?: string;
  sort?: string;         // default "time_asc", e.g. "price_asc"
  page?: number;
}

export interface SessionGroup {
  movie: Movie;
  sessions: Session[];   // already sorted by start time
}

export interface SessionsResponse {
  data: SessionGroup[];
  meta: {
    currentPage: number;   // VERIFY
    lastPage: number;      // pages over FILMS (10 per page)
    totalMovies: number;
    totalSessions: number; // "Showing X sessions"
  };
}

// GET /movies/{movie}/sessions?date= -> grouped by venue
export interface VenueSessionGroup {
  venue: VenueRef;       // VERIFY shape
  sessions: Session[];
}

// ---------- Seat map ----------
export type SeatState = "available" | "sold" | "held" | "unavailable";

export interface Seat {
  id: number;            // send as seatId when holding; never send code
  code: string;          // "E7": price summary, order, ticket
  label: string;         // "7": text inside the seat button
  state: SeatState;      // "unavailable" = empty spacer, no button
  aisleAfter: boolean;   // render a gangway spacer after this seat
  isMine: boolean;       // part of my live hold -> restore selection
}

export interface SeatRow {
  label: string;         // from data, may skip letters (G then J)
  seats: Seat[];
}

export interface SeatSection {
  name: string;          // "Front stalls", "Balcony", ...
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
  holdId: string;           // uuid
  sessionId: number;
  expiresAt: ISODateTime;   // drive the countdown from THIS
  secondsRemaining: number; // do not count down from this
  isLive: boolean;          // false = expired (still 200, unlike 404)
  subtotal: Lari;
  seats: HeldSeat[];
}

export interface OrderRequest {
  holdId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  cardNumber: string;    // spaces allowed
  expiry: string;        // "MM/YY"
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
  reference: string;     // "KX-7QF2LD": also the refund path param
  status: "paid" | "refunded" | string;
  totalPrice: Lari;
  paidAt: ISODateTime;
  refundedAt: ISODateTime | null;
  isUpcoming: boolean;
  isRefundable: boolean; // drive the Refund button from this, never compute the cutoff
  cardLastFour: string;
  contact: { fullName: string; email: string; mobileNumber: string };
  session: Session & { movie: MovieDetail };
  tickets: Ticket[];
}

export type TicketsFilter = "upcoming" | "past";

// ---------- Auth / profile ----------
export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  fullName: string | null;
  mobileNumber: string | null;
  dateOfBirth: ISODate | null;
  age: number | null;    // server-derived; use it for the age gate
  preferredVenue: Venue | null;
  profileComplete: boolean; // yellow/green navbar dot + booking gate
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirmation: string; // the only snake_case field
  avatar?: File;                 // jpg/jpeg/png/webp, max 2MB
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ProfileRequest {
  fullName: string;
  mobileNumber: string;    // spaces OK
  dateOfBirth: ISODate;
  preferredVenueId?: number;
  avatar?: File;
}

// ---------- Errors ----------
export interface ValidationErrorBody {
  message: string;
  errors: Record<string, string[]>;
}

export interface RuleErrorBody {
  message: string;         // already user-facing: show as-is
}

export interface ConflictErrorBody {
  message: string;
  contested: string[];     // seat CODES, e.g. ["E7","E8"]
}

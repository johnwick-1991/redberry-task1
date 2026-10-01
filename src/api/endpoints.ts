import { api } from './client';
import type {
  ApiResponse,
  AuthResponse,
  FilterOptions,
  LoginRequest,
  Movie,
  MovieDetail,
  Order,
  OrderRequest,
  ProfileRequest,
  RegisterRequest,
  SeatHold,
  SeatMap,
  Session,
  SessionsQuery,
  SessionsResponse,
  TicketsFilter,
  User,
  VenueSessionGroup,
  HoldRequest,
} from './types';

// Responses are wrapped as { data: ... }; tolerate an unwrapped body just in case.
const unwrap = <T>(p: Promise<{ data: ApiResponse<T> | T }>) =>
  p.then((r) => {
    const body = r.data as ApiResponse<T> | T;
    return body !== null && typeof body === 'object' && 'data' in body
      ? (body as ApiResponse<T>).data
      : (body as T);
  });

// ---------- Auth ----------
export function login(body: LoginRequest) {
  return unwrap<AuthResponse>(api.post('/login', body, { skipAuthRedirect: true }));
}

export function register(body: RegisterRequest) {
  const form = new FormData();
  form.append('username', body.username);
  form.append('email', body.email);
  form.append('password', body.password);
  form.append('password_confirmation', body.password_confirmation);
  if (body.avatar) form.append('avatar', body.avatar);
  return unwrap<AuthResponse>(api.post('/register', form, { skipAuthRedirect: true }));
}

export function logout() {
  return api.post('/logout', null, { skipAuthRedirect: true });
}

export function fetchMe() {
  return unwrap<User>(api.get('/me', { skipAuthRedirect: true }));
}

export function updateProfile(body: ProfileRequest) {
  // Documented as multipart/form-data (it also accepts an avatar).
  const form = new FormData();
  form.append('fullName', body.fullName);
  form.append('mobileNumber', body.mobileNumber);
  form.append('dateOfBirth', body.dateOfBirth);
  if (body.preferredVenueId) form.append('preferredVenueId', String(body.preferredVenueId));
  // Laravel only parses multipart bodies on POST, so PUT is spoofed.
  form.append('_method', 'PUT');
  return unwrap<User>(api.post('/profile', form));
}

// ---------- Catalogue ----------
export function fetchFilterOptions() {
  return unwrap<FilterOptions>(api.get('/filter-options'));
}

export function searchMovies(q: string, signal?: AbortSignal) {
  return unwrap<Movie[]>(api.get('/search', { params: { q }, signal }));
}

export function fetchNowPlaying(limit?: number) {
  return unwrap<Movie[]>(api.get('/movies/now-playing', { params: { limit } }));
}

export function fetchComingSoon(limit?: number) {
  return unwrap<Movie[]>(api.get('/movies/coming-soon', { params: { limit } }));
}

export function fetchFeatured() {
  return unwrap<Movie[]>(api.get('/movies/featured'));
}

export function fetchMovie(slug: string) {
  return unwrap<MovieDetail>(api.get(`/movies/${encodeURIComponent(slug)}`));
}

export function fetchMovieSessions(slug: string, date: string) {
  return unwrap<VenueSessionGroup[]>(
    api.get(`/movies/${encodeURIComponent(slug)}/sessions`, { params: { date } }),
  );
}

export function notifyMe(slug: string) {
  return api.post(`/movies/${encodeURIComponent(slug)}/notify`);
}

// ---------- Sessions ----------
export function fetchSessions(q: SessionsQuery, signal?: AbortSignal) {
  // The API expects array filters as `venues[]=a&venues[]=b`.
  const params = new URLSearchParams();
  params.set('date', q.date);
  q.venues.forEach((v) => params.append('venues[]', v));
  q.formats.forEach((v) => params.append('formats[]', v));
  q.languages.forEach((v) => params.append('languages[]', v));
  q.bands.forEach((v) => params.append('bands[]', v));
  if (q.search) params.set('search', q.search);
  if (q.sort) params.set('sort', q.sort);
  params.set('page', String(q.page));
  return api.get<SessionsResponse>('/sessions', { params, signal }).then((r) => r.data);
}

export function fetchSession(id: number) {
  return unwrap<Session>(api.get(`/sessions/${id}`));
}

export function fetchSeatMap(id: number) {
  return unwrap<SeatMap>(api.get(`/sessions/${id}/seats`));
}

// ---------- Booking ----------
export function createHold(sessionId: number, body: HoldRequest) {
  return unwrap<SeatHold>(api.post(`/sessions/${sessionId}/holds`, body));
}

export function fetchHold(holdId: string) {
  return unwrap<SeatHold>(api.get(`/holds/${holdId}`));
}

export function releaseHold(holdId: string) {
  return api.delete(`/holds/${holdId}`, { skipAuthRedirect: true });
}

export function createOrder(body: OrderRequest) {
  return unwrap<Order>(api.post('/orders', body));
}

// ---------- Tickets ----------
export function fetchTickets(filter: TicketsFilter) {
  return unwrap<Order[]>(api.get('/tickets', { params: { filter } }));
}

export function refundOrder(reference: string) {
  return unwrap<Order>(api.post(`/orders/${encodeURIComponent(reference)}/refund`));
}

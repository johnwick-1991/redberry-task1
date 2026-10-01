import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order, Seat, SeatHold, SeatMap as SeatMapData, Session, TicketTypeOption } from '@/api/types';
import { createHold, fetchHold, releaseHold } from '@/api/endpoints';
import { parseApiError } from '@/api/errors';
import { qk, useFilterOptions, useSeatMap, useSession } from '@/api/queries';
import { useAuthStore } from '@/store/auth';
import { useAuthModal } from '@/store/authModal';
import { useBookingStore } from '@/store/booking';
import { formatLongDate, formatPrice, roundMoney } from '@/lib/format';
import { ageRestrictionMessage, isAgeRestricted, PROFILE_INCOMPLETE_MESSAGE } from '@/lib/guards';
import { Poster } from '@/components/MovieCards';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/Field';
import { AgeBadge, Chip, ErrorState } from '@/components/ui/States';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { XIcon } from '@/components/ui/icons';
import { SeatLegend, SeatMap } from './SeatMap';
import { HoldTimer, useCountdown } from './HoldTimer';
import { CheckoutStep } from './CheckoutStep';
import { Confirmation } from './Confirmation';

type Step = 'seats' | 'checkout' | 'done';

interface Selected {
  seatId: number;
  code: string;
  section: string;
  ticketType: string;
}

type Notice = { tone: 'error' | 'warning' | 'info'; text: string } | null;

const EXPIRED_MESSAGE = 'Your hold time expired. Please re-select your seats.';

/** Child tickets (and anything else with blockedFromRatingAge) are refused on restricted titles. */
function isTypeBlocked(type: TicketTypeOption | undefined, minAge: number) {
  return !!type && type.blockedFromRatingAge !== null && minAge >= type.blockedFromRatingAge;
}

function seatIndex(map: SeatMapData | undefined) {
  const byId = new Map<number, { seat: Seat; section: string }>();
  const byCode = new Map<string, Seat>();
  map?.sections.forEach((section) =>
    section.rows.forEach((row) =>
      row.seats.forEach((seat) => {
        byId.set(seat.id, { seat, section: section.name });
        byCode.set(seat.code, seat);
      }),
    ),
  );
  return { byId, byCode };
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: 'seats', label: 'Seats' },
    { key: 'checkout', label: 'Checkout' },
  ];
  const currentIndex = step === 'seats' ? 0 : 1;
  return (
    <ol className="flex items-center gap-3 text-sm">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <span
            className={clsx(
              'flex items-center gap-2 font-semibold',
              i === currentIndex ? 'text-ink' : i < currentIndex || step === 'done' ? 'text-ok' : 'text-muted',
            )}
            aria-current={i === currentIndex && step !== 'done' ? 'step' : undefined}
          >
            <span
              className={clsx(
                'grid size-6 place-items-center rounded-full text-xs',
                i === currentIndex && step !== 'done'
                  ? 'bg-accent text-white'
                  : i < currentIndex || step === 'done'
                    ? 'bg-ok/20 text-ok'
                    : 'bg-surface-3',
              )}
            >
              {i + 1}
            </span>
            {s.label}
          </span>
          {i === 0 && <span className="text-muted">→</span>}
        </li>
      ))}
    </ol>
  );
}

function SessionHeader({ session, step, seconds, showTimer }: { session: Session; step: Step; seconds: number; showTimer: boolean }) {
  const movie = session.movie;
  return (
    <div className="flex items-center gap-5 border-b border-line px-6 pb-5 pr-16 pt-6">
      {movie && <Poster src={movie.posterUrl} title={movie.title} className="h-24 w-16 shrink-0 rounded-lg" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h2 className="truncate text-2xl font-extrabold">{movie?.title ?? 'Booking'}</h2>
          {movie && <AgeBadge rating={movie.ageRating} />}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="text-ink">{session.venue.name}</span>· Hall {session.hall.name} ·{' '}
          <span className="text-ink">{formatLongDate(session.date)}</span>·{' '}
          <span className="font-bold text-ink">{session.time}</span>
          <Chip>{session.format.name}</Chip>
          <span>{session.language.name}</span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-3">
        {step !== 'done' && <StepIndicator step={step} />}
        {showTimer && <HoldTimer seconds={seconds} />}
      </div>
    </div>
  );
}

function BookingFlow({ sessionId }: { sessionId: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { holdId: storedHoldId, setHold: storeHold, close: closeStore } = useBookingStore();

  const sessionQuery = useSession(sessionId);
  const mapQuery = useSeatMap(sessionId);
  const options = useFilterOptions();

  const [step, setStep] = useState<Step>('seats');
  const [selection, setSelection] = useState<Selected[]>([]);
  const [hold, setHold] = useState<SeatHold | null>(null);
  const [lostIds, setLostIds] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<Notice>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [restoring, setRestoring] = useState(storedHoldId !== null);
  const restoredMine = useRef(false);

  const session = sessionQuery.data;
  const movie = session?.movie;
  const minAge = movie?.ageRating.minAge ?? 0;
  const ticketTypes = useMemo(() => options.data?.ticketTypes ?? [], [options.data]);
  const maxSeats = options.data?.maxSeatsPerOrder ?? 3;
  const { byId, byCode } = useMemo(() => seatIndex(mapQuery.data), [mapQuery.data]);
  const selectedIds = useMemo(() => new Set(selection.map((s) => s.seatId)), [selection]);

  // ---------- Hold lifecycle ----------
  const saveHold = useCallback(
    (next: SeatHold | null) => {
      setHold(next);
      storeHold(next?.holdId ?? null);
    },
    [storeHold],
  );

  const refetchMap = useCallback(() => {
    setLostIds(new Set());
    return queryClient.invalidateQueries({ queryKey: qk.seatMap(sessionId) });
  }, [queryClient, sessionId]);

  /** Timer hit zero (or the API said the hold is gone): start over on step 1. */
  const expire = useCallback(() => {
    saveHold(null);
    setSelection([]);
    setStep('seats');
    setNotice({ tone: 'warning', text: EXPIRED_MESSAGE });
    refetchMap();
  }, [saveHold, refetchMap]);

  /** 409: someone else took some seats. Drop those, keep the rest, refetch the map. */
  const handleContested = useCallback(
    (codes: string[], fallback: string) => {
      const lost = codes.map((c) => byCode.get(c)).filter((s): s is Seat => !!s);
      setLostIds((prev) => new Set([...prev, ...lost.map((s) => s.id)]));
      setSelection((prev) => prev.filter((s) => !codes.includes(s.code)));
      setStep('seats');
      setNotice({
        tone: 'error',
        text: codes.length
          ? `Sorry, seat${codes.length > 1 ? 's' : ''} ${codes.join(', ')} ${codes.length > 1 ? 'were' : 'was'} just taken by someone else. We kept the rest of your selection.`
          : fallback,
      });
      // Refetch after a beat so the "sold" marking is visible even if the refetch is fast.
      queryClient.invalidateQueries({ queryKey: qk.seatMap(sessionId) });
    },
    [byCode, queryClient, sessionId],
  );

  const seconds = useCountdown(hold?.expiresAt ?? null, expire);

  // Resume after a page refresh: read the stored hold back.
  useEffect(() => {
    if (!storedHoldId || !restoring) return;
    let cancelled = false;
    fetchHold(storedHoldId)
      .then((h) => {
        if (cancelled) return;
        if (h.isLive && h.sessionId === sessionId) {
          setHold(h);
          setSelection(
            h.seats.map((s) => ({ seatId: s.seatId, code: s.code, section: '', ticketType: s.ticketType.slug })),
          );
          setStep('checkout');
        } else {
          storeHold(null);
          if (!h.isLive) setNotice({ tone: 'warning', text: EXPIRED_MESSAGE });
        }
      })
      .catch(() => !cancelled && storeHold(null))
      .finally(() => !cancelled && setRestoring(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fill in section names for restored seats once the map is known; restore isMine seats too.
  useEffect(() => {
    if (!mapQuery.data) return;
    setSelection((prev) => {
      if (prev.length === 0 && !restoredMine.current && !restoring) {
        restoredMine.current = true;
        const mine: Selected[] = [];
        byId.forEach(({ seat, section }) => {
          if (seat.isMine) mine.push({ seatId: seat.id, code: seat.code, section, ticketType: 'adult' });
        });
        return mine.slice(0, maxSeats);
      }
      return prev.map((s) => (s.section ? s : { ...s, section: byId.get(s.seatId)?.section ?? '' }));
    });
  }, [mapQuery.data, byId, restoring, maxSeats]);

  // ---------- Seat rules (all enforced in the UI) ----------
  const toggleSeat = (seat: Seat, section: string) => {
    setNotice(null);
    if (selectedIds.has(seat.id)) {
      setSelection((prev) => prev.filter((s) => s.seatId !== seat.id));
      return;
    }
    const mineHeld = seat.isMine && seat.state === 'held';
    if ((seat.state !== 'available' && !mineHeld) || lostIds.has(seat.id)) return;
    if (selection.length >= maxSeats) {
      setNotice({ tone: 'warning', text: `You can select up to ${maxSeats} seats per order.` });
      return;
    }
    setSelection((prev) => [...prev, { seatId: seat.id, code: seat.code, section, ticketType: 'adult' }]);
  };

  const setTicketType = (seatId: number, ticketType: string) =>
    setSelection((prev) => prev.map((s) => (s.seatId === seatId ? { ...s, ticketType } : s)));

  const priceFor = (slug: string) => {
    const type = ticketTypes.find((t) => t.slug === slug);
    return roundMoney((session?.price ?? 0) * (type?.priceRatio ?? 1));
  };
  const subtotal = roundMoney(selection.reduce((sum, s) => sum + priceFor(s.ticketType), 0));

  const violations = selection
    .map((s) => {
      const type = ticketTypes.find((t) => t.slug === s.ticketType);
      if (isTypeBlocked(type, minAge)) {
        return `Seat ${s.code}: ${type!.name} tickets are not available for ${movie?.ageRating.code} films.`;
      }
      return null;
    })
    .filter((v): v is string => v !== null);

  const blockers: string[] = [];
  if (!user) blockers.push('Please log in to continue.');
  else if (!user.profileComplete) blockers.push(PROFILE_INCOMPLETE_MESSAGE);
  else if (movie && isAgeRestricted(user, movie.ageRating)) blockers.push(ageRestrictionMessage(movie.ageRating));
  if (selection.length > maxSeats) blockers.push(`You can select up to ${maxSeats} seats per order.`);

  const canContinue = selection.length > 0 && violations.length === 0 && blockers.length === 0;

  // ---------- Step 1 -> Step 2: hold the seats ----------
  const holdMutation = useMutation({
    mutationFn: () =>
      createHold(sessionId, {
        seats: selection.map((s) => ({ seatId: s.seatId, ticketType: s.ticketType })),
      }),
    onSuccess: (h) => {
      saveHold(h);
      setNotice(null);
      setStep('checkout');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      if (parsed.kind === 'conflict') {
        saveHold(null); // nothing is held after a 409
        handleContested(parsed.contested, parsed.message);
      } else if (parsed.kind === 'validation') {
        setNotice({ tone: 'error', text: Object.values(parsed.fields).join(' ') });
      } else {
        // Rule errors (profile, age, session started) come with a user-ready message.
        setNotice({ tone: 'error', text: parsed.message });
      }
    },
  });

  const sameAsHold =
    hold?.isLive &&
    seconds > 0 &&
    hold.seats.length === selection.length &&
    selection.every((s) => hold.seats.some((h) => h.seatId === s.seatId && h.ticketType.slug === s.ticketType));

  const goToCheckout = () => {
    if (!canContinue || holdMutation.isPending) return;
    // Back from checkout without changes: reuse the live hold instead of holding again.
    if (sameAsHold) {
      setStep('checkout');
      return;
    }
    holdMutation.mutate();
  };

  // ---------- Close ----------
  const close = () => {
    if (holdMutation.isPending) return;
    // Release an unpaid hold so the seats go straight back on the map.
    if (hold && step !== 'done') {
      releaseHold(hold.holdId)
        .catch(() => {})
        .finally(() => queryClient.invalidateQueries({ queryKey: qk.seatMap(sessionId) }));
    }
    closeStore();
  };

  const onPaid = (o: Order) => {
    setOrder(o);
    setStep('done');
    setHold(null);
    storeHold(null);
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['movies', 'sessions'] });
  };

  // ---------- Render ----------
  const loading = sessionQuery.isPending || options.isPending || restoring;
  const header =
    session && !loading ? (
      <SessionHeader session={session} step={step} seconds={seconds} showTimer={!!hold && step !== 'done'} />
    ) : null;

  let body: ReactNode;
  if (loading) {
    body = (
      <div className="grid grid-cols-[1fr_340px] gap-8">
        <Skeleton className="h-[480px] rounded-2xl" />
        <Skeleton className="h-[480px] rounded-2xl" />
      </div>
    );
  } else if (sessionQuery.isError) {
    body = <ErrorState error={sessionQuery.error} onRetry={() => sessionQuery.refetch()} />;
  } else if (step === 'done' && order && session) {
    body = (
      <Confirmation
        order={order}
        fallbackSession={session}
        onClose={closeStore}
        onMyTickets={() => {
          closeStore();
          navigate('/profile#tickets');
        }}
      />
    );
  } else if (step === 'checkout' && hold && user) {
    body = (
      <>
        {notice && (
          <div className="mb-5">
            <FormAlert tone={notice.tone}>{notice.text}</FormAlert>
          </div>
        )}
        <CheckoutStep
          hold={hold}
          user={user}
          sectionBySeatId={new Map(selection.map((s) => [s.seatId, s.section || byId.get(s.seatId)?.section || '']))}
          onBack={() => {
            // Keep the hold: the user still wants these seats.
            setNotice(null);
            setStep('seats');
          }}
          onPaid={onPaid}
          onExpired={expire}
          onContested={handleContested}
        />
      </>
    );
  } else {
    body = (
      <div className="grid grid-cols-[1fr_340px] gap-8">
        <div className="flex min-w-0 flex-col gap-6 rounded-2xl border border-line bg-surface-2/50 p-6">
          {mapQuery.isPending ? (
            <div className="flex flex-col items-center gap-2 py-6">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-[560px]" />
              ))}
            </div>
          ) : mapQuery.isError ? (
            <ErrorState error={mapQuery.error} onRetry={() => mapQuery.refetch()} title="Couldn't load the hall map" />
          ) : (
            <>
              <div className="relative overflow-x-auto pb-2">
                {mapQuery.isFetching && (
                  <Spinner className="absolute right-0 top-0 size-4 text-muted" />
                )}
                <SeatMap map={mapQuery.data} selectedIds={selectedIds} lostIds={lostIds} onToggle={toggleSeat} />
              </div>
              <SeatLegend />
            </>
          )}
        </div>

        <aside className="flex flex-col rounded-2xl border border-line bg-surface-2 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Your seats</h3>
            <span className="text-xs text-muted">
              {selection.length}/{maxSeats}
            </span>
          </div>

          {notice && (
            <div className="mb-3">
              <FormAlert tone={notice.tone}>{notice.text}</FormAlert>
            </div>
          )}

          {selection.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              Pick up to {maxSeats} seats on the map.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {selection.map((s) => (
                <li key={s.seatId} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      <span className="font-bold">{s.code}</span>
                      <span className="text-muted"> · {s.section || byId.get(s.seatId)?.section}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatPrice(priceFor(s.ticketType))}</span>
                      <button
                        type="button"
                        onClick={() => setSelection((prev) => prev.filter((x) => x.seatId !== s.seatId))}
                        className="cursor-pointer rounded p-0.5 text-muted hover:text-ink"
                        aria-label={`Remove seat ${s.code}`}
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                  <select
                    value={s.ticketType}
                    onChange={(e) => setTicketType(s.seatId, e.target.value)}
                    aria-label={`Ticket type for seat ${s.code}`}
                    className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-line bg-surface-2 px-2 text-sm outline-none focus:border-ink/40"
                  >
                    {ticketTypes.map((t) => {
                      const blocked = isTypeBlocked(t, minAge);
                      return (
                        <option key={t.slug} value={t.slug} disabled={blocked}>
                          {t.name} · {Math.round(t.priceRatio * 100)}%{blocked ? ` (not for ${movie?.ageRating.code})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </li>
              ))}
            </ul>
          )}

          {violations.length > 0 && (
            <div className="mt-3">
              <FormAlert>
                <ul className="list-inside list-disc">
                  {violations.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </FormAlert>
            </div>
          )}

          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">Subtotal</span>
              <span className="text-2xl font-extrabold">{formatPrice(subtotal)}</span>
            </div>
            {blockers.length > 0 && selection.length > 0 && (
              <p className="mt-3 text-sm text-warn">{blockers[0]}</p>
            )}
            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={!canContinue}
              loading={holdMutation.isPending}
              onClick={goToCheckout}
            >
              Next: Checkout
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={close} disabled={holdMutation.isPending}>
              Close
            </Button>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <Modal open onClose={close} size="xl" header={header} title={header ? undefined : 'Select seats'}>
      {body}
    </Modal>
  );
}

/** Mounted once in the layout; opens whenever a session is chosen (or a booking is resumed after refresh). */
export function BookingModal() {
  const sessionId = useBookingStore((s) => s.sessionId);
  const close = useBookingStore((s) => s.close);
  const { ready, token, user } = useAuthStore();
  // While the login modal is up (e.g. a 401 mid-booking), keep the flow mounted
  // so the interrupted request can be replayed into it after login.
  const reauthenticating = useAuthModal((s) => s.modal !== null);

  useEffect(() => {
    if (sessionId !== null && ready && !token && !reauthenticating) close();
  }, [sessionId, ready, token, reauthenticating, close]);

  if (sessionId === null || !ready) return null;
  if (!user && !reauthenticating) return null;
  return <BookingFlow key={sessionId} sessionId={sessionId} />;
}

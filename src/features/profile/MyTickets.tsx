import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order, TicketsFilter } from '@/api/types';
import { refundOrder } from '@/api/endpoints';
import { errorMessage } from '@/api/errors';
import { useTickets } from '@/api/queries';
import { toast } from '@/store/toast';
import { formatPrice, formatRuntime, formatShortDate } from '@/lib/format';
import { Poster } from '@/components/MovieCards';
import { Button, buttonClasses } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { AgeBadge, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { FigmaIcon } from '@/components/ui/icons';

function RefundDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => refundOrder(order.reference),
    onSuccess: async () => {
      // Re-render from the server: the order moves from Upcoming to Past.
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['movies', 'sessions'] });
      toast(`Order ${order.reference} refunded. ${formatPrice(order.totalPrice)} is on its way back to your card.`, 'success');
      onClose();
    },
    // 422: already refunded or inside the cutoff; the message says which.
    onError: (e) => setError(errorMessage(e)),
  });

  const close = () => !mutation.isPending && onClose();

  return (
    <Modal
      open
      onClose={close}
      title="Refund this order?"
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={close} disabled={mutation.isPending}>
            Keep tickets
          </Button>
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={() => !mutation.isPending && mutation.mutate()}
          >
            Confirm Refund
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        {error && <FormAlert>{error}</FormAlert>}
        <p className="text-muted">
          Your seats ({order.tickets.map((t) => t.seatCode).join(', ')}) will be released and{' '}
          <span className="font-semibold text-ink">{formatPrice(order.totalPrice)}</span> refunded to the card ending in{' '}
          {order.cardLastFour}. This can&apos;t be undone.
        </p>
      </div>
    </Modal>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 font-semibold leading-none">
      <span className="text-xs uppercase tracking-[0.72px] text-muted">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/** "Refundable until 14:30, Tue 15 Sep": the API closes refunds 2 hours before the start. */
function refundDeadline(startsAt: string) {
  const d = new Date(new Date(startsAt).getTime() - 2 * 60 * 60 * 1000);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${time}, ${day}`;
}

function TicketCard({ order, onRefund }: { order: Order; onRefund?: () => void }) {
  const { session } = order;
  const movie = session.movie;
  const refunded = order.status === 'refunded' || order.refundedAt !== null;

  return (
    <article className="flex items-stretch gap-[18px] overflow-hidden rounded-[26px] bg-surface">
      <div className="flex min-w-0 flex-1 items-center gap-[18px] px-[30px] py-[25px]">
        {movie && <Poster src={movie.posterUrl} title={movie.title} className="h-[133px] w-[100px] shrink-0 rounded-[10px]" />}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            {movie ? (
              <Link to={`/movies/${movie.slug}`} className="truncate text-xl font-extrabold uppercase leading-none hover:text-accent">
                {movie.title}
              </Link>
            ) : (
              <span className="text-xl font-extrabold leading-none">Order {order.reference}</span>
            )}
            {movie && <AgeBadge rating={movie.ageRating} className="py-[3px]" />}
            {movie && <span className="text-sm text-muted">{formatRuntime(movie.runtimeMinutes)}</span>}
          </div>
          <div className="flex flex-wrap gap-10">
            <Meta label="Date">
              {formatShortDate(session.date)} · {session.time}
            </Meta>
            <Meta label="Venue">
              {session.venue?.name ?? session.hall.venue?.name} · Hall {session.hall.name}
            </Meta>
            {session.format && (
              <Meta label="Format">
                {session.format.name}
                {session.language && ` · ${session.language.name}`}
              </Meta>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.72px] text-muted">Seats</span>
            {order.tickets.map((t) => (
              <span key={t.id} className="rounded-md bg-tint-white px-2.5 py-1 text-xs font-semibold">
                {t.seatCode} · {t.ticketType.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket stub */}
      <div className="flex w-[300px] shrink-0 flex-col justify-center gap-4 border-l border-dashed border-surface-3 px-6 py-5">
        <div className="flex flex-col gap-0.5 font-semibold">
          <span className="text-xs uppercase tracking-[0.72px] text-muted">Order</span>
          <span className="text-sm">#{order.reference}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-muted">{refunded ? 'Refunded' : 'Total paid'}</span>
            <span className={clsx('text-2xl font-extrabold leading-none', refunded && 'text-muted line-through')}>
              {formatPrice(order.totalPrice)}
            </span>
          </div>
          {!refunded && (
            <>
              <Button variant="secondary" size="sm" className="w-full" disabled={!onRefund || !order.isRefundable} onClick={onRefund}>
                Refund
              </Button>
              <p className="text-center text-xs text-muted">
                {order.isRefundable
                  ? `Refundable until ${refundDeadline(session.startsAt)}`
                  : 'Refunds close 2 hours before the session starts.'}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function TicketList({ filter }: { filter: TicketsFilter }) {
  const { data, isPending, isError, error, refetch } = useTickets(filter);
  const [refunding, setRefunding] = useState<Order | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[183px] rounded-[26px]" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load your tickets" />;
  if (data.length === 0) {
    return filter === 'upcoming' ? (
      <EmptyState
        icon={<FigmaIcon name="ticket" className="size-10" />}
        title="No upcoming tickets"
        description="When you book a session, your tickets will show up here."
        action={
          <Link to="/sessions" className={buttonClasses()}>
            Browse sessions
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon={<FigmaIcon name="ticket" className="size-10" />}
        title="No past tickets"
        description="Sessions you've attended and refunded orders will appear here."
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {data.map((order) => (
          <TicketCard
            key={order.id}
            order={order}
            onRefund={filter === 'upcoming' ? () => setRefunding(order) : undefined}
          />
        ))}
      </div>
      {refunding && <RefundDialog order={refunding} onClose={() => setRefunding(null)} />}
    </>
  );
}

export function MyTickets() {
  const [tab, setTab] = useState<TicketsFilter>('upcoming');
  const upcoming = useTickets('upcoming');
  const past = useTickets('past');
  const tabs: { id: TicketsFilter; label: string; count?: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: upcoming.data?.length },
    { id: 'past', label: 'Past', count: past.data?.length },
  ];

  return (
    <section id="tickets" className="flex flex-col gap-5">
      <div role="tablist" className="flex self-start rounded-xl bg-surface p-[5px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex cursor-pointer items-center gap-2 rounded-[10px] px-3.5 py-[7px] font-semibold transition-colors',
              tab === t.id ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink',
            )}
          >
            <span className="text-sm">{t.label}</span>
            {t.count !== undefined && (
              <span className={clsx('text-xs', tab !== t.id && 'text-disabled')}>{t.count}</span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <TicketList key={tab} filter={tab} />
      </div>
    </section>
  );
}

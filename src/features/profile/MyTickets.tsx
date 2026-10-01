import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order, TicketsFilter } from '@/api/types';
import { refundOrder } from '@/api/endpoints';
import { errorMessage } from '@/api/errors';
import { useTickets } from '@/api/queries';
import { toast } from '@/store/toast';
import { formatLongDate, formatPrice } from '@/lib/format';
import { Poster } from '@/components/MovieCards';
import { Button, buttonClasses } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { AgeBadge, Chip, EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Spinner';
import { TicketIcon } from '@/components/ui/icons';

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

function TicketCard({ order, onRefund }: { order: Order; onRefund?: () => void }) {
  const { session } = order;
  const movie = session.movie;
  const refunded = order.status === 'refunded' || order.refundedAt !== null;

  return (
    <article className={clsx('flex overflow-hidden rounded-2xl border border-line bg-surface', refunded && 'opacity-75')}>
      {movie && <Poster src={movie.posterUrl} title={movie.title} className="w-36 shrink-0" />}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {movie ? (
                <Link to={`/movies/${movie.slug}`} className="text-lg font-bold hover:text-accent">
                  {movie.title}
                </Link>
              ) : (
                <span className="text-lg font-bold">Order {order.reference}</span>
              )}
              {movie && <AgeBadge rating={movie.ageRating} />}
            </div>
            <p className="mt-1 text-sm text-muted">
              {session.venue?.name ?? session.hall.venue?.name} · Hall {session.hall.name}
            </p>
          </div>
          <span className="font-mono text-xs font-semibold tracking-wider text-muted">{order.reference}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{formatLongDate(session.date)}</span>
          <span className="text-muted">at</span>
          <span className="font-semibold">{session.time}</span>
          {session.format && <Chip>{session.format.name}</Chip>}
          {session.language && <span className="text-muted">{session.language.name}</span>}
        </div>

        <ul className="flex flex-wrap gap-2">
          {order.tickets.map((t) => (
            <li key={t.id} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs">
              <span className="font-bold">{t.seatCode}</span>
              <span className="text-muted"> · {t.ticketType.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ticket stub */}
      <div className="flex w-56 shrink-0 flex-col justify-between border-l border-dashed border-line bg-surface-2/60 p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{refunded ? 'Refunded' : 'Total paid'}</p>
          <p className={clsx('text-2xl font-extrabold', refunded && 'text-muted line-through')}>
            {formatPrice(order.totalPrice)}
          </p>
        </div>
        {onRefund && (
          <div className="flex flex-col gap-1.5">
            <Button variant="danger" size="sm" disabled={!order.isRefundable} onClick={onRefund}>
              Refund
            </Button>
            {!order.isRefundable && (
              <p className="text-xs text-muted">Refunds close 2 hours before the session starts.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function TicketList({ filter }: { filter: TicketsFilter }) {
  const { data, isPending, isError, error, refetch } = useTickets(filter);
  const [refunding, setRefunding] = useState<Order | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load your tickets" />;
  if (data.length === 0) {
    return filter === 'upcoming' ? (
      <EmptyState
        icon={<TicketIcon className="size-10" />}
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
        icon={<TicketIcon className="size-10" />}
        title="No past tickets"
        description="Sessions you've attended and refunded orders will appear here."
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
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
  const tabs: { id: TicketsFilter; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
  ];

  return (
    <section id="tickets" className="scroll-mt-24">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">My Tickets</h2>
        <div role="tablist" className="flex rounded-xl border border-line bg-surface p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
                tab === t.id ? 'bg-accent text-white' : 'text-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel">
        <TicketList key={tab} filter={tab} />
      </div>
    </section>
  );
}

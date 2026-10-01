import type { Order, Session } from '@/api/types';
import { formatLongDate, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/icons';

/** Rendered from the server's order response, not local state. */
export function Confirmation({
  order,
  fallbackSession,
  onMyTickets,
  onClose,
}: {
  order: Order;
  fallbackSession: Session;
  onMyTickets: () => void;
  onClose: () => void;
}) {
  const session = order.session ?? fallbackSession;
  const movieTitle = order.session?.movie?.title ?? fallbackSession.movie?.title;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-4 text-center">
      <div className="grid size-16 animate-pop-in place-items-center rounded-full bg-ok/15 text-ok">
        <CheckIcon className="size-8" strokeWidth={3} />
      </div>
      <h3 className="mt-5 text-2xl font-extrabold">You&apos;re all set!</h3>
      <p className="mt-2 text-muted">Your payment was successful and your tickets are booked.</p>

      <div className="mt-6 w-full rounded-2xl border border-line bg-surface-2 p-5 text-left">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <span className="text-sm text-muted">Order reference</span>
          <span className="font-mono text-lg font-bold tracking-wider text-accent">{order.reference}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-sm">
          {movieTitle && (
            <div className="col-span-2">
              <dt className="text-muted">Film</dt>
              <dd className="font-semibold">{movieTitle}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">When</dt>
            <dd className="font-semibold">
              {formatLongDate(session.date)} · {session.time}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Where</dt>
            <dd className="font-semibold">
              {(session.venue ?? fallbackSession.venue).name} · Hall {session.hall.name}
            </dd>
          </div>
        </dl>
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {order.tickets.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>
                <span className="font-bold">Seat {t.seatCode}</span>
                <span className="text-muted"> · {t.ticketType.name}</span>
              </span>
              <span className="font-semibold">{formatPrice(t.price)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm text-muted">Paid with card ···· {order.cardLastFour}</span>
          <span className="text-xl font-extrabold">{formatPrice(order.totalPrice)}</span>
        </div>
      </div>

      <div className="mt-6 flex w-full gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
          Close
        </Button>
        <Button size="lg" className="flex-1" onClick={onMyTickets}>
          My Tickets
        </Button>
      </div>
    </div>
  );
}

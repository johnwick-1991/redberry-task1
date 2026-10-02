import { formatAmount, formatPrice } from '@/lib/format';

const lari = { maskImage: 'url(/figma/lari.svg)', WebkitMaskImage: 'url(/figma/lari.svg)' };

/**
 * A price with the Lari sign outlined from the Figma file. Archivo has no ₾
 * glyph, so text would fall back to a different font per OS; the shape keeps
 * it identical to the design. Sized in em, so it follows the text around it.
 * `spaced` gives the "₾ 14" form the design uses on cards and totals.
 */
export function Price({ value, spaced = false }: { value: number; spaced?: boolean }) {
  return (
    <span className="whitespace-nowrap" role="text" aria-label={formatPrice(value)}>
      <span aria-hidden="true" className="mask-icon mr-[0.06em] h-[0.815em] w-[0.529em]" style={lari} />
      <span aria-hidden="true">
        {spaced && ' '}
        {formatAmount(value)}
      </span>
    </span>
  );
}

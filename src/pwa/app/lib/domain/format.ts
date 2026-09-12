/**
 * nl-NL currency formatting per design handoff README ("€ 1.234", comma
 * decimal, dot thousands). Whole-euro amounts drop the decimals; anything
 * with cents shows them, e.g. "€ 50,75". Negative amounts use the minus
 * sign U+2212, not a hyphen.
 */
export function formatEuros(cents: number): string {
  const decimals = cents % 100 === 0 ? 0 : 2
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(cents) / 100)

  return `${cents < 0 ? '−' : ''}€ ${formatted}`
}

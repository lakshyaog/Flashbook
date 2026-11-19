// 0 / missing values mean "no data yet" — render an em dash instead of a fake number
export const EMPTY = '—';

export const fmtUsd = (n?: number | null) =>
  n ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : EMPTY;

export const fmtNum = (n: number | null | undefined, digits = 2) => (n ? n.toFixed(digits) : EMPTY);

export const fmtPct = (n: number | null | undefined, hasData: boolean) =>
  hasData ? `${(n ?? 0) >= 0 ? '+' : ''}${(n ?? 0).toFixed(2)}%` : EMPTY;

export const NATIVE_SCALE = 1_000_000_000;

export function formatNativeUnits(units: unknown): string {
  const n = typeof units === 'number' ? units : Number(units);
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(n));
  const intPart = Math.floor(abs / NATIVE_SCALE);
  const fracPart = abs % NATIVE_SCALE;
  if (fracPart === 0) return `${sign}${intPart}`;
  const frac = String(fracPart).padStart(9, '0').replace(/0+$/, '');
  return `${sign}${intPart}.${frac}`;
}

export function parseDecimalToUnits(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const [intRaw, fracRaw = ''] = s.split('.');
  if (fracRaw.length > 9) return null;
  const intPart = Number(intRaw);
  if (!Number.isFinite(intPart) || intPart < 0) return null;
  const frac = (fracRaw + '000000000').slice(0, 9);
  const fracPart = Number(frac);
  if (!Number.isFinite(fracPart) || fracPart < 0) return null;
  const units = intPart * NATIVE_SCALE + fracPart;
  if (!Number.isSafeInteger(units) || units < 0) return null;
  return units;
}


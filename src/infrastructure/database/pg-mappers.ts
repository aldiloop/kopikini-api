/** Nilai DECIMAL dari `pg` datang sebagai string; ubah ke number (Rupiah aman di double). */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

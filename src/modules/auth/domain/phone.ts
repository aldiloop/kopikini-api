/**
 * Normalisasi nomor HP Indonesia ke format E.164 (+62...).
 * Menerima: 081234567890, 6281234567890, +62 812-3456-7890.
 * Mengembalikan null bila bukan nomor seluler Indonesia yang valid.
 */
export function normalizeIndonesianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  let national: string;
  if (/^\+62\d+$/.test(digits)) national = digits.slice(3);
  else if (/^62\d+$/.test(digits)) national = digits.slice(2);
  else if (/^0\d+$/.test(digits)) national = digits.slice(1);
  else return null;

  // Nomor seluler Indonesia: diawali 8, total 9–12 digit setelah kode negara.
  if (!/^8\d{8,11}$/.test(national)) return null;
  return `+62${national}`;
}

/** Samarkan nomor untuk log: +62812****7890 */
export function maskPhone(e164: string): string {
  if (e164.length <= 8) return '****';
  return `${e164.slice(0, 6)}****${e164.slice(-4)}`;
}

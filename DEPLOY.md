# Deploy versi asli KopiKini — persiapan (belum dieksekusi)

Status: backend orders sudah jadi dan typecheck lolos. Langkah di bawah ini
BARU jalan setelah Aldi menyetujui hosting dan memberikan kunci Midtrans
sandbox. Jangan jalankan langkah akun/cloud sebelum persetujuan itu.

## 1. Database — Supabase (gratis)
- Buat project Supabase baru, region terdekat (Singapore).
- Ambil Postgres connection string (pooled, dengan `?sslmode=require` bila perlu).
- Set `DATABASE_SSL=true` bila connection string memakai SSL.

## 2. Migrasi + seed ke database live
Dari folder `kopikini-api`, dengan `.env` berisi `DATABASE_URL` live:
- `npm run db:migrate` — menjalankan 001, 002, 003 (sekali saja, tercatat).
- `npm run db:seed` — seed 10 gerai, 5 kategori, 25 produk.

## 3. Backend — Render gratis (Docker)
- Push folder ini ke GitHub (repo Aldi), lalu buat Web Service di Render
  dengan root directory `kopikini-api` dan Dockerfile di folder ini.
- Environment variable wajib di Render (nilai dari Aldi / dari Supabase):
  `NODE_ENV=production`, `PORT` (diisi Render otomatis), `DATABASE_URL`,
  `DATABASE_SSL=true`, `JWT_ACCESS_SECRET` (min 32 karakter, acak),
  `JWT_REFRESH_SECRET` (min 32 karakter, acak), `OTP_HASH_SECRET`
  (min 32 karakter, acak). Opsional: `MIDTRANS_SERVER_KEY`,
  `MIDTRANS_CLIENT_KEY` (sandbox `SB-Mid-*`), `MIDTRANS_IS_PRODUCTION=false`.
- Catat URL backend live, mis. `https://kopikini-api.onrender.com`.
- Catatan Render gratis: service tidur bila lama tidak dipakai, request
  pertama setelah tidur bisa lambat beberapa detik.

## 4. Web ke mode API
- Di Vercel project `kopikini-web`, set environment variable:
  `VITE_DATA_SOURCE=api`, `VITE_ORDERS_SOURCE=api`.
  Perhatian: web saat ini memanggil `/api/v1` same-origin, jadi tanpa
  rewrite ke backend, mode api tidak akan jalan di Vercel. Saat redeploy,
  tambahkan rewrite `/api/:path*` ke URL backend live di `vercel.json`
  web (catatan: `VITE_API_PROXY_TARGET` hanya untuk proxy dev/preview
  Vite, bukan untuk produksi Vercel).
- Redeploy web, lalu verifikasi end-to-end: katalog, OTP, checkout,
  pembayaran sandbox, tracking, panel admin (role staf).

## Yang belum ada
- Kunci Midtrans sandbox dari Aldi (belum diberikan).
- Job kadaluarsa pembayaran otomatis (saat ini hanya via webhook `expire`).
- Modul voucher/loyalti (tabelnya belum ada DDL di BSD).

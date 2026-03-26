# Portonew Vercel CMS

CMS ini adalah hasil migrasi dari Volantis-inspired CMS ke Vercel (Serverless).

## Stack
- **Frontend**: HTML/JS/CSS (Vanilla)
- **Database**: [Turso](https://turso.tech) (libSQL)
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **Deployment**: [Vercel](https://vercel.com)

## Persiapan Deploy (Vercel)

1. **Turso Database**:
   - Buat database baru di Turso.
   - Dapatkan `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`.
   - Jalankan `npm run seed` secara lokal (dengan set env) untuk inisialisasi tabel dan data awal.

2. **Vercel Blob**:
   - Aktifkan Vercel Blob di dashboard project Vercel Anda.
   - Vercel akan otomatis menyuntikkan `BLOB_READ_WRITE_TOKEN`.

3. **Environment Variables**:
   Set variabel berikut di Vercel Dashboard:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_USERNAME` (optional, default: admin)
   - `ADMIN_PASSWORD` (optional, default: bajaraya123)

## Local Development
1. Salin `.env.example` ke `.env` dan isi valuenya.
2. Jalankan `npm install`.
3. Jalankan `npm run dev` (memerlukan Vercel CLI).

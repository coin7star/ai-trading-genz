# AI Trading Assistant Gen Z 🚀

Asisten trading anti-FOMO dengan UI glassmorphism dan bahasa tongkrongan. 
Dibuat menggunakan Next.js App Router dan siap di-deploy ke Cloudflare Pages.

## Cara Menjalankan di Lokal
1. `npm install`
2. Buat file `.env.local` dan tambahkan: `AI_API_KEY=api_key_kamu_di_sini`
3. `npm run dev`
4. Buka `http://localhost:3000`

## Cara Deploy ke Cloudflare Pages
1. Push repo ini ke GitHub.
2. Buka dashboard Cloudflare -> Pages -> Connect to Git.
3. Pilih repo ini. Framework preset: **Next.js**.
4. Di bagian Environment Variables, tambahkan `AI_API_KEY`.
5. Save and Deploy!

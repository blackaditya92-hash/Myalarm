# Myalarm - paket perbaikan

## File
- `index.html`: UI dan stylesheet. Hanya memuat `./script.js`.
- `script.js`: satu-satunya implementasi jam, jadwal, audio alarm, dan kontrol tombol.

## Cara memasang
1. Backup file lama.
2. Ganti `index.html` dan `script.js` di root repository dengan file dari folder ini.
3. Hapus referensi lama ke `/scripts/app.js`, `999-social-credit-siren.mp3`, dan `favicon.ico` jika masih ada di konfigurasi/template lain.
4. Deploy ulang di hosting.
5. Buka DevTools > Network, centang Disable cache, lalu reload. Pastikan `index.html` dan `script.js` berstatus 200 dan tidak ada 404.

## Catatan penting
- Jadwal tanggal 29 Oktober sampai 8 November 2026 dipertahankan persis dari source awal.
- Tanggal yang belum terdaftar sengaja ditampilkan sebagai `Jadwal belum tersedia`; jangan mengasumsikan pola shift tanpa jadwal sebenarnya.
- Audio dibuat melalui Web Audio API sehingga tidak butuh berkas MP3 eksternal. Browser harus mengizinkan audio setelah tombol Mulai Alarm diklik.
- Pengingat hanya berjalan selama tab/halaman terbuka. Browser/OS dapat menangguhkan tab di latar belakang; ini bukan sistem notifikasi background atau alarm perangkat yang dijamin berbunyi saat browser ditutup.

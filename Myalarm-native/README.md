# Myalarm Native Android + Cloudflare

Implementasi native awal untuk repository `blackaditya92-hash/Myalarm`.

## Isi proyek

- `android/`: aplikasi Android Kotlin + Jetpack Compose.
- `cloudflare/`: Cloudflare Worker API dan migrasi Cloudflare D1.
- `.github/workflows/android-release.yml`: build APK melalui GitHub Actions saat tag versi `vX.Y.Z` dibuat.

Aplikasi native menggantikan polling JavaScript browser. Alarm lokal disimpan di SharedPreferences dan dijadwalkan memakai `AlarmManager.setExactAndAllowWhileIdle`. Alarm berjalan offline setelah berhasil dijadwalkan. Alarm yang sudah aktif menggunakan foreground service dan ringtone perangkat; pengguna menghentikannya dari notifikasi.

## A. Siapkan Cloudflare

1. Install Node.js dan Wrangler: `npm install -g wrangler`.
2. Login: `wrangler login`.
3. Buat database: `wrangler d1 create myalarm-db`.
4. Salin `database_id` hasil perintah ke `cloudflare/wrangler.toml`.
5. Jalankan migrasi: `cd cloudflare && wrangler d1 migrations apply myalarm-db --remote`.
6. Buat secret JWT: `wrangler secret put JWT_SECRET` lalu masukkan secret acak minimal 32 byte. Jangan simpan secret ini di APK atau repository.
7. Deploy API: `wrangler deploy`.
8. Tes `https://NAMA-WORKER.SUBDOMAIN.workers.dev/health`, hasil yang diharapkan `{"ok":true,...}`.

API menyediakan:
- `POST /api/register` dengan `{email,password}`; password minimal 10 karakter.
- `POST /api/login` dengan `{email,password}`.
- `GET /api/alarms` dengan Bearer token.
- `PUT /api/alarms` dengan Bearer token dan `{alarms:[...]}`.

Password disimpan sebagai PBKDF2-SHA256 salted hash; token sesi ditandatangani HMAC-SHA256 dan berlaku 30 hari. Untuk deployment publik, aktifkan Cloudflare rate limiting/WAF pada endpoint register/login dan siapkan proses pemulihan akun sebelum dipakai banyak pengguna.

## B. Buka aplikasi Android

1. Buka folder `android/` di Android Studio (Hedgehog atau lebih baru).
2. Tunggu Gradle Sync dan pasang Android SDK 35.
3. Hubungkan HP Android atau gunakan emulator, lalu tekan Run.
4. Di aplikasi, izinkan notifikasi.
5. Tekan **Periksa izin alarm presisi** dan izinkan `Alarms & reminders` di pengaturan Android.
6. Untuk perangkat Xiaomi/Oppo/Vivo/Realme/Samsung tertentu, atur baterai Myalarm ke unrestricted/allow background activity jika sistem menunda alarm.

Minimum Android API 26 (Android 8). `SCHEDULE_EXACT_ALARM` dapat dicabut oleh pengguna atau sistem. Jika izin belum tersedia, aplikasi tidak dapat menjadwalkan alarm presisi.

## C. Sinkronisasi cloud

1. Masukkan URL Worker, contoh `https://myalarm-api.username.workers.dev`.
2. Buat akun dengan email dan password minimal 10 karakter, atau login jika akun sudah ada.
3. **Upload** mengirim seluruh daftar lokal dan mengganti daftar cloud milik akun tersebut.
4. **Download** mengganti daftar lokal dengan daftar dari cloud dan menjadwalkan alarm yang diunduh.

Catatan: sinkronisasi saat ini manual. Ini disengaja agar tidak terjadi konflik diam-diam antara dua perangkat. Lakukan Download sebelum mengedit di perangkat kedua, lalu Upload setelah selesai. Jadwal lokal tetap berjalan tanpa internet.

## D. Update aplikasi

Workflow GitHub Actions membangun APK debug ketika tag versi dibuat. Contoh:

```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions membuat Release dengan APK. Tombol **Periksa pembaruan aplikasi** di Android mengecek GitHub Releases dan membuka halaman rilis jika versi baru tersedia. Instalasi APK dari luar Play Store tetap memerlukan persetujuan pengguna. Untuk distribusi produksi, gunakan signing key Android milik pemilik aplikasi yang disimpan sebagai GitHub Actions Secrets, atau publikasikan melalui Google Play. Jangan gunakan debug signing untuk distribusi publik jangka panjang.

## E. Perbedaan dari website lama

Website lama memakai `localStorage` dan timer JavaScript yang hanya berjalan selama tab aktif. Versi native ini memakai database lokal Android + AlarmManager, sehingga alarm terjadwal tidak bergantung pada halaman web tetap terbuka. Jadwal awal dari `script.js` lama (29 Oktober–8 November 2026) dimasukkan sebagai data awal perangkat pertama. Data dapat diedit dari aplikasi.

## Batasan dan hal yang harus diuji

- Belum ada proses migrasi otomatis data LocalStorage browser ke database Android. Jadwal awal lama sudah disertakan, perubahan lain perlu dimasukkan/diunggah manual.
- Alarm exact masih tunduk pada izin Android dan kebijakan OEM; uji pada HP target dengan layar mati, Doze, restart, dan mode hemat baterai.
- Alarm yang sudah dijadwalkan akan dipulihkan setelah `BOOT_COMPLETED` dan pembaruan paket aplikasi. Android dapat menghapus jadwal jika aplikasi di-force-stop; buka kembali aplikasi untuk menjadwalkan ulang.
- Sinkronisasi tidak realtime dan tidak melakukan merge otomatis. Upload adalah replace-all untuk akun tersebut.
- Workflow menghasilkan APK debug untuk pengujian. Sebelum distribusi luas, konfigurasi signing release yang aman.
- Belum dilakukan build Gradle di lingkungan ini karena Android SDK/Gradle tidak tersedia. JavaScript Worker sudah diperiksa dengan `node --check`; proyek perlu Gradle Sync dan uji perangkat sebelum dinyatakan siap produksi.

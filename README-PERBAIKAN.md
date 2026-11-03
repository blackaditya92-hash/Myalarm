# Myalarm - versi perbaikan

## Fitur
- Jam dan tanggal real-time.
- Alarm otomatis berdasarkan jadwal per tanggal.
- Tambah jadwal alarm, edit tanggal/shift/jam, dan hapus jadwal.
- Pilihan shift Pagi, Siang, Malam, atau Libur.
- Waktu alarm dapat diatur untuk setiap tanggal.
- Jadwal baru dan perubahan disimpan di `localStorage` browser.
- Audio dibuat melalui Web Audio API, tanpa file MP3 eksternal.

## Penerapan
1. Backup repository lama.
2. Ganti `index.html` dan `script.js` di root repository dengan file dari paket ini.
3. Commit dan push, lalu deploy ulang.
4. Buka situs dan lakukan hard refresh.
5. Gunakan menu **Kelola Alarm** untuk menambah atau mengubah jadwal.

## Catatan penting
- Penyimpanan `localStorage` hanya berlaku pada browser/perangkat yang sama. Data tidak otomatis tersinkron ke perangkat lain.
- Alarm hanya dapat berjalan selama halaman/browser tetap aktif. Tab yang ditangguhkan atau komputer yang tidur dapat membuat alarm terlambat.
- Jadwal bawaan hanya mencakup tanggal yang sudah ada pada source. Tambahkan tanggal lain melalui menu Kelola Alarm.
- Jam akhir harus lebih besar daripada jam mulai pada hari yang sama.

```javascript
const alarmSound = document.getElementById('alarmSound');
```javascript
function playAlarm() {
alarmSound.loop = true; // Agar suara berulang terus
alarmSound.play(); // Memutar suara
}
```javascript
function stopAlarm() {
alarmSound.pause(); // Menghentikan suara
alarmSound.currentTime = 0; // Mengatur ulang waktu ke awal (agar kalau diputar lagi mulai dari awal)
}
```javascript
// --- 1. Mengambil Elemen HTML yang Dibutuhkan ---
const displayClock = document.getElementById('displayClock');
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmButton = document.getElementById('setAlarmButton');
const stopAlarmButton = document.getElementById('stopAlarmButton');
const alarmSound = document.getElementById('alarmSound'); // Elemen audio alarm

let alarmInterval; // Variabel untuk menyimpan interval pengecekan alarm
let alarmSetTime = null; // Variabel untuk menyimpan waktu alarm yang diatur

// --- 2. Fungsi untuk Menampilkan Jam Real-time ---
function updateClock() {
const now = new Date();
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const seconds = String(now.getSeconds()).padStart(2, '0');
displayClock.textContent = `${hours}:${minutes}:${seconds}`;

// Setiap detik, cek apakah sudah waktunya alarm berbunyi
if (alarmSetTime) {
const currentHourMinute = `${hours}:${minutes}`;
if (currentHourMinute === alarmSetTime) {
playAlarm();
// Agar alarm tidak berbunyi terus menerus setiap detik setelah match
// Kita bisa menonaktifkan alarm setelah berbunyi, atau menambahkan logic "sudah berbunyi"
// Untuk sementara, kita akan stop pengecekan alarm setelah berbunyi sekali
// Atau pengguna harus menekan tombol Stop Alarm
}
}
}

// --- 3. Fungsi untuk Memutar Audio Alarm ---
function playAlarm() {
// Pastikan alarm hanya berbunyi kalau belum berbunyi
if (alarmSound.paused) {
alarmSound.loop = true; // Agar suara berulang terus
alarmSound.play(); // Memutar suara
console.log('Alarm berbunyi!');
// Opsional: ganti teks tombol "Set Alarm" menjadi "Alarm Aktif"
setAlarmButton.textContent = 'Alarm Aktif!';
setAlarmButton.disabled = true; // Nonaktifkan tombol set saat alarm aktif
}
}

// --- 4. Fungsi untuk Menghentikan Audio Alarm ---
function stopAlarm() {
alarmSound.pause(); // Menghentikan suara
alarmSound.currentTime = 0; // Mengatur ulang waktu ke awal
console.log('Alarm dihentikan.');
// Reset status alarm
alarmSetTime = null; // Hapus waktu alarm yang diatur
setAlarmButton.textContent = 'Set Alarm'; // Kembalikan teks tombol
setAlarmButton.disabled = false; // Aktifkan lagi tombol set
alarmTimeInput.value = ''; // Kosongkan input waktu
clearInterval(alarmInterval); // Hentikan interval pengecekan alarm
alarmInterval = setInterval(updateClock, 1000); // Mulai lagi interval clock saja
}

// --- 5. Event Listener untuk Tombol "Set Alarm" ---
setAlarmButton.addEventListener('click', () => {
const selectedTime = alarmTimeInput.value; // Ambil waktu dari input
if (selectedTime) {
alarmSetTime = selectedTime;
console.log(`Alarm diatur untuk pukul: ${alarmSetTime}`);
alert(`Alarm diatur untuk pukul: ${alarmSetTime}`);
setAlarmButton.textContent = 'Alarm Diatur';
// Kita tidak akan langsung memutar alarm di sini,
// tapi biarkan updateClock() yang mengecek setiap detik.

// Opsional: Hentikan interval pengecekan sebelumnya dan mulai yang baru
// Ini memastikan hanya ada satu interval yang aktif.
clearInterval(alarmInterval); 
alarmInterval = setInterval(updateClock, 1000); // Mulai pengecekan setiap detik
} else {
alert('Mohon atur waktu alarm terlebih dahulu!');
}
});

// --- 6. Event Listener untuk Tombol "Stop Alarm" ---
stopAlarmButton.addEventListener('click', () => {
stopAlarm();
});

// --- 7. Inisialisasi: Mulai Jam Saat Halaman Dimuat ---
// Panggil updateClock sekali saat halaman pertama kali dimuat
updateClock();
// Kemudian, panggil updateClock setiap 1 detik (1000 milidetik)
alarmInterval = setInterval(updateClock, 1000);

```

---
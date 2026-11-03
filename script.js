'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const timeEl = $('currentTimeDisplay');
  const dateEl = $('currentDateDisplay');
  const shiftEl = $('shiftDisplay');
  const statusEl = $('alarmTimeDisplay');
  const pill = $('statusPill');
  const startBtn = $('setAlarmButton');
  const stopBtn = $('stopAlarmButton');
  const disableBtn = $('disableButton');
  const overlay = $('alarmOverlay');
  const card = $('mainCard');

  if (![timeEl, dateEl, shiftEl, statusEl, pill, startBtn, stopBtn, disableBtn, overlay, card].every(Boolean)) {
    console.error('Myalarm: elemen HTML penting tidak ditemukan. Pastikan index.html dan script.js berasal dari versi yang sama.');
    return;
  }

  // Isi jadwal per tanggal di sini. Tanggal yang tidak tercantum dianggap belum memiliki jadwal.
  const defaultSchedule = {
    '2026-10-29': 'PAGI',
    '2026-10-30': 'PAGI',
    '2026-10-31': 'PAGI',
    '2026-11-01': 'PAGI',
    '2026-11-02': 'LIBUR',
    '2026-11-03': 'PAGI',
    '2026-11-04': 'PAGI',
    '2026-11-05': 'PAGI',
    '2026-11-06': 'PAGI',
    '2026-11-07': 'PAGI',
    '2026-11-08': 'PAGI'
  };

  const defaultAlarmTimes = {
    PAGI: { start: '04:30', end: '05:25' },
    SIANG: { start: '11:30', end: '12:35' },
    MALAM: { start: '20:30', end: '21:15' },
    LIBUR: { start: null, end: null }
  };

  const STORAGE_KEY = 'myalarm.schedule.v1';
  let schedule = { ...defaultSchedule };
  let alarmTimes = JSON.parse(JSON.stringify(defaultAlarmTimes));
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      schedule = { ...schedule, ...(saved.schedule || {}) };
      alarmTimes = { ...alarmTimes, ...(saved.alarmTimes || {}) };
    }
  } catch (error) { console.warn('Myalarm: data tersimpan tidak dapat dibaca.', error); }

  const alarmForm = $('alarmForm');
  const alarmList = $('alarmList');
  const dateInput = $('alarmDate');
  const shiftInput = $('alarmShift');
  const startInput = $('alarmStart');
  const endInput = $('alarmEnd');
  const editingInput = $('editingDate');

  function persistSchedule() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schedule, alarmTimes }));
  }

  function scheduleFor(date) {
    const entry = schedule[date];
    if (!entry) return null;
    return typeof entry === 'string'
      ? { shift: entry, ...(defaultAlarmTimes[entry] || {}) }
      : entry;
  }

  function renderAlarmList() {
    alarmList.replaceChildren();
    const dates = Object.keys(schedule).sort();
    if (!dates.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      empty.textContent = 'Belum ada jadwal alarm.'; alarmList.append(empty); return;
    }
    dates.forEach((date) => {
      const item = scheduleFor(date);
      const row = document.createElement('div'); row.className = 'alarm-row';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${new Date(`${date}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${item.shift === 'LIBUR' ? 'Libur' : `Shift ${item.shift}`}`;
      const detail = document.createElement('small');
      detail.textContent = item.shift === 'LIBUR' ? 'Tidak ada alarm' : `${item.start || '??:??'}–${item.end || '??:??'}`;
      info.append(title, detail);
      const actions = document.createElement('div'); actions.className = 'row-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary'; edit.textContent = 'Edit';
      edit.addEventListener('click', () => openEditor(date));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Hapus';
      remove.addEventListener('click', () => {
        if (!window.confirm(`Hapus jadwal ${date}?`)) return;
        delete schedule[date]; persistSchedule(); renderAlarmList(); update();
      });
      actions.append(edit, remove); row.append(info, actions); alarmList.append(row);
    });
  }

  function openEditor(date = '') {
    const item = date ? scheduleFor(date) : null;
    alarmForm.hidden = false;
    editingInput.value = date;
    dateInput.value = date || dateKey(new Date());
    shiftInput.value = item?.shift || 'PAGI';
    startInput.value = item?.start || defaultAlarmTimes.PAGI.start;
    endInput.value = item?.end || defaultAlarmTimes.PAGI.end;
    $('saveAlarmButton').textContent = date ? 'Simpan Perubahan' : 'Simpan Alarm';
    $('toggleManagerButton').textContent = 'Tutup Form';
  }

  function closeEditor() {
    alarmForm.hidden = true; alarmForm.reset(); editingInput.value = '';
    $('toggleManagerButton').textContent = '＋ Tambah Alarm';
  }

  shiftInput.addEventListener('change', () => {
    const preset = defaultAlarmTimes[shiftInput.value];
    if (preset.start) { startInput.value = preset.start; endInput.value = preset.end; }
  });
  $('toggleManagerButton').addEventListener('click', () => alarmForm.hidden ? openEditor() : closeEditor());
  $('cancelEditButton').addEventListener('click', closeEditor);
  alarmForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const date = dateInput.value, shift = shiftInput.value;
    const originalDate = editingInput.value;
    if (!date) return;
    if (shift !== 'LIBUR' && (!startInput.value || !endInput.value || startInput.value >= endInput.value)) {
      window.alert('Waktu akhir harus lebih besar daripada waktu mulai.'); return;
    }
    if (originalDate && originalDate !== date) delete schedule[originalDate];
    schedule[date] = shift === 'LIBUR'
      ? { shift }
      : { shift, start: startInput.value, end: endInput.value };
    persistSchedule(); renderAlarmList(); closeEditor(); update();
  });

  let schedulerRunning = false;
  let audioContext = null;
  let ticker = null;
  let activeDate = '';
  let activeShift = '';
  let lastTriggeredKey = '';
  let manuallyStopped = false;
  let visualTimer = null;
  let audioNodes = [];

  const dateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const clock = (date) => date.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const minutes = (value) => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };

  function setPill(label, kind = '') {
    pill.textContent = label;
    pill.className = `pill${kind ? ` ${kind}` : ''}`;
  }

  function clearAlarmVisual() {
    if (visualTimer) window.clearTimeout(visualTimer);
    visualTimer = null;
    card.classList.remove('alarm-flash');
    overlay.classList.remove('show');
  }

  function stopSound() {
    for (const node of audioNodes) {
      try { node.stop(); } catch (_) { /* node may already have stopped */ }
      try { node.disconnect(); } catch (_) { /* already disconnected */ }
    }
    audioNodes = [];
  }

  function stopAlarm(manual = false) {
    clearAlarmVisual();
    stopSound();
    if (manual) {
      manuallyStopped = true;
      statusEl.textContent = 'Bunyi dihentikan. Pemantauan tetap aktif dan alarm berikutnya masih dijadwalkan.';
      setPill('DIBERHENTIKAN');
    }
  }

  async function unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      audioContext = audioContext || new AudioContextClass();
      if (audioContext.state === 'suspended') await audioContext.resume();
      return audioContext.state === 'running';
    } catch (error) {
      console.warn('Myalarm: audio tidak dapat diaktifkan.', error);
      return false;
    }
  }

  function beep() {
    if (!audioContext || audioContext.state !== 'running') return false;
    stopSound();
    const base = audioContext.currentTime;
    [0, 0.42, 0.84, 1.26, 1.68, 2.1].forEach((offset) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, base + offset);
      gain.gain.setValueAtTime(0.0001, base + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, base + offset + 0.02);
      gain.gain.setValueAtTime(0.12, base + offset + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, base + offset + 0.26);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(base + offset);
      oscillator.stop(base + offset + 0.28);
      audioNodes.push(oscillator);
    });
    return true;
  }

  function triggerAlarm(key) {
    if (lastTriggeredKey === key || manuallyStopped) return;
    lastTriggeredKey = key;
    card.classList.add('alarm-flash');
    overlay.classList.add('show');
    $('overlayMessage').textContent = `Waktunya mulai shift ${activeShift}. Alarm: ${scheduleFor(today).start}.`;
    statusEl.textContent = `ALARM BERBUNYI · Shift ${activeShift}. Tekan tombol merah untuk menghentikan bunyi.`;
    setPill('ALARM AKTIF', 'active');
    if (!beep()) {
      statusEl.textContent = 'Alarm visual aktif, tetapi suara tidak tersedia. Coba tekan tombol Mulai Alarm lagi untuk mengizinkan audio browser.';
    }
    visualTimer = window.setTimeout(() => {
      clearAlarmVisual();
      stopSound();
    }, 5000);
  }

  function updateSchedule(now) {
    const today = dateKey(now);
    if (today !== activeDate) {
      activeDate = today;
      activeShift = (scheduleFor(today)?.shift || '') || '';
      lastTriggeredKey = '';
      manuallyStopped = false;
      clearAlarmVisual();
      stopSound();
    }

    if (!activeShift) {
      shiftEl.textContent = 'Jadwal belum tersedia';
      statusEl.textContent = `Belum ada data jadwal untuk ${today}. Tambahkan tanggal dan shift pada objek jadwal di script.js.`;
      setPill('TANPA JADWAL');
      return;
    }

    if (activeShift === 'LIBUR') {
      shiftEl.textContent = 'Hari ini libur';
      statusEl.textContent = 'Tidak ada alarm yang dijadwalkan hari ini. Selamat beristirahat.';
      setPill('LIBUR', 'off');
      return;
    }

    const shiftTime = scheduleFor(today);
    if (!shiftTime) {
      shiftEl.textContent = 'Jadwal tidak valid';
      statusEl.textContent = `Jenis shift "${activeShift}" belum memiliki konfigurasi alarm.`;
      setPill('KONFIGURASI SALAH');
      return;
    }

    shiftEl.textContent = `Shift ${activeShift}`;
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const startMinute = minutes(shiftTime.start);
    const endMinute = minutes(shiftTime.end);

    if (currentMinute < startMinute) {
      statusEl.textContent = `Alarm dijadwalkan pukul ${shiftTime.start} sampai ${shiftTime.end}.`;
      setPill('MENUNGGU');
      return;
    }
    if (currentMinute > endMinute || (currentMinute === endMinute && now.getSeconds() > 0)) {
      statusEl.textContent = `Periode alarm shift ${activeShift} hari ini selesai pukul ${shiftTime.end}.`;
      setPill('SELESAI');
      return;
    }

    // Alarm pertama berbunyi saat periode dimulai, kemudian tiap 5 menit.
    // Gunakan jendela detik agar polling tidak melewatkan detik 00.
    const elapsed = currentMinute - startMinute;
    if (elapsed >= 0 && elapsed % 5 === 0 && now.getSeconds() < 2) {
      const key = `${today}-${activeShift}-${now.getHours()}:${now.getMinutes()}`;
      triggerAlarm(key);
    } else if (!overlay.classList.contains('show')) {
      statusEl.textContent = `Periode pengingat ${shiftTime.start}–${shiftTime.end}. Alarm berulang setiap 5 menit.`;
      setPill(manuallyStopped ? 'DIBERHENTIKAN' : 'AKTIF', manuallyStopped ? '' : 'active');
    }
  }

  function update() {
    const now = new Date();
    timeEl.textContent = clock(now);
    dateEl.textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    if (schedulerRunning) {
      updateSchedule(now);
      return;
    }

    const shift = (scheduleFor(dateKey(now))?.shift || '') || '';
    shiftEl.textContent = shift === 'LIBUR' ? 'Hari ini libur' : shift ? `Shift ${shift}` : 'Jadwal belum tersedia';
    if (shift === 'LIBUR') {
      statusEl.textContent = 'Tidak ada alarm yang dijadwalkan hari ini.';
    } else if (shift && scheduleFor(dateKey(now))) {
      statusEl.textContent = `Jadwal alarm ${scheduleFor(dateKey(now)).start}–${scheduleFor(dateKey(now)).end}. Klik mulai untuk mengaktifkan.`;
    } else {
      statusEl.textContent = `Tanggal ${dateKey(now)} belum terdaftar di jadwal.`;
    }
    setPill('BELUM AKTIF');
  }

  async function startScheduler() {
    if (schedulerRunning) return;
    await unlockAudio(); // Browser memerlukan interaksi pengguna untuk mengizinkan audio.
    schedulerRunning = true;
    manuallyStopped = false;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    disableBtn.disabled = false;
    $('liveDot').classList.add('on');
    $('liveLabel').textContent = 'Pemantauan aktif';
    update();
    if (ticker) window.clearInterval(ticker);
    ticker = window.setInterval(update, 250);
  }

  function disableScheduler() {
    schedulerRunning = false;
    if (ticker) window.clearInterval(ticker);
    ticker = null;
    stopAlarm(false);
    startBtn.disabled = false;
    stopBtn.disabled = true;
    disableBtn.disabled = true;
    $('liveDot').classList.remove('on');
    $('liveLabel').textContent = 'Belum aktif';
    setPill('DINONAKTIFKAN');
    statusEl.textContent = 'Pemantauan jadwal dinonaktifkan.';
  }

  startBtn.addEventListener('click', startScheduler);
  stopBtn.addEventListener('click', () => stopAlarm(true));
  $('overlayStopButton').addEventListener('click', () => stopAlarm(true));
  disableBtn.addEventListener('click', disableScheduler);
  window.addEventListener('pagehide', () => {
    if (ticker) window.clearInterval(ticker);
    stopSound();
  });

  renderAlarmList();
  update();
  window.setInterval(() => { if (!schedulerRunning) update(); }, 1000);
})();

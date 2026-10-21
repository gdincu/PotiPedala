/* Poți Pedala? — verdict simplu da/nu pentru bicicliști
 * Date: Open-Meteo pe ore (gratuit): temperatură, precipitații, probabilitate, vânt.
 * Logică: VERDE dacă fiecare oră din următoarele N ore este în limitele utilizatorului.
 */
const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

const settings = {
  get hours()   { return clampInt(store.get('pp_hours', '2'), 1, 12, 2); },
  get rainMm()  { return clampFloat(store.get('pp_rainMm', '0.2'), 0, 10, 0.2); },
  get rainProb(){ return clampInt(store.get('pp_rainProb', '40'), 0, 100, 40); },
  get minTemp() { return clampFloat(store.get('pp_minTemp', '5'), -20, 40, 5); },
  get maxWind() { return clampFloat(store.get('pp_maxWind', '25'), 0, 150, 25); },
  get lat()     { return clampFloat(store.get('pp_lat', '44.33'), -90, 90, 44.33); },
  get lon()     { return clampFloat(store.get('pp_lon', '23.80'), -180, 180, 23.80); },
};
function clampInt(v, lo, hi, fb) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb; }
function clampFloat(v, lo, hi, fb) { const n = parseFloat(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb; }

let lastWindowText = '';

function hourVerdict(h, s) {
  // returnează null dacă ora e bună de pedalat, altfel motivul scurt
  if ((h.precip ?? 0) > s.rainMm) return `🌧️ ${h.precip.toFixed(1)}mm ploaie`;
  if ((h.prob ?? 0) > s.rainProb) return `🌧️ ${h.prob}% risc de ploaie`;
  if ((h.temp ?? 99) < s.minTemp) return `🥶 ${Math.round(h.temp)}°C frig`;
  if ((h.wind ?? 0) > s.maxWind) return `💨 ${Math.round(h.wind)} km/h vânt`;
  return null;
}

async function check() {
  setLoading();
  const s = {
    hours: clampInt($('hoursInput').value, 1, 12, settings.hours),
    rainMm: clampFloat($('rainMmInput').value, 0, 10, settings.rainMm),
    rainProb: clampInt($('rainProbInput').value, 0, 100, settings.rainProb),
    minTemp: clampFloat($('tempInput').value, -20, 40, settings.minTemp),
    maxWind: clampFloat($('windInput').value, 0, 150, settings.maxWind),
    lat: parseFloat($('latInput').value),
    lon: parseFloat($('lonInput').value),
  };
  if (!Number.isFinite(s.lat)) s.lat = 44.33;
  if (!Number.isFinite(s.lon)) s.lon = 23.80;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}` +
    `&current=temperature_2m,weather_code` +
    `&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code` +
    `&timezone=Europe%2FBucharest&forecast_days=3&wind_speed_unit=kmh`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    render(d, s);
    $('updatedAt').textContent = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    $('verdict').className = 'verdict stop';
    $('verdict').textContent = '⚠️ Nu pot verifica';
    $('verdictSub').textContent = 'Fără conexiune la prognoză. Reîncearcă. (' + e.message + ')';
    $('statusDot').className = 'status-dot stop';
    $('statusDot').textContent = '!';
  }
}

function setLoading() {
  $('verdict').className = 'verdict loading';
  $('verdict').textContent = 'Se verifică…';
  $('verdictSub').textContent = 'Se încarcă prognoza…';
  $('statusDot').className = 'status-dot loading';
  $('statusDot').textContent = '…';
  $('failReason').className = 'fail-reason';
  $('failReason').textContent = '';
}

function parseHours(d) {
  const h = d.hourly, now = Date.now();
  let start = h.time.findIndex((t) => new Date(t).getTime() >= now - 3600e3);
  if (start < 0) start = 0;
  return h.time.map((t, i) => ({
    time: t,
    date: new Date(t),
    temp: h.temperature_2m?.[i],
    precip: h.precipitation?.[i] ?? 0,
    prob: h.precipitation_probability?.[i] ?? 0,
    wind: h.wind_speed_10m?.[i] ?? 0,
    code: h.weather_code?.[i] ?? 0,
  })).slice(start);
}

function fmtHM(date) {
  return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}
function fmtDay(date) {
  const today = new Date().toDateString() === date.toDateString();
  if (today) return 'astăzi';
  const tomorrow = new Date(Date.now() + 864e5).toDateString() === date.toDateString();
  if (tomorrow) return 'mâine';
  return date.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'numeric' });
}
const oreLabel = (n) => n === 1 ? 'oră' : 'ore';
const emojiFor = (code) => code === 0 ? '☀️' : code <= 2 ? '⛅' : code === 3 ? '☁️' : code < 70 ? '🌧️' : code < 80 ? '🌨️' : '⛈️';

function render(d, s) {
  const allHours = parseHours(d);
  const next = allHours.slice(0, s.hours);
  const checks = next.map((h) => ({ h, bad: hourVerdict(h, s) }));
  const allGood = checks.every((c) => !c.bad);

  $('placeLabel').textContent = `${s.lat.toFixed(2)}, ${s.lon.toFixed(2)} · N=${s.hours}h · ≥${s.minTemp}°C · ≤${s.maxWind}km/h · ploaie ≤${s.rainMm}mm/${s.rainProb}%`;

  // --- 1. Verdictul mare ---
  if (allGood) {
    $('statusDot').className = 'status-dot go';
    $('statusDot').textContent = '✓';
    $('verdict').className = 'verdict go';
    $('verdict').textContent = '🟢 POȚI PEDALA';
    $('verdictSub').textContent = `Vremea este bună de pedalat pentru următoarele ${s.hours} ${oreLabel(s.hours)}. Hai pe bicicletă! 🚴`;
    $('failReason').className = 'fail-reason';
    $('failReason').textContent = '';
  } else {
    const first = checks.find((c) => c.bad);
    $('statusDot').className = 'status-dot stop';
    $('statusDot').textContent = '✕';
    $('verdict').className = 'verdict stop';
    $('verdict').textContent = '🔴 MAI AȘTEAPTĂ';
    const badCount = checks.filter((c) => c.bad).length;
    $('verdictSub').textContent =
      `${first.bad} la ${fmtHM(first.h.date)} — ${badCount} din ${s.hours} ${oreLabel(s.hours)} depășesc limitele.`;
    $('failReason').className = 'fail-reason show';
    $('failReason').textContent = '⛔ ' + checks.filter((c) => c.bad)
      .map((c) => `${fmtHM(c.h.date)}: ${c.bad}`).join(' · ');
  }

  // --- 2. Cronologia (următoarele 12 ore) ---
  $('timeline').innerHTML = allHours.slice(0, 12).map((h) => {
    const bad = hourVerdict(h, s);
    return `<div class="slot ${bad ? 'bad' : 'ok'}">
      <div class="t">${fmtHM(h.date)}</div>
      <div class="big-emoji">${emojiFor(h.code)}</div>
      <div class="v">${Math.round(h.temp)}° · ${Math.round(h.wind)}<span style="font-weight:400">km/h</span></div>
      <div>🌧️ ${h.precip.toFixed(1)}mm · ${h.prob}%</div>
      ${bad ? `<div class="bad-reason">${bad}</div>` : `<div style="color:#7bf0a8;font-weight:700">bine ✓</div>`}
    </div>`;
  }).join('');

  // --- 3. Următoarea fereastră bună (căutare în 48h) ---
  const win = findWindow(allHours.slice(0, 48), s);
  const card = $('windowCard');
  if (allGood) {
    card.hidden = true;
    lastWindowText = '';
  } else if (win) {
    card.hidden = false;
    const label = `Fereastră de ${s.hours} ${oreLabel(s.hours)} găsită ${fmtDay(win[0].date)} între ${fmtHM(win[0].date)} și ${fmtHM(win[win.length - 1].date)} — poți pedala! 🎉`;
    lastWindowText = label;
    $('windowTitle').textContent = `✅ Fereastră de ${s.hours} ${oreLabel(s.hours)} găsită!`;
    $('windowSub').textContent = label;
    maybeAutoNotify(label);
  } else {
    card.hidden = false;
    lastWindowText = '';
    $('windowTitle').textContent = 'Nicio fereastră în 48h 😞';
    $('windowSub').textContent = `Nicio perioadă de ${s.hours} ${oreLabel(s.hours)} în limitele tale în următoarele 48h. Încearcă să relaxezi limitele de vânt/ploaie.`;
  }
}

function findWindow(hours, s) {
  const n = s.hours;
  for (let i = 0; i + n <= hours.length; i++) {
    const slice = hours.slice(i, i + n);
    if (slice.every((h) => !hourVerdict(h, s))) {
      // sare peste blocul „chiar acum” — apelantul arată fereastra doar când acum e rău,
      // dar păstrăm simplu: returnăm primul bloc viitor care începe după 1h
      if (i === 0) continue;
      return slice;
    }
  }
  return null;
}

// ---- Notificări (comutator Oprit / Pornit) ----
function refreshNotifyBtn() {
  $('notifyBtn').textContent = store.get('pp_notify', '0') === '1' ? 'Pornit' : 'Oprit';
}
$('notifyBtn').onclick = async () => {
  if (store.get('pp_notify', '0') === '1') {
    store.set('pp_notify', '0');
    refreshNotifyBtn();
    return;
  }
  if (!('Notification' in window)) { alert('Notificările nu sunt acceptate aici.'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { alert('Permisiune refuzată — fereastra rămâne afișată pe ecran.'); return; }
  store.set('pp_notify', '1');
  refreshNotifyBtn();
  try { new Notification('Poți Pedala? 🚴', { body: lastWindowText || 'Caut o fereastră de pedalat. Ține aplicația deschisă — verifică din 10 în 10 minute.' }); } catch {}
};

function maybeAutoNotify(text) {
  if (store.get('pp_notify', '0') !== '1') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification('Poți Pedala? 🚴', { body: text }); } catch {}
}

// ---- Controale ----
function collapseLimits() {
  const card = $('limitsCard');
  if (card && 'open' in card) card.open = false;
}
function syncInputs() {
  $('hoursInput').value = settings.hours;
  $('rainMmInput').value = settings.rainMm;
  $('rainProbInput').value = settings.rainProb;
  $('tempInput').value = settings.minTemp;
  $('windInput').value = settings.maxWind;
  $('latInput').value = settings.lat.toFixed(2);
  $('lonInput').value = settings.lon.toFixed(2);
}
function persistFromInputs() {
  store.set('pp_hours', String(clampInt($('hoursInput').value, 1, 12, 2)));
  store.set('pp_rainMm', String(clampFloat($('rainMmInput').value, 0, 10, 0.2)));
  store.set('pp_rainProb', String(clampInt($('rainProbInput').value, 0, 100, 40)));
  store.set('pp_minTemp', String(clampFloat($('tempInput').value, -20, 40, 5)));
  store.set('pp_maxWind', String(clampFloat($('windInput').value, 0, 150, 25)));
  store.set('pp_lat', String(parseFloat($('latInput').value) || 44.33));
  store.set('pp_lon', String(parseFloat($('lonInput').value) || 23.80));
}
$('saveBtn').onclick = () => { persistFromInputs(); collapseLimits(); check(); };
$('refreshBtn').onclick = () => { persistFromInputs(); check(); };
$('locateBtn').onclick = () => {
  navigator.geolocation?.getCurrentPosition((p) => {
    $('latInput').value = p.coords.latitude.toFixed(2);
    $('lonInput').value = p.coords.longitude.toFixed(2);
    $('presetSelect').value = 'custom';
    persistFromInputs(); check();
  }, () => alert('Locația a fost refuzată.'), { timeout: 8000 });
};
$('presetSelect').onchange = (e) => {
  if (e.target.value === 'craiova') {
    $('latInput').value = '44.33'; $('lonInput').value = '23.80';
  }
};

// Prompt de instalare PWA
let deferred;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferred = e; $('installBtn').hidden = false;
});
$('installBtn').onclick = () => deferred?.prompt();

refreshNotifyBtn();

syncInputs();
check();
setInterval(check, 10 * 60 * 1000);

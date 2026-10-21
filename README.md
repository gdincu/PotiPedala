# Poți Pedala? (PWA)

- 🟢 **POȚI PEDALA** — vremea este bună de pedalat pentru următoarele **N** ore.
- 🔴 **MAI AȘTEAPTĂ** — vântul, ploaia sau frigul depășește pragul setat.
- 🔔 **Fereastră inteligentă**: găsește următoarea perioadă bună de N ore timp de 48h —
  ex. *„Fereastră de 2 ore găsită între 15:00 și 17:00 — poți pedala!”* —
  și poate trimite o notificare în browser.

## Limite (editabile, salvate local)

| Setare | Implicit |
|---|---|
| Fereastră de pedalat N ore | 2 |
| Ploaie maximă mm/oră | 0.2 |
| Probabilitate maximă de ploaie % | 40 |
| Temperatură minimă °C | 5 |
| Vânt maxim km/h | 25 |
| Locație | Craiova 44.33, 23.80 + 📍 geolocalizare |

Regulă: **fiecare** oră din următoarele N trebuie să treacă **toate** limitele, altfel 🔴.

## Date (gratuite)

`api.open-meteo.com` pe ore: `temperature_2m, precipitation, precipitation_probability, wind_speed_10m, weather_code` + fusul orar `Europe/Bucharest`.

## Notificări

- **Notificări (Oprit/Pornit)** pornește notificările, apoi te anunță când apare o fereastră bună. Verifică automat din 10 în 10 minute cât e deschisă.
- Offline: interfața e salvată de `sw.js`; prognoza are nevoie de rețea.
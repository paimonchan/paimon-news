# 04 — Content Sources (Aktual)

## Sumber Berita Terkini
**28 RSS feed dari 11 portal:**

### Portal Umum
1. **Detik.com** — detikNews, detikFinance, detikNet, detikHot, detikSport, detikOto, detikTravel, detikFood, detikHealth, Wolipop
2. **CNN Indonesia** — nasional, internasional, ekonomi, teknologi, olahraga, hiburan, gaya hidup
3. **Kompas.com** — megapolitan, nasional
4. **Tempo.co** — nasional
5. **CNBC Indonesia** — market
6. **Media Indonesia** — nasional
7. **Antara News** — umum
8. **Tribun News** — nasional
9. **Okezone** — news
10. **Sindonews** — nasional
11. **RMOL.id** — nasional

## Kriteria Pemilihan
- Portal berita mainstream Indonesia
- RSS feed tersedia dan stabil
- Cakupan topik yang luas

## Proses
- RSS di-fetch tiap 6 jam via GitHub Actions (conditional GET — hemat bandwidth)
- HTML di-extract, dinormalisasi, lalu di-cluster
- Duplikat lintas portal otomatis terdeteksi via Jaccard similarity

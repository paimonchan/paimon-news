# 02 — Product (Features & UX)

## User Stories

### Sebagai Pembaca
- [ ] Melihat daftar berita terbaru dari berbagai sumber
- [ ] Membaca ringkasan berita yang padat dan enak dibaca
- [ ] Klik "Baca Selengkapnya" untuk ke sumber asli
- [ ] Filter berita berdasarkan kategori (tech, politik, olahraga, dll)
- [ ] Search berita
- [ ] Bookmark / simpan berita

### Sebagai Pembaca Premium
- [ ] Tidak ada iklan
- [ ] Ringkasan lebih panjang / deep dive
- [ ] Notifikasi real-time untuk topik tertentu
- [ ] Ekspor / share ringkasan

## User Flow
1. User buka website → lihat feed berita terkini
2. Setiap card berisi: **judul** → **ringkasan 2-3 paragraf** → **sumber** → **timestamp**
3. Klik card → baca ringkasan lengkap + link ke artikel asli

## UI/UX Principles
- Mobile-first (karena berita dibaca di HP)
- Load time < 2 detik
- Dark mode / light mode
- Font nyaman dibaca (Inter, Merriweather, dll)

## MVP Features
- [ ] Feed berita dari 3-5 sumber
- [ ] Summarization otomatis (LLM)
- [ ] Kategori dasar (3-5 kategori)
- [ ] Search sederhana
- [ ] Responsive web

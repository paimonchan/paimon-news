// Utilitas teks Bahasa Indonesia: normalisasi, tokenisasi, kemiripan, escaping.
// Murni — tanpa IO, tanpa dependency. Aman ditest 100%.

const STOPWORDS = new Set(
  `yang dan di ke dari untuk dengan pada dalam ini itu adalah ialah akan telah sudah tidak ada atau juga
bisa dapat sebagai lebih karena namun saat ketika setelah sebelum hingga sampai oleh bagi tentang antara
seperti yaitu yakni menjadi serta agar supaya maka jika bila kalau bahwa mereka kami kita saya aku dia ia
anda kamu nya pun lah kah per para kepada terhadap secara sejak demi guna belum sedang masih hanya cuma
saja sangat paling amat begitu begini sebuah suatu setiap beberapa semua seluruh banyak sedikit lagi pernah
segera kemudian lalu lantas tapi tetapi sambil seraya kata ujar tutur menurut ungkap jelas terang bilang
the of to in for on at an a is are was were be been has have had it its his her their our your my me we you
he she they them us i s t d com www id co rp ribu juta miliar senin selasa rabu kamis jumat sabtu minggu
januari februari maret april mei juni juli agustus september oktober november desember wib wita wit foto
video baca simak terkait editor redaksi`
    .split(/\s+/)
    .filter(Boolean)
);

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape teks mentah (mis. judul RSS) sebelum diinterpolasi ke HTML email/template. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeText(input: string): string {
  return stripHtml(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): Set<string> {
  const out = new Set<string>();
  for (const tok of normalizeText(input).split(" ")) {
    if (tok.length >= 3 && !STOPWORDS.has(tok) && !/^\d+$/.test(tok)) out.add(tok);
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (big.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Kemiripan berbobot: irisan dihitung terhadap himpunan yang lebih kecil (toleran judul beda panjang). */
export function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (big.has(t)) inter++;
  return inter / small.size;
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|igshid|ref$|ref_src|spm|campaignid)/i.test(key)) {
        u.searchParams.delete(key);
      }
    }
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return url.trim();
  }
}

export function sentences(text: string): string[] {
  return stripHtml(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
}

export function excerpt(text: string | null | undefined, max = 220): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

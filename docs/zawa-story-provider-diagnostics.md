# Diagnostik Story Zawa — BADAI

Belum ada bukti Story diterima. Production ditahan atas permintaan pengguna
sampai Story terbukti tampil di WhatsApp. Catatan ini bisa diteruskan ke dukungan
Zawa; tidak ada kredensial yang perlu disertakan.

## Kontrak yang digunakan

- `POST https://api-zawa.azickri.com/status`
- Header `id`, `session-id`, `Content-Type: application/json`; nilainya hanya
  dibaca oleh Supabase Edge Function dari tabel sesi privat.
- Body `{ "type": "text", "text": "Uji Status WhatsApp BADAI. Penanda …" }`.
- Respons sukses yang didokumentasikan: HTTP 200 dengan `statusId`.
- Dokumen resmi: <https://zawa.azickri.com/api/send/send-status.md>.
  Diperiksa ulang pada 14 Oktober 2026; kontraknya sama dengan audit awal.

## Percobaan yang diizinkan

| Penanda | Mulai UTC (WIB) | Hasil | Audiens yang dikonfirmasi pengguna |
| --- | --- | --- | --- |
| `BADAI-STORY-6A7407A1` | 06:50:21 (13:50:21) | HTTP 504 setelah sekitar 60,3 detik, tanpa `statusId` | Kontak saya |
| `BADAI-STORY-EBD7E8CF` | 07:04:54 (14:04:54) | HTTP 504 setelah sekitar 60,1 detik, tanpa `statusId` | Hanya bagikan dengan satu kontak percobaan |
| `BADAI-PAIR-STORY-C949BA77` | 08:50:51 (15:50:51) | HTTP 504 setelah 60,049 detik, tanpa `statusId` | Setelah reset dan scan QR ulang; pengaturan terakhir yang dikonfirmasi adalah Hanya bagikan dengan satu kontak percobaan |

Ketiganya pada 14 Oktober 2026, masing-masing **satu** permintaan. Percobaan kedua
adalah uji baru dengan penanda berbeda dan izin pengguna setelah perubahan
privasi. Percobaan ketiga dikonfirmasi dan dikirim pengguna dari Admin setelah
reset yang disetujui, scan QR ulang, dan penerimaan nyata uji grup pada koneksi
baru. Permintaan lama tidak diulang. Hasil ketiganya tetap `unknown`; antrean uji
ketiga otomatis `paused`. Tidak ada retry otomatis.

Sesudah pengguna mengonfirmasi Story tetap tidak terlihat, dua antrean uji
ditutup sebagai `cancelled`. **Hasil job tetap `unknown`**, masing-masing satu
percobaan dan HTTP 504. Tidak ada bukti penerimaan yang dibuat. Penutupan ini
menghilangkan tombol LANJUTKAN pada preview lama, tanpa mengirim ulang atau
menghapus hasil pengujian. Bila Story kemudian benar-benar terlihat, bukti
penerimaan masih dapat dicatat.

Sesi yang sama berhasil mengirim teks dan gambar ke grup serta teks ke Channel,
dengan ID provider dan bukti penerimaan pengguna. Pemeriksaan sesi dari Edge
setelah uji kedua juga memperoleh HTTP 200 dan `isConnected: true` dalam sekitar
2,5 detik. Hal ini tidak membuktikan kemampuan pengiriman Story.

BADAI menunggu respons pengiriman sampai 65 detik. Di ketiga uji Story, panggilan
HTTP ke Zawa telah mengembalikan 504 sekitar detik ke-60. Dokumen Zawa menyebut
waktu pemrosesan kirim maksimum empat menit. Komponen yang menghasilkan timeout
60 detik dan penyebab internalnya belum diketahui.

Uji diagnostik tambahan dari Edge menggunakan payload teks kosong yang secara
eksplisit didokumentasikan tidak valid: `{ "type": "text", "text": "" }`.
Zawa memberi HTTP 400 dengan `text should not be empty` dalam sekitar 3 detik.
Endpoint menjawab lapisan validasi dengan kontrak yang benar; proses publikasi
dengan teks valid tetap mengalami timeout. Uji diagnostik ini tidak memiliki
konten Story, tidak mencatat bukti penerimaan, dan tidak membuka fitur Story.
Tidak ada respons mentah atau kredensial yang ditampilkan.

## Data yang diperlukan dari Zawa

Mohon dukungan Zawa memeriksa sesi melalui panel/kanal autentikasi milik pengguna,
tanpa meminta pengguna memposting token di chat atau repository:

1. Apakah tiga `POST /status` dengan penanda dan waktu di atas diterima engine?
2. Apakah engine menyelesaikan publikasi? Bila ya, apa `statusId` dan waktu
   penyelesaiannya? Bila tidak, apa pesan error internal yang sudah disanitasi?
3. Gateway/komponen mana yang memberi HTTP 504 sekitar 60 detik, sementara engine
   mendokumentasikan batas empat menit?
4. Apakah proses membaca privasi/sinkronisasi kontak berhenti, atau proses kirim
   Status gagal? Perubahan audiens ke satu kontak belum menyelesaikan timeout.
5. Perbaikan apa yang diperlukan setelah perubahan privasi dan satu reset/scan
   QR ulang tidak menyelesaikan timeout?

Tidak ada API diagnostik sinkronisasi kontak atau tanda terima Story yang
didokumentasikan. BADAI tidak mencoba endpoint dugaan, memperlakukan 504 sebagai
gagal pasti, ataupun mengubah konfigurasi akun secara otomatis.

## Langkah reset yang disetujui kemudian

Pengguna kemudian mengirim halaman Error & Solusi dan menyetujui **satu** reset
serta kesiapan scan QR. `PUT /session` dijalankan sekali sekitar 14:43 WIB pada
14 Oktober 2026, menghasilkan HTTP 200 sesuai dokumentasi. Pengiriman dibekukan,
riwayat tetap disimpan, dan generasi pairing privat diperbarui karena Zawa
mempertahankan ID/token setelah reset. Pengguna scan QR ulang; koneksi baru sudah
diverifikasi terhubung dari backend. Uji teks grup `BADAI-PAIR-GROUP-C949BA77`
mendapat HTTP 200 dengan messageId `3EB05E0765ECA5DDB68582`, dan pengguna
mengonfirmasi bahwa pesan benar-benar terlihat di WhatsApp #22 IMAGO. Bukti
penerimaan generasi pairing baru dicatat tanpa memakai ulang bukti sesi lama.

Setelah itu, pengguna mengirim satu uji Story dari Admin:

```json
{
  "type": "text",
  "text": "Uji Status WhatsApp BADAI setelah scan QR ulang. Penanda BADAI-PAIR-STORY-C949BA77. Mohon abaikan pesan percobaan ini."
}
```

Job `803df861-849e-4007-b1ac-7df06f3f8169` mulai `15:50:51.631 WIB` dan
hasilnya dicatat `15:51:51.679 WIB`, HTTP 504, tanpa ID provider. Job hanya
mencatat satu percobaan; run `2b00e80e-7307-4e72-9f18-c5c56f4b4e56` otomatis
dipause. Generasi pairing sama dengan uji grup yang diterima nyata. Pengguna
melaporkan notifikasi `BELUM DIKETAHUI — TIDAK DICOBA ULANG`; penerimaan di
WhatsApp tetap perlu diperiksa, tanpa mengulang kiriman. Pemeriksaan sesi
berikutnya memperoleh HTTP 200, connected=true, dalam sekitar 2,5 detik.
Reset/pairing belum menyelesaikan timeout Story; sumber gateway dan penyebab
engine tidak bisa dipastikan tanpa log Zawa.

## Pemeriksaan ulang panduan Kirim Status

Pengguna kemudian meminta pemeriksaan ulang melalui
<https://zawa.azickri.com/api/send/send-status.html>. HTML halaman tersebut dan
versi Markdown sama-sama diambil langsung, HTTP 200. Kontraknya tetap
`POST /status`, header `id`, `session-id`, `Content-Type: application/json`,
body `{ "type": "text", "text": "..." }`, respons HTTP 200 dengan `statusId`.
Tidak ada kolom nomor, group, newsletter, audience, warna, atau endpoint
tambahan yang diwajibkan untuk teks. Privasi audiens tetap diatur melalui HP.

Fungsi Supabase yang aktif saat audit adalah `badai-wa-send` versi 13. Source map
bundle yang diambil melalui Management API menunjukkan empat modul yang sama
persis dengan repository: entrypoint, service, Zawa adapter, dan worker auth.
Jadi tidak ditemukan perbedaan format request ataupun adapter lama pada fungsi
yang terpasang. Ini tidak membuktikan keberhasilan publikasi oleh engine Zawa.

Perbaikan laporan dipasang sebagai versi 14: respons Owner kini menyertakan
kode HTTP provider dan kode diagnostik yang disanitasi. Admin menampilkan
misalnya HTTP 504 dan langkah memeriksa WhatsApp tanpa mengirim ulang. Respons
worker tetap hanya boolean; tidak ada data akun atau kredensial baru yang
ditampilkan. Endpoint, payload Status, timeout, dan aturan tanpa retry tetap
sama. Empat puluh tes adapter/service/UI lolos, termasuk jalur Status sesuai
contoh panduan, pencatatan statusId sebagai penerimaan API, serta 504 tanpa retry.
Pemeriksaan tipe dan build juga lolos. Tes lokal ini bukan bukti Story diterima.

Sesudah deployment, diagnostik teks kosong yang tidak mempublikasikan konten
masih mendapat HTTP 400 sesuai dokumentasi dalam sekitar 2,6 detik. Satu draft
baru `UJI STATUS PANDUAN ZAWA - BADAI-STATUS-DOC-98B6557B` disiapkan dengan isi:

```json
{
  "type": "text",
  "text": "Deploy hari ini lancar jaya 🚀\nBADAI-STATUS-DOC-98B6557B"
}
```

Draft `b9cf7868-93e1-4901-b4ec-cd44348262c5` memiliki nol job saat disiapkan.
Pengguna diminta mengonfirmasi satu uji melalui Admin dan melaporkan penerimaan
nyata; tidak ada operator POST Status dengan teks valid atau retry otomatis.
Preview commit `a74e40c` READY di
<https://badai-62iz618e0-cuanify25-2175s-projects.vercel.app/admin>.
CORS origin baru dan preview sebelumnya sama-sama terverifikasi HTTP 204.
Anonymous Admin tetap memerlukan login Vercel, bukan bukti akses Owner.
Production masih ditahan dan tidak ada bukti Story baru yang diklaim.

## Pesan yang bisa dikirim pengguna ke dukungan Zawa

> Sesi Zawa saya terhubung dan berhasil mengirim teks/gambar grup serta teks
> Channel, tetapi tiga POST /status teks menghasilkan HTTP 504 sekitar 60 detik.
> Pada 14 Oktober 2026: BADAI-STORY-6A7407A1 mulai 13:50:21 WIB dengan privasi
> Kontak saya; BADAI-STORY-EBD7E8CF mulai 14:04:54 WIB dengan Hanya bagikan dengan
> satu kontak percobaan. Satu reset yang disarankan panduan sudah dilakukan pada
> sekitar 14:43 WIB dan QR sudah discan ulang. Uji teks grup pada koneksi baru
> benar-benar diterima. Namun BADAI-PAIR-STORY-C949BA77 mulai 15:50:51 WIB tetap
> mendapat 504 setelah 60,049 detik. Payload mengikuti dokumentasi resmi, dan
> ketiganya tidak menghasilkan statusId. Mohon periksa penerimaan request,
> hasil publikasi/error engine, dan gateway timeout 60 detik. Tidak ada kiriman
> yang diulang otomatis. Kredensial sesi akan diidentifikasi hanya melalui kanal
> aman; mohon tidak meminta token diposting di chat atau repository.
> Payload teks kosong pada endpoint yang sama mendapat HTTP 400 sesuai dokumentasi
> dalam sekitar tiga detik; teks valid tetap mengalami timeout.

Pesan ini masih berupa draft. Codex belum menghubungi atau mengirim pesan ke
dukungan Zawa. Alamat dukungan `contact.azickri@gmail.com` tercantum pada
<https://zawa.azickri.com/guide/errors.html>. Dokumentasi Status dan Error & Solusi
diperiksa ulang setelah percobaan ketiga; tidak ada endpoint polling hasil
Status atau diagnostik kontak yang didokumentasikan.

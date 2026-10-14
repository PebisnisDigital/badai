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

## Dua percobaan yang diizinkan

| Penanda | Mulai UTC (WIB) | Hasil | Audiens yang dikonfirmasi pengguna |
| --- | --- | --- | --- |
| `BADAI-STORY-6A7407A1` | 06:50:21 (13:50:21) | HTTP 504 setelah sekitar 60,3 detik, tanpa `statusId` | Kontak saya |
| `BADAI-STORY-EBD7E8CF` | 07:04:54 (14:04:54) | HTTP 504 setelah sekitar 60,1 detik, tanpa `statusId` | Hanya bagikan dengan satu kontak percobaan |

Keduanya pada 14 Oktober 2026, masing-masing **satu** permintaan. Percobaan kedua
adalah uji baru dengan penanda berbeda dan izin pengguna setelah perubahan
privasi. Permintaan lama tidak diulang. Keduanya tercatat `unknown`, dengan
antrean masing-masing `paused`; tidak ada percobaan ketiga otomatis.

Sesi yang sama berhasil mengirim teks dan gambar ke grup serta teks ke Channel,
dengan ID provider dan bukti penerimaan pengguna. Pemeriksaan sesi dari Edge
setelah uji kedua juga memperoleh HTTP 200 dan `isConnected: true` dalam sekitar
2,5 detik. Hal ini tidak membuktikan kemampuan pengiriman Story.

BADAI menunggu respons pengiriman sampai 65 detik. Di kedua uji Story, panggilan
HTTP ke Zawa telah mengembalikan 504 sekitar detik ke-60. Dokumen Zawa menyebut
waktu pemrosesan kirim maksimum empat menit. Komponen yang menghasilkan timeout
60 detik dan penyebab internalnya belum diketahui.

## Data yang diperlukan dari Zawa

Mohon dukungan Zawa memeriksa sesi melalui panel/kanal autentikasi milik pengguna,
tanpa meminta pengguna memposting token di chat atau repository:

1. Apakah dua `POST /status` dengan penanda dan waktu di atas diterima engine?
2. Apakah engine menyelesaikan publikasi? Bila ya, apa `statusId` dan waktu
   penyelesaiannya? Bila tidak, apa pesan error internal yang sudah disanitasi?
3. Gateway/komponen mana yang memberi HTTP 504 sekitar 60 detik, sementara engine
   mendokumentasikan batas empat menit?
4. Apakah proses membaca privasi/sinkronisasi kontak berhenti, atau proses kirim
   Status gagal? Perubahan audiens ke satu kontak belum menyelesaikan timeout.
5. Perbaikan apa yang diperlukan tanpa mereset sesi WhatsApp yang sudah bekerja?

Tidak ada API diagnostik sinkronisasi kontak atau tanda terima Story yang
didokumentasikan. BADAI tidak mencoba endpoint dugaan, memperlakukan 504 sebagai
gagal pasti, mereset sesi, ataupun mengubah konfigurasi akun secara otomatis.

## Pesan yang bisa dikirim pengguna ke dukungan Zawa

> Sesi Zawa saya terhubung dan berhasil mengirim teks/gambar grup serta teks
> Channel, tetapi dua POST /status teks menghasilkan HTTP 504 sekitar 60 detik.
> Pada 14 Oktober 2026: BADAI-STORY-6A7407A1 mulai 13:50:21 WIB dengan privasi
> Kontak saya; BADAI-STORY-EBD7E8CF mulai 14:04:54 WIB dengan Hanya bagikan dengan
> satu kontak percobaan. Payload mengikuti dokumentasi resmi, dan keduanya tidak
> menghasilkan statusId. Mohon periksa penerimaan request, hasil publikasi/error
> engine, dan gateway timeout 60 detik. Saya tidak ingin reset sesi sebelum
> penyebabnya jelas. Kredensial sesi akan diidentifikasi hanya melalui kanal aman.

Pesan ini masih berupa draft. Codex belum menghubungi atau mengirim pesan ke
dukungan Zawa.

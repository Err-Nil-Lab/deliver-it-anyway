# GDD — DELIVER IT ANYWAY (Working Title)

> **Catatan:** Dokumen ini mengikuti struktur GDD Err Nil Studio. Status dipakai untuk membedakan keputusan yang sudah disepakati, hipotesis, dan hal yang masih perlu diuji.

## 0. Identitas dokumen

- **Judul / versi GDD:** DELIVER IT ANYWAY — v2.0 (pivot: fokus memuat, pengiriman paralel, shift berwaktu)
- **Tanggal pembaruan:** 2026-10-10
- **Pemilik keputusan desain:** `TERBUKA`
- **Platform / input utama:** `TERBUKA` untuk rilis — target prototipe: browser desktop, mouse (drag & drop) + keyboard
- **Status proyek:** Build di repo masih **loop v1** (muat satu per satu, satu haul global). Desain v2 di bawah belum diimplementasi; urutan kerja ada di `WORK_STEPS.md`. Belum ada browser test maupun playtest pada build mana pun.
- **Workflow produksi:** Satu chat mengerjakan satu step aktif menurut `WORK_STEPS.md`, seperti proyek *Proceed Anyway*.

### Cara membaca status

| Status | Arti |
| --- | --- |
| `TETAP` | Keputusan desain yang disetujui. Jangan diubah diam-diam. |
| `BERJALAN` | Perilaku yang sudah ada di build saat ini. |
| `USULAN` | Ide yang belum disetujui atau belum dibuat. |
| `TERBUKA` | Pertanyaan yang belum diputuskan. |
| `PERLU UJI` | Hipotesis pengalaman pemain yang belum punya bukti cukup. |

---

## 1. Inti game

- **Premis satu kalimat:** Pemain bekerja seperti kasir untuk antrean truk: menyeret paket ke truk, menimbang berat terhadap risiko, menekan **Deliver**, dan terus memuat truk lain sementara pengiriman berjalan di latar — sampai timer shift habis dan shift report muncul.
- **Genre dan bentuk sesi:** Active incremental + push-your-luck; sesi berupa shift berwaktu pendek yang diulang.
- **Pemain sasaran:** `TERBUKA`
- **Janji pengalaman:** Terus berpikir **“satu paket lagi masuk… atau kirim sekarang?”** di bawah tekanan waktu, lalu menikmati *ting ting ting SUCCESS DELIVERED* atau menyesali *ting ting ting DUAR*.
- **Masalah desain utama:** `PERLU UJI` — Apakah memuat di bawah tekanan waktu dan armada terbatas tetap menghasilkan keputusan “satu lagi” yang tegang, bukan sekadar menyusun paket aman berulang kali.

---

## 2. Pilar desain

| Pilar | Terlihat dalam permainan ketika… | Ide harus ditolak/diubah ketika… |
| --- | --- | --- |
| **Loading Is The Game** `TETAP` | Aksi utama pemain adalah memilih dan memuat paket; risiko dan reward terbaca dari muatan. | Sistem baru menjauhkan pemain dari tindakan memuat. |
| **One More Is The Decision** `TETAP` | Menambah paket selalu menaikkan nilai sekaligus risiko; pemain memilih kapan berhenti. | Progression/aturan membuat menambah paket tidak berisiko atau tidak berguna. |
| **Parallel, Not Blocking** `TETAP` | Pengiriman berjalan di latar; pemain boleh langsung memuat truk lain. | Ada popup/scene yang menahan input saat pengiriman. |
| **Active Incremental** `TETAP` | Progress datang dari keputusan cepat dan shift aktif, bukan idle. | Progress utama bisa berjalan sendiri. |
| **Absurd, Boxy, Readable** `TETAP` | Paket, truk, berat, value, dan risiko terbaca seketika. | Visual membuat state sulit dibaca. |

---

## 3. Loop pemain

**Loop shift:**

1. Shift dimulai: timer berjalan, ada **5 paket** di antrean, dan **2 truk** tersedia.
2. Pemain **menyeret paket ke bak truk**; HUD truk menampilkan berat total, kapasitas, nilai, dan chance sukses.
3. Pemain menekan **DELIVER** (boleh setengah kosong; minimal 1 paket). Truk berangkat; pengiriman berjalan di jalur latar berupa titik rute (*ting ting ting*).
4. Pemain **langsung** memuat truk lain tanpa menunggu. Hasil muncul sebagai banner singkat tanpa perlu ditutup: **SUCCESS DELIVERED** atau **DUAR**.
5. Truk kembali setelah waktu rute (bust: lebih lama); paket baru muncul di antrean beberapa detik sekali.
6. Timer habis → pengiriman yang masih berjalan diselesaikan → **shift report** → beli upgrade → shift berikutnya.

**Prinsip waktu:** waktu rute sama untuk setiap truk. Muatan lebih penuh berarti uang per detik lebih tinggi, tetapi risiko DUAR naik. Truk kecil yang aman mengunci slot armada untuk uang yang sedikit. Itulah biaya “main aman”.

### Contoh 30 detik

1. Antrean: TV $40/8, Sofa $90/18, Fridge $160/30, ... Pemain menyeret TV dan Sofa ke Truk A (26 load vs kapasitas 20 → chance 76%).
2. Pemain menekan DELIVER. Truk A berangkat; titik rute mulai bergerak.
3. Pemain memuat Truk B dengan Fridge sendirian (30 load → 60%?) atau menambah paket lebih ringan.
4. Banner: Truk A **SUCCESS +$130**. Truk A kembali setelah beberapa detik.

> Semua angka di atas contoh uji, bukan keputusan.

---

## 4. Aturan permainan

### Kontrol dan kemampuan pemain

| Aksi | Input | Aturan dan batas | Status |
| --- | --- | --- | --- |
| **Muat paket** | Drag & drop paket → bak truk | Menambah berat dan nilai truk; hanya ke truk yang sedang di dermaga. | `TETAP` |
| **Tarik kembali paket** | Drag paket keluar bak | Hanya sebelum deliver. | `USULAN` |
| **Deliver** | Klik tombol deliver | Mengunci muatan dan chance; truk berangkat; tidak memblokir input. Boleh dengan muatan sedikit, minimal 1 paket. | `TETAP` |
| **Beli upgrade** | Klik di shift report | Memakai uang permanen. | `TETAP` |
| **Skip / buang paket** | — | Tidak ada. Paket yang tidak dimuat tetap di antrean. | `USULAN` |

### Paket, risiko, dan reward

| Elemen | Aturan | Status |
| --- | --- | --- |
| **Atribut paket** | Nilai ($) dan berat (load). Ukuran fisik **ditunda**, belum dipakai untuk aturan. | `TETAP` |
| **Chance** | Dihitung dari total berat vs kapasitas truk (`calculateDeliveryChance`): aman sampai kapasitas, lalu turun per 1% kapasitas terlampaui (berbasis rasio), dengan minimum. Chance dikunci saat deliver. | `BERJALAN`, angka `TERBUKA` |
| **Reward** | Setiap paket punya nilai; sukses membayar total nilai paket di truk. Bonus per truk, bila ada, harus kecil agar tidak mendorong truk kecil. | nilai per paket `TETAP`; bonus per truk `USULAN` |
| **Bust (DUAR)** | Muatan hilang; biaya perbaikan = maks($40, 40% nilai muatan); truk downtime tambahan 12 detik. **Wallet boleh negatif (utang)**; upgrade hanya bisa dibeli saat saldo cukup. | `BERJALAN`; nilai `TERBUKA` |
| **Tier paket** | Tier baru terbuka tiap 3 level capacity; tiap tier berisi paket kecil, menengah, dan jackpot berat yang hanya terjangkau lewat overload. | `BERJALAN`; nilai `TERBUKA` |
| **Antrean** | 5 paket awal; spawn baru tiap beberapa detik. Antrean punya batas maksimum agar paket tidak menumpuk tanpa konsekuensi. | spawn `TETAP`; batas `USULAN` |
| **Armada** | 2 truk di awal; truk yang di jalan tidak tersedia sampai kembali. | `TETAP` |
| **Physics** | Hanya kosmetik (goyang, jatuh, ledakan). Tidak menentukan hasil. | `USULAN` |

### Shift dan progression

- **Timer shift:** durasi tetap per shift. Pengiriman yang sedang berjalan saat timer habis tetap diselesaikan sebelum report. `USULAN` (selesaikan pengiriman); durasi `TERBUKA`.
- **Shift report:** menampilkan pendapatan, jumlah truk sukses/bust, biaya perbaikan, dan uang per menit shift. `TETAP`
- **Upgrade awal (maksimal 4 jenis):** capacity truk, durasi shift, spawn rate paket, jumlah truk. `TETAP` sebagai daftar awal; harga dan efek `TERBUKA`.
- **Restart:** money dan upgrade tetap; antrean dan truk direset tiap shift.
- **Win/final milestone:** `TERBUKA`.

### Angka uji awal (untuk `config.ts`, bukan keputusan)

| Parameter | Nilai uji awal |
| --- | ---: |
| Durasi shift | 90 detik |
| Paket awal / interval spawn / batas antrean | 5 / 6 detik / 8 |
| Waktu rute | 6 detik |
| Downtime tambahan saat bust | +4 detik |
| Biaya perbaikan | $25 |
| Kapasitas truk | 20 load |

---

## 5. Presentasi dan keterbacaan

- **Arah visual (`TETAP`):** simple boxy 2D, kotak tegas, kontras jelas, detail minimal.
- **Layout:** antrean paket, dua bak truk, jalur rute untuk pengiriman berjalan, timer shift, wallet. HUD tidak menutupi bak truk.
- **Hasil pengiriman (`TETAP`):** banner singkat di jalur truk, hilang sendiri tanpa tombol close. Hasil besar atau bust diberi overlay dramatis (flash, shake, SFX tebal) yang **tidak menangkap input**.
- **Audio:** SFX pendek untuk muat, deliver, titik rute, success, DUAR, upgrade.
- **Akses dan keterbacaan:** berat, chance, dan status truk selalu terlihat; aman vs overload tidak bergantung pada warna saja.

---

## 6. Batas desain

### Wajib dipertahankan (`TETAP`)

- Pemain selalu punya keputusan bermakna: kirim sekarang atau tambah satu paket lagi.
- Menambah paket selalu menambah value dan load/risk exposure.
- Pengiriman tidak memblokir input.
- Tidak ada complex driving sebagai core mechanic.
- Progress utama aktif, bukan idle.
- Visual 2D boxy, simple, readable, absurd.

### Di luar scope sekarang

- Physics yang menentukan hasil, stacking simulation, ukuran fisik paket sebagai kendala.
- Full driving, open world, multiplayer, narasi berat.
- Deep tycoon/economy, puluhan stat atau cabang upgrade.
- Idle income, offline progression.
- Prestige.

### Ide yang ditunda (`USULAN`)

- Ukuran paket sebagai kendala ruang bak (ditunda atas keputusan pemilik).
- Pseudo-physics deterministik (titik berat) bila physics ingin berpengaruh.
- Random paket dengan rasio value/berat berbeda.
- Cargo escalation: box → electronics → furniture → vehicle → bangunan → objek mustahil.
- DUAR terjadi di titik acak sepanjang rute untuk tegang.

---

## 7. Bukti dan pertanyaan terbuka

| Klaim / pertanyaan | Status | Bukti saat ini | Uji berikutnya |
| --- | --- | --- | --- |
| Build v1: muat satu per satu, dispatch, resolution 4 detik, wallet, log haul, satu upgrade capacity, juice. | `BERJALAN` (legacy v1) | Production build lolos. Belum ada browser test atau playtest. | Dipakai ulang sebagian di v2 (lihat `WORK_STEPS.md`). |
| Fungsi risiko `calculateDeliveryChance` dapat dipakai ulang tanpa perubahan. | `BERJALAN` | `src/systems/risk.ts` murni dari load dan capacity. | Dipakai per truk. |
| Drag & drop + armada paralel mempertahankan keputusan “satu lagi”. | `PERLU UJI` | Belum ada. | Playtest shift pertama. |
| Waktu rute yang sama membuat muatan penuh lebih menguntungkan per menit dan menahan farming truk kecil. | `PERLU UJI` | Argumen model; belum diuji. | Bandingkan uang/menit truk kecil vs penuh di shift report. |
| Banner non-blocking cukup mempertahankan rasa DUAR / SUCCESS. | `PERLU UJI` | Belum ada. | Amati apakah hasil terlewat saat pemain sibuk memuat. |
| 2 truk awal tidak membebani pemain. | `PERLU UJI` | Belum ada. | Playtest. |
| Biaya perbaikan + downtime terasa adil, bukan hukuman acak. | `PERLU UJI` | Belum ada. | Respons pemain setelah bust. |
| Timer shift lebih baik daripada jatah truk per shift. | `TERBUKA` | Perbandingan desain meja saja. | Flag config untuk menguji akhir shift berdasar timer atau jumlah truk. |
| Random paket atau urutan tetap. | `TERBUKA` | Belum diuji. | Setelah baseline. |

---

## 8. Keputusan dan perubahan

| Tanggal | Keputusan | Alasan/bukti | Dampak |
| --- | --- | --- | --- |
| 2026-10-06 | Fokus konsep berpindah dari full 3D driving menjadi active incremental delivery. | Driving menggeser fokus dan memperbesar scope. | Driving manual keluar dari core. |
| 2026-10-06 | Visual direvisi menjadi simple boxy 2D. | Instruksi pemilik. | Tidak ada model/kamera 3D. |
| 2026-10-06 | Prototipe v1 dibangun (Step 1–6, 10–13 sebagian). | Production build lolos; belum ada runtime/playtest. | Menjadi dasar kode yang dipakai ulang sebagian. |
| 2026-10-10 | **Pivot v2:** fokus ke memuat. Pemain menerima 5 paket, drag & drop ke truk, menilai risiko, lalu deliver. | Keputusan pemilik: loop v1 kurang menekankan memuat. | Pilar “One More Is The Decision” diperluas menjadi memuat paket; GDD dan `WORK_STEPS.md` ditulis ulang. |
| 2026-10-10 | Pengiriman **paralel, tidak memblokir**; hasil berupa banner non-blocking, hasil besar/bust dengan overlay tak menangkap input. | Keputusan pemilik setelah membandingkan versi berurutan dan paralel. | State per truk menggantikan fase global. |
| 2026-10-10 | Armada awal **2 truk**; waktu rute sebagai biaya kesempatan. | Tanpa batas armada, truk kecil aman jadi dominan. | Upgrade jumlah truk menjadi sink uang. |
| 2026-10-10 | Bust = biaya perbaikan + downtime truk. | Keputusan pemilik. | Hukuman berupa waktu dan uang. |
| 2026-10-10 | Shift berwaktu dengan shift report dan upgrade antar-shift. | Keputusan pemilik: ala incremental, kasir. | Timer dan layar report baru. |
| 2026-10-10 | Ukuran paket ditunda; risiko tetap dari berat; physics hanya kosmetik. | Keputusan pemilik; menjaga risiko terbaca dan scope kecil. | `risk.ts` dipakai ulang. |
| 2026-10-10 | Tidak ada skip; deliver setengah kosong boleh. | Keputusan pemilik. | Tekanan berasal dari waktu dan armada, bukan dari membuang paket. |

---

## 9. Kontrak kerja untuk ChatGPT

> Gunakan GDD ini sebagai acuan tujuan dan keputusan desain game. Sebelum mengusulkan atau mengubah sesuatu, baca status item terkait, lalu cek kode/config, checklist, dan laporan QA terbaru bila tersedia. Bedakan fakta build, temuan playtest, hipotesis, dan usulan. Jangan menganggap `USULAN` sebagai fitur yang disetujui. Jika permintaanku bertentangan dengan keputusan `TETAP`, jelaskan konsekuensinya dan ikuti instruksi terbaruku. Kerjakan hanya tugas yang kuminta, verifikasi sesuai risikonya, lalu laporkan perubahan GDD yang diperlukan. Jangan mengklaim pengalaman pemain sudah tervalidasi hanya dari build atau tes otomatis.

**Pemeliharaan:** Setelah keputusan desain berubah, perbarui bagian terkait dan baris keputusan. Setelah implementasi berubah, cek tabel `BERJALAN` terhadap kode. Setelah playtest, perbarui bukti dan status `PERLU UJI`.

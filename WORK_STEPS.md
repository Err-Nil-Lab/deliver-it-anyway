# DELIVER IT ANYWAY — One Chat, One Step

Dokumen ini adalah urutan kerja utama proyek. Acuan desainnya `GDD.md` **v2.0** (pivot: fokus memuat, pengiriman paralel, shift berwaktu). `docs/archive/PROTOTYPE_PLAN.md`, `docs/archive/RULES_MODEL.md`, dan `docs/archive/PROGRESSION_EVAL.md` menjelaskan loop v1 dan sudah usang untuk desain v2; pakai hanya sebagai rujukan angka dan rumus risiko. Angka dan fitur berstatus `TERBUKA`/`USULAN` hanya menjadi asumsi prototipe sampai diputuskan berdasarkan uji.

## Aturan kerja

Setiap chat hanya mengerjakan **satu step aktif**.

Dalam setiap step, Codex harus:

1. membaca kondisi proyek terbaru;
2. mengerjakan hanya scope step tersebut;
3. menjalankan verifikasi yang relevan;
4. memperbaiki error yang masih termasuk scope step;
5. memperbarui status checklist ini;
6. melaporkan hasil dan berhenti;
7. tidak memulai step berikutnya sebelum diminta.

Jika sebuah step belum lolos Definition of Done, statusnya tetap `IN PROGRESS` dan chat berikutnya melanjutkan step yang sama.

Status yang digunakan:

- `[ ]` NOT STARTED
- `[-]` IN PROGRESS
- `[x]` DONE
- `[!]` BLOCKED

---

## Arsip: loop v1 (digantikan v2)

Step 1–6 membangun bootstrap, HUD, LOAD/DISPATCH, resolution, dan log. Step 10–13 menambah satu upgrade capacity, milestone ARCADE, dan juice. Semua lolos production build; **tidak pernah diuji di browser atau oleh pemain**. Step 7–9 dan 12 (QA runtime, playtest, tuning) tidak diselesaikan dan dibatalkan oleh pivot v2.

Yang dipakai ulang di v2:

- `src/systems/risk.ts` — `calculateDeliveryChance(load, capacity)` per truk, tanpa perubahan.
- `src/config.ts` — pola konfigurasi terpusat; nilai v1 yang tidak relevan dihapus saat dipakai.
- `src/main.ts` — setup KAPLAY, tombol input, dan `playSfx`.
- Logika payout/bust dan log haul dari `src/gameState.ts` sebagai referensi; bentuk state diganti.

Yang digantikan: fase global `HAUL → RESOLVING → RESULT`, offer berurutan deterministik, dan satu upgrade capacity sekali pakai.

---

## Core Proof v2

### [x] Step V2-1 — State multi-truk, antrean paket, dan timer (tanpa UI baru)

**Tujuan:** Mengganti state global v1 dengan state yang mewakili antrean paket, dua truk, pengiriman berjalan, dan shift berwaktu.

**Pekerjaan:**

- definisikan `Package` (nama, value, load), `Truck` (muatan, status `LOADING | EN_ROUTE | RETURNING`, waktu kembali), dan state shift (timer, antrean, wallet);
- fungsi murni: muat paket ke truk, tarik kembali, deliver (kunci chance via `calculateDeliveryChance`), selesaikan pengiriman, spawn paket, tick waktu;
- bust: biaya perbaikan tetap + downtime tambahan; wallet tidak negatif;
- nilai uji awal masuk `config.ts` (shift 90 s, rute 6 s, spawn 6 s, antrean maks 8, repair $25, downtime +4 s);
- hapus penggunaan state v1 yang tidak lagi relevan tanpa mengubah `risk.ts`.

**Definition of Done:**

- `npm run build` lolos;
- state dapat dijalankan dengan urutan pemanggilan fungsi tanpa KAPLAY;
- deliver tidak memblokir truk lain; truk yang di jalan tidak bisa dimuat;
- chance yang dikunci sama dengan chance yang dipakai saat resolusi.

**Tidak dikerjakan:** UI, drag & drop, animasi, upgrade.

**Hasil:** `src/shiftState.ts` (state murni: `createShiftState`, `loadPackage`, `unloadPackage`, `deliver`, `tickShift`) dan blok `shift` di `src/config.ts`. `src/gameState.ts` v1 sengaja dibiarkan karena `main.ts` masih memakainya; dihapus saat UI v2 menggantikannya (V2-2/3). Build lolos; skenario script sekali pakai (muat, deliver paralel, bust + repair, downtime, akhir shift dengan REPORT) berjalan sesuai.

---

### [x] Step V2-2 — Antrean paket dan drag & drop ke truk (greybox)

**Tujuan:** Membuat tindakan memuat terasa dan terbaca.

**Pekerjaan:**

- tampilkan 5 paket awal dan dua bak truk sebagai kotak 2D;
- drag & drop paket ke bak; tarik kembali sebelum deliver;
- HUD per truk: load/kapasitas, nilai, chance, penanda aman vs overload selain warna;
- preview chance saat paket diseret ke truk.

**Hasil implementasi:** `src/main.ts` ditulis ulang memakai `shiftState` (immediate-mode `onDraw`, input mouse manual); `src/gameState.ts` v1 dihapus. Drag dari antrean atau bak, drop ke bak lain untuk memindah, drop di luar bak untuk mengembalikan ke antrean. HUD per truk memuat load/kapasitas, nilai, chance, SAFE/OVERLOAD. Build lolos; **belum dicek di browser** dan belum ada timer/spawn/deliver di UI (V2-3, V2-4). Antrean 8 paket melebihi lebar layar; perlu ditangani di V2-4. Drag & drop dikonfirmasi pemilik berjalan di browser (2026-10-10).

**Definition of Done:**

- muatan visual sama dengan state;
- paket tidak bisa dimuat ke truk yang sedang di jalan;
- input cepat tidak menggandakan paket;
- HUD tidak menutupi bak truk.

---

### [x] Step V2-3 — Deliver paralel dan jalur rute

**Tujuan:** Membuat pengiriman berjalan di latar tanpa memblokir input.

**Pekerjaan:**

- tombol DELIVER per truk; truk berangkat, jalur rute dengan titik bergerak;
- hasil dari chance terkunci: success membayar muatan, bust memicu biaya perbaikan dan downtime;
- truk kembali dan dapat dimuat lagi;
- banner hasil singkat di jalur truk, hilang sendiri.

**Hasil implementasi:** tombol DELIVER per truk, jalur rute 8 titik dengan penanda truk, `DELIVERING $x @ y%`, banner SUCCESS DELIVERED / DUAR (hilang sendiri, tidak menangkap input), flash + shake + SFX, status REPAIRING saat downtime. Frame border + footer `ERR NIL // 002` mengikuti PROCEED ANYWAY. Karena `tickShift` aktif, timer 90 detik dan spawn paket ikut berjalan; layar shift report hanya placeholder teks (V2-4). Build lolos; **belum dicek di browser**.

**Definition of Done:**

- pemain dapat memuat truk B sementara truk A di jalan;
- hasil tidak bisa diselesaikan dua kali;
- wallet berubah tepat sekali per pengiriman;
- tidak ada popup yang menahan input.

---

### [x] Step V2-4 — Timer shift, spawn paket, dan shift report

**Tujuan:** Menutup siklus satu shift.

**Pekerjaan:**

- timer shift dan HUD timer;
- spawn paket tiap interval sampai batas antrean;
- saat timer habis: pengiriman berjalan diselesaikan dulu, lalu shift report;
- report: pendapatan, truk sukses/bust, biaya perbaikan, uang per menit shift;
- tombol mulai shift berikutnya dengan wallet tetap.

**Hasil implementasi:** layar REPORT berisi deliveries, success, DUAR, payout, repair, net, per menit, wallet (dihitung dari `state.log`); tombol/Enter/Space `NEXT SHIFT` memanggil `createShiftState(wallet)` dan mereset banner/log/drag. Build lolos; belum dicek tiga shift beruntun di browser.

**Definition of Done:**

- tiga shift beruntun tanpa state bocor;
- angka report cocok dengan log pengiriman;
- paket dan truk direset benar tiap shift.

---

### [x] Step V2-5 — Upgrade di shift report

**Tujuan:** Memberi uang tujuan yang berulang.

**Pekerjaan:**

- empat upgrade awal: capacity truk, durasi shift, spawn rate, jumlah truk;
- harga dan efek terpusat di `config.ts`, bertingkat sederhana;
- upgrade bertahan antar-shift.

**Definition of Done:**

- pembelian memotong uang tepat sekali;
- efek langsung terlihat di shift berikutnya;
- upgrade tidak menghapus situasi overload yang menggiurkan (cek dengan model nilai/berat).

**Tidak dikerjakan:** skill tree, prestige, stability.

**Hasil implementasi:** `config.upgrades` (capacity +4 load/level maks 5, shift time +15 s maks 4, spawn -1 s maks 3, extra truck maks 1; biaya `baseCost × growth^level`), `buyUpgrade`/`getUpgradeCost` di `shiftState.ts`, dan daftar upgrade dengan tombol BUY di layar report. Pembelian hanya di fase REPORT; level bertahan antar-shift. Dengan 3 truk, bak mengecil agar antrean tetap muat. Build lolos dan logika pembelian dicek lewat skrip sekali pakai; **belum dicek di browser**. Catatan tuning: pool paket tetap (8/18/30 load) sehingga capacity maksimal (40) masih overload hanya bila 3 paket dimuat — perlu dinilai di V2-8/V2-9.

---

### [-] Step V2-6 — Feedback dan presentasi

**Tujuan:** Membuat load, deliver, success, DUAR, dan upgrade mudah dirasakan.

**Pekerjaan:**

- tween singkat saat paket masuk, SFX titik rute;
- overlay dramatis untuk hasil besar/bust yang tidak menangkap input;
- hierarki UI dan tanda overload selain warna.

**Hasil implementasi:** paket yang dimuat jatuh singkat ke bak (tween), SFX tick tiap titik rute, overlay besar `DUAR` / `BIG DELIVERY` (payout ≥ $200) yang fade dan tidak menangkap input, bak berbingkai tebal saat overload (selain teks), SFX upgrade terpisah. Nilai di `config.juice`. Build lolos; **belum dicek di browser**.

**Definition of Done:**

- success dan bust dibedakan tanpa membaca paragraf;
- feedback tidak menutupi bak truk atau memperlambat memuat;
- banner dan overlay tidak mencuri input.

---

## Log perubahan (di luar daftar step)

- **Rename (2026-10-10):** judul proyek menjadi DELIVER IT ANYWAY (dokumen, `index.html`, `package.json`, menu). Nama folder tetap `one-more-delivery`.
- **Main menu (2026-10-10):** judul `DELIVER IT / ANYWAY`, tombol START (klik/Enter/Space) dan HOW TO PLAY (klik/H) yang membuka layar terpisah dengan 4 baris dan BACK (klik/Esc). Scene `MENU`/`HOWTO`/`PLAY` di `main.ts`; tick shift tidak berjalan di luar `PLAY`. Build lolos; belum dicek di browser.

- **Readability pass 1 (2026-10-10):** skala tipografi 28/18/14 (`ui.text`), HUD truk tiga kolom berlabel (LOAD, VALUE, CHANCE) dengan chance paling besar, load overload sebagai chip putih solid `26/20 +6`, preview drag sebagai `76% > 28%`, kartu paket seragam ukuran 18. Build lolos; belum dicek di browser. 
- **Readability pass 2 (2026-10-10):** meter muatan tipis di atas tiap bak (solid sampai kapasitas, outline setelahnya, tick kapasitas), satu margin kiri (24) untuk header/bak/antrean, `TIME` berkedip inversi di 10 detik terakhir, teks footer digelapkan (`colors.footer`) untuk kontras ≥ 4,5:1. Build lolos; belum dicek di browser.

- **Accent color minimal (2026-10-10):** token `danger`/`safe`/`caution` di `config.colors`; dipakai hanya untuk status kecil: chance per tier (`risk.safeAt`/`cautionAt`), chip overload dan meter meluap (merah), banner/overlay SUCCESS (hijau) vs DUAR (merah), flash bust, chip TIME ≤10 detik (kuning), payout/repair di report. Frame, footer, kartu, dan judul tetap monokrom; teks dan bentuk tetap membawa informasi tanpa warna. Build lolos; belum dicek di browser, termasuk uji grayscale.

- **Balancing pass 1 (2026-10-10):** disimulasikan dengan 3 bot (SAFE/MID/GREEDY, 25 kampanye) sebelum dan sesudah. Build lama: semua upgrade habis sebelum shift 3, net datar ~$5k. Perubahan: penalti overload berbasis persen kapasitas (0,8 poin per 1%), shift 45 s, rute 8 s, downtime bust 12 s, repair `max($40, 40% nilai muatan)` dan wallet boleh negatif (utang), 4 tier paket yang terbuka tiap 3 level capacity (item terberat per tier hanya terjangkau lewat overload), harga upgrade `costGrowth` 1,65/1,65/1,75 dengan capacity 12 level. Hasil simulasi: strategi MID (chance ≥70%) terbaik di shift 2–10, SAFE lambat di awal, GREEDY terburuk; ±22 dari 23 level terbeli di sekitar shift 23. **Hanya simulasi bot** (muat 1,3 s, tanpa ragu); belum ada pemain. Skrip simulasi tidak ada di repo.

- **Package readability + truck price (2026-10-10):** hapus counter `QUEUE n/8` (diganti chip `QUEUE FULL` saat penuh); kartu paket: lebar mengikuti load (visual saja), nilai $ ukuran 28 sebagai titik fokus, nama kecil, strip merah `LOAD n +x` bila paket melebihi sisa kapasitas truk terlonggar, bingkai ganda untuk paket jackpot tier; antrean mengalir dan mengecil bila perlu agar maksimal 2 baris; truk ke-3 $5.000. Hover preview belum dikerjakan. Build lolos; belum dicek di browser.

- **Package readability pass 2 (2026-10-10):** risiko jadi kata (`HEAVY n` pada strip merah untuk paket yang tidak muat aman di truk mana pun, angka kelebihan dihapus dari kartu); reward jadi bentuk lewat `Package.rarity` (0 bingkai tunggal, 1 bingkai ganda, 2 jackpot dengan header solid dan nama). Tidak ada warna baru; merah tetap hanya untuk risiko. Build lolos; belum dicek di browser dan belum diuji "3 detik" (paket paling bernilai / paling berat).

- **Cleanup lanjutan (2026-10-10):** `main.ts` dipecah menjadi `context`, `layout`, `audio`, `scenes/{menu,play,report}`; perilaku dipertahankan (pemindahan mekanis). Repo git kosong di folder induk dihapus. Build lolos; perlu sanity check di browser (menu, drag, deliver, report, upgrade).

## Verifikasi dan uji

### [ ] Step V2-7 — QA runtime build v2

**Pekerjaan:** jalankan dev server; uji drag & drop cepat, deliver beruntun, refresh, resize, kehilangan fokus, akhir shift dengan pengiriman berjalan, 3+ shift. Catat sebagai fakta build, terpisah dari dugaan pengalaman pemain.

**Definition of Done:** tidak ada blocker pada loop utama; masalah yang tersisa tertulis; production build lolos.

---

### [ ] Step V2-8 — Playtest shift

**Pekerjaan:** 3–5 pemain baru, tanpa penjelasan, 2–3 shift. Catat apakah mereka memuat dengan sengaja, ragu, overload, melewatkan hasil, membeli upgrade, dan kutipan verbatim. Pisahkan observasi, interpretasi, dan usulan. Bandingkan uang/menit truk kecil vs penuh.

**Definition of Done:** laporan menjawab: apakah truk kecil aman mendominasi, apakah hasil terlewat, apakah 2 truk membebani, apakah bust terasa adil. Status `PERLU UJI` di GDD diperbarui hanya sesuai bukti.

---

### [ ] Step V2-9 — Satu iterasi tuning

**Pekerjaan:** pilih satu temuan terbesar V2-8, ubah satu keluarga parameter atau satu aturan kecil, uji ulang, catat efek.

**Definition of Done:** perubahan punya hubungan jelas dengan temuan; keputusan mempertahankan atau membatalkan tercatat.

---

## Current status

**Active step:** Step V2-6 (`[-]`, kode selesai, menunggu cek di browser).
**Next instruction to start:** cek V2-6, lalu Step V2-7 (QA runtime) dan V2-8 (playtest, perlu pemain).
**Catatan:** keputusan terbuka yang memengaruhi step: bonus per truk (`USULAN`, hati-hati mendorong truk kecil), batas antrean, dan apakah pengiriman berjalan diselesaikan saat timer habis (`USULAN`).

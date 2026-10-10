# DELIVER IT ANYWAY — rencana pembuktian prototipe

Tanggal: 2026-10-06  
Dasar: `GDD.md` v1.0. Dokumen ini adalah rencana kerja, bukan keputusan desain baru.

## 1. Yang sedang kita bangun

Pemain menerima tawaran cargo, menambahkannya ke satu haul, lalu memilih kapan mengirim. Cargo berikutnya menaikkan nilai sekaligus load dan paparan risiko. Delivery yang berhasil memberi uang permanen; bust menghapus haul saat itu. Uang nantinya membuka skala cargo dan kendaraan yang makin absurd.

**Pertanyaan utama:** setelah beberapa haul, apakah pemain masih sengaja berpikir “satu lagi” dan menerima konsekuensinya, atau menemukan pola aman yang tinggal diulang?

Kini bootstrap, loop delivery, capacity upgrade, milestone ARCADE/truk, dan feedback retro singkat sudah terimplementasi. Step 7 stress-check runtime dan Step 12 playtest progression masih terbuka. Atas keputusan pemilik, Step 8–9 dilewati sementara. Analisis meja Step 12 ada di `PROGRESSION_EVAL.md`; production build berhasil, browser presentation check belum dilakukan.

## 2. Risiko desain yang harus dijawab lebih dulu

1. **Safe farming.** Bila mengirim di bawah kapasitas selalu berhasil dan mengirim haul kecil bisa dilakukan tanpa biaya/waktu berarti, strategi aman mungkin memberi uang stabil dan membuat overload tidak menarik. Bandingkan *uang per menit* dan frekuensi pilihan overload, bukan hanya besarnya hadiah per haul.
2. **Pilihan menjadi soal hitung otomatis.** Dengan urutan offer dan chance yang tetap, pemain dapat menemukan satu titik dispatch optimal lalu mengulanginya. Tension emosional belum tentu muncul dari angka yang jelas saja.
3. **Bust terasa sewenang-wenang.** Jika peluang gagal tidak dipahami sebelum dispatch, kehilangan seluruh haul dapat terasa seperti hukuman acak. Perubahan risk dan hasil harus terbaca; respons pemain perlu diamati langsung.
4. **Upgrade menghapus konflik.** Capacity/stability bisa membuat pemain terus aman jika cargo baru tidak meningkatkan godaan dan load secara sepadan.
5. **Visual mengganggu keputusan.** Tumpukan kotak 2D harus memperjelas skala dan risiko tanpa menutupi angka atau bentuk kendaraan.

Jangan langsung menambal risiko tersebut dengan fitur baru. Bangun baseline kecil, lihat perilaku pemain, lalu ubah satu aturan pada satu waktu.

**Pemeriksaan model minimum:** untuk haul bernilai `V` dengan peluang berhasil `p`, nilai harapan dispatch sekarang adalah `p × V`. Bila cargo berikutnya bernilai `v` dan menurunkan peluang ke `p_baru`, bandingkan dengan `p_baru × (V + v)`. Ini hanya pemeriksaan ekonomi satu haul; keputusan pemain dan laju uang per menit tetap perlu diuji, terutama karena durasi delivery dan harga upgrade belum ditetapkan.

## 3. Lingkup prototipe pertama: Core Proof

### Wajib ada

- Satu kendaraan dan tiga jenis cargo dengan nilai/load berbeda, ditawarkan dalam urutan tetap agar pengujian awal mudah dibandingkan.
- `LOAD`, `DISPATCH`, hasil success/bust, dan `CONTINUE`; pemain dapat dispatch setelah setidaknya satu cargo.
- Tampilan tetap untuk nilai haul, load/kapasitas, dan indikator peluang/risiko; offer berikutnya menampilkan nilai dan load sebelum diambil.
- Setiap load langsung mengubah nilai, load, indikator risiko, dan tumpukan cargo sederhana.
- Resolution singkat, wallet permanen, dan reset haul yang benar setelah kedua jenis hasil.
- Parameter cargo, kapasitas, peluang, dan durasi terpusat agar satu variabel dapat diubah tanpa membongkar UI.
- Log lokal per haul: cargo yang diambil, load, estimasi chance saat dispatch, hasil, payout, durasi, dan uang per menit. Ini untuk analisis prototipe, bukan analitik daring.

### Asumsi sementara untuk build uji, bukan keputusan GDD

- Di bawah/tepat kapasitas: 100% berhasil. Di atas kapasitas: chance turun menurut kurva sederhana yang bisa dituning.
- Bust kehilangan seluruh current haul, uang permanen tetap.
- Offer deterministik dan belum ada `SKIP`, upgrade, tier, prestige, atau randomisasi.
- Angka chance terlihat. Bentuk label kualitatif dapat dibandingkan sesudah baseline.

Asumsi ini dipilih agar satu pertanyaan utama bisa diuji. Hasil playtest menentukan apakah masing-masing dipertahankan atau diganti.

## 4. Urutan kerja dan gerbang keputusan

| Tahap | Hasil yang dibuat | Syarat keluar |
| --- | --- | --- |
| **0. Bootstrap** | Ikuti workflow *Proceed Anyway*: satu chat satu step, mulai dari proyek browser desktop 2D dengan TypeScript, KAPLAY, dan Vite sebagai baseline yang sudah tersedia lokal. | Proyek game kedua dapat dijalankan dan build berhasil; batas waktu serta pemilik keputusan masih dicatat bila belum diketahui. |
| **1. Model aturan** | `RULES_MODEL.md`: tabel cargo, kapasitas, chance curve, perbandingan EV, dan dua simulasi 10 haul. | Ada pilihan overload yang masuk akal untuk diuji; safe farming dan nilai uang per menit terlihat pada model. Angka tetap provisional. |
| **2. Core Proof playable** | Seluruh loop `offer → load → dispatch → result → next haul`, UI terbaca, dan greybox kotak 2D. | Pemain dapat menyelesaikan 10 haul tanpa macet; wallet dan haul reset benar; outcome mengikuti chance yang ditampilkan. |
| **3. Playtest pertama** | 3–5 pemain baru, sekitar 10 menit per orang, plus catatan observasi dan tanya singkat. | Tim dapat menunjuk bagian mana yang membuat pemain ragu, memilih aman, mengambil risiko, atau merasa bust tidak adil. Keputusan perubahan didasarkan pada temuan, bukan intuisi saja. |
| **4. Satu iterasi aturan** | Perbaiki satu penyebab terbesar: kurva risk, nilai/berat cargo, cue, atau ekonomi dispatch. | Uji ulang melihat apakah keputusan membaik tanpa muncul strategi dominan baru. |
| **5. Bukti incremental** | Tambah paling banyak satu upgrade capacity dan satu lompatan cargo/vehicle visual. | Setelah upgrade, pemain masih menjumpai pilihan dispatch versus cargo berikutnya; progres terasa terlihat. |
| **6. Presentasi dan QA** | Animasi delivery/bust singkat, SFX inti, feedback uang, dan pemeriksaan build. | Angka dan pile-up tetap terbaca; beberapa success/bust beruntun tidak merusak state; build final berjalan di target platform. |

Tahap 5–6 hanya masuk setelah loop pada tahap 3–4 memberi alasan untuk dilanjutkan. Jika loop belum bekerja, pakai waktu untuk memperbaiki keputusan inti.

## 5. Cara menguji pengalaman pemain

Berikan instruksi singkat: “Muat cargo dan kirim kapan menurutmu tepat. Uang dari pengiriman berhasil bisa dipakai nanti.” Jangan jelaskan strategi atau peluang terbaik.

**Catat observasi per pemain:**

- Berapa lama sampai `LOAD` dan `DISPATCH` pertama tanpa bantuan?
- Pada haul mana pemain mulai mempertimbangkan overload? Apa yang mereka lihat sebelum memilih?
- Apakah mereka berkali-kali dispatch di batas aman? Apakah itu sengaja karena dianggap optimal?
- Setelah bust, apakah mereka paham penyebab dan memilih mencoba lagi? Catat kata-kata mereka, bukan tafsiran kita saja.
- Apakah keputusan berikutnya berubah setelah success besar atau bust?
- Berapa lama satu haul dan berapa banyak haul yang dimainkan tanpa dorongan?

**Tanya sesudah bermain:** “Kapan kamu merasa ingin menambah satu cargo?”, “Apa yang menurutmu menyebabkan bust terakhir?”, “Apakah ada pilihan yang terasa jelas selalu paling benar?”, “Mau main beberapa haul lagi? Kenapa?”

**Sinyal untuk lanjut** (heuristik sampel kecil, bukan validasi pasar): pemain memahami taruhan sebelum dispatch, ada variasi keputusan yang disengaja, sebagian mengambil risiko karena reward menarik, dan setelah bust mereka dapat menjelaskan konsekuensi serta masih ingin mencoba. Jika kebanyakan hanya farm aman atau tidak memahami peluang, kembali ke tahap 4.

## 6. Keputusan terbuka, menurut prioritas

1. **Batas produksi:** deadline, jumlah orang, dan platform rilis. Baseline prototipe browser desktop 2D mengikuti stack *Proceed Anyway*; target rilis akhir masih terbuka.
2. **Ekonomi keputusan:** apakah baseline safe farming memang dominan; bila ya, perubahan terkecil apa yang memberi alasan mengambil risiko tanpa memaksa pemain?
3. **Risk dan loss:** kurva chance, safe zone, full versus partial loss. Uji setelah Core Proof, jangan dianggap sudah final.
4. **Offer:** fungsi `SKIP`, biaya/batasnya, dan randomisasi. Tunda sampai baseline deterministik menunjukkan apa yang kurang.
5. **Progression:** harga upgrade, cargo tier, dan milestone. Harga/efek capacity upgrade serta offer ARCADE hanya asumsi uji; evaluasi pemain masih diperlukan.
6. **Presentasi:** exact percentage versus label kualitatif, bentuk kendaraan, palet, dan target audio.

## 7. Batas implementasi

- Pertahankan simple boxy 2D dan feedback tumpukan cargo sejak greybox; tidak perlu physics stacking kompleks.
- Delivery merupakan resolution pendek, tanpa manual driving.
- Tidak ada idle income, offline progression, prestige, atau banyak cabang upgrade dalam Core Proof.
- Gunakan workflow dan stack prototipe TypeScript, KAPLAY, dan Vite seperti `proceed-anyway`, tetapi buat proyek terpisah. Salin hanya pola atau komponen yang memang cocok dengan loop delivery.
- Catat fakta build, observasi playtest, tafsiran, dan keputusan secara terpisah. Ubah status GDD setelah ada keputusan atau bukti yang sesuai.

## 8. Langkah berikutnya yang paling kecil

Step 1–6 selesai. Step 7 sudah memiliki log haul dan ringkasan sesi; production build lolos. Browser/runtime QA sengaja dilewati sesuai arahan pemilik, jadi Step 7 masih berjalan dan perlu dilanjutkan saat browser test diizinkan.

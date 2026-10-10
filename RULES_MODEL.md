# DELIVER IT ANYWAY — model aturan satu haul

Step 2 — baseline analisis untuk prototipe  
Status: **angka di bawah adalah asumsi uji, belum keputusan GDD**.

## 1. Parameter sementara

| Parameter | Nilai model | Catatan |
| --- | ---: | --- |
| Kapasitas kendaraan | 20 load | Titik aman awal; belum dituning. |
| Cargo TV | $40 / 8 load | Offer pertama. |
| Cargo Sofa | $90 / 18 load | Offer kedua. |
| Cargo Fridge | $160 / 30 load | Offer ketiga. |
| Peluang pada load ≤ kapasitas | 100% | Menguji hipotesis safe zone. |
| Penalti overload | −4 poin persentase per load di atas 20 | Rumus uji: `max(5%, 100% − 4% × (load − 20))`. |
| Waktu keputusan per cargo | 3 detik | Perkiraan membaca offer dan memilih. |
| Durasi delivery | 4 detik | Di dalam rentang 2–5 detik pada GDD. |
| Bust | Current haul tidak dibayar; wallet tersimpan | Mengikuti konsekuensi sementara di GDD. |
| Offer antar-haul | Urutannya kembali ke TV → Sofa → Fridge | Deterministik untuk membandingkan strategi, bukan keputusan final. |

Model menganggap pemain selalu boleh dispatch setelah minimal satu cargo. `SKIP`, upgrade, dan biaya lanjut belum dimasukkan.

## 2. Rumus keputusan

Untuk haul bernilai `V`, load `L`, dan peluang berhasil `p(L)`:

- **Expected payout dispatch sekarang** = `p(L) × V`.
- Jika cargo berikutnya bernilai `v` dan load `w`, **expected payout setelah load** = `p(L + w) × (V + v)`.
- **Perkiraan uang per menit** = `expected payout ÷ perkiraan detik haul × 60`.

Rumus uang per menit menganggap waktu memilih tiap cargo 3 detik dan resolution 4 detik. Waktu animasi, continue, pemain membaca UI lebih lama, dan waktu di luar haul belum termasuk.

## 3. Perbandingan pilihan

| Keadaan | Value / load | Peluang | Expected payout | Waktu sampai hasil |
| --- | ---: | ---: | ---: | ---: |
| Load TV, dispatch sekarang | $40 / 8 | 100% | $40.00 | 7 detik |
| Load TV + Sofa, dispatch | $130 / 26 | 76% | $98.80 | 10 detik |
| Load TV + Sofa + Fridge, dispatch | $290 / 56 | 5% (batas minimum) | $14.50 | 13 detik |

Pada keadaan TV, ambil Sofa menaikkan expected payout dari **$40 ke $98.80**, tetapi membawa peluang bust menjadi **24%**. Mengambil Fridge setelah itu menurunkan expected payout menjadi **$14.50**, sehingga model menyarankan berhenti setelah dua cargo.

## 4. Simulasi 10 haul per strategi

### Strategi aman: dispatch setelah TV

Peluang selalu 100%; setiap haul membutuhkan satu keputusan (3 detik) dan satu resolution (4 detik).

| Haul | Hasil | Payout | Kumulatif |
| ---: | --- | ---: | ---: |
| 1 | Success | $40 | $40 |
| 2 | Success | $40 | $80 |
| 3 | Success | $40 | $120 |
| 4 | Success | $40 | $160 |
| 5 | Success | $40 | $200 |
| 6 | Success | $40 | $240 |
| 7 | Success | $40 | $280 |
| 8 | Success | $40 | $320 |
| 9 | Success | $40 | $360 |
| 10 | Success | $40 | $400 |

**Hasil model:** 10 success, $400 dalam 70 detik = **$342.86/menit**.

### Strategi push: load TV + Sofa, lalu dispatch

Setiap haul bernilai $130 dengan peluang 76%. Roll tetap di bawah adalah contoh deterministik untuk membuat tabel bisa diulang; success terjadi bila `roll < 0.76`. Ini bukan klaim tentang hasil pemain.

| Haul | Roll contoh | Hasil | Payout | Kumulatif |
| ---: | ---: | --- | ---: | ---: |
| 1 | 0.13 | Success | $130 | $130 |
| 2 | 0.84 | Bust | $0 | $130 |
| 3 | 0.44 | Success | $130 | $260 |
| 4 | 0.69 | Success | $130 | $390 |
| 5 | 0.95 | Bust | $0 | $390 |
| 6 | 0.10 | Success | $130 | $520 |
| 7 | 0.32 | Success | $130 | $650 |
| 8 | 0.91 | Bust | $0 | $650 |
| 9 | 0.62 | Success | $130 | $780 |
| 10 | 0.27 | Success | $130 | $910 |

**Hasil contoh:** 7 success, 3 bust, $910 dalam 100 detik = **$546/menit**.  
**Nilai harapan 10 haul:** 7.6 success rata-rata, $988 dalam 100 detik = **$592.80/menit**.

Hasil 10 haul contoh berbeda dari nilai harapan karena peluang mengandung variasi. Strategi aman memperoleh hasil pasti; strategi push memberi hasil rata-rata lebih tinggi dengan risiko kehilangan haul.

## 5. Apa yang dikatakan model

- Dengan angka uji ini, **safe farming tidak mendominasi** expected money per minute; mendorong dua cargo memberi expected rate lebih tinggi.
- Namun aturan deterministik memberi pola mudah ditebak: load TV + Sofa, lalu dispatch. Pemain bisa menyelesaikan keputusan sebagai resep tetap, bukan menimbang setiap offer.
- Pilihan awal masih punya konsekuensi yang terlihat: $40 terjamin versus $130 dengan 24% bust. Belum diketahui apakah pemain menganggap tradeoff ini cukup menegangkan.
- Hasil ini sensitif pada chance curve, value/load, durasi keputusan, dan durasi resolution. Semua itu tetap `TERBUKA`.

## 6. Keputusan yang belum diambil

- Apakah batas aman benar-benar 100% success.
- Apakah penalti overload linear, seberapa curam, dan batas minimum peluangnya.
- Apakah peluang exact ditampilkan sebelum `LOAD` sebagai peluang setelah cargo masuk, atau pemain hanya melihat risiko saat ini.
- Apakah offer selalu deterministik atau kemudian diacak.
- Apakah bust menghapus seluruh haul atau sebagian.
- Durasi keputusan, delivery, dan continue dalam permainan sebenarnya.

Model ini menyiapkan baseline untuk implementasi dan playtest berikutnya. Tidak ada angka tabel di sini yang mengubah status desain `TETAP` pada GDD.

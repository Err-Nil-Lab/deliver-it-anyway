> **ARSIP:** evaluasi v1 untuk loop v1 (haul tunggal). Tidak sesuai build sekarang; lihat `GDD.md` v2.

# DELIVER IT ANYWAY — evaluasi progression awal

Tanggal: 2026-10-06  
Status: **analisis model selesai; uji pemain belum dilakukan**  
Lingkup: Step 11–12; Step 8–9 dilewati atas keputusan pemilik.

## Fakta implementasi

- Upgrade tunggal: bayar $130 untuk menaikkan capacity dari 20 menjadi 30; hanya bisa dibeli sekali di layar result.
- Setelah upgrade, kendaraan memakai siluet kotak yang lebih panjang dan offer awal berubah menjadi ARCADE ($240 / 16 load), lalu SOFA ($90 / 18), lalu FRIDGE ($160 / 30).
- ARCADE digambar lebih besar di cargo bay. Offer tetap deterministik.
- Angka, formula risiko, dan daftar offer masih parameter prototipe, bukan keputusan desain final.

## Perbandingan model sebelum dan sesudah

Rumus chance: `max(5%, 100% - 4% × max(0, load - capacity))`.

| Kondisi | Haul | Chance | Expected payout | Makna model |
| --- | ---: | ---: | ---: | --- |
| Sebelum upgrade, dispatch TV | $40 / 8 load | 100% | $40.00 | Haul aman kecil |
| Sebelum upgrade, TV + SOFA | $130 / 26 load | 76% | $98.80 | Risiko naik; EV lebih tinggi dari dispatch TV |
| Sesudah upgrade, dispatch ARCADE | $240 / 16 load | 100% | $240.00 | Reward awal besar dan aman |
| Sesudah upgrade, ARCADE + SOFA | $330 / 34 load | 84% | $277.20 | “Satu lagi” menambah EV $37.20 dengan 16% bust chance |
| Sesudah upgrade, ARCADE + SOFA + FRIDGE | $490 / 64 load | 5% | $24.50 | Tambahan Fridge membuat risiko maksimum dan EV turun tajam |

## Observasi, interpretasi, hipotesis

- **Fakta model:** upgrade membuka kondisi aman baru dan menawarkan risiko yang masih terukur pada ARCADE + SOFA. Load berikutnya, FRIDGE, membawa chance ke minimum 5%.
- **Interpretasi:** daftar baru memiliki titik dispatch yang bisa dihitung; model menganggap ARCADE + SOFA lebih baik secara expected payout daripada ARCADE saja. Pemain mungkin mengikuti resep itu tanpa mengalami ketegangan.
- **Hipotesis:** reward besar dan angka chance yang terlihat dapat membuat pemain berani mengambil risiko ARCADE + SOFA. Belum ada bukti pemain One More Delivery bahwa uang kini terasa berarti atau visual milestone terbaca.

## Catatan playtest Step 12

Uji satu sesi ketika pemain bisa memperoleh $130, membeli upgrade, dan menjalani minimal dua haul sesudahnya. Jangan menjelaskan strategi. Catat:

1. Apakah pemain menyadari harga/efek upgrade dan mengumpulkan uang dengan tujuan membelinya?
2. Setelah upgrade, apakah siluet kendaraan dan ARCADE terasa lebih besar tanpa penjelasan?
3. Pada ARCADE + SOFA, peluang 84% dan tambahan $90 terlihat; apakah pemain dispatch atau mengambil FRIDGE? Minta alasan dengan kata-kata mereka.
4. Apakah setelah upgrade pemain masih merasa ada risiko yang berarti? Catat respons segera setelah bust maupun success.
5. Catat jumlah haul dan durasi aktual; jangan gunakan HUD cash/min sebagai pengganti waktu sesi penuh.

**Belum ada hasil sesi pemain.** Keputusan sementara: pertahankan konfigurasi ini hanya untuk diuji. Jangan tandai progression berhasil atau menyenangkan sebelum sesi dilakukan.

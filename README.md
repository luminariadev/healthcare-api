# HealthCare API — PocketBase Backend

Backend untuk sistem **booking & antrean klinik** berbasis [PocketBase](https://pocketbase.io) (BaaS single-binary). Multi-tenant: satu instance melayani banyak klinik.

## 🧱 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | PocketBase v0.22+ (Go single binary) |
| Database | SQLite (embedded, WAL mode) |
| Realtime | WebSocket built-in (`pb.collection().subscribe()`) |
| Notifikasi | Fonnte WhatsApp API (hook) |
| Deploy | Docker / VPS binary / Pockethost |

## 📦 Collections (Schema)

| Collection | Deskripsi | Source (MySQL lama) |
|------------|-----------|---------------------|
| `users` | Auth — patient / admin / doctor | `users` |
| `clinics` | Tenant klinik (multi-tenant) | — (baru) |
| `doctors` | Data dokter | `dokter` |
| `services` | Layanan klinik | `layanan` |
| `schedules` | Jadwal dokter per tanggal | `jadwal` |
| `bookings` | Booking pasien | `booking` |
| `queues` | Antrean realtime | `antrean` |
| `queue_counters` | Penghitung nomor antrean per hari | `queue_counters` |

## 🚀 Cara Menjalankan

### Opsi 1 — Docker (recommended)

```bash
cp .env.example .env   # set PB_ENCRYPTION_KEY & FONNTE_API_KEY
docker compose up -d
```

### Opsi 2 — Binary langsung

```bash
# download dari https://github.com/pocketbase/pocketbase/releases
./pocketbase serve --http=0.0.0.0:8090
# migrations di pb_migrations/ otomatis dijalankan saat start
```

### Akses

| Layanan | URL |
|---------|-----|
| Admin UI | http://127.0.0.1:8090/_/ |
| REST API | http://127.0.0.1:8090/api/ |
| Realtime WS | ws://127.0.0.1:8090/api/realtime |

## 🔌 Hooks (Business Logic)

`pb_hooks/main.pb.js`:
- **Auto booking code** — `B-YYYYMMDDXXXX`
- **Auto queue number** — per layanan per hari (`A-001`, `B-001`, ...)
- **Auto queue entry** — booking create → antrean dibuat otomatis
- **WhatsApp notify** — via Fonnte ke nomor pasien

## 🧪 Migrasi Database

Migration JS ada di `pb_migrations/` — dijalankan otomatis saat `pocketbase serve` pertama kali. Untuk rollback manual: hapus collection dari Admin UI.

## 🤝 CI/CD

`.github/workflows/ci.yml` — lint hooks (node --check) + build check di tiap push ke `main`.

## 📄 License

MIT © 2026 Rizkia Nuari Fujiana (luminariadev)

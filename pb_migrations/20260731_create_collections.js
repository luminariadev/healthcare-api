// Migration: 20260731_create_collections.js
// HealthCare — PocketBase schema migration
// Migrasi dari MySQL klinik_kampus.sql → PocketBase collections (multi-tenant)

migrate(
  (app) => {
    // ─── 1. users (extends PocketBase auth collection) ───────────────
    const users = new Collection({
      name: "users",
      type: "auth",
      fields: [
        { name: "full_name", type: "text", required: true },
        { name: "phone", type: "text", required: false },
        { name: "role", type: "select", required: true, maxSelect: 1, values: ["patient", "admin", "doctor"] },
        { name: "clinic_id", type: "relation", required: false, collectionId: "clinics" },
        { name: "active", type: "bool", required: false },
      ],
    });
    app.save(users);

    // ─── 2. clinics (multi-tenant root) ──────────────────────────────
    const clinics = new Collection({
      name: "clinics",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "address", type: "text" },
        { name: "phone", type: "text" },
        { name: "logo", type: "file" },
        { name: "active", type: "bool" },
      ],
    });
    app.save(clinics);

    // ─── 3. doctors ─────────────────────────────────────────────────
    const doctors = new Collection({
      name: "doctors",
      type: "base",
      fields: [
        { name: "clinic_id", type: "relation", required: true, collectionId: clinics.id },
        { name: "name", type: "text", required: true },
        { name: "specialization", type: "text", required: true },
        { name: "gender", type: "select", maxSelect: 1, values: ["pria", "wanita"] },
        { name: "phone", type: "text" },
        { name: "email", type: "email" },
        { name: "status", type: "select", maxSelect: 1, values: ["aktif", "nonaktif"], defaultValue: "aktif" },
      ],
    });
    app.save(doctors);

    // ─── 4. services (layanan) ──────────────────────────────────────
    const services = new Collection({
      name: "services",
      type: "base",
      fields: [
        { name: "clinic_id", type: "relation", required: true, collectionId: clinics.id },
        { name: "name", type: "text", required: true },
        { name: "description", type: "editor" },
      ],
    });
    app.save(services);

    // ─── 5. schedules (jadwal) ──────────────────────────────────────
    const schedules = new Collection({
      name: "schedules",
      type: "base",
      fields: [
        { name: "clinic_id", type: "relation", required: true, collectionId: clinics.id },
        { name: "doctor_id", type: "relation", required: true, collectionId: doctors.id },
        { name: "service_id", type: "relation", required: true, collectionId: services.id },
        { name: "date", type: "date", required: true },
        { name: "start_time", type: "text", required: true },
        { name: "end_time", type: "text", required: true },
        { name: "room", type: "text" },
        { name: "quota", type: "number", required: true, defaultValue: 20 },
        { name: "status", type: "select", maxSelect: 1, values: ["aktif", "nonaktif"], defaultValue: "aktif" },
      ],
    });
    app.save(schedules);

    // ─── 6. bookings (booking) ──────────────────────────────────────
    const bookings = new Collection({
      name: "bookings",
      type: "base",
      fields: [
        { name: "clinic_id", type: "relation", required: true, collectionId: clinics.id },
        { name: "booking_code", type: "text", required: true },
        { name: "user_id", type: "relation", required: true, collectionId: users.id },
        { name: "schedule_id", type: "relation", required: true, collectionId: schedules.id },
        { name: "complaint", type: "editor" },
        { name: "status", type: "select", maxSelect: 1, values: ["pending", "terjadwal", "dibatalkan", "selesai"], defaultValue: "terjadwal" },
      ],
    });
    app.save(bookings);

    // ─── 7. queues (antrean) ───────────────────────────────────────
    const queues = new Collection({
      name: "queues",
      type: "base",
      fields: [
        { name: "clinic_id", type: "relation", required: true, collectionId: clinics.id },
        { name: "booking_id", type: "relation", required: true, collectionId: bookings.id },
        { name: "queue_number", type: "text", required: true },
        { name: "status", type: "select", maxSelect: 1, values: ["menunggu", "dipanggil", "sedang diperiksa", "selesai", "dibatalkan"], defaultValue: "menunggu" },
        { name: "called_at", type: "date" },
      ],
    });
    app.save(queues);

    // ─── 8. queue_counters ──────────────────────────────────────────
    const queueCounters = new Collection({
      name: "queue_counters",
      type: "base",
      fields: [
        { name: "clinic_id", type: "relation", required: true, collectionId: clinics.id },
        { name: "service_id", type: "relation", required: true, collectionId: services.id },
        { name: "date", type: "date", required: true },
        { name: "last_number", type: "number", required: true, defaultValue: 0 },
      ],
    });
    app.save(queueCounters);

    console.log("[migration] HealthCare collections created ✅");
  },
  (app) => {
    // Down migration — cleanup
    ["queue_counters", "queues", "bookings", "schedules", "services", "doctors", "clinics", "users"].forEach((name) => {
      const col = app.findCollectionByNameOrId(name);
      if (col) app.delete(col);
    });
    console.log("[migration] HealthCare collections rolled back");
  }
);

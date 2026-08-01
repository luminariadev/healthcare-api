// Migration: 20260731_create_collections.js
// HealthCare — PocketBase schema (v0.39 API — class-based fields)

migrate(
  (app) => {
    const log = (msg) => console.log("[migration] " + msg);

    const text = (name, opts = {}) => Object.assign(new TextField(), { name, ...opts });
    const select = (name, values, opts = {}) => Object.assign(new SelectField(), { name, values, ...opts });
    const rel = (name, collectionId, opts = {}) => Object.assign(new RelationField(), { name, collectionId, ...opts });
    const num = (name, opts = {}) => Object.assign(new NumberField(), { name, ...opts });
    const bool = (name, opts = {}) => Object.assign(new BoolField(), { name, ...opts });
    const email = (name, opts = {}) => Object.assign(new EmailField(), { name, ...opts });
    const editor = (name, opts = {}) => Object.assign(new EditorField(), { name, ...opts });
    const date = (name, opts = {}) => Object.assign(new DateField(), { name, ...opts });
    const file = (name, opts = {}) => Object.assign(new FileField(), { name, ...opts });

    // ─── 1. users (bawaan — tambah field custom) ────────────────
    const users = app.findCollectionByNameOrId("users");
    const usersFields = ["full_name", "phone", "role", "active"];
    usersFields.forEach((f) => {
      if (!users.fields.some((x) => x.name === f)) {
        users.fields.add(
          f === "full_name" ? text("full_name", { required: true })
          : f === "phone" ? text("phone")
          : f === "role" ? select("role", ["patient", "admin", "doctor"], { required: true, maxSelect: 1 })
          : bool("active")
        );
      }
    });
    app.save(users);
    log("users fields added");

    // ─── 2. clinics ─────────────────────────────────────────────
    const clinics = new Collection({ name: "clinics", type: "base" });
    clinics.fields.add(text("name", { required: true }));
    clinics.fields.add(text("address"));
    clinics.fields.add(text("phone"));
    clinics.fields.add(file("logo"));
    clinics.fields.add(bool("active"));
    app.save(clinics);
    log("clinics created");

    // ─── 3. doctors ─────────────────────────────────────────────
    const doctors = new Collection({ name: "doctors", type: "base" });
    doctors.fields.add(rel("clinic_id", clinics.id, { required: true, maxSelect: 1 }));
    doctors.fields.add(text("name", { required: true }));
    doctors.fields.add(text("specialization", { required: true }));
    doctors.fields.add(select("gender", ["pria", "wanita"], { maxSelect: 1 }));
    doctors.fields.add(text("phone"));
    doctors.fields.add(email("email"));
    doctors.fields.add(select("status", ["aktif", "nonaktif"], { maxSelect: 1 }));
    app.save(doctors);
    log("doctors created");

    // ─── 4. services ────────────────────────────────────────────
    const services = new Collection({ name: "services", type: "base" });
    services.fields.add(rel("clinic_id", clinics.id, { required: true, maxSelect: 1 }));
    services.fields.add(text("name", { required: true }));
    services.fields.add(editor("description"));
    app.save(services);
    log("services created");

    // ─── 5. schedules ───────────────────────────────────────────
    const schedules = new Collection({ name: "schedules", type: "base" });
    schedules.fields.add(rel("clinic_id", clinics.id, { required: true, maxSelect: 1 }));
    schedules.fields.add(rel("doctor_id", doctors.id, { required: true, maxSelect: 1 }));
    schedules.fields.add(rel("service_id", services.id, { required: true, maxSelect: 1 }));
    schedules.fields.add(date("date", { required: true }));
    schedules.fields.add(text("start_time", { required: true }));
    schedules.fields.add(text("end_time", { required: true }));
    schedules.fields.add(text("room"));
    schedules.fields.add(num("quota", { required: true }));
    schedules.fields.add(select("status", ["aktif", "nonaktif"], { maxSelect: 1 }));
    app.save(schedules);
    log("schedules created");

    // ─── 6. bookings ────────────────────────────────────────────
    const bookings = new Collection({ name: "bookings", type: "base" });
    bookings.fields.add(rel("clinic_id", clinics.id, { required: true, maxSelect: 1 }));
    bookings.fields.add(text("booking_code", { required: true }));
    bookings.fields.add(rel("user_id", users.id, { required: true, maxSelect: 1 }));
    bookings.fields.add(rel("schedule_id", schedules.id, { required: true, maxSelect: 1 }));
    bookings.fields.add(editor("complaint"));
    bookings.fields.add(select("status", ["pending", "terjadwal", "dibatalkan", "selesai"], { maxSelect: 1 }));
    app.save(bookings);
    log("bookings created");

    // ─── 7. queues ──────────────────────────────────────────────
    const queues = new Collection({ name: "queues", type: "base" });
    queues.fields.add(rel("clinic_id", clinics.id, { required: true, maxSelect: 1 }));
    queues.fields.add(rel("booking_id", bookings.id, { required: true, maxSelect: 1 }));
    queues.fields.add(text("queue_number", { required: true }));
    queues.fields.add(select("status", ["menunggu", "dipanggil", "sedang diperiksa", "selesai", "dibatalkan"], { maxSelect: 1 }));
    queues.fields.add(date("called_at"));
    app.save(queues);
    log("queues created");

    // ─── 8. queue_counters ──────────────────────────────────────
    const queueCounters = new Collection({ name: "queue_counters", type: "base" });
    queueCounters.fields.add(rel("clinic_id", clinics.id, { required: true, maxSelect: 1 }));
    queueCounters.fields.add(rel("service_id", services.id, { required: true, maxSelect: 1 }));
    queueCounters.fields.add(date("date", { required: true }));
    queueCounters.fields.add(num("last_number", { required: true }));
    app.save(queueCounters);
    log("queue_counters created");

    log("HealthCare collections created ✅");
  },
  (app) => {
    ["queue_counters", "queues", "bookings", "schedules", "services", "doctors", "clinics"].forEach((name) => {
      const col = app.findCollectionByNameOrId(name);
      if (col) app.delete(col);
    });
    console.log("[migration] rolled back");
  }
);

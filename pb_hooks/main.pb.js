// pb_hooks/main.pb.js — HealthCare business logic
// - Auto-generate booking code
// - Auto-create queue entry when booking created
// - Realtime broadcast helpers (PocketBase does this natively via subscriptions)
// - Fonnte WhatsApp notification (pattern from antrean_klinik_kampus)

const FONNTE_API_KEY = $os.getenv("FONNTE_API_KEY") || "";
const FONNTE_URL = "https://api.fonnte.com/send";

// ─── Generate booking code: B-YYYYMMDDNNNN ───────────────────────────
function generateBookingCode(date) {
  const d = date || new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `B-${ymd}${rand}`;
}

// ─── Generate queue number: <LayananPrefix>-NNN ──────────────────────
async function getNextQueueNumber(app, serviceId, clinicId, dateStr) {
  const counters = app.findCollectionByNameOrId("queue_counters");
  const today = dateStr || new Date().toISOString().slice(0, 10);

  // Find today's counter for this service
  const existing = app.findRecordsByFilter(
    counters,
    `service_id="${serviceId}" && clinic_id="${clinicId}" && date~"${today}"`,
    1, 0
  );

  let counter;
  if (existing.length > 0) {
    counter = existing[0];
    counter.set("last_number", (counter.get("last_number") || 0) + 1);
    await app.save(counter);
  } else {
    counter = new Record(counters, {
      service_id: serviceId,
      clinic_id: clinicId,
      date: today,
      last_number: 1,
    });
    await app.save(counter);
  }

  // Service letter prefix (A = Dokter Umum, B = Gigi, etc.)
  const service = app.findRecordById("services", serviceId);
  const prefix = (service?.get("name") || "X").charAt(0).toUpperCase();
  return `${prefix}-${String(counter.get("last_number")).padStart(3, "0")}`;
}

// ─── Send WhatsApp notification via Fonnte ────────────────────────────
async function sendWhatsApp(phone, message) {
  if (!FONNTE_API_KEY || !phone) return;
  try {
    const resp = $http.send({
      method: "POST",
      url: FONNTE_URL,
      headers: { Authorization: FONNTE_API_KEY },
      body: { target: phone, message, countryCode: "62" },
      timeout: 10,
    });
    console.log("[fonnte] response:", resp?.statusCode, resp?.body?.slice(0, 100));
  } catch (e) {
    console.error("[fonnte] error:", e);
  }
}

// ─── After booking created ────────────────────────────────────────────
routerAdd("POST", "/api/hooks/on-booking-created", (c) => {
  const data = $apis.requestInfo(c).data;
  const app = c.get("app");

  (async () => {
    try {
      // Auto-create queue entry
      const queues = app.findCollectionByNameOrId("queues");
      const queueNumber = await getNextQueueNumber(
        app,
        data.service_id,
        data.clinic_id,
        null
      );
      const queue = new Record(queues, {
        clinic_id: data.clinic_id,
        booking_id: data.id,
        queue_number: queueNumber,
        status: "menunggu",
      });
      await app.save(queue);

      // Notify patient
      const user = app.findRecordById("users", data.user_id);
      const phone = user?.get("phone");
      const message = `Halo ${user?.get("full_name") || "Pasien"}, booking Anda diterima!\nKode Booking: ${data.booking_code}\nNomor Antrean: ${queueNumber}\nMohon datang 15 menit sebelum jadwal.`;
      await sendWhatsApp(phone, message);
    } catch (e) {
      console.error("[hook] on-booking-created error:", e);
    }
  })();

  return c.json(200, { success: true });
});

// ─── Before booking create: set booking code ─────────────────────────
routerAdd("POST", "/api/hooks/pre-booking", (c) => {
  const data = $apis.requestInfo(c).data;
  data.booking_code = data.booking_code || generateBookingCode();
  return c.json(200, data);
});

console.log("[hooks] HealthCare hooks loaded ✅");

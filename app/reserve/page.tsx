"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Users, Clock3, MapPin, Star } from "lucide-react";

type AvailableBay = {
  code: "B1" | "B2" | "B3" | "B4" | "B19";
  name: string;
  type: "standard" | "vip";
  capacity: number;
  price: number;
};

const timeSlots = [
  "10:00","11:00","12:00","13:00","14:00","15:00",
  "16:00","17:00","18:00","19:00","20:00","21:00","22:00"
];

function getBayAccent(type: "standard" | "vip") {
  if (type === "vip") {
    return {
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      ring: "border-amber-300/40",
      bg: "from-amber-50 to-white",
      chip: "bg-amber-50 text-amber-700",
      icon: "text-amber-600",
      label: "VIP",
    };
  }

  return {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ring: "border-emerald-300/40",
    bg: "from-emerald-50 to-white",
    chip: "bg-emerald-50 text-emerald-700",
    icon: "text-emerald-600",
    label: "Standard",
  };
}

export default function ReservePage() {
  const [date, setDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("18:00");
  const [durationHours, setDurationHours] = useState("2");
  const [guestCount, setGuestCount] = useState("4");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [availableBays, setAvailableBays] = useState<AvailableBay[]>([]);
  const [selectedBay, setSelectedBay] = useState<AvailableBay | null>(null);

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<null | {
    code: string;
    totalAmount: number;
    bay: string;
    customer: string;
    status: string;
  }>(null);

  const totalPreview = useMemo(() => {
    if (!selectedBay) return 0;
    return selectedBay.price * Number(durationHours || 0);
  }, [selectedBay, durationHours]);

  async function checkAvailability() {
    setMessage("");
    setCreatedReservation(null);
    setSelectedBay(null);

    const res = await fetch("/api/public/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        startTime,
        durationHours: Number(durationHours),
        guestCount: Number(guestCount),
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setMessage(result.error || "No se pudo consultar disponibilidad.");
      setAvailableBays([]);
      return;
    }

    setAvailableBays(result.bays || []);

    if (result.bays?.length) {
      setMessage(`Se encontraron ${result.bays.length} bahía(s) disponibles.`);
    } else {
      setMessage("No hay bahías disponibles para ese horario.");
    }
  }

  async function createReservation() {
    if (!selectedBay) {
      alert("Selecciona una bahía.");
      return;
    }

    if (!fullName.trim()) {
      alert("Escribe el nombre del cliente.");
      return;
    }

    setSaving(true);
    setMessage("");

    const res = await fetch("/api/public/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        email,
        bayId:
          selectedBay.code === "B1" ? 1 :
          selectedBay.code === "B2" ? 2 :
          selectedBay.code === "B3" ? 3 :
          selectedBay.code === "B4" ? 4 : 5,
        date,
        startTime,
        durationHours: Number(durationHours),
        guestCount: Number(guestCount),
        totalAmount: selectedBay.price * Number(durationHours),
      }),
    });

    const result = await res.json();
    setSaving(false);

    if (!res.ok) {
      alert(result.error || "No se pudo crear la reservación.");
      setMessage(result.error || "No se pudo crear la reservación.");
      return;
    }

    setCreatedReservation({
      code: result.reservation.code,
      totalAmount: result.reservation.totalAmount,
      bay: result.reservation.bay,
      customer: result.reservation.customer,
      status: result.reservation.status,
    });

    setMessage("Reservación guardada correctamente.");
    setSelectedBay(null);
    await checkAvailability();
    setFullName("");
    setPhone("");
    setEmail("");
  }

  return (
    <main className="bunker-page">
      <section className="bunker-hero p-8 md:p-10">
        <div className="bunker-pill bg-white/10 text-white">
          Bunker 19 · Reservaciones
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
          Reserva tu bahía
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
          Elige fecha, hora y bahía disponible para cerrar la reservación en minutos.
        </p>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="bunker-card p-6">
            <h2 className="text-2xl font-black text-[#1f5c3f]">Datos del cliente</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre completo"
                className="bunker-input"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Teléfono"
                className="bunker-input"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo"
                className="bunker-input"
              />
            </div>
          </section>

          <section className="bunker-card p-6">
            <h2 className="text-2xl font-black text-[#1f5c3f]">Datos de la reserva</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bunker-input pr-12"
                />
                <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1f5c3f]" />
              </div>

              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bunker-input"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>

              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="bunker-input"
              >
                <option value="1">1 hora</option>
                <option value="2">2 horas</option>
                <option value="3">3 horas</option>
                <option value="4">4 horas</option>
              </select>

              <select
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="bunker-input"
              >
                {["2", "3", "4", "5", "6", "8", "10"].map((qty) => (
                  <option key={qty} value={qty}>{qty} personas</option>
                ))}
              </select>
            </div>

            <button onClick={checkAvailability} className="bunker-button-primary mt-5">
              Ver disponibilidad
            </button>
          </section>

          {message ? (
            <div className="bunker-card p-4 text-sm bunker-muted">
              {message}
            </div>
          ) : null}

          <section className="space-y-4">
            {availableBays.map((bay) => {
              const isSelected = selectedBay?.code === bay.code;
              const accent = getBayAccent(bay.type);

              return (
                <button
                  key={bay.code}
                  type="button"
                  onClick={() => setSelectedBay(bay)}
                  className={`group relative w-full overflow-hidden rounded-[28px] border bg-gradient-to-br p-0 text-left transition ${
                    isSelected
                      ? `${accent.ring} shadow-[0_18px_40px_rgba(21,32,24,0.12)]`
                      : "border-[rgba(31,92,63,0.10)] shadow-[0_12px_28px_rgba(21,32,24,0.06)] hover:-translate-y-[1px] hover:shadow-[0_18px_36px_rgba(21,32,24,0.10)]"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${accent.bg}`} />

                  <div className="relative grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-3xl font-black tracking-tight text-[#1f5c3f]">
                          {bay.code}
                        </div>

                        <div className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${accent.badge}`}>
                          {accent.label}
                        </div>

                        {isSelected ? (
                          <div className="rounded-full border border-[#1f5c3f]/15 bg-[#edf7ea] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#1f5c3f]">
                            Seleccionada
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-2 text-base font-semibold text-[#243328]">
                        {bay.name}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${accent.chip}`}>
                          <Users className={`h-4 w-4 ${accent.icon}`} />
                          {bay.capacity} personas
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-medium text-[#48604f]">
                          <Clock3 className="h-4 w-4 text-[#1f5c3f]" />
                          Reserva por hora
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-medium text-[#48604f]">
                          <MapPin className="h-4 w-4 text-[#1f5c3f]" />
                          Bunker 19
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[180px] rounded-[22px] border border-white/60 bg-white/80 p-4 text-left shadow-[0_10px_24px_rgba(21,32,24,0.06)] md:text-right">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#738277]">
                        Tarifa
                      </div>

                      <div className="mt-1 text-3xl font-black text-[#1f2a21]">
                        ${bay.price}
                      </div>

                      <div className="text-sm text-[#728076]">
                        por hora
                      </div>

                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1f5c3f]">
                        <Star className="h-4 w-4" />
                        {bay.type === "vip" ? "Experiencia premium" : "Ideal para grupos"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bunker-card-strong sticky top-24 p-6">
            <h2 className="text-2xl font-black text-[#1f5c3f]">Resumen</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="bunker-muted">Cliente</span>
                <span className="font-semibold">{fullName || "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="bunker-muted">Fecha</span>
                <span className="font-semibold">{date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="bunker-muted">Hora</span>
                <span className="font-semibold">{startTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="bunker-muted">Duración</span>
                <span className="font-semibold">{durationHours} h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="bunker-muted">Personas</span>
                <span className="font-semibold">{guestCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="bunker-muted">Bahía</span>
                <span className="font-semibold">{selectedBay?.code || "--"}</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#eef7eb] p-4">
              <div className="text-sm bunker-muted">Total estimado</div>
              <div className="mt-1 text-3xl font-black text-[#1f5c3f]">${totalPreview}</div>
            </div>

            <button
              onClick={createReservation}
              disabled={!selectedBay || saving}
              className="bunker-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Confirmar reservación"}
            </button>
          </section>

          {createdReservation ? (
            <section className="bunker-card p-6">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#1f5c3f]">
                Reservación creada
              </div>
              <div className="mt-3 text-2xl font-black text-[#1f5c3f]">
                {createdReservation.code}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="bunker-muted">Cliente</span>
                  <span className="font-semibold">{createdReservation.customer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bunker-muted">Bahía</span>
                  <span className="font-semibold">{createdReservation.bay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bunker-muted">Estatus</span>
                  <span className="font-semibold">{createdReservation.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bunker-muted">Total</span>
                  <span className="font-semibold">${createdReservation.totalAmount}</span>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
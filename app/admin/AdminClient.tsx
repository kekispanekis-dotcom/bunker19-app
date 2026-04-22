"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

type Entry = {
  id: number;
  code: string;
  customer: string;
  startTime: string;
  durationHours: number;
  status: string;
  paymentStatus: string;
  totalAmount: number;
};

type BayRow = {
  bayCode: string;
  bayName: string;
  entries: Entry[];
};

type EditBay = {
  id: number;
  code: string;
  name: string;
  basePrice: number;
  capacity: number;
};

type EditData = {
  id: number;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  bayId: string;
  date: string;
  startTime: string;
  durationHours: string;
  guestCount: string;
};

type ReservationDetailResponse = {
  ok: boolean;
  reservation: {
    id: number;
    code: string;
    customer: {
      fullName: string;
      phone: string;
      email: string;
    };
    reservation: {
      bayId: number;
      date: string;
      startTime: string;
      durationHours: number;
      guestCount: number;
    };
  };
  bays: EditBay[];
};

const HOURS = [
  "10:00","11:00","12:00","13:00","14:00","15:00",
  "16:00","17:00","18:00","19:00","20:00","21:00","22:00",
];

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function startOffset(time: string) {
  return (toMinutes(time) - toMinutes("10:00")) / 60;
}

function statusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "border-[#1f5c3f]/25 bg-[#eaf6e8] text-[#1f5c3f]";
    case "paid":
      return "border-lime-400/30 bg-lime-50 text-lime-700";
    case "cancelled":
      return "border-red-300 bg-red-50 text-red-700";
    case "no_show":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "pending":
      return "border-sky-300 bg-sky-50 text-sky-700";
    default:
      return "border-gray-200 bg-white text-gray-700";
  }
}

function paymentClass(status: string) {
  switch (status) {
    case "paid":
      return "text-lime-700";
    case "unpaid":
      return "text-gray-500";
    case "partial":
      return "text-amber-700";
    case "failed":
      return "text-red-700";
    default:
      return "text-gray-700";
  }
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
}

function getWeekDates(startDate: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
}

function weekdayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function AdminPage() {
  const router = useRouter();

  const [date, setDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });
  const [schedule, setSchedule] = useState<BayRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [bayFilter, setBayFilter] = useState("all");

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [editBays, setEditBays] = useState<EditBay[]>([]);

  const [draggedReservationId, setDraggedReservationId] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      cache: "no-store",
    });

    window.location.href = "/admin/login?reason=expired";
  }

  async function fetchSchedule(targetDate: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/schedule/daily?date=${encodeURIComponent(targetDate)}`,
        { method: "GET", cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "No se pudo cargar la agenda.");
        return;
      }

      setSchedule(result.schedule || []);
    } catch {
      setError("Error de conexión con la API.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(id: number, action: "cancel" | "no-show" | "check-in") {
    if (action === "cancel") {
      const ok = window.confirm("¿Seguro que quieres cancelar esta reservación?");
      if (!ok) return;
    }

    try {
      const response = await fetch(`/api/admin/reservations/${id}/${action}`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "No se pudo ejecutar la acción.");
        return;
      }

      await fetchSchedule(date);
    } catch {
      alert("Error ejecutando acción.");
    }
  }

  async function openEdit(id: number) {
    setEditLoading(true);

    try {
      const response = await fetch(`/api/admin/reservations/${id}`);
      const result: ReservationDetailResponse | { error: string } = await response.json();

      if (!response.ok) {
        alert("error" in result ? result.error : "No se pudo cargar la reservación.");
        return;
      }

      const data = (result as ReservationDetailResponse).reservation;

      setEditData({
        id: data.id,
        code: data.code,
        fullName: data.customer.fullName,
        phone: data.customer.phone,
        email: data.customer.email,
        bayId: String(data.reservation.bayId),
        date: data.reservation.date,
        startTime: data.reservation.startTime,
        durationHours: String(data.reservation.durationHours),
        guestCount: String(data.reservation.guestCount),
      });

      setEditBays((result as ReservationDetailResponse).bays || []);
      setEditOpen(true);
    } catch {
      alert("Error cargando datos para editar.");
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit() {
    if (!editData) return;

    setSavingEdit(true);

    try {
      const response = await fetch(`/api/admin/reservations/${editData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editData.fullName,
          phone: editData.phone,
          email: editData.email,
          bayId: Number(editData.bayId),
          date: editData.date,
          startTime: editData.startTime,
          durationHours: Number(editData.durationHours),
          guestCount: Number(editData.guestCount),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "No se pudo guardar la edición.");
        return;
      }

      setEditOpen(false);
      setEditData(null);
      await fetchSchedule(date);
      alert("Reservación actualizada.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function moveReservation(reservationId: number, targetBayCode: string, targetHour: string) {
    try {
      const detailResponse = await fetch(`/api/admin/reservations/${reservationId}`);
      const detailResult: ReservationDetailResponse | { error: string } = await detailResponse.json();

      if (!detailResponse.ok) {
        alert("error" in detailResult ? detailResult.error : "No se pudo leer la reservación.");
        return;
      }

      const detail = (detailResult as ReservationDetailResponse).reservation;
      const bays = (detailResult as ReservationDetailResponse).bays || [];
      const targetBay = bays.find((b) => b.code === targetBayCode);

      if (!targetBay) {
        alert("No se encontró la bahía destino.");
        return;
      }

      const patchResponse = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: detail.customer.fullName,
          phone: detail.customer.phone,
          email: detail.customer.email,
          bayId: targetBay.id,
          date: detail.reservation.date,
          startTime: targetHour,
          durationHours: detail.reservation.durationHours,
          guestCount: detail.reservation.guestCount,
        }),
      });

      const patchResult = await patchResponse.json();

      if (!patchResponse.ok) {
        alert(patchResult.error || "No se pudo mover la reservación.");
        return;
      }

      await fetchSchedule(date);
    } catch {
      alert("Error moviendo reservación.");
    }
  }

  useEffect(() => {
    fetchSchedule(date);
  }, []);

  const filteredSchedule = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schedule
      .filter((bay) => bayFilter === "all" || bay.bayCode === bayFilter)
      .map((bay) => ({
        ...bay,
        entries: bay.entries.filter((entry) => {
          const matchesSearch =
            !query ||
            entry.customer.toLowerCase().includes(query) ||
            entry.code.toLowerCase().includes(query) ||
            entry.startTime.toLowerCase().includes(query);

          const matchesStatus =
            statusFilter === "all" || entry.status === statusFilter;

          const matchesPayment =
            paymentFilter === "all" || entry.paymentStatus === paymentFilter;

          return matchesSearch && matchesStatus && matchesPayment;
        }),
      }));
  }, [schedule, search, statusFilter, paymentFilter, bayFilter]);

  const totalReservations = useMemo(
    () => filteredSchedule.reduce((sum, bay) => sum + bay.entries.length, 0),
    [filteredSchedule]
  );

  const totalRevenue = useMemo(
    () =>
      filteredSchedule.reduce(
        (sum, bay) => sum + bay.entries.reduce((s, entry) => s + Number(entry.totalAmount), 0),
        0
      ),
    [filteredSchedule]
  );

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const bayOptions = useMemo(() => schedule.map((b) => b.bayCode), [schedule]);

  return (
    <main className="bunker-page">
      <section className="bunker-hero p-8 md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="bunker-pill bg-white/10 text-white">
              Bunker 19 · Admin Operativo
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              {viewMode === "day" ? "Agenda Visual" : "Vista Semanal"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
              Una vista mucho más clara, ligera y profesional para operar el día.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-white/70">Reservas</div>
                <div className="mt-1 text-2xl font-black">{totalReservations}</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-white/70">Ingreso</div>
                <div className="mt-1 text-2xl font-black">${totalRevenue}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/15"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>

      <section className="bunker-card mt-6 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div>
                <label className="mb-2 block text-sm font-semibold bunker-muted">Fecha operativa</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bunker-input pr-12"
                  />
                  <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1f5c3f]" />
                </div>
              </div>

              <button onClick={() => fetchSchedule(date)} className="bunker-button-primary">
                {loading ? "Cargando..." : "Actualizar agenda"}
              </button>

              <div className="flex overflow-hidden rounded-2xl border border-[rgba(31,92,63,0.12)] bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode("day")}
                  className={`px-4 py-2.5 text-sm font-bold ${
                    viewMode === "day" ? "bg-[#1f5c3f] text-white" : "text-[#1f5c3f]"
                  }`}
                >
                  Día
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`px-4 py-2.5 text-sm font-bold ${
                    viewMode === "week" ? "bg-[#1f5c3f] text-white" : "text-[#1f5c3f]"
                  }`}
                >
                  Semana
                </button>
              </div>
            </div>

            <div className="text-sm bunker-muted">
              {viewMode === "day" ? "Horas visibles: 10:00 a 22:00" : "Semana a partir de la fecha elegida"}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, folio u hora"
              className="bunker-input"
            />

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bunker-input">
              <option value="all">Todos los estatus</option>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="paid">paid</option>
              <option value="cancelled">cancelled</option>
              <option value="no_show">no_show</option>
              <option value="completed">completed</option>
            </select>

            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="bunker-input">
              <option value="all">Todos los pagos</option>
              <option value="unpaid">unpaid</option>
              <option value="partial">partial</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
            </select>

            <select value={bayFilter} onChange={(e) => setBayFilter(e.target.value)} className="bunker-input">
              <option value="all">Todas las bahías</option>
              {bayOptions.map((bayCode) => (
                <option key={bayCode} value={bayCode}>{bayCode}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      {viewMode === "day" ? (
        <section className="mt-6 overflow-x-auto rounded-[28px] border border-[rgba(31,92,63,0.10)] bg-[rgba(255,255,255,0.78)] p-4 backdrop-blur-xl">
          <div className="min-w-[1400px]">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `130px repeat(${filteredSchedule.length}, minmax(240px, 1fr))` }}
            >
              <div className="rounded-2xl border border-[rgba(31,92,63,0.10)] bg-white p-4 text-sm font-bold text-[#1f5c3f]">
                Hora
              </div>

              {filteredSchedule.map((bay) => (
                <div key={bay.bayCode} className="rounded-2xl border border-[rgba(31,92,63,0.10)] bg-white p-4">
                  <div className="text-xl font-black text-[#1f5c3f]">{bay.bayCode}</div>
                  <div className="text-sm bunker-muted">{bay.bayName}</div>
                </div>
              ))}

              <div className="flex flex-col gap-0 rounded-2xl border border-[rgba(31,92,63,0.10)] bg-white">
                {HOURS.map((hour) => (
                  <div key={hour} className="flex h-24 items-start border-b border-[rgba(31,92,63,0.05)] px-4 py-2 text-sm bunker-muted last:border-b-0">
                    {hour}
                  </div>
                ))}
              </div>

              {filteredSchedule.map((bay) => (
                <div
                  key={bay.bayCode}
                  className="relative rounded-2xl border border-[rgba(31,92,63,0.10)] bg-[linear-gradient(180deg,#ffffff,#f4f8f2)]"
                  style={{ height: `${HOURS.length * 96}px` }}
                >
                  {HOURS.map((hour, i) => {
                    const cellKey = `${bay.bayCode}-${hour}`;
                    const isOver = dragOverCell === cellKey;

                    return (
                      <div
                        key={`${bay.bayCode}-${hour}`}
                        className={`absolute left-0 right-0 border-b border-[rgba(31,92,63,0.05)] ${isOver ? "bg-[#eaf6e8]" : ""}`}
                        style={{ top: `${i * 96}px`, height: "96px" }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverCell(cellKey);
                        }}
                        onDragLeave={() => {
                          if (dragOverCell === cellKey) setDragOverCell(null);
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const reservationId = Number(e.dataTransfer.getData("text/plain") || draggedReservationId);
                          setDragOverCell(null);
                          setDraggedReservationId(null);
                          if (!reservationId) return;
                          await moveReservation(reservationId, bay.bayCode, hour);
                        }}
                      />
                    );
                  })}

                  {bay.entries.map((entry) => {
                    const top = startOffset(entry.startTime) * 96;
                    const height = entry.durationHours * 96;
                    const isCancelled = entry.status === "cancelled";
                    const isNoShow = entry.status === "no_show";
                    const isCompleted = entry.status === "completed";
                    const draggable = !(isCancelled || isCompleted);

                    return (
                      <div
                        key={entry.id}
                        draggable={draggable}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(entry.id));
                          setDraggedReservationId(entry.id);
                        }}
                        onDragEnd={() => {
                          setDraggedReservationId(null);
                          setDragOverCell(null);
                        }}
                        className={`absolute left-2 right-2 overflow-hidden rounded-2xl border p-2.5 shadow-[0_10px_24px_rgba(21,32,24,0.08)] ${
                          draggable ? "cursor-move" : "cursor-default opacity-80"
                        } ${statusClass(entry.status)}`}
                        style={{ top: `${top + 4}px`, height: `${height - 8}px` }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold">{entry.customer}</div>
                            <div className="truncate text-[11px] uppercase tracking-wide opacity-70">
                              {entry.code}
                            </div>
                          </div>

                          <div className="text-right text-[11px]">
                            <div className="font-semibold">{entry.startTime}</div>
                            <div>{entry.durationHours} h</div>
                          </div>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                          <span className="rounded-full border border-current/10 bg-white/40 px-2 py-0.5">
                            {entry.status}
                          </span>
                          <span className={`rounded-full border border-current/10 bg-white/40 px-2 py-0.5 ${paymentClass(entry.paymentStatus)}`}>
                            {entry.paymentStatus}
                          </span>
                        </div>

                        <div className="mt-1 text-xs font-bold">
                          ${entry.totalAmount}
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => openEdit(entry.id)}
                            className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#1f5c3f]"
                          >
                            {editLoading ? "..." : "Editar"}
                          </button>

                          <button
                            onClick={() => runAction(entry.id, "check-in")}
                            disabled={isCancelled || isNoShow || isCompleted}
                            className="rounded-lg bg-[#1f5c3f] px-2 py-1 text-[11px] font-bold text-white disabled:opacity-40"
                          >
                            Check-in
                          </button>

                          <button
                            onClick={() => runAction(entry.id, "no-show")}
                            disabled={isCancelled || isNoShow || isCompleted}
                            className="rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-40"
                          >
                            No-show
                          </button>

                          <button
                            onClick={() => runAction(entry.id, "cancel")}
                            disabled={isCancelled || isCompleted}
                            className="rounded-lg bg-red-500 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-40"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weekDates.map((weekDate) => (
            <button
              key={weekDate}
              type="button"
              onClick={() => {
                setDate(weekDate);
                setViewMode("day");
                setTimeout(() => fetchSchedule(weekDate), 0);
              }}
              className="bunker-card p-5 text-left transition hover:bg-white"
            >
              <div className="text-xs uppercase tracking-[0.2em] bunker-muted">
                {weekdayLabel(weekDate)}
              </div>
              <div className="mt-3 text-2xl font-black text-[#1f5c3f]">{weekDate}</div>
              <div className="mt-2 text-sm bunker-muted">
                Click para abrir timeline del día.
              </div>
            </button>
          ))}
        </section>
      )}

      {editOpen && editData ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-[rgba(31,92,63,0.10)] bg-white p-6 shadow-[0_20px_60px_rgba(21,32,24,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#1f5c3f]">Editar reservación</h2>
                <p className="mt-1 text-sm bunker-muted">{editData.code}</p>
              </div>

              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditData(null);
                }}
                className="rounded-xl border border-[rgba(31,92,63,0.10)] px-3 py-2 text-sm font-semibold text-[#1f5c3f]"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input value={editData.fullName} onChange={(e) => setEditData({ ...editData, fullName: e.target.value })} placeholder="Nombre completo" className="bunker-input" />
              <input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} placeholder="Teléfono" className="bunker-input" />
              <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} placeholder="Correo" className="bunker-input md:col-span-2" />
              <select value={editData.bayId} onChange={(e) => setEditData({ ...editData, bayId: e.target.value })} className="bunker-input">
                {editBays.map((bay) => (
                  <option key={bay.id} value={bay.id}>
                    {bay.code} · {bay.name} · ${bay.basePrice}/h · cap {bay.capacity}
                  </option>
                ))}
              </select>
              <input type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className="bunker-input" />
              <input value={editData.startTime} onChange={(e) => setEditData({ ...editData, startTime: e.target.value })} placeholder="Hora" className="bunker-input" />
              <input type="number" value={editData.durationHours} onChange={(e) => setEditData({ ...editData, durationHours: e.target.value })} placeholder="Duración" className="bunker-input" />
              <input type="number" value={editData.guestCount} onChange={(e) => setEditData({ ...editData, guestCount: e.target.value })} placeholder="Personas" className="bunker-input" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={saveEdit} disabled={savingEdit} className="bunker-button-primary disabled:opacity-50">
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditData(null);
                }}
                className="bunker-button-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
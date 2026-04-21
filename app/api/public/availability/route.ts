import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type BayItem = {
  id: number;
  code: string;
  name: string;
  bayType: string;
  capacity: number;
  basePrice: number;
};

type ReservationItem = {
  id: number;
  bayId: number;
  startTime: string;
  durationHours: number;
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addHours(time: string, hours: number) {
  const total = toMinutes(time) + hours * 60;
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const date = body.date as string;
    const startTime = body.startTime as string;
    const durationHours = Number(body.durationHours);
    const guestCount = Number(body.guestCount);

    if (!date || !startTime || !durationHours || !guestCount) {
      return NextResponse.json(
        { error: "Faltan datos para consultar disponibilidad." },
        { status: 400 }
      );
    }

    const requestEnd = addHours(startTime, durationHours);

    const bays = (await prisma.bay.findMany({
      where: {
        isActive: true,
        capacity: {
          gte: guestCount,
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    })) as BayItem[];

    const activeReservations = (await prisma.reservation.findMany({
      where: {
        reservationDate: new Date(date + "T00:00:00"),
        reservationStatus: {
          in: ["pending", "confirmed", "paid"],
        },
      },
      select: {
        id: true,
        bayId: true,
        startTime: true,
        durationHours: true,
      },
    })) as ReservationItem[];

    const availableBays = bays.filter((bay: BayItem) => {
      const reservationConflict = activeReservations.some(
        (reservation: ReservationItem) => {
          if (reservation.bayId !== bay.id) return false;

          const reservationEnd = addHours(
            reservation.startTime,
            reservation.durationHours
          );

          const overlaps =
            toMinutes(startTime) < toMinutes(reservationEnd) &&
            toMinutes(requestEnd) > toMinutes(reservation.startTime);

          return overlaps;
        }
      );

      return !reservationConflict;
    });

    return NextResponse.json({
      ok: true,
      bays: availableBays.map((bay: BayItem) => ({
        code: bay.code,
        name: bay.name,
        type: bay.bayType,
        capacity: bay.capacity,
        price: bay.basePrice,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo consultar disponibilidad." },
      { status: 400 }
    );
  }
}
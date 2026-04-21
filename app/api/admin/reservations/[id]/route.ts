import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        bay: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservación no encontrada." },
        { status: 404 }
      );
    }

    const bays = await prisma.bay.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({
      ok: true,
      reservation: {
        id: reservation.id,
        code: reservation.reservationCode,
        customer: {
          fullName: reservation.customer.fullName,
          phone: reservation.customer.phone || "",
          email: reservation.customer.email || "",
        },
        reservation: {
          bayId: reservation.bayId,
          date: reservation.reservationDate.toISOString().slice(0, 10),
          startTime: reservation.startTime,
          durationHours: reservation.durationHours,
          guestCount: reservation.guestCount,
        },
      },
      bays: bays.map((bay: {
        id: number;
        code: string;
        name: string;
        basePrice: number;
        capacity: number;
      }) => ({
        id: bay.id,
        code: bay.code,
        name: bay.name,
        basePrice: bay.basePrice,
        capacity: bay.capacity,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo leer la reservación." },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: { customer: true, bay: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservación no encontrada." },
        { status: 404 }
      );
    }

    const targetBay = await prisma.bay.findUnique({
      where: { id: Number(body.bayId) },
    });

    if (!targetBay) {
      return NextResponse.json(
        { error: "Bahía no encontrada." },
        { status: 404 }
      );
    }

    if (Number(body.guestCount) > targetBay.capacity) {
      return NextResponse.json(
        { error: `La bahía ${targetBay.code} permite máximo ${targetBay.capacity} personas.` },
        { status: 400 }
      );
    }

    const newStart = toMinutes(body.startTime);
    const newEnd = newStart + Number(body.durationHours) * 60;

    const conflicts = await prisma.reservation.findMany({
      where: {
        bayId: Number(body.bayId),
        reservationDate: new Date(body.date + "T00:00:00"),
        id: { not: reservation.id },
        reservationStatus: {
          in: ["confirmed", "paid", "pending"],
        },
      },
    });

    for (const r of conflicts) {
      const rStart = toMinutes(r.startTime);
      const rEnd = rStart + r.durationHours * 60;
      const overlap = newStart < rEnd && newEnd > rStart;

      if (overlap) {
        return NextResponse.json(
          { error: "Conflicto de horario con otra reservación en la bahía seleccionada." },
          { status: 400 }
        );
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: reservation.customerId },
      data: {
        fullName: body.fullName,
        phone: body.phone || null,
        email: body.email || null,
      },
    });

    const totalAmount =
      Number(targetBay.basePrice) * Number(body.durationHours);

    const updatedReservation = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        bayId: Number(body.bayId),
        reservationDate: new Date(body.date + "T00:00:00"),
        startTime: body.startTime,
        durationHours: Number(body.durationHours),
        guestCount: Number(body.guestCount),
        totalAmount,
      },
    });

    return NextResponse.json({
      ok: true,
      reservation: updatedReservation,
      customer: updatedCustomer,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar la reservación." },
      { status: 400 }
    );
  }
}
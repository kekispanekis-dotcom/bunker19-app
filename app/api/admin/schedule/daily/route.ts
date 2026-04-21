import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "La fecha es obligatoria." },
        { status: 400 }
      );
    }

    const reservationDate = new Date(date + "T00:00:00");

    const bays = await prisma.bay.findMany({
      orderBy: { displayOrder: "asc" },
    });

    const reservations = await prisma.reservation.findMany({
      where: {
        reservationDate,
      },
      orderBy: {
        startTime: "asc",
      },
      include: {
        customer: true,
      },
    });

    const schedule = bays.map((bay) => ({
      bayCode: bay.code,
      bayName: bay.name,
      entries: reservations
        .filter((reservation) => reservation.bayId === bay.id)
        .map((reservation) => ({
          id: reservation.id,
          code: reservation.reservationCode,
          customer: reservation.customer?.fullName || `Cliente ${reservation.customerId}`,
          startTime: reservation.startTime,
          durationHours: reservation.durationHours,
          status: reservation.reservationStatus,
          paymentStatus: reservation.paymentStatus,
          totalAmount: reservation.totalAmount,
        })),
    }));

    return NextResponse.json({
      date,
      schedule,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo cargar la agenda." },
      { status: 400 }
    );
  }
}
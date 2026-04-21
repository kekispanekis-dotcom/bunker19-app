-- CreateEnum
CREATE TYPE "BayType" AS ENUM ('standard', 'vip');

-- CreateEnum
CREATE TYPE "ReservationType" AS ENUM ('pay_now', 'reserve_only');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'confirmed', 'paid', 'cancelled', 'no_show', 'completed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'partial', 'paid', 'refunded', 'failed');

-- CreateTable
CREATE TABLE "Bay" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bayType" "BayType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "Bay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "reservationCode" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "bayId" INTEGER NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "reservationType" "ReservationType" NOT NULL,
    "reservationStatus" "ReservationStatus" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bay_code_key" ON "Bay"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reservationCode_key" ON "Reservation"("reservationCode");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bayId_fkey" FOREIGN KEY ("bayId") REFERENCES "Bay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

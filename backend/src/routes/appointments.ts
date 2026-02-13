import { Router } from "express";
import { PrismaClient, AppointmentStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { authMiddleware } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

// List appointments for logged-in user (patient or doctor)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { id: userId, role } = (req as any).user;
    if (role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (!patient) return res.json([]);
      const list = await prisma.appointment.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: { include: { user: true } },
        },
        orderBy: { date: "desc" },
      });
      return res.json(list);
    }
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) return res.json([]);
    const list = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: { include: { user: true } },
      },
      orderBy: { date: "desc" },
    });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Create appointment
router.post("/", async (req, res) => {
  try {
    const { doctorId, patientId, date, timeFrom, timeTo, symptoms } = req.body as {
      doctorId: number;
      patientId: number;
      date: string;
      timeFrom: string;
      timeTo: string;
      symptoms: string;
    };

    if (!doctorId || !patientId || !date || !timeFrom || !timeTo) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const trackingId = `DOC-${randomUUID().split("-")[0].toUpperCase()}`;

    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        date: new Date(date),
        timeFrom,
        timeTo,
        symptoms,
        trackingId,
      },
    });

    return res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Track appointment by trackingId
router.get("/track/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { trackingId },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
        prescription: true,
      },
    });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.json(appointment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Simple update of status (could be doctor-only in real app)
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status: AppointmentStatus };

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;


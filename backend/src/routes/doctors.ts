import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// List and filter doctors
router.get("/", async (req, res) => {
  try {
    const { q, specialty, location } = req.query as {
      q?: string;
      specialty?: string;
      location?: string;
    };

    const doctors = await prisma.doctor.findMany({
      where: {
        AND: [
          specialty ? { specialty: { contains: specialty } } : {},
          location ? { location: { contains: location } } : {},
          q
            ? {
                OR: [
                  { user: { name: { contains: q } } },
                  { specialty: { contains: q } },
                  { location: { contains: q } },
                ],
              }
            : {},
        ],
      },
      include: {
        user: true,
      },
      orderBy: {
        rating: "desc",
      },
    });

    return res.json(
      doctors.map((d) => ({
        id: d.id,
        name: d.user.name,
        email: d.user.email,
        specialty: d.specialty,
        experienceYears: d.experienceYears,
        location: d.location,
        fee: d.fee,
        rating: d.rating,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get single doctor
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    return res.json({
      id: doctor.id,
      name: doctor.user.name,
      email: doctor.user.email,
      specialty: doctor.specialty,
      experienceYears: doctor.experienceYears,
      location: doctor.location,
      fee: doctor.fee,
      rating: doctor.rating,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;


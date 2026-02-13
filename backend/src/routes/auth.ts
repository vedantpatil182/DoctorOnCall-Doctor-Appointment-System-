import { Router } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body as {
      email: string;
      password: string;
      name: string;
      role: Role;
    };

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role,
      },
    });

    if (role === "DOCTOR") {
      await prisma.doctor.create({
        data: {
          userId: user.id,
          specialty: "General Physician",
          experienceYears: 1,
          location: "Online",
          fee: 500,
        },
      });
    } else {
      await prisma.patient.create({
        data: {
          userId: user.id,
        },
      });
    }

    return res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    let patientId: number | null = null;
    let doctorId: number | null = null;
    if (user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      patientId = patient?.id ?? null;
    } else {
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      doctorId = doctor?.id ?? null;
    }

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        patientId,
        doctorId,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    let patientId: number | null = null;
    let doctorId: number | null = null;
    if (user.role === "PATIENT") {
      const p = await prisma.patient.findUnique({ where: { userId } });
      patientId = p?.id ?? null;
    } else {
      const d = await prisma.doctor.findUnique({ where: { userId } });
      doctorId = d?.id ?? null;
    }
    return res.json({
      ...user,
      patientId,
      doctorId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;


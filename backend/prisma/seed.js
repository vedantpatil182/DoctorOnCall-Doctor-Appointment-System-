const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const INDIAN_DOCTORS = [
  { name: "Dr. Vedant Patil", email: "vedant.patil@doctoroncall.in", specialty: "General Physician", experienceYears: 12, location: "Bangalore", fee: 500, rating: 4.8 },
  { name: "Dr. Priya Sharma", email: "priya.sharma@doctoroncall.in", specialty: "Cardiologist", experienceYears: 15, location: "Mumbai", fee: 800, rating: 4.9 },
  { name: "Dr. tushar Patil", email: "tushar.patil@doctoroncall.in", specialty: "Pediatrician", experienceYears: 10, location: "Ahmedabad", fee: 450, rating: 4.7 },
  { name: "Dr. Sneha Reddy", email: "sneha.reddy@doctoroncall.in", specialty: "Dermatologist", experienceYears: 8, location: "Hyderabad", fee: 600, rating: 4.6 },
  { name: "Dr. Vikram Singh", email: "vikram.singh@doctoroncall.in", specialty: "Orthopedic", experienceYears: 14, location: "Delhi", fee: 700, rating: 4.8 },
  { name: "Dr. Ananya Iyer", email: "ananya.iyer@doctoroncall.in", specialty: "Gynecologist", experienceYears: 11, location: "Chennai", fee: 650, rating: 4.9 },
  { name: "Dr. Arjun Nair", email: "arjun.nair@doctoroncall.in", specialty: "ENT Specialist", experienceYears: 9, location: "Kochi", fee: 550, rating: 4.5 },
  { name: "Dr. Kavitha Menon", email: "kavitha.menon@doctoroncall.in", specialty: "Psychiatrist", experienceYears: 13, location: "Thiruvananthapuram", fee: 750, rating: 4.7 },
  { name: "Dr. Rohan phirke", email: "rohan.phirke@doctoroncall.in", specialty: "Pulmonologist", experienceYears: 7, location: "Pune", fee: 600, rating: 4.6 },
  { name: "Dr. Meera Krishnan", email: "meera.krishnan@doctoroncall.in", specialty: "Diabetologist", experienceYears: 16, location: "Bangalore", fee: 700, rating: 4.9 },
];

async function main() {
  const hashed = await bcrypt.hash("password123", 10);

  for (const d of INDIAN_DOCTORS) {
    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) continue;

    const user = await prisma.user.create({
      data: {
        email: d.email,
        password: hashed,
        name: d.name,
        role: "DOCTOR",
      },
    });

    await prisma.doctor.create({
      data: {
        userId: user.id,
        specialty: d.specialty,
        experienceYears: d.experienceYears,
        location: d.location,
        fee: d.fee,
        rating: d.rating,
      },
    });
    console.log("Seeded doctor:", d.name);
  }

  console.log("Seed completed. Indian doctors added.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

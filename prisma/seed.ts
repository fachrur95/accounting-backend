import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("password123", 8);

  const superAdmin = await prisma.user.upsert({
    where: { email: "super@admin.com" },
    update: {
      email: "super@admin.com",
      name: "Super Admin",
      password,
      role: "SUPERADMIN",
      isEmailVerified: true,
    },
    create: {
      email: "super@admin.com",
      name: "Super Admin",
      password,
      role: "SUPERADMIN",
      isEmailVerified: true,
    },
  });

  console.log({ superAdmin });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
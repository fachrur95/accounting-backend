import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import defaultAccountClass from "../src/utils/templates/default-account-class";

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

  const createManyAccountClass = [];

  // const createManyAccountClass = defaultAccountClass.map((row) => prisma.accountClass.create({ data: row }));

  // console.log({ createManyAccountClass })

  for (const row of defaultAccountClass) {
    createManyAccountClass.push(prisma.accountClass.upsert({
      where: {
        code: row.code,
      },
      create: row,
      update: row
    }));
  }

  await Promise.all(createManyAccountClass);

  console.log({ superAdmin });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
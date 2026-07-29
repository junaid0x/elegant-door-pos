const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding authentication data...');

  const accounts = [
    { email: 'admin@elegantdoors.com', password: 'admin123', name: 'System Admin', role: 'SUPER_ADMIN' },
    { email: 'admin@elegantdoors.ca', password: 'Password123!', name: 'System Admin CA', role: 'SUPER_ADMIN' }
  ];

  for (const account of accounts) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(account.password, salt);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        password: hashedPassword,
        isActive: true,
        role: account.role,
      },
      create: {
        name: account.name,
        email: account.email,
        password: hashedPassword,
        role: account.role,
        isActive: true,
      },
    });

    console.log(`User ${user.email} seeded successfully with role ${user.role}!`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

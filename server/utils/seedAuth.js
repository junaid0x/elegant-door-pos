const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding authentication data...');

  const email = 'admin@elegantdoors.ca';
  const password = 'Password123!';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email }
  });

  if (existingAdmin) {
    console.log('Admin account already exists.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: email,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    }
  });

  console.log(`Admin created successfully!`);
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

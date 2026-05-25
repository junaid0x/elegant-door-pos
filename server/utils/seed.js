// Seed script — creates the first super_admin user
// Run: node utils/seed.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if any user exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Users already exist. Skipping seed.');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@elegantdoors.com',
      password: 'admin123',
      role: 'super_admin',
    });

    console.log('Super admin created successfully:');
    console.log(`  Email: ${superAdmin.email}`);
    console.log(`  Password: admin123`);
    console.log(`  Role: ${superAdmin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();

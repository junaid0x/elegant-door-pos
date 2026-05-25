const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const resetPassword = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);

    // Find any admin/manager
    const user = await User.findOne({ email: 'admin@elegantdoors.com' }) 
              || await User.findOne({ role: 'super_admin' }) 
              || await User.findOne();

    if (!user) {
      console.log('No user found in the database. Creating one...');
      const superAdmin = await User.create({
        name: 'Super Admin',
        email: 'admin@elegantdoors.com',
        password: 'admin123',
        role: 'super_admin',
      });
      console.log('\n--- TEMPORARY CREDENTIALS ---');
      console.log('Email:', superAdmin.email);
      console.log('Password: admin123');
      console.log('-----------------------------\n');
      process.exit(0);
    }

    console.log('Found existing user:', user.email);

    // Mongoose pre('save') hook will hash this automatically!
    user.password = 'admin123';
    await user.save();

    console.log('\n--- TEMPORARY CREDENTIALS ---');
    console.log('Email:', user.email);
    console.log('Password: admin123');
    console.log('-----------------------------\n');
    console.log('Password successfully reset and hashed via Mongoose hooks.');
    
    process.exit(0);
  } catch (error) {
    console.error('Password reset failed:', error);
    process.exit(1);
  }
};

resetPassword();

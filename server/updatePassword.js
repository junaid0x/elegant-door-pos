const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const updatePassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find an admin user
    const user = await User.findOne({ email: 'admin@elegantdoors.com' }) || await User.findOne({ role: 'super_admin' }) || await User.findOne();
    
    if (!user) {
      console.log('No user found to update');
      process.exit(1);
    }
    
    console.log('Updating user:', user.email);
    user.password = 'admin123';
    await user.save();
    
    console.log('Password updated successfully to admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
};

updatePassword();

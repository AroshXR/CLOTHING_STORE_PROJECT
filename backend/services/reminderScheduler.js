const cron = require('node-cron');
const Booking = require('../models/Booking');
const { sendReturnReminderEmail } = require('./emailService');
const { getEmailBranding } = require('./siteSettingsService');

// Track sent reminders to avoid duplicates
const sentReminders = new Set();

// Function to check and send return reminders
const checkReturnReminders = async () => {
  try {
    console.log('Checking for bookings that need return reminders...');
    
    const today = new Date();
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    
    // Set time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    twoDaysFromNow.setHours(23, 59, 59, 999);
    
    // Find bookings with return date within 2 days that are confirmed
    const upcomingReturns = await Booking.find({
      returnDate: {
        $gte: today,
        $lte: twoDaysFromNow
      },
      status: 'confirmed'      //Only confirmed bookings get reminders
    }).populate('user', 'username').populate('outfit', 'brand model category').lean();
    
    console.log(`Found ${upcomingReturns.length} bookings with upcoming return dates`);

    const pendingReminders = upcomingReturns
      .map(booking => ({
        booking,
        reminderKey: `${booking._id}_${new Date(booking.returnDate).toDateString()}`
      }))
      .filter(({ reminderKey }) => !sentReminders.has(reminderKey));

    if (pendingReminders.length) {
      const brand = await getEmailBranding();
      const results = await Promise.allSettled(
        pendingReminders.map(({ booking }) => sendReturnReminderEmail(booking, booking.email, brand))
      );
      results.forEach((entry, idx) => {
        const { booking, reminderKey } = pendingReminders[idx];
        const shortId = booking._id.toString().slice(-6);
        if (entry.status === 'fulfilled' && entry.value?.success) {
          sentReminders.add(reminderKey);
          console.log(`Return reminder sent for booking #${shortId} to ${booking.email}`);
        } else {
          const reason = entry.status === 'rejected' ? entry.reason?.message : entry.value?.error;
          console.error(`Failed to send reminder for booking #${shortId}:`, reason);
        }
      });
    }
    
    // Clean up old reminder keys (older than 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    for (const key of sentReminders) {
      const [bookingId, dateString] = key.split('_');
      const reminderDate = new Date(dateString);
      if (reminderDate < weekAgo) {
        sentReminders.delete(key);
      }
    }
    
  } catch (error) {
    console.error('Error in checkReturnReminders:', error.message);
  }
};

// Function to manually send reminder for a specific booking
const sendManualReminder = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('user')
      .populate('outfit');
    
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }
    
    if (booking.status !== 'confirmed') {
      return { success: false, error: 'Booking is not confirmed' };
    }
    
    const result = await sendReturnReminderEmail(booking, booking.email);
    
    if (result.success) {
      console.log(`Manual reminder sent for booking #${booking._id.toString().slice(-6)}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error sending manual reminder:`, error.message);
    return { success: false, error: error.message };
  }
};

// Schedule the reminder check to run twice daily (9 AM and 6 PM)
const startReminderScheduler = () => {
  console.log('Starting return reminder scheduler...');
  
  // Run at 9:00 AM every day
  cron.schedule('0 9 * * *', () => {
    checkReturnReminders();
  }, {
    timezone: "Asia/Colombo" // Adjust timezone as needed
  });
  
  // Run at 5:15 PM every day
  cron.schedule('15 17 * * *', () => {
    console.log('Running scheduled return reminder check (5:15 PM)...');
    checkReturnReminders();
  }, {
    timezone: "Asia/Colombo" // Adjust timezone as needed
  });
  
  console.log('Return reminder scheduler started successfully');
  console.log('Reminders will be sent at 9:00 AM and 5:15 PM daily');
  
  // Run initial check after 30 seconds
  setTimeout(() => {
    console.log('Running initial return reminder check...');
    checkReturnReminders();
  }, 30000);
};

// Stop the scheduler (useful for testing)
const stopReminderScheduler = () => {
  cron.getTasks().forEach(task => task.stop());
  console.log('Return reminder scheduler stopped');
};

module.exports = {
  startReminderScheduler,
  stopReminderScheduler,
  checkReturnReminders,
  sendManualReminder
};

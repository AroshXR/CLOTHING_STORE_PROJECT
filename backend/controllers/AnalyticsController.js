const Order = require('../models/OrderModel');
const ClothingItem = require('../models/ClothingItemModel');
const Applicant = require('../models/ApplicantModel');

// Get overview analytics (revenue, orders, AOV)
const getOverviewAnalytics = async (req, res) => {
  try {
    const [result] = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$Price' }, totalOrders: { $sum: 1 } } }
    ]);
    const totalRevenue = result?.totalRevenue || 0;
    const totalOrders = result?.totalOrders || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      totalRevenue,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
};

// Get stock analytics
const getStockAnalytics = async (req, res) => {
  try {
    const [result] = await ClothingItem.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
          lowStockCount: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lt: ['$stock', 10] }] }, 1, 0] } },
          outOfStockCount: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      totalItems: result?.totalItems || 0,
      totalValue: Math.round((result?.totalValue || 0) * 100) / 100,
      lowStockCount: result?.lowStockCount || 0,
      outOfStockCount: result?.outOfStockCount || 0
    });
  } catch (error) {
    console.error('Error fetching stock analytics:', error);
    res.status(500).json({ error: 'Failed to fetch stock analytics' });
  }
};

// Get recent orders
const getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const orders = await Order.find({ status: { $ne: 'cancelled' } })
      .sort({ CreatedAt: -1 })
      .limit(limit)
      .populate('AdminID', 'username email')
      .lean();

    res.json({ orders });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
};

// Get recent applications
const getRecentApplications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const applicants = await Applicant.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ applicants });
  } catch (error) {
    console.error('Error fetching recent applications:', error);
    res.status(500).json({ error: 'Failed to fetch recent applications' });
  }
};

module.exports = {
  getOverviewAnalytics,
  getStockAnalytics,
  getRecentOrders,
  getRecentApplications
};

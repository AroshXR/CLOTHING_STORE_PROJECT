const Tailor = require('../models/Tailor');
const User = require('../models/User');
const CustomOrder = require('../models/CustomOrder');

// Register or update current user as a Tailor
exports.registerTailor = async (req, res) => {
  try {
    const { name, phone, skills = [], payoutEmail } = req.body || {};
    if (!name) return res.status(400).json({ status: 'error', message: 'Name is required' });

    const existing = await Tailor.findOne({ userId: req.user._id });
    if (existing) {
      existing.name = name;
      existing.phone = phone;
      existing.skills = Array.isArray(skills) ? skills : [];
      existing.payoutEmail = payoutEmail;
      existing.isActive = true;
      await existing.save();
      return res.json({ status: 'ok', data: existing });
    }

    const created = await Tailor.create({
      userId: req.user._id,
      name,
      phone,
      skills: Array.isArray(skills) ? skills : [],
      payoutEmail,
      isActive: true,
    });
    return res.status(201).json({ status: 'ok', data: created });
  } catch (err) {
    console.error('registerTailor error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to register tailor' });
  }
};

// Get my tailor profile
exports.getMyTailorProfile = async (req, res) => {
  try {
    const tailor = await Tailor.findOne({ userId: req.user._id });
    if (!tailor) return res.status(404).json({ status: 'error', message: 'Tailor profile not found' });

    const ACTIVE_STATUSES = ['pending','assigned','accepted','in_progress'];
    const activeOrderCount = await CustomOrder.countDocuments({ assignedTailor: tailor._id, status: { $in: ACTIVE_STATUSES } });
    const busy = activeOrderCount > 10;

    res.json({ status: 'ok', data: { ...tailor.toObject(), activeOrderCount, busy } });
  } catch (err) {
    console.error('getMyTailorProfile error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch profile' });
  }
};

// Admin: list all tailors with stats (rating is stored; activeOrderCount computed; busy if > 10)
const ACTIVE_STATUSES = ['pending', 'assigned', 'accepted', 'in_progress'];

const getActiveOrderCountMap = async (tailorIds) => {
  if (!tailorIds.length) return new Map();
  const rows = await CustomOrder.aggregate([
    { $match: { assignedTailor: { $in: tailorIds }, status: { $in: ACTIVE_STATUSES } } },
    { $group: { _id: '$assignedTailor', count: { $sum: 1 } } }
  ]);
  return new Map(rows.map(r => [String(r._id), r.count]));
};

exports.listTailors = async (req, res) => {
  try {
    const tailors = await Tailor.find()
      .populate('userId', 'username email type')
      .sort({ createdAt: -1 });

    const countMap = await getActiveOrderCountMap(tailors.map(t => t._id));
    const withStats = tailors.map((t) => {
      const activeOrderCount = countMap.get(String(t._id)) || 0;
      return {
        ...t.toObject(),
        user: t.userId ? { id: t.userId._id, username: t.userId.username, email: t.userId.email, type: t.userId.type } : null,
        activeOrderCount,
        busy: activeOrderCount > 10,
      };
    });

    res.json({ status: 'ok', count: withStats.length, data: withStats });
  } catch (err) {
    console.error('listTailors error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to list tailors' });
  }
};

// Admin: sync Tailor collection from Users with type 'Tailor'
exports.syncTailorsFromUsers = async (req, res) => {
  try {
    const users = await User.find({ type: 'Tailor' }).select('_id username email').lean();
    const existingList = users.length
      ? await Tailor.find({ userId: { $in: users.map(u => u._id) } })
      : [];
    const existingByUser = new Map(existingList.map(t => [String(t.userId), t]));
    const toCreate = [];
    const bulkUpdates = [];

    for (const u of users) {
      const existing = existingByUser.get(String(u._id));
      if (!existing) {
        toCreate.push({ userId: u._id, name: u.username || 'Tailor', isActive: true });
      } else {
        const update = {};
        if (!existing.name && u.username) update.name = u.username;
        if (existing.isActive !== true) update.isActive = true;
        if (Object.keys(update).length) {
          bulkUpdates.push({ updateOne: { filter: { _id: existing._id }, update: { $set: update } } });
        }
      }
    }

    if (toCreate.length) await Tailor.insertMany(toCreate);
    if (bulkUpdates.length) await Tailor.bulkWrite(bulkUpdates);

    const total = await Tailor.countDocuments();
    res.json({ status: 'ok', message: 'Sync complete', created: toCreate.length, updated: bulkUpdates.length, total });
  } catch (err) {
    console.error('syncTailorsFromUsers error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to sync tailors' });
  }
};

// Admin: overview of tailors (from Tailor collection) and custom orders (from ClothCustomizer)
exports.adminOverview = async (req, res) => {
  try {
    // Tailors with stats
    const tailors = await Tailor.find().sort({ createdAt: -1 });
    const countMap = await getActiveOrderCountMap(tailors.map(t => t._id));
    const tailorsWithStats = tailors.map((t) => {
      const activeOrderCount = countMap.get(String(t._id)) || 0;
      return { ...t.toObject(), activeOrderCount, busy: activeOrderCount > 10 };
    });

    // Tailors from User collection (registration source), optionally enriched with Tailor profile
    const tailorUsers = await User.find({ type: 'Tailor' })
      .select('_id username email type createdAt');

    // Build a map of userId -> Tailor profile to enrich
    const tailorProfiles = await Tailor.find({ userId: { $in: tailorUsers.map(u => u._id) } })
      .select('userId name phone skills isActive rating createdAt');
    const profileByUserId = new Map(tailorProfiles.map(p => [String(p.userId), p]));

    const tailorsFromUsers = tailorUsers.map(u => {
      const prof = profileByUserId.get(String(u._id));
      return {
        user: { id: u._id, username: u.username, email: u.email, type: u.type, createdAt: u.createdAt },
        profile: prof ? {
          id: prof._id,
          name: prof.name,
          phone: prof.phone,
          skills: prof.skills,
          isActive: prof.isActive,
          rating: prof.rating,
          createdAt: prof.createdAt,
        } : null,
      };
    });

    res.json({
      status: 'ok',
      data: {
        tailors: tailorsWithStats,
        tailorsFromUsers,
        counts: {
          tailors: tailorsWithStats.length,
          tailorsFromUsers: tailorsFromUsers.length,
        }
      }
    });
  } catch (err) {
    console.error('adminOverview error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to build overview' });
  }
};

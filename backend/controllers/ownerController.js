const { isAdmin } = require('../middleware/auth');
const User = require("../models/User");
const fs = require("fs");  // Replaced import with require
const imagekit = require("../config/imageKit");
const Outfit = require("../models/Outfit");
const Booking = require("../models/Booking");

// API to change Role of the User
const changeRoleToOwner = async (req, res) => {
    try {
        const { _id } = req.user;
        await User.findByIdAndUpdate(_id, { role: "owner" });
        res.json({ success: true, message: "Now You can List Outfits" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API to List Outfit
const addOutfit = async (req, res) => {
    try {
        const { _id } = req.user;
        let outfit = JSON.parse(req.body.outfitData);
        const files = req.files; // This is an object with field names as keys

        if (!files || (!files.mainImage && !files.additionalImages)) {
            return res.json({ success: false, message: "At least one image is required" });
        }

        // Upload main image (required)
        const mainImageFile = files.mainImage ? files.mainImage[0] : null;
        if (!mainImageFile) {
            return res.json({ success: false, message: "Main image is required" });
        }

        const mainFileBuffer = await fs.promises.readFile(mainImageFile.path);
        const mainResponse = await imagekit.upload({
            file: mainFileBuffer,
            fileName: mainImageFile.originalname,
            folder: '/outfits'
        });

        const mainOptimizedImageUrl = imagekit.url({
            path: mainResponse.filePath,
            transformation: [
                { width: '1280' },
                { quality: 'auto' },
                { format: 'webp' }
            ]
        });

        // Upload additional images (optional, max 3) in parallel
        const additionalFiles = (files.additionalImages || []).slice(0, 3);
        const additionalImages = await Promise.all(additionalFiles.map(async (file) => {
            const fileBuffer = await fs.promises.readFile(file.path);
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: file.originalname,
                folder: '/outfits'
            });
            return imagekit.url({
                path: response.filePath,
                transformation: [
                    { width: '1280' },
                    { quality: 'auto' },
                    { format: 'webp' }
                ]
            });
        }));

        await Outfit.create({ 
            ...outfit, 
            owner: _id, 
            image: mainOptimizedImageUrl,
            images: additionalImages
        });

        res.json({ success: true, message: "Outfit Added" });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    } finally {
        const tempFiles = [req.files?.mainImage?.[0], ...(req.files?.additionalImages || [])].filter(Boolean);
        await Promise.allSettled(tempFiles.map(file => fs.promises.unlink(file.path)));
    }
};


//API to list owner Outfits
const getOwnerOutfits = async (req, res) => {
    try {
        const { _id } = req.user;
        const outfits = await Outfit.find({ owner: _id, archivedAt: null }).lean();
        res.json({ success: true, outfits });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

//API to get all outfits (for frontend browsing)
const getAllOutfits = async (req, res) => {
    try {
        const { location, category, search, minPrice, maxPrice } = req.query;
        
        let query = { isAvailable: true, archivedAt: null };
        
        if (location) query.location = location;
        if (category) query.category = category;
        if (minPrice || maxPrice) {
            query.pricePerDay = {};
            if (minPrice) query.pricePerDay.$gte = Number(minPrice);
            if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
        }
        if (search) {
            query.$or = [
                { brand: { $regex: search, $options: 'i' } },
                { model: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Get all outfits matching the query
        let outfits = await Outfit.find(query).populate('owner', 'username email').lean();
        
        // Filter out outfits with pending or confirmed bookings in one query
        const bookedIds = outfits.length
            ? new Set((await Booking.distinct('outfit', {
                outfit: { $in: outfits.map(o => o._id) },
                status: { $in: ['pending', 'confirmed'] }
            })).map(String))
            : new Set();
        const availableOutfits = outfits.filter(outfit => !bookedIds.has(String(outfit._id)));
        
        res.json({ success: true, outfits: availableOutfits });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

//API to toggle outfit availability
const toggleOutfitAvailability = async (req, res) => {
    try {
        const { _id } = req.user;
        const { outfitId } = req.body;
        const outfit = await Outfit.findById(outfitId);
        if (!outfit) {
            return res.json({ success: false, message: "Outfit not found" });
        }

        // Checking if the outfit belongs to the user
        if (outfit.owner.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized" });
        }
        outfit.isAvailable = !outfit.isAvailable;
        await outfit.save();

        res.json({ success: true, message: "Availability Toggled" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

//API to delete an Outfit (hard delete with related bookings)
const deleteOutfit = async (req, res) => {
    const outfit = await Outfit.findById(req.body.outfitId);
    if (!outfit || (!isAdmin(req.user) && String(outfit.owner) !== String(req.user._id))) return res.status(404).json({ success: false, message: 'Outfit not found' });
    outfit.isAvailable = false; outfit.archivedAt = new Date(); await outfit.save();
    res.json({ success: true, message: 'Outfit archived; booking history has been retained' });
};

//API to get Dashboard data
const getDashboardData = async (req, res) => {
    try {
        const { _id, role, type } = req.user;
        if (role !== 'owner' && role !== 'admin' && type !== 'Admin') {
            return res.json({ success: false, message: "Unauthorized" });
        }
        
        // For admin users, get all outfits and bookings. For owner users, get only their own
        let outfitQuery = {};
        let bookingQuery = {};
        
        if (role === 'admin' || type === 'Admin') {
            // Admin sees all outfits and bookings
            outfitQuery = {};
            bookingQuery = {};
        } else {
            // Owner sees only their own
            outfitQuery = { owner: _id };
            bookingQuery = { owner: _id };
        }
        
        const [totalOutfits, bookingStats, pendingBookings] = await Promise.all([
            Outfit.countDocuments(outfitQuery),
            Booking.aggregate([
                { $match: bookingQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        revenue: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$price', 0] } }
                    }
                }
            ]),
            Booking.find({ ...bookingQuery, status: "pending" })
                .populate('outfit')
                .populate('user', 'username email')
                .sort({ createdAt: -1 })
                .limit(3)
                .lean()
        ]);

        const statusMap = new Map(bookingStats.map(s => [s._id, s]));
        const totalBookings = bookingStats.reduce((sum, s) => sum + s.count, 0);
        const confirmedBookings = statusMap.get('confirmed')?.count || 0;
        const cancelledBookings = statusMap.get('cancelled')?.count || 0;
        const monthlyRevenue = statusMap.get('confirmed')?.revenue || 0;

        const dashboardData = {
            totalOutfits,
            totalBookings,
            pendingBookings,
            confirmedBookings,
            cancelledBookings,
            monthlyRevenue
        }

        res.json({success:true, dashboardData});


    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};


// API to update User Image
const updateUserImage = async (req, res) => {
    try {
        const { _id } = req.user;
        const imageFile = req.file;

        // Upload Imagekit
        const fileBuffer = await fs.promises.readFile(imageFile.path);
        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/users'
        });

        // Optimization through imagekit URL transformation
        const optimizedImageUrl = imagekit.url({
            path: response.filePath,
            transformation: [
                { width: '1280' }, // width resizing
                { quality: 'auto' }, // auto compression
                { format: 'webp' } // convert to modern format
            ]
        });

        const image = optimizedImageUrl;

        await User.findByIdAndUpdate(_id, { image });
        res.json({ success: true, message: "Image Updated" });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    } finally {
        if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    }
};

//API to get single outfit by ID for editing
const getOutfitById = async (req, res) => {
    try {
        const { outfitId } = req.params;
        const { _id } = req.user;

        const outfit = await Outfit.findOne({ _id: outfitId, owner: _id });
        
        if (!outfit) {
            return res.json({ success: false, message: "Outfit not found or you don't have permission to edit it" });
        }

        res.json({ success: true, outfit });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

//API to update outfit details
const updateOutfit = async (req, res) => {
    try {
        const { outfitId } = req.params;
        const { _id } = req.user;
        
        // Parse outfit data from request body
        const submitted = JSON.parse(req.body.outfitData);
        const outfitData = {};
        for (const field of ['brand', 'model', 'condition', 'category', 'material', 'color', 'size', 'pricePerDay', 'location', 'description']) {
            if (submitted[field] !== undefined) outfitData[field] = submitted[field];
        }
        const files = req.files;

        // Verify outfit belongs to the user
        const existingOutfit = await Outfit.findOne({ _id: outfitId, owner: _id });
        if (!existingOutfit) {
            return res.json({ success: false, message: "Outfit not found or you don't have permission to edit it" });
        }

        // Handle image updates
        let imageUrl = existingOutfit.image; // Keep existing image by default
        let additionalImages = existingOutfit.images || []; // Keep existing additional images

        // Update main image if provided
        if (files && files.mainImage) {
            const mainImageFile = files.mainImage[0];
            const fileBuffer = await fs.promises.readFile(mainImageFile.path);
            const mainImageUpload = await imagekit.upload({
                file: fileBuffer,
                fileName: `outfit_${Date.now()}_main.${mainImageFile.originalname.split('.').pop()}`,
                folder: '/outfits'
            });
            imageUrl = mainImageUpload.url;
        }

        // Update additional images if provided (parallel upload)
        if (files && files.additionalImages) {
            additionalImages = await Promise.all(files.additionalImages.map(async (file) => {
                const fileBuffer = await fs.promises.readFile(file.path);
                const upload = await imagekit.upload({
                    file: fileBuffer,
                    fileName: `outfit_${Date.now()}_additional.${file.originalname.split('.').pop()}`,
                    folder: '/outfits'
                });
                return upload.url;
            }));
        }

        // Update outfit in database
        const updatedOutfit = await Outfit.findByIdAndUpdate(
            outfitId,
            {
                ...outfitData,
                image: imageUrl,
                images: additionalImages
            },
            { new: true }
        );

        res.json({ success: true, message: "Outfit updated successfully", outfit: updatedOutfit });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    } finally {
        const tempFiles = [req.files?.mainImage?.[0], ...(req.files?.additionalImages || [])].filter(Boolean);
        await Promise.allSettled(tempFiles.map(file => fs.promises.unlink(file.path)));
    }
};

// Exporting functions using CommonJS
module.exports = {
    changeRoleToOwner,
    addOutfit,
    getOwnerOutfits,
    getAllOutfits,
    toggleOutfitAvailability,
    deleteOutfit,
    getDashboardData,
    updateUserImage,
    getOutfitById,
    updateOutfit
};

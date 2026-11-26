const express = require("express");  // Replaced import with require
const { protect, ownerOnly } = require("../middleware/auth");  // Replaced import with require
const ownerController = require("../controllers/ownerController");  // Replaced import with require
const upload = require("../middleware/multer");

const ownerRouter = express.Router();

// Safety wrapper to avoid "argument handler must be a function" on startup
const h = (fnName) => {
  const fn = ownerController[fnName];
  if (typeof fn !== 'function') {
    console.error(`[ownerRoutes] Missing handler: ${fnName}`);
    return (req, res) => res.status(500).json({ success: false, message: `Handler '${fnName}' not available` });
  }
  return fn;
};

ownerRouter.post("/add-outfit", protect, ownerOnly, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 3 }
]), h('addOutfit'));
ownerRouter.get("/outfits", protect, ownerOnly, h('getOwnerOutfits'));
ownerRouter.get("/all-outfits", h('getAllOutfits')); // Public endpoint for browsing
ownerRouter.post("/toggle-outfit", protect, ownerOnly, h('toggleOutfitAvailability'));
ownerRouter.post("/delete-outfit", protect, ownerOnly, h('deleteOutfit'));

ownerRouter.get("/dashboard", protect, ownerOnly, h('getDashboardData'));
ownerRouter.post("/update-image", protect, upload.single("image"), h('updateUserImage'));

// Routes for editing outfits
ownerRouter.get("/outfit/:outfitId", protect, ownerOnly, h('getOutfitById'));
ownerRouter.put("/outfit/:outfitId", protect, ownerOnly, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 3 }
]), h('updateOutfit'));


module.exports = ownerRouter;  // Replaced export default with module.exports

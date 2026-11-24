const express = require("express");
const router = express.Router();
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// Import Job controller
const JobController = require("../controllers/JobController");

// Public routes (for career page)
router.get("/", optionalAuth, JobController.getAllJobs);
router.get("/:id", optionalAuth, JobController.getJobById);

// Admin routes (should be protected with auth middleware)
router.post("/", protect, adminOnly, JobController.createJob);
router.put("/:id", protect, adminOnly, JobController.updateJob);
router.delete("/:id", protect, adminOnly, JobController.deleteJob);
router.patch("/:id/status", protect, adminOnly, JobController.updateJobStatus);
router.get("/admin/all", protect, adminOnly, JobController.getAllJobsAdmin);

module.exports = router;

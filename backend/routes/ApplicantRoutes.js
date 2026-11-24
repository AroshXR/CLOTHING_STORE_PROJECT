const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { protect, adminOnly, applicantAccess } = require('../middleware/auth');
const ctrl = require('../controllers/ApplicantController');
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => done(null, path.join(__dirname, '..', 'uploads', 'resumes')),
    filename: (_req, file, done) => done(null, 'resume-' + require('crypto').randomUUID() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, done) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype);
    done(allowed ? null : new Error('Only PDF and Word documents are accepted'), allowed);
  }
});
router.post('/', upload.single('resume'), ctrl.addApplicant);
router.use(protect);
router.get('/', ctrl.getAllApplicants);
router.get('/analytics', adminOnly, ctrl.getRecruitmentAnalytics);
router.get('/reports', adminOnly, ctrl.getApplicantReport);
router.get('/:id', applicantAccess, ctrl.getApplicantById);
router.put('/:id', applicantAccess, ctrl.updateApplicant);
router.delete('/:id', applicantAccess, ctrl.deleteApplicant);
router.patch('/:id/status', adminOnly, ctrl.updateApplicantStatus);
router.post('/:id/schedule-interview', adminOnly, ctrl.scheduleInterview);
module.exports = router;







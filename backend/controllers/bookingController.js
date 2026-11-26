const bookingService = require('../services/bookingService');
const { isAdmin } = require('../middleware/auth');
const Booking = require("../models/Booking");
const Outfit = require("../models/Outfit");
const { sendPayOnReturnEmail } = require("../services/emailService");
const { escapeHtml } = require("../services/siteSettingsService");
const puppeteer = require('puppeteer');

let sharedBrowserPromise = null;
const getPdfBrowser = async () => {
    if (!sharedBrowserPromise) {
        sharedBrowserPromise = puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }).then((browser) => {
            browser.on('disconnected', () => { sharedBrowserPromise = null; });
            return browser;
        }).catch((err) => {
            sharedBrowserPromise = null;
            throw err;
        });
    }
    return sharedBrowserPromise;
};

const closePdfBrowser = async () => {
    const pending = sharedBrowserPromise;
    sharedBrowserPromise = null;
    if (!pending) return;
    try {
        const browser = await pending;
        await browser.close();
    } catch (_) {
        // Ignore shutdown errors if browser already exited
    }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.once(signal, () => {
        closePdfBrowser().catch(() => {});
    });
});

// API to check availability of Outfit for given Date and Location
const checkAvailabilityOfOutfit = async (req, res) => {
    try {
        const { location, reservationDate, returnDate } = req.body;

        // Fetch all available outfits for the given location
        const outfits = await Outfit.find({ location, isAvailable: true });
        const bookedIds = outfits.length
            ? new Set((await Booking.distinct('outfit', {
                outfit: { $in: outfits.map(o => o._id) },
                status: { $in: ["pending", "confirmed"] },
                reservationDate: { $lte: returnDate },
                returnDate: { $gte: reservationDate }
            })).map(String))
            : new Set();
        const availableOutfits = outfits
            .filter(outfit => !bookedIds.has(String(outfit._id)))
            .map(outfit => ({ ...outfit._doc, isAvailable: true }));

        res.json({ success: true, availableOutfits });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API to create booking
const createBooking = async (req, res) => {
    try { const booking = await bookingService.create(req.user, req.body, req.file); res.status(201).json({ success: true, message: 'Booking created', booking }); }
    catch (error) { if (req.file) require('fs').unlink(req.file.path, () => {}); throw error; }
};

// API to list User bookings
const getUserBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const bookings = await Booking.find({ user: _id }).populate("outfit").sort({ createdAt: -1 }).lean();

        res.json({ success: true, bookings });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API to get Owner Bookings
const getOwnerBooking = async (req, res) => {
    try {
        if (req.user.type !== 'owner' && req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.type !== 'Admin') {
            return res.json({ success: false, message: "Unauthorized" });
        }
        
        // For admin users, get all bookings. For owner users, get only their own
        let bookingQuery = {};
        if (req.user.role === 'admin' || req.user.type === 'Admin') {
            bookingQuery = {}; // Get all bookings
        } else {
            bookingQuery = { owner: req.user._id }; // Get only owner's bookings
        }
        
        const bookings = await Booking.find(bookingQuery)
            .populate('outfit').populate('user', 'username email')
            .select("-user.password")
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, bookings });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API to Change the booking status
const changeBookingStatus = async (req, res) => {
    const booking = await bookingService.changeStatus(req.user, req.body.bookingId, req.body.status);
    res.json({ success: true, message: 'Booking status updated', booking });
};

// API to delete booking
const deleteBooking = async (req, res) => {
    await bookingService.remove(req.user, req.params.bookingId);
    res.json({ success: true, message: 'Booking deleted' });
};

//API to get single booking by ID for editing
const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { _id } = req.user;

        const booking = await Booking.findOne({ _id: bookingId, user: _id }).populate('outfit');
        
        if (!booking) {
            return res.json({ success: false, message: "Booking not found or you don't have permission to edit it" });
        }

        res.json({ success: true, booking });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_BOOKING_STATUSES = new Set(['pending', 'confirmed', 'cancelled']);

const buildBookingReportData = async (req) => {
    const rawStart = typeof req.query.startDate === 'string' && ISO_DATE_RE.test(req.query.startDate) ? req.query.startDate : '';
    const rawEnd = typeof req.query.endDate === 'string' && ISO_DATE_RE.test(req.query.endDate) ? req.query.endDate : '';
    const { status, location } = req.query;
    const query = isAdmin(req.user) ? {} : { owner: req.user._id };

    if (rawStart && rawEnd) {
        query.createdAt = {
            $gte: new Date(rawStart),
            $lte: new Date(rawEnd + 'T23:59:59.999Z')
        };
    }

    if (typeof status === 'string' && status !== 'all' && ALLOWED_BOOKING_STATUSES.has(status)) {
        query.status = status;
    }

    let bookings = await Booking.find(query)
        .populate({ path: 'outfit', select: 'brand model category pricePerDay location image' })
        .populate({ path: 'user', select: 'username email' })
        .populate({ path: 'owner', select: 'username email' })
        .sort({ createdAt: -1 })
        .lean();

    if (location && location !== 'all') {
        bookings = bookings.filter(booking => booking.outfit && booking.outfit.location === location);
    }

    const totalBookings = bookings.length;
    const totalRevenue = bookings
        .filter(booking => booking.status === 'confirmed')
        .reduce((sum, booking) => sum + Number(booking.price || 0), 0);

    const statusCounts = bookings.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
    }, {});

    return {
        bookings,
        summary: {
            totalBookings,
            totalRevenue,
            statusCounts,
            reportPeriod: {
                startDate: rawStart || 'All time',
                endDate: rawEnd || 'Present'
            }
        }
    };
};

//API to generate booking report for admin
const generateBookingReport = async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== 'owner' && !isAdmin(req.user)) {
            return res.json({ success: false, message: "Unauthorized - Admin access required" });
        }

        const reportData = await buildBookingReportData(req);
        res.json({ success: true, reportData });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

//API to update booking details
const updateBooking = async (req, res) => {
    try { const booking = await bookingService.update(req.user, req.params.bookingId, req.body, req.file); res.json({ success: true, message: 'Booking updated', booking }); }
    catch (error) { if (req.file) require('fs').unlink(req.file.path, () => {}); throw error; }
};

// Exporting functions using CommonJS
// API to send Pay on Return email
const sendPayOnReturnConfirmation = async (req, res) => {
    try {
        const { bookingId } = req.body;  // Gets booking ID from request
        const userId = req.user._id;

        // Find the booking and populate outfit and user details
        const booking = await Booking.findById(bookingId)
            .populate('outfit')
            .populate('user', 'username email');

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        // Verify the booking belongs to the user
        if (booking.user._id.toString() !== userId.toString()) {
            return res.json({ success: false, message: "Unauthorized access" });
        }

        // Check if booking is confirmed
        if (booking.status !== 'confirmed') {
            return res.json({ success: false, message: "Only confirmed bookings can use Pay on Return" });
        }

        // Send the email
        const emailResult = await sendPayOnReturnEmail(booking, booking.email);

        if (emailResult.success) {
            res.json({ 
                success: true, 
                message: "Pay on Return confirmation email sent successfully",
                messageId: emailResult.messageId 
            });
        } else {
            res.json({ 
                success: false, 
                message: "Failed to send email: " + emailResult.error 
            });
        }
    } catch (error) {
        console.error('Error sending Pay on Return email:', error);
        res.json({ success: false, message: error.message });
    }
};

//API to generate booking report as PDF
const generateBookingReportPDF = async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== 'owner' && !isAdmin(req.user)) {
            return res.json({ success: false, message: "Unauthorized - Admin access required" });
        }

        const { bookings, summary } = await buildBookingReportData(req);

        // Get current user info for the report
        const currentUser = req.user;
        const currency = 'Rs.';

        // Generate HTML content for PDF
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Booking Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                .header h1 { color: #000; margin: 0; }
                .header p { margin: 5px 0; color: #333; }
                .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #ccc; }
                .summary h2 { color: #000; margin-top: 0; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                .summary-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #000; border: 1px solid #ddd; }
                .summary-item h3 { margin: 0 0 5px 0; color: #000; }
                .summary-item p { margin: 0; font-size: 18px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #000; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ccc; }
                th { background: #000; color: white; font-weight: bold; }
                tr:nth-child(even) { background: #f9f9f9; }
                tr:nth-child(odd) { background: white; }
                .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; border: 1px solid #000; }
                .status.pending { background: #e6e6e6; color: #000; }
                .status.confirmed { background: #d4d4d4; color: #000; }
                .status.cancelled { background: #b8b8b8; color: #000; }
                .outfit-info { display: flex; align-items: center; gap: 10px; }
                .outfit-img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Booking Report</h1>
                <p><strong>Generated on:</strong> ${escapeHtml(new Date().toLocaleDateString())}</p>
                <p><strong>Owner:</strong> ${escapeHtml(currentUser?.username || 'Owner')}</p>
                <p><strong>Report Period:</strong> ${escapeHtml(summary.reportPeriod.startDate)} to ${escapeHtml(summary.reportPeriod.endDate)}</p>
            </div>

            <div class="summary">
                <h2>📈 Summary & Analytics</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <h3>Total Bookings</h3>
                        <p>${summary.totalBookings}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Total Revenue</h3>
                        <p>${currency}${summary.totalRevenue.toFixed(2)}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Confirmed Bookings</h3>
                        <p>${summary.statusCounts.confirmed || 0}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Pending Bookings</h3>
                        <p>${summary.statusCounts.pending || 0}</p>
                    </div>
                </div>
            </div>

            <h2>📋 Detailed Booking Information</h2>
            <table>
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Outfit Details</th>
                        <th>Customer</th>
                        <th>Booking Period</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Total Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => {
                        const startDate = new Date(booking.reservationDate).toLocaleDateString();
                        const endDate = new Date(booking.returnDate).toLocaleDateString();
                        const duration = Math.ceil((new Date(booking.returnDate) - new Date(booking.reservationDate)) / (1000 * 60 * 60 * 24));
                        const statusClass = ALLOWED_BOOKING_STATUSES.has(booking.status) ? booking.status : 'unknown';
                        const statusText = escapeHtml(String(booking.status || 'unknown').toUpperCase());
                        
                        return `
                        <tr>
                            <td>#${escapeHtml(String(booking._id || '').slice(-6))}</td>
                            <td>
                                <div class="outfit-info">
                                    <div>
                                        <strong>${escapeHtml(booking.outfit?.brand || 'N/A')} - ${escapeHtml(booking.outfit?.model || 'N/A')}</strong><br>
                                        <small>${escapeHtml(booking.outfit?.category || 'N/A')} | ${escapeHtml(booking.outfit?.location || 'N/A')}</small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <strong>${escapeHtml(booking.user?.username || 'N/A')}</strong><br>
                                <small>${escapeHtml(booking.user?.email || 'N/A')}</small>
                            </td>
                            <td>
                                <strong>Start:</strong> ${escapeHtml(startDate)}<br>
                                <strong>End:</strong> ${escapeHtml(endDate)}
                            </td>
                            <td>${duration} day${duration !== 1 ? 's' : ''}</td>
                            <td><span class="status ${statusClass}">${statusText}</span></td>
                            <td><strong>${escapeHtml(currency)}${Number(booking.price || 0).toFixed(2)}</strong></td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
                <p>This report was generated automatically by the Outfit Rental Management System</p>
                <p>© ${new Date().getFullYear()} - All rights reserved</p>
            </div>
        </body>
        </html>
        `;

        // Reuse a shared Puppeteer browser instance to avoid per-request launches
        const browser = await getPdfBrowser();
        const page = await browser.newPage();
        let pdfBuffer;
        try {
            await page.setJavaScriptEnabled(false);
            await page.setRequestInterception(true);
            page.on('request', (intercepted) => {
                if (intercepted.isNavigationRequest() && intercepted.frame() === page.mainFrame()) {
                    return intercepted.continue();
                }
                return intercepted.abort();
            });
            await page.setContent(htmlContent, { waitUntil: 'load' });
            pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
        } finally {
            await page.close().catch(() => {});
        }

        // Set response headers for PDF download
        const filename = `booking-report-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the PDF buffer
        res.send(pdfBuffer);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    checkAvailabilityOfOutfit,
    createBooking,
    getUserBooking,
    getOwnerBooking,
    changeBookingStatus,
    deleteBooking,
    getBookingById,
    updateBooking,
    generateBookingReport,
    generateBookingReportPDF,
    sendPayOnReturnConfirmation
};

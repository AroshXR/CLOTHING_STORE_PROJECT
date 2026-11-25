import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './Components/Layout/AppShell';
import NotFound from './Components/Layout/NotFound';
import { AuthProvider } from './AuthGuard/authGuard';
import { BrandingProvider } from './config/branding';
import ProtectedRoute from './AuthGuard/ProtectedRoute';

const SiteSettings = lazy(() => import('./pages/admin/SiteSettings'));
const HomeLanding = lazy(() => import('./Components/Editorial/HomeLanding'));
const Splash = lazy(() => import('./Components/Editorial/Splash'));
const About = lazy(() => import('./Components/Editorial/About'));
const LoginPage = lazy(() => import('./Components/Login_Register/Login'));
const RegisterPage = lazy(() => import('./Components/Login_Register/Register'));
const ClothingStudio = lazy(() => import('./Components/clothing-customizer/studio/ClothingStudio'));
const Career = lazy(() => import('./Components/Career/Career'));
const ApplicantDashboard = lazy(() => import('./Components/ApplicantDashboard/ApplicantDashboard'));
const AdminJobManagement = lazy(() => import('./Components/AdminJobManagement/AdminJobManagement'));
const AdminApplicantManagement = lazy(() => import('./Components/AdminApplicantManagement/AdminApplicantManagement'));
const AdminApplicantDetail = lazy(() => import('./Components/AdminApplicantManagement/AdminApplicantDetail'));
const AdminPanel = lazy(() => import('./Components/AdminPanel/AdminPanel'));
const Contact = lazy(() => import('./Components/Editorial/Contact'));
const OrderManagement = lazy(() => import('./Components/OrderManagement/OrderManagement'));
const PaymentManagement = lazy(() => import('./Components/PaymentManagement/PaymentManagement'));
const PaymentDetailsDisplay = lazy(() => import('./Components/PaymentDetailsDisplay/PaymentDetailsDisplay'));
const TailorHome = lazy(() => import('./Components/Home/Tailor_Interface/TailorHome'));
const SupplierManagement = lazy(() => import('./Components/Supplier-management/SupplierManagement'));
const MaterialInventoryManagement = lazy(() => import('./Components/MaterialInventory-management/MaterialInventoryManagement'));
const SkinToneColorGuide = lazy(() => import('./Components/SkinToneColorGuide/SkinToneColorGuide'));
const Unauthorized = lazy(() => import('./Components/Unauthorized/Unauthorized'));
const UserAccount = lazy(() => import('./Components/UserManagement/UserAccount'));
const AdminUserManagement = lazy(() => import('./Components/AdminManagement/AdminUserManagement'));
const PrivacyPolicy = lazy(() => import('./Components/PrivacyPolicy_Terms/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./Components/PrivacyPolicy_Terms/TermsAndConditions'));
const Outlet = lazy(() => import('./Components/Outlet/Outlet'));
const OutletDetail = lazy(() => import('./Components/Outlet/OutletDetail'));
const AdminOutlet = lazy(() => import('./Components/AdminOutlet/AdminOutlet'));
const ClothingInventoryManagement = lazy(() => import('./Components/ClothingInventoryManagement/ClothingInventoryManagement'));
const OrderSummaryPage = lazy(() => import('./Components/OrderManagement/OrderSummaryPage'));
const BookingReport = lazy(() => import('./pages/admin/BookingReport'));
const LearnMore = lazy(() => import('./Components/LearnMore/LearnMore'));

const Rentals = lazy(() => import('./Components/Editorial/Rentals'));
const OutfitDetails = lazy(() => import('./pages/OutfitDetails'));
const Outfits = lazy(() => import('./pages/Outfits'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const EditBooking = lazy(() => import('./pages/EditBooking'));
const Layout = lazy(() => import('./pages/owner/Layout'));
const Dashboard = lazy(() => import('./pages/owner/Dashboard'));
const AddOutfit = lazy(() => import('./pages/owner/AddOutfit'));
const EditOutfit = lazy(() => import('./pages/owner/EditOutfit'));
const ManageOutfits = lazy(() => import('./pages/owner/ManageOutfits'));
const ManageBookings = lazy(() => import('./pages/owner/ManageBookings'));
const Reports = lazy(() => import('./pages/owner/Reports'));

const AdminHub = lazy(() => import('./Components/AdminHub/AdminHub'));
const AdminCustomOrders = lazy(() => import('./pages/admin/CustomOrders'));
const AdminCustomOrderDetail = lazy(() => import('./pages/admin/CustomOrderDetail'));
const AdminTailors = lazy(() => import('./pages/admin/Tailors'));
const AdminClothCustomizer = lazy(() => import('./Components/clothing-customizer/admin-cloth-customizer'));

function App() {
  return (
    <BrandingProvider><AuthProvider><AppShell>
      <Suspense fallback={<div className="p-8 text-center" role="status">Loading…</div>}>
      <Routes>
        <Route path="/admin/site-settings" element={<ProtectedRoute allowedUserTypes="Admin"><SiteSettings /></ProtectedRoute>} />
        {/* Public routes */}
        <Route path="/" element={<Splash />} />
        <Route path="/home" element={<HomeLanding />} />
        <Route path="/about" element={<About />} />
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/career" element={<Career />} />
        <Route path="/customizer" element={<ClothingStudio />} />
        <Route path="/outlet" element={<Outlet />} />
        <Route path="/outlet/:id" element={<OutletDetail />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/orderSummary" element={<OrderSummaryPage />} />

        {/* Applicant and informational routes */}
        <Route path="/applicant-dashboard" element={<ApplicantDashboard />} />
        <Route path="/color-guide" element={<SkinToneColorGuide />} />

        {/* Authenticated customer & applicant routes */}
        <Route
          path="/userHome"
          element={(
            <ProtectedRoute allowedUserTypes={["Customer", "Applicant"]}>
              <HomeLanding />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/orderManagement"
          element={(
            <ProtectedRoute allowedUserTypes={["Customer", "Applicant"]}>
              <OrderManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/paymentManagement"
          element={(
            <ProtectedRoute allowedUserTypes={["Customer", "Applicant"]}>
              <PaymentManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/paymentDetails"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <PaymentDetailsDisplay />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/user/account"
          element={(
            <ProtectedRoute allowedUserTypes={["Customer", "Applicant", "Tailor", "Admin"]}>
              <UserAccount />
            </ProtectedRoute>
          )}
        />

        {/* Tailor experience */}
        <Route
          path="/tailorHome"
          element={(
            <ProtectedRoute allowedUserTypes="Tailor">
              <TailorHome />
            </ProtectedRoute>
          )}
        />

        {/* Supplier management - restricted to admin by default */}
        <Route
          path="/supplierManagement"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <SupplierManagement />
            </ProtectedRoute>
          )}
        />

        {/* Inventory management - restricted to admin by default */}
        <Route
          path="/inventoryManagement"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <MaterialInventoryManagement />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin-outlet"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminOutlet />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/clothing-inventory"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <ClothingInventoryManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin-hub"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminHub />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/custom-orders"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminCustomOrders />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/custom-orders/:id"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminCustomOrderDetail />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/tailors"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminTailors />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin-cloth-customizer"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminClothCustomizer />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminPanel />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin-jobs"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminJobManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin-applicants"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminApplicantManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin-applicants/:id"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminApplicantDetail />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <AdminUserManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/booking-reports"
          element={(
            <ProtectedRoute allowedUserTypes="Admin">
              <BookingReport />
            </ProtectedRoute>
          )}
        />


        <Route path='/rentalHome' element={<Rentals />}/>
        <Route path='/outfit-details/:id' element = {<OutfitDetails/>}/>
        <Route path='/outfits' element = {<Outfits/>}/>
        <Route 
          path='/my-bookings' 
          element={
            <ProtectedRoute allowedUserTypes={["Customer", "Applicant"]}>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/edit-booking/:bookingId' 
          element={
            <ProtectedRoute allowedUserTypes={["Customer", "Applicant"]}>
              <EditBooking />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/owner' 
          element={
            <ProtectedRoute allowedUserTypes={["owner", "Admin"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
            <Route index element={<Dashboard />} />
            <Route path='add-outfit' element={<AddOutfit />} />
            <Route path='edit-outfit/:outfitId' element={<EditOutfit />} />
            <Route path='manage-outfits' element={<ManageOutfits />} />
            <Route path='manage-bookings' element={<ManageBookings />} />
            <Route path='reports' element={<Reports />} />
        </Route>




        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </AppShell></AuthProvider></BrandingProvider>
  );
}

export default App;

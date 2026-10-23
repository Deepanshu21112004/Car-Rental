import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import MainLayout from './layouts/MainLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';

import ProtectedRoute from './components/ProtectedRoute';
import UserRoute from './components/UserRoute';
import AdminRoute from './components/AdminRoute';

// Public pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Cars from './pages/public/Cars';
import CarDetails from './pages/public/CarDetails';
import Contact from './pages/public/Contact';
import FAQ from './pages/public/FAQ';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// User pages
import UserDashboard from './pages/user/Dashboard';
import Profile from './pages/user/Profile';
import UserBookings from './pages/user/Bookings';
import BookingDetails from './pages/user/BookingDetails';
import Favorites from './pages/user/Favorites';
import Reviews from './pages/user/Reviews';
import UserChallans from './pages/user/Challans';
import AdminChallans from './pages/admin/Challans';

// Booking/payment pages
import Booking from './pages/booking/Booking';
import Checkout from './pages/booking/Checkout';
import PaymentSuccess from './pages/booking/PaymentSuccess';
import PaymentFailed from './pages/booking/PaymentFailed';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminCars from './pages/admin/Cars';
import AddCar from './pages/admin/AddCar';
import EditCar from './pages/admin/EditCar';
import Users from './pages/admin/Users';
import AdminBookings from './pages/admin/Bookings';
import AdminBookingDetails from './pages/admin/BookingDetails';
import Payments from './pages/admin/Payments';
import AdminReviews from './pages/admin/Reviews';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

const NotFound = () => (
    <div className="container section-space text-center">
        <div className="empty-state">
            <span className="eyebrow">404</span>

            <h1>Page not found</h1>

            <p>The page you requested does not exist.</p>

            <a href="/" className="btn btn-primary-custom">
                Back Home
            </a>
        </div>
    </div>
);

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* =====================================================
                        MAIN WEBSITE
                    ===================================================== */}

                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Home />} />

                        <Route path="/about" element={<About />} />

                        <Route path="/cars" element={<Cars />} />

                        <Route path="/cars/:id" element={<CarDetails />} />

                        <Route path="/contact" element={<Contact />} />

                        <Route path="/faq" element={<FAQ />} />

                        {/* =================================================
                            AUTH
                        ================================================= */}

                        <Route path="/login" element={<Login />} />

                        <Route path="/register" element={<Register />} />

                        <Route path="/forgot-password" element={<ForgotPassword />} />

                        <Route path="/reset-password" element={<ResetPassword />} />

                        {/* =================================================
                            PROTECTED BOOKING PAGES
                        ================================================= */}

                        <Route element={<ProtectedRoute />}>
                            <Route path="/booking/:carId" element={<Booking />} />

                            <Route path="/checkout/:bookingId" element={<Checkout />} />
                        </Route>

                        {/* =================================================
                            STRIPE RETURN PAGES

                            IMPORTANT:
                            These are NOT protected because Stripe must
                            be able to redirect back here.
                        ================================================= */}

                        <Route path="/payment-success" element={<PaymentSuccess />} />

                        <Route path="/payment-failed" element={<PaymentFailed />} />
                    </Route>

                    {/* =====================================================
                        USER ACCOUNT
                    ===================================================== */}

                    <Route element={<ProtectedRoute />}>
                        <Route element={<UserRoute />}>
                            <Route element={<UserLayout />}>
                                <Route path="/dashboard" element={<UserDashboard />} />

                                <Route path="/profile" element={<Profile />} />

                                <Route path="/my-bookings" element={<UserBookings />} />

                                <Route path="/my-bookings/:id" element={<BookingDetails />} />

                                <Route path="/favorites" element={<Favorites />} />

                                <Route path="/my-reviews" element={<Reviews />} />

                                <Route path="/my-challans" element={<UserChallans />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* =====================================================
                        ADMIN
                    ===================================================== */}

                    <Route element={<AdminRoute />}>
                        <Route element={<AdminLayout />}>
                            <Route path="/admin" element={<AdminDashboard />} />

                            <Route path="/admin/cars" element={<AdminCars />} />

                            <Route path="/admin/cars/add" element={<AddCar />} />

                            <Route path="/admin/cars/edit/:id" element={<EditCar />} />

                            <Route path="/admin/users" element={<Users />} />

                            <Route path="/admin/bookings" element={<AdminBookings />} />

                            <Route path="/admin/bookings/:id" element={<AdminBookingDetails />} />

                            <Route path="/admin/challans" element={<AdminChallans />} />

                            <Route path="/admin/payments" element={<Payments />} />

                            <Route path="/admin/reviews" element={<AdminReviews />} />

                            <Route path="/admin/reports" element={<Reports />} />

                            <Route path="/admin/settings" element={<Settings />} />
                        </Route>
                    </Route>

                    {/* =====================================================
                        404
                    ===================================================== */}

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

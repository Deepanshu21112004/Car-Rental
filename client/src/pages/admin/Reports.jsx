import { useCallback, useEffect, useState } from 'react';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line,
} from 'recharts';

import Swal from 'sweetalert2';

import api from '../../services/api';

export default function Reports() {
    const [report, setReport] = useState(null);
    const [range, setRange] = useState('all');
    const [loading, setLoading] = useState(true);

    const loadReports = useCallback(async (selectedRange = range) => {
        try {
            setLoading(true);

            const response = await api.get('/admin/reports', {
                params: {
                    range: selectedRange,
                },
            });

            setReport(response.data);
        } catch (error) {
            console.error('Reports error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to load reports',
                text: error.response?.data?.message || 'Please try again.',
            });
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        loadReports(range);
    }, [loadReports, range]);

    const money = (value) => {
        return `₹${Number(value || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
        })}`;
    };

    const formatMonth = (month) => {
        if (!month) {
            return '';
        }

        const [year, monthNumber] = month.split('-');

        const date = new Date(Number(year), Number(monthNumber) - 1, 1);

        return date.toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner" />
            </div>
        );
    }

    if (!report) {
        return null;
    }

    const summary = report.summary || {};

    const months = report.months || [];

    const bookingStatuses = report.bookingStatuses || {};

    const bookingChart = [
        {
            name: 'Pending',
            value: bookingStatuses.Pending || 0,
        },

        {
            name: 'Confirmed',
            value: bookingStatuses.Confirmed || 0,
        },

        {
            name: 'Active',
            value: bookingStatuses.Active || 0,
        },

        {
            name: 'Completed',
            value: bookingStatuses.Completed || 0,
        },

        {
            name: 'Cancelled',
            value: bookingStatuses.Cancelled || 0,
        },
    ];

    const COLORS = ['#f59e0b', '#2448ff', '#06b6d4', '#16a34a', '#dc2626'];

    return (
        <div>
            {/* HEADER */}

            <div className="dash-heading">
                <div>
                    <span className="eyebrow">REPORTS</span>

                    <h1>Business reports.</h1>

                    <p className="muted">
                        Monitor bookings, payments, revenue and rental performance.
                    </p>
                </div>

                <div>
                    <select
                        className="form-select"
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                    >
                        <option value="all">All Time</option>

                        <option value="7d">Last 7 Days</option>

                        <option value="30d">Last 30 Days</option>

                        <option value="90d">Last 90 Days</option>

                        <option value="year">This Year</option>
                    </select>
                </div>
            </div>

            {/* BOOKING SUMMARY */}

            <div className="row g-4 mb-4">
                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">TOTAL BOOKINGS</span>

                        <h2 className="mt-2 mb-1">{summary.totalBookings || 0}</h2>

                        <p className="muted mb-0">Bookings in selected period</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">COMPLETED</span>

                        <h2 className="mt-2 mb-1">{summary.completedBookings || 0}</h2>

                        <p className="muted mb-0">Completed rentals</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">ACTIVE</span>

                        <h2 className="mt-2 mb-1">{summary.activeBookings || 0}</h2>

                        <p className="muted mb-0">Active rentals</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">CANCELLED</span>

                        <h2 className="mt-2 mb-1">{summary.cancelledBookings || 0}</h2>

                        <p className="muted mb-0">Cancelled rentals</p>
                    </div>
                </div>
            </div>

            {/* REVENUE */}

            <div className="row g-4 mb-4">
                <div className="col-md-6 col-xl-4">
                    <div className="content-card">
                        <span className="eyebrow">GROSS REVENUE</span>

                        <h2 className="mt-2 mb-1">{money(summary.grossRevenue)}</h2>

                        <p className="muted mb-0">Revenue collected before refunds</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-4">
                    <div className="content-card">
                        <span className="eyebrow">REFUNDED</span>

                        <h2 className="mt-2 mb-1">{money(summary.refundedAmount)}</h2>

                        <p className="muted mb-0">Money returned to customers</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-4">
                    <div className="content-card">
                        <span className="eyebrow">NET REVENUE</span>

                        <h2 className="mt-2 mb-1">{money(summary.netRevenue)}</h2>

                        <p className="muted mb-0">Gross revenue minus refunds</p>
                    </div>
                </div>
            </div>

            {/* GENERAL STATISTICS */}

            <div className="row g-4 mb-4">
                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">CUSTOMERS</span>

                        <h2 className="mt-2 mb-1">{summary.totalCustomers || 0}</h2>

                        <p className="muted mb-0">Registered customers</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">CARS</span>

                        <h2 className="mt-2 mb-1">{summary.totalCars || 0}</h2>

                        <p className="muted mb-0">Cars available in system</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">AVG. BOOKING</span>

                        <h2 className="mt-2 mb-1">{money(summary.averageBookingValue)}</h2>

                        <p className="muted mb-0">Average net booking value</p>
                    </div>
                </div>

                <div className="col-md-6 col-xl-3">
                    <div className="content-card">
                        <span className="eyebrow">PENDING PAYMENTS</span>

                        <h2 className="mt-2 mb-1">{summary.pendingPayments || 0}</h2>

                        <p className="muted mb-0">Payments waiting for completion</p>
                    </div>
                </div>
            </div>

            {/* REVENUE CHART */}

            <div className="content-card mb-4">
                <div className="mb-4">
                    <span className="eyebrow">REVENUE TREND</span>

                    <h3 className="mt-2 mb-1">Monthly revenue</h3>

                    <p className="muted mb-0">Gross revenue, refunds and net revenue.</p>
                </div>

                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={months}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="month" tickFormatter={formatMonth} />

                        <YAxis />

                        <Tooltip formatter={(value) => money(value)} labelFormatter={formatMonth} />

                        <Legend />

                        <Bar
                            dataKey="grossRevenue"
                            name="Gross Revenue"
                            fill="#2448ff"
                            radius={[8, 8, 0, 0]}
                        />

                        <Bar
                            dataKey="refunded"
                            name="Refunded"
                            fill="#dc2626"
                            radius={[8, 8, 0, 0]}
                        />

                        <Bar
                            dataKey="netRevenue"
                            name="Net Revenue"
                            fill="#16a34a"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* BOOKING CHARTS */}

            <div className="row g-4 mb-4">
                <div className="col-lg-8">
                    <div className="content-card">
                        <div className="mb-4">
                            <span className="eyebrow">BOOKINGS</span>

                            <h3 className="mt-2 mb-1">Monthly bookings</h3>

                            <p className="muted mb-0">Number of bookings created each month.</p>
                        </div>

                        <ResponsiveContainer width="100%" height={330}>
                            <LineChart data={months}>
                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis dataKey="month" tickFormatter={formatMonth} />

                                <YAxis allowDecimals={false} />

                                <Tooltip labelFormatter={formatMonth} />

                                <Line
                                    type="monotone"
                                    dataKey="bookings"
                                    name="Bookings"
                                    stroke="#2448ff"
                                    strokeWidth={3}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="content-card">
                        <div className="mb-4">
                            <span className="eyebrow">BOOKING STATUS</span>

                            <h3 className="mt-2 mb-1">Booking breakdown</h3>

                            <p className="muted mb-0">Booking distribution.</p>
                        </div>

                        <ResponsiveContainer width="100%" height={330}>
                            <PieChart>
                                <Pie
                                    data={bookingChart}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="45%"
                                    outerRadius={105}
                                    label
                                >
                                    {bookingChart.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip />

                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* PAYMENT SUMMARY */}

            <div className="content-card">
                <div className="mb-4">
                    <span className="eyebrow">PAYMENTS</span>

                    <h3 className="mt-2 mb-1">Payment summary</h3>

                    <p className="muted mb-0">Payment activity for the selected period.</p>
                </div>

                <div className="row g-4">
                    <div className="col-md-4 col-xl-2">
                        <div className="report-mini-card">
                            <span>Paid</span>

                            <strong>{summary.paidPayments || 0}</strong>
                        </div>
                    </div>

                    <div className="col-md-4 col-xl-2">
                        <div className="report-mini-card">
                            <span>Pending</span>

                            <strong>{summary.pendingPayments || 0}</strong>
                        </div>
                    </div>

                    <div className="col-md-4 col-xl-2">
                        <div className="report-mini-card">
                            <span>Failed</span>

                            <strong>{summary.failedPayments || 0}</strong>
                        </div>
                    </div>

                    <div className="col-md-4 col-xl-2">
                        <div className="report-mini-card">
                            <span>Expired</span>

                            <strong>{summary.expiredPayments || 0}</strong>
                        </div>
                    </div>

                    <div className="col-md-4 col-xl-2">
                        <div className="report-mini-card">
                            <span>Refunded</span>

                            <strong>{report.paymentStatuses?.Refunded?.count || 0}</strong>
                        </div>
                    </div>

                    <div className="col-md-4 col-xl-2">
                        <div className="report-mini-card">
                            <span>Refund Amount</span>

                            <strong>{money(summary.refundedAmount)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

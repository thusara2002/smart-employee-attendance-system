import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, employeeAPI, leaveAPI, notificationAPI } from '../services/api';
import {
    FiUsers, FiUserCheck, FiUserX, FiClock, FiCalendar,
    FiTrendingUp, FiAlertCircle, FiBell, FiArrowRight, FiRefreshCw, FiFileText
} from 'react-icons/fi';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        lateToday: 0,
        pendingLeaves: 0,
        onLeave: 0
    });
    const [todayAttendance, setTodayAttendance] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [countRes, summaryRes, attendanceRes, leavesRes, notifRes] = await Promise.allSettled([
                employeeAPI.getActiveCount(),
                attendanceAPI.getSummary(),
                attendanceAPI.getToday(),
                leaveAPI.getPending(),
                notificationAPI.getUnread()
            ]);

            const totalEmployees = countRes.status === 'fulfilled' ? countRes.value.data || 0 : 0;
            const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value.data || {} : {};
            const attendanceData = attendanceRes.status === 'fulfilled' ? attendanceRes.value.data || [] : [];
            const leavesData = leavesRes.status === 'fulfilled' ? leavesRes.value.data || [] : [];
            const notifData = notifRes.status === 'fulfilled' ? notifRes.value.data || [] : [];

            setStats({
                totalEmployees: totalEmployees,
                presentToday: summaryData.present || 0,
                absentToday: summaryData.absent || 0,
                lateToday: summaryData.late || 0,
                pendingLeaves: leavesData.length || 0,
                onLeave: summaryData.onLeave || 0
            });

            setTodayAttendance(attendanceData.slice(0, 5));
            setPendingLeaves(leavesData.slice(0, 5));
            setNotifications(notifData.slice(0, 5));
        } catch (err) {
            console.error('Unexpected error fetching dashboard data', err);
            setError('An error occurred while loading dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateTime) => {
        if (!dateTime) return '-';
        return new Date(dateTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            PRESENT: 'badge-success',
            LATE: 'badge-warning',
            ABSENT: 'badge-error',
            ON_LEAVE: 'badge-info',
            PENDING: 'badge-warning',
            APPROVED: 'badge-success',
            REJECTED: 'badge-error'
        };
        return badges[status] || 'badge-primary';
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard">
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <FiAlertCircle style={{ fontSize: '3rem', color: 'var(--error)', marginBottom: '1rem' }} />
                    <h2 style={{ marginBottom: '1rem' }}>Failed to Load Dashboard</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
                    <button className="btn btn-primary" onClick={fetchDashboardData}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1 className="page-title">Welcome back, {user?.firstName || 'Admin'}!</h1>
                <p className="page-subtitle">Here's what's happening today</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-4 mb-6">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <FiUsers />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalEmployees}</div>
                        <div className="stat-label">Total Employees</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <FiUserCheck />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.presentToday}</div>
                        <div className="stat-label">Present Today</div>
                        <div className="stat-change positive">
                            <FiTrendingUp /> {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon error">
                        <FiUserX />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.absentToday}</div>
                        <div className="stat-label">Absent Today</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <FiClock />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.lateToday}</div>
                        <div className="stat-label">Late Arrivals</div>
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-2 mb-6">
                <div className="stat-card">
                    <div className="stat-icon info">
                        <FiCalendar />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.onLeave}</div>
                        <div className="stat-label">On Leave</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon secondary">
                        <FiAlertCircle />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pendingLeaves}</div>
                        <div className="stat-label">Pending Leave Requests</div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-2">
                {/* Today's Attendance */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h2 className="card-title">Today's Attendance</h2>
                            <p className="card-subtitle">Recent check-ins</p>
                        </div>
                        <Link to="attendance" className="btn btn-ghost btn-sm">
                            View All <FiArrowRight />
                        </Link>
                    </div>

                    {todayAttendance.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Check In</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayAttendance.map((record) => (
                                        <tr key={record.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar avatar-sm">
                                                        {(record.employeeName || 'U').split(' ').filter(n => n).map(n => n[0]).join('') || 'U'}
                                                    </div>
                                                    <span>{record.employeeName || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td>{formatTime(record.checkIn)}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadge(record.status)}`}>
                                                    {record.status || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FiCalendar />
                            </div>
                            <h3 className="empty-state-title">No attendance records</h3>
                            <p className="empty-state-description">No employees have checked in today yet.</p>
                        </div>
                    )}
                </div>

                {/* Pending Leave Requests */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h2 className="card-title">Pending Leave Requests</h2>
                            <p className="card-subtitle">Awaiting approval</p>
                        </div>
                        <Link to="leaves" className="btn btn-ghost btn-sm">
                            View All <FiArrowRight />
                        </Link>
                    </div>

                    {pendingLeaves.length > 0 ? (
                        <div className="leave-list">
                            {pendingLeaves.map((leave) => (
                                <div key={leave.id} className="leave-item">
                                    <div className="flex items-center gap-3">
                                        <div className="avatar avatar-sm">
                                            {(leave.employeeName || 'U').split(' ').filter(n => n).map(n => n[0]).join('') || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-medium">{leave.employeeName || 'Unknown'}</div>
                                            <div className="text-sm text-muted">
                                                {leave.leaveType || 'Leave'} • {leave.days || 0} day{(leave.days || 0) > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`badge ${getStatusBadge(leave.status)}`}>
                                        {leave.status || 'N/A'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <FiFileText />
                            </div>
                            <h3 className="empty-state-title">No pending requests</h3>
                            <p className="empty-state-description">All leave requests have been processed.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Notifications */}
            {notifications.length > 0 && (
                <div className="card mt-6">
                    <div className="card-header">
                        <div>
                            <h2 className="card-title">Recent Notifications</h2>
                            <p className="card-subtitle">Stay updated</p>
                        </div>
                    </div>
                    <div className="notification-list">
                        {notifications.map((notif) => (
                            <div key={notif.id} className="notification-item">
                                <div className="notification-icon">
                                    <FiBell />
                                </div>
                                <div className="notification-content">
                                    <div className="notification-title">{notif.title}</div>
                                    <div className="notification-message">{notif.message}</div>
                                    <div className="notification-time">
                                        {new Date(notif.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
        .leave-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .leave-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
        }

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .notification-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
        }

        .notification-icon {
          width: 40px;
          height: 40px;
          background: var(--primary);
          color: white;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
        }

        .notification-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .notification-message {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .notification-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
        </div>
    );
}

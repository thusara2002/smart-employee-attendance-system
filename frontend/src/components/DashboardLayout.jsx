import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import {
    FiHome, FiUsers, FiCalendar, FiClock, FiFileText,
    FiBell, FiSettings, FiLogOut, FiMenu, FiX, FiMoon, FiSun,
    FiMonitor, FiUser, FiPieChart
} from 'react-icons/fi';

export default function DashboardLayout() {
    const { user, logout, isSuperAdmin, isAdmin, isStaffAdmin } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') {
            setDarkMode(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await notificationAPI.getUnreadCount();
                setNotificationCount(response.data.count);
            } catch (err) {
                console.error('Failed to fetch notifications');
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get display name based on role
    const getDisplayName = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        return user?.firstName || user?.email?.split('@')[0] || 'User';
    };

    // Get initials based on role
    const getDisplayInitials = () => {
        const first = user?.firstName?.[0] || '';
        const last = user?.lastName?.[0] || '';
        if (first || last) return (first + last).toUpperCase();
        return 'U';
    };

    const getNavItems = () => {
        const items = [];

        try {
            // Dashboard - different for each role
            if (isSuperAdmin()) {
                items.push(
                    { to: '/admin', icon: FiHome, label: 'Dashboard', exact: true },
                    { to: '/admin/employees', icon: FiUsers, label: 'Employees' },
                    { to: '/admin/attendance', icon: FiCalendar, label: 'Attendance' },
                    { to: '/admin/shifts', icon: FiClock, label: 'Shifts' },
                    { to: '/admin/leaves', icon: FiFileText, label: 'Leave Requests' },
                    { to: '/admin/reports', icon: FiPieChart, label: 'Reports' },
                    { to: '/admin/profile', icon: FiUser, label: 'Profile' }
                );
            } else if (isAdmin()) {
                items.push(
                    { to: '/hr', icon: FiHome, label: 'Dashboard', exact: true },
                    { to: '/hr/employees', icon: FiUsers, label: 'Employees' },
                    { to: '/hr/attendance', icon: FiCalendar, label: 'Attendance' },
                    { to: '/hr/shifts', icon: FiClock, label: 'Shifts' },
                    { to: '/hr/leaves', icon: FiFileText, label: 'Leave Requests' },
                    { to: '/hr/reports', icon: FiPieChart, label: 'Reports' },
                    { to: '/hr/profile', icon: FiUser, label: 'Profile' }
                );
            } else if (isStaffAdmin()) {
                items.push(
                    { to: '/hr', icon: FiHome, label: 'Dashboard', exact: true },
                    { to: '/hr/employees', icon: FiUsers, label: 'Employees' },
                    { to: '/hr/attendance', icon: FiCalendar, label: 'Attendance' },
                    { to: '/hr/leaves', icon: FiFileText, label: 'Leave Requests' },
                    { to: '/hr/profile', icon: FiUser, label: 'Profile' }
                );
            } else {
                items.push(
                    { to: '/employee', icon: FiHome, label: 'Dashboard', exact: true },
                    { to: '/employee/attendance', icon: FiCalendar, label: 'My Attendance' },
                    { to: '/employee/leaves', icon: FiFileText, label: 'My Leaves' },
                    { to: '/employee/profile', icon: FiUser, label: 'Profile' }
                );
            }
        } catch (err) {
            console.error('Error in getNavItems:', err);
        }

        return items;
    };

    return (
        <div className="app-container">
            <div className="animated-bg"></div>

            {/* Sidebar */}
            <aside className={`sidebar ${!sidebarOpen ? 'sidebar-hidden' : ''}`}>
                <div className="logo">
                    <div className="logo-icon">
                        <FiMonitor />
                    </div>
                    <span className="logo-text">AttendEase</span>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <span className="nav-section-title">Main Menu</span>
                        {getNavItems().map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.exact}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <item.icon className="nav-item-icon" />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    <div className="nav-section">
                        <span className="nav-section-title">Quick Actions</span>
                        <NavLink to="/kiosk" className="nav-item">
                            <FiMonitor className="nav-item-icon" />
                            <span>Kiosk Mode</span>
                        </NavLink>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-card">
                        <div className="avatar">
                            {getDisplayInitials()}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{getDisplayName()}</div>
                            <div className="user-role">
                                {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? 'Administrator' :
                                    user?.role === 'STAFF_ADMIN' ? 'Staff Admin' : 'Employee'}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-ghost logout-btn">
                        <FiLogOut /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${!sidebarOpen ? 'main-content-full' : ''}`}>
                {/* Header */}
                <header className="main-header">
                    <div className="header-left">
                        <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <FiX /> : <FiMenu />}
                        </button>
                    </div>

                    <div className="header-right">
                        <button
                            className="btn btn-icon btn-ghost"
                            onClick={toggleTheme}
                            title="Toggle theme"
                        >
                            {darkMode ? <FiSun /> : <FiMoon />}
                        </button>

                        <button
                            className="btn btn-icon btn-ghost notification-btn"
                            onClick={() => navigate(isSuperAdmin() ? '/admin/notifications' : isAdmin() ? '/hr/notifications' : '/employee/notifications')}
                        >
                            <FiBell />
                            {notificationCount > 0 && (
                                <span className="notification-badge">{notificationCount}</span>
                            )}
                        </button>

                        <div
                            className="avatar avatar-sm"
                            onClick={() => navigate(isSuperAdmin() ? '/admin/profile' : isAdmin() ? '/hr/profile' : '/employee/profile')}
                            style={{ cursor: 'pointer' }}
                            title="My Profile"
                        >
                            {getDisplayInitials()}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="page-content">
                    <Outlet />
                </div>
            </main>

            <style>{`
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        
        .sidebar-nav::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .sidebar-footer {
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          margin-top: auto;
          flex-shrink: 0;
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        .logout-btn {
          width: 100%;
          justify-content: center;
          color: var(--error);
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          margin-bottom: 1rem;
        }

        .header-left, .header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .notification-btn {
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          background: var(--error);
          color: white;
          font-size: 0.625rem;
          font-weight: 600;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-content {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

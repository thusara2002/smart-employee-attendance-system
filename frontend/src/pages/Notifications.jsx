import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { FiBell, FiCheck, FiTrash2, FiInfo } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { success, error } = useToast();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await notificationAPI.getAll();
            setNotifications(res.data);
        } catch (err) {
            error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            success('All notifications marked as read');
            fetchNotifications();
        } catch (err) {
            error('Failed to mark all as read');
        }
    };

    return (
        <div className="notifications-page">
            <div className="page-header">
                <div className="flex justify-between items-center w-full">
                    <div>
                        <h1 className="page-title">Notifications</h1>
                        <p className="page-subtitle">Stay updated with the latest system alerts</p>
                    </div>
                    {notifications.length > 0 && (
                        <button className="btn btn-ghost" onClick={markAllRead}>
                            <FiCheck /> Mark all as read
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="text-center py-10"><div className="spinner"></div></div>
                ) : notifications.length > 0 ? (
                    <div className="notification-list">
                        {notifications.map((n) => (
                            <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                                <div className="notification-icon">
                                    <FiInfo />
                                </div>
                                <div className="notification-body">
                                    <h4 className="notification-title">{n.title}</h4>
                                    <p className="notification-text">{n.message}</p>
                                    <span className="notification-time">{new Date(n.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state py-10 text-center">
                        <FiBell style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <p>No notifications yet</p>
                    </div>
                )}
            </div>

            <style>{`
                .notification-list { display: flex; flex-direction: column; gap: 0.5rem; }
                .notification-item { display: flex; gap: 1rem; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); }
                .notification-item.unread { background: var(--bg-secondary); border-left: 4px solid var(--primary-color); }
                .notification-icon { color: var(--primary-color); font-size: 1.25rem; }
                .notification-title { margin: 0 0 0.25rem 0; font-size: 1rem; font-weight: 600; }
                .notification-text { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary); }
                .notification-time { font-size: 0.75rem; color: var(--text-muted); }
            `}</style>
        </div>
    );
}

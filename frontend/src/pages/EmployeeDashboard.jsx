import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, leaveAPI } from '../services/api';
import { FiClock, FiCalendar, FiCheckCircle, FiXCircle, FiPlus } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function EmployeeDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [recentAttendance, setRecentAttendance] = useState([]);
    const [myLeaves, setMyLeaves] = useState([]);
    const { success, error } = useToast();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [todayRes, attRes, leavesRes] = await Promise.all([
                attendanceAPI.getMyToday(),
                attendanceAPI.getRecent(user?.employeeId, 7),
                leaveAPI.getMyRecentLeaves(5)
            ]);
            setTodayAttendance(todayRes.data);
            setRecentAttendance(attRes.data);
            setMyLeaves(leavesRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const formatTime = (dateTime) => dateTime ? new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div className="employee-dashboard">
            <div className="page-header">
                <h1 className="page-title">Welcome, {user?.firstName}!</h1>
                <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="grid grid-2 mb-6">
                <div className="card">
                    <h3 className="card-title mb-4"><FiClock /> Today's Status</h3>
                    {todayAttendance ? (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`badge ${todayAttendance.status === 'PRESENT' ? 'badge-success' : todayAttendance.status === 'LATE' ? 'badge-warning' : 'badge-error'}`}>
                                    {todayAttendance.status}
                                </span>
                            </div>
                            <p><strong>Check In:</strong> {formatTime(todayAttendance.checkIn)}</p>
                            <p><strong>Check Out:</strong> {formatTime(todayAttendance.checkOut)}</p>
                            {todayAttendance.workingHours && <p><strong>Working Hours:</strong> {todayAttendance.workingHours.toFixed(1)} hrs</p>}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <FiXCircle style={{ fontSize: '2rem', color: 'var(--error)', marginBottom: '1rem' }} />
                            <p>You haven't checked in today</p>
                            <a href="/kiosk" className="btn btn-primary mt-4">Go to Kiosk</a>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 className="card-title mb-4"><FiCalendar /> Leave Balance</h3>
                    <div className="grid grid-2">
                        <div className="stat-item"><div className="stat-value">12</div><div className="stat-label">Annual</div></div>
                        <div className="stat-item"><div className="stat-value">6</div><div className="stat-label">Sick</div></div>
                        <div className="stat-item"><div className="stat-value">3</div><div className="stat-label">Casual</div></div>
                        <div className="stat-item"><div className="stat-value">{myLeaves.filter(l => l.status === 'PENDING').length}</div><div className="stat-label">Pending</div></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <h3 className="card-title mb-4">Recent Attendance</h3>
                    {recentAttendance.length > 0 ? (
                        <table className="table">
                            <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Status</th></tr></thead>
                            <tbody>
                                {recentAttendance.map(a => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.date).toLocaleDateString()}</td>
                                        <td>{formatTime(a.checkIn)}</td>
                                        <td>{formatTime(a.checkOut)}</td>
                                        <td><span className={`badge badge-${a.status === 'PRESENT' ? 'success' : a.status === 'LATE' ? 'warning' : 'error'}`}>{a.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="text-muted text-center">No records</p>}
                </div>

                <div className="card">
                    <h3 className="card-title mb-4">My Leave Requests</h3>
                    {myLeaves.length > 0 ? (
                        <div className="leave-list">
                            {myLeaves.map(l => (
                                <div key={l.id} className="leave-item">
                                    <div>
                                        <div className="font-medium">{l.leaveType}</div>
                                        <div className="text-sm text-muted">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</div>
                                    </div>
                                    <span className={`badge badge-${l.status === 'APPROVED' ? 'success' : l.status === 'PENDING' ? 'warning' : 'error'}`}>{l.status}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-muted text-center">No leave requests</p>}
                </div>
            </div>

            <style>{`
        .stat-item { text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); }
        .stat-item .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
        .stat-item .stat-label { color: var(--text-muted); font-size: 0.75rem; }
        .leave-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .leave-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--radius-lg); }
      `}</style>
        </div>
    );
}

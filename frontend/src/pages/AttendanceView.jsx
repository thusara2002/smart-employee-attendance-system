import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { attendanceAPI } from '../services/api';
import { FiCalendar, FiSearch, FiFilter } from 'react-icons/fi';

export default function AttendanceView() {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const { error } = useToast();

    useEffect(() => { fetchAttendance(); }, [date]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const response = await attendanceAPI.getByDate(date);
            setAttendance(response.data);
        } catch (err) { error('Failed to fetch attendance'); }
        finally { setLoading(false); }
    };

    const formatTime = (dt) => dt ? new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

    const filtered = attendance.filter(a =>
        `${a.employeeName} ${a.employeeId} ${a.department}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => ({
        PRESENT: 'badge-success', LATE: 'badge-warning', ABSENT: 'badge-error', ON_LEAVE: 'badge-info'
    }[status] || 'badge-primary');

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div className="attendance-view">
            <div className="page-header">
                <h1 className="page-title">Attendance Records</h1>
                <p className="page-subtitle">View and manage daily attendance</p>
            </div>

            <div className="card mb-6">
                <div className="flex gap-4 items-end flex-wrap">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Date</label>
                        <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                        <label className="form-label">Search</label>
                        <input type="text" className="form-input" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr><th>Employee</th><th>Check In</th><th>Check Out</th><th>Type</th><th>Status</th><th>Hours</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map(a => (
                                <tr key={a.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="avatar avatar-sm">{a.employeeName?.split(' ').map(n => n[0]).join('')}</div>
                                            <div><div className="font-medium">{a.employeeName}</div><div className="text-sm text-muted">{a.employeeId}</div></div>
                                        </div>
                                    </td>
                                    <td>{formatTime(a.checkIn)}</td>
                                    <td>{formatTime(a.checkOut)}</td>
                                    <td><span className="badge badge-primary">{a.type}</span></td>
                                    <td><span className={`badge ${getStatusBadge(a.status)}`}>{a.status}</span></td>
                                    <td>{a.workingHours?.toFixed(1) || '-'} hrs</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon"><FiCalendar /></div>
                        <h3 className="empty-state-title">No records found</h3>
                        <p className="empty-state-description">No attendance records for this date</p>
                    </div>
                )}
            </div>
        </div>
    );
}

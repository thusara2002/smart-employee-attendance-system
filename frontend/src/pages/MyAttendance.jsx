import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, reportAPI } from '../services/api';
import { FiCalendar, FiClock, FiSearch, FiFilter, FiDownload } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function MyAttendance() {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const { error, success } = useToast();

    useEffect(() => {
        if (user?.employeeId) {
            fetchAttendance();
        } else if (user !== null) {
            // User is loaded but has no employeeId (e.g., admin users)
            setLoading(false);
        }
    }, [user?.employeeId, user]);

    const fetchAttendance = async () => {
        if (!user?.employeeId) return;
        setLoading(true);
        try {
            const res = await attendanceAPI.getEmployeeAttendanceByRange(user.employeeId, startDate, endDate);
            // Reverse so latest is first
            const sortedRecords = [...res.data].sort((a, b) => new Date(b.date) - new Date(a.date));
            setAttendance(sortedRecords);
        } catch (err) {
            error('Failed to fetch attendance history');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!user?.employeeId) return;
        try {
            const response = await reportAPI.downloadEmployeeExcel(user.employeeId, startDate, endDate);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `my_attendance_${startDate}_to_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            success('Attendance report exported successfully');
        } catch (err) {
            error('Failed to export report');
        }
    };

    const formatTime = (dateTime) => dateTime ? new Date(dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

    return (
        <div className="my-attendance">
            <div className="page-header">
                <h1 className="page-title">My Attendance History</h1>
                <p className="page-subtitle">View your past attendance records</p>
            </div>

            <div className="card">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="card-title">Attendance Log</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted">From:</label>
                            <input
                                type="date"
                                className="form-input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted">To:</label>
                            <input
                                type="date"
                                className="form-input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={fetchAttendance}>
                            <FiFilter className="mr-1" /> Filter
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                            <FiDownload className="mr-1" /> Export Excel
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10"><div className="spinner"></div></div>
                ) : !user?.employeeId ? (
                    <div className="empty-state py-10 text-center">
                        <FiCalendar style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <p>You don't have an employee profile linked to your account</p>
                        <p className="text-sm text-muted mt-2">Please contact your administrator if you believe this is an error.</p>
                    </div>
                ) : attendance.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Status</th>
                                    <th>Hours</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.map((record) => (
                                    <tr key={record.id}>
                                        <td>{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                        <td>{formatTime(record.checkIn)}</td>
                                        <td>{formatTime(record.checkOut)}</td>
                                        <td>
                                            <span className={`badge badge-${record.status === 'PRESENT' ? 'success' : record.status === 'LATE' ? 'warning' : 'error'}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td>{record.workingHours ? `${record.workingHours.toFixed(1)} hrs` : '-'}</td>
                                        <td>
                                            <div className="text-xs text-muted">
                                                In: {record.checkInType?.replace('_', ' ')}
                                                {record.checkOutType && <br />}
                                                {record.checkOutType && `Out: ${record.checkOutType?.replace('_', ' ')}`}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state py-10 text-center">
                        <FiCalendar style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <p>No attendance records found for this period</p>
                    </div>
                )}
            </div>
        </div>
    );
}

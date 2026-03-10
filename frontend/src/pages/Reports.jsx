import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { reportAPI } from '../services/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiDownload, FiCalendar } from 'react-icons/fi';

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState('daily');
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [reportData, setReportData] = useState(null);
    const { success, error } = useToast();
    const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

    useEffect(() => { fetchReport(); }, [reportType]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = reportType === 'daily' ? await reportAPI.getDaily()
                : reportType === 'weekly' ? await reportAPI.getWeekly()
                    : await reportAPI.getMonthly();
            setReportData(response.data);
        } catch (err) { error('Failed to fetch report'); }
        finally { setLoading(false); }
    };

    const handleDownload = async () => {
        try {
            const response = await reportAPI.download(dateRange.startDate, dateRange.endDate);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_${dateRange.startDate}_${dateRange.endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            success('CSV Report downloaded');
        } catch (err) { error('Download failed'); }
    };

    const handleDownloadExcel = async () => {
        try {
            const response = await reportAPI.downloadExcel(dateRange.startDate, dateRange.endDate);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_${dateRange.startDate}_${dateRange.endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            success('Excel Report downloaded');
        } catch (err) { error('Download failed'); }
    };

    const getPieData = () => reportData?.summary ? [
        { name: 'Present', value: reportData.summary.present || 0 },
        { name: 'Absent', value: reportData.summary.absent || 0 },
        { name: 'Late', value: reportData.summary.late || 0 },
        { name: 'Leave', value: reportData.summary.onLeave || 0 }
    ] : [];

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div className="reports-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports & Analytics</h1>
                    <p className="page-subtitle">View attendance statistics and download reports</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-secondary" onClick={handleDownload}><FiDownload /> CSV</button>
                    <button className="btn btn-primary" onClick={handleDownloadExcel}><FiDownload /> Excel</button>
                </div>
            </div>

            <div className="tabs">
                {['daily', 'weekly', 'monthly'].map((t) => (
                    <button key={t} className={`tab ${reportType === t ? 'active' : ''}`} onClick={() => setReportType(t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            <div className="card mb-6">
                <div className="flex gap-4 items-end">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Start</label>
                        <input type="date" className="form-input" value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">End</label>
                        <input type="date" className="form-input" value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
                    </div>
                    <button className="btn btn-secondary" onClick={handleDownload}><FiDownload /> CSV</button>
                    <button className="btn btn-primary" onClick={handleDownloadExcel}><FiDownload /> Excel</button>
                </div>
            </div>

            <div className="grid grid-2 mb-6">
                <div className="card">
                    <h3 className="card-title mb-4">Attendance Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={getPieData()} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                                {getPieData().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip /><Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <h3 className="card-title mb-4">Summary</h3>
                    <div className="stats-grid">
                        <div className="stat-item"><div className="stat-value">{reportData?.summary?.totalEmployees || 0}</div><div className="stat-label">Total</div></div>
                        <div className="stat-item"><div className="stat-value" style={{ color: 'var(--success)' }}>{reportData?.summary?.present || 0}</div><div className="stat-label">Present</div></div>
                        <div className="stat-item"><div className="stat-value" style={{ color: 'var(--error)' }}>{reportData?.summary?.absent || 0}</div><div className="stat-label">Absent</div></div>
                        <div className="stat-item"><div className="stat-value" style={{ color: 'var(--warning)' }}>{reportData?.summary?.late || 0}</div><div className="stat-label">Late</div></div>
                    </div>
                </div>
            </div>

            <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .stat-item { text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); }
        .stat-item .stat-value { font-size: 1.5rem; font-weight: 700; }
        .stat-item .stat-label { color: var(--text-muted); font-size: 0.875rem; }
      `}</style>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import { FiFileText, FiPlus, FiCalendar, FiClock } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function MyLeaves() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const { success, error } = useToast();
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        leaveType: 'ANNUAL',
        reason: ''
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const res = await leaveAPI.getMyLeaves();
            setLeaves(res.data.reverse());
        } catch (err) {
            error('Failed to fetch leave requests');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestLeave = async (e) => {
        e.preventDefault();
        try {
            await leaveAPI.request(formData);
            success('Leave request submitted successfully');
            setShowModal(false);
            setFormData({ startDate: '', endDate: '', leaveType: 'ANNUAL', reason: '' });
            fetchLeaves();
        } catch (err) {
            error(err.response?.data?.error || 'Failed to submit leave request');
        }
    };

    return (
        <div className="my-leaves">
            <div className="page-header">
                <div className="flex justify-between items-center w-full">
                    <div>
                        <h1 className="page-title">My Leave Requests</h1>
                        <p className="page-subtitle">Track and submit your leave applications</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <FiPlus /> Request Leave
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="text-center py-10"><div className="spinner"></div></div>
                ) : leaves.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Applied On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.map((leave) => (
                                    <tr key={leave.id}>
                                        <td><strong>{leave.leaveType}</strong></td>
                                        <td>
                                            <div className="text-sm">
                                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td><div className="text-sm max-w-xs truncate" title={leave.reason}>{leave.reason}</div></td>
                                        <td>
                                            <span className={`badge badge-${leave.status === 'APPROVED' ? 'success' : leave.status === 'PENDING' ? 'warning' : 'error'}`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td>{new Date(leave.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state py-10 text-center">
                        <FiFileText style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem' }} />
                        <p>No leave requests found</p>
                    </div>
                )}
            </div>

            {/* Request Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Request Leave</h3>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleRequestLeave}>
                            <div className="form-group mb-4">
                                <label className="form-label">Leave Type</label>
                                <select
                                    className="form-input"
                                    value={formData.leaveType}
                                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                    required
                                >
                                    <option value="ANNUAL">Annual Leave</option>
                                    <option value="SICK">Sick Leave</option>
                                    <option value="CASUAL">Casual Leave</option>
                                    <option value="MATERNITY">Maternity Leave</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="grid grid-2 mb-4">
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group mb-6">
                                <label className="form-label">Reason</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Explain your reason for leave..."
                                    required
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { leaveAPI } from '../services/api';
import { FiCheck, FiX, FiClock, FiCalendar, FiFilter } from 'react-icons/fi';

export default function LeaveManagement() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
    const [showModal, setShowModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [actionType, setActionType] = useState(''); // approve, reject
    const [comments, setComments] = useState('');
    const { success, error } = useToast();

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const response = await leaveAPI.getAll();
            setLeaves(response.data);
        } catch (err) {
            error('Failed to fetch leave requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedLeave || !actionType) return;

        try {
            if (actionType === 'approve') {
                await leaveAPI.approve(selectedLeave.id, comments);
                success('Leave request approved');
            } else {
                if (!comments) {
                    error('Please provide a reason for rejection');
                    return;
                }
                await leaveAPI.reject(selectedLeave.id, comments);
                success('Leave request rejected');
            }
            setShowModal(false);
            setSelectedLeave(null);
            setComments('');
            fetchLeaves();
        } catch (err) {
            error(err.response?.data?.error || 'Action failed');
        }
    };

    const openActionModal = (leave, action) => {
        setSelectedLeave(leave);
        setActionType(action);
        setComments('');
        setShowModal(true);
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: 'badge-warning',
            APPROVED: 'badge-success',
            REJECTED: 'badge-error',
            CANCELLED: 'badge-secondary'
        };
        return badges[status] || 'badge-primary';
    };

    const getLeaveTypeBadge = (type) => {
        const badges = {
            CASUAL: 'badge-primary',
            SICK: 'badge-error',
            ANNUAL: 'badge-success',
            UNPAID: 'badge-warning',
            MATERNITY: 'badge-info',
            PATERNITY: 'badge-info',
            OTHER: 'badge-secondary'
        };
        return badges[type] || 'badge-primary';
    };

    const filteredLeaves = leaves.filter(leave => {
        if (filter === 'all') return true;
        return leave.status === filter.toUpperCase();
    });

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="leave-management">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Leave Requests</h1>
                    <p className="page-subtitle">Manage employee leave requests</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-4 mb-6">
                <div className="stat-card" onClick={() => setFilter('pending')}>
                    <div className="stat-icon warning">
                        <FiClock />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {leaves.filter(l => l.status === 'PENDING').length}
                        </div>
                        <div className="stat-label">Pending</div>
                    </div>
                </div>

                <div className="stat-card" onClick={() => setFilter('approved')}>
                    <div className="stat-icon success">
                        <FiCheck />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {leaves.filter(l => l.status === 'APPROVED').length}
                        </div>
                        <div className="stat-label">Approved</div>
                    </div>
                </div>

                <div className="stat-card" onClick={() => setFilter('rejected')}>
                    <div className="stat-icon error">
                        <FiX />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {leaves.filter(l => l.status === 'REJECTED').length}
                        </div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>

                <div className="stat-card" onClick={() => setFilter('all')}>
                    <div className="stat-icon primary">
                        <FiCalendar />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{leaves.length}</div>
                        <div className="stat-label">Total Requests</div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="tabs">
                {['all', 'pending', 'approved', 'rejected'].map((f) => (
                    <button
                        key={f}
                        className={`tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Leave Requests Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Type</th>
                                <th>Duration</th>
                                <th>Dates</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeaves.map((leave) => (
                                <tr key={leave.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="avatar avatar-sm">
                                                {leave.employeeName?.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="font-medium">{leave.employeeName}</div>
                                                <div className="text-sm text-muted">{leave.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${getLeaveTypeBadge(leave.leaveType)}`}>
                                            {leave.leaveType}
                                        </span>
                                    </td>
                                    <td>{leave.days} day{leave.days > 1 ? 's' : ''}</td>
                                    <td>
                                        <div className="text-sm">
                                            {new Date(leave.startDate).toLocaleDateString()} -
                                            <br />
                                            {new Date(leave.endDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="text-sm" style={{ maxWidth: '200px' }}>
                                            {leave.reason?.substring(0, 50)}
                                            {leave.reason?.length > 50 && '...'}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(leave.status)}`}>
                                            {leave.status}
                                        </span>
                                    </td>
                                    <td>
                                        {leave.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => openActionModal(leave, 'approve')}
                                                >
                                                    <FiCheck /> Approve
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => openActionModal(leave, 'reject')}
                                                >
                                                    <FiX /> Reject
                                                </button>
                                            </div>
                                        )}
                                        {leave.status !== 'PENDING' && leave.approvedBy && (
                                            <div className="text-sm text-muted">
                                                By: {leave.approvedBy}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredLeaves.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <FiCalendar />
                        </div>
                        <h3 className="empty-state-title">No leave requests</h3>
                        <p className="empty-state-description">
                            No leave requests found for the selected filter.
                        </p>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {showModal && selectedLeave && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {actionType === 'approve' ? 'Approve Leave' : 'Reject Leave'}
                            </h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p><strong>Employee:</strong> {selectedLeave.employeeName}</p>
                            <p><strong>Type:</strong> {selectedLeave.leaveType}</p>
                            <p><strong>Duration:</strong> {selectedLeave.days} day(s)</p>
                            <p><strong>Period:</strong> {new Date(selectedLeave.startDate).toLocaleDateString()} - {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                            <p><strong>Reason:</strong> {selectedLeave.reason}</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {actionType === 'approve' ? 'Comments (optional)' : 'Reason for rejection *'}
                            </label>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder={actionType === 'approve' ? 'Add any comments...' : 'Please provide a reason...'}
                                required={actionType === 'reject'}
                            />
                        </div>

                        <div className="flex justify-between mt-6">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button
                                className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                                onClick={handleAction}
                            >
                                {actionType === 'approve' ? 'Approve Leave' : 'Reject Leave'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .stat-card {
          cursor: pointer;
        }

        .stat-card:hover {
          border-color: var(--primary);
        }
      `}</style>
        </div>
    );
}

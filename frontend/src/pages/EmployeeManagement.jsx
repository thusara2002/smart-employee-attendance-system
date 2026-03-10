import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { employeeAPI, authAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import FaceRegistration from '../components/FaceRegistration';
import {
    FiPlus, FiEdit, FiTrash2, FiSearch,
    FiCamera, FiDownload, FiX, FiUser, FiUserPlus, FiImage
} from 'react-icons/fi';

export default function EmployeeManagement() {
    const { user, isSuperAdmin } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showFaceModal, setShowFaceModal] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [faceRegLoading, setFaceRegLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        department: '',
        designation: '',
        role: 'EMPLOYEE'
    });
    const [staffFormData, setStaffFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        department: '',
        designation: '',
        role: 'EMPLOYEE'
    });
    const { success, error } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const empRes = await employeeAPI.getActive();
            setEmployees(empRes.data || []);
        } catch (err) {
            error('Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedEmployee) {
                await employeeAPI.update(selectedEmployee.id, formData);
                success('Employee updated successfully');
            } else {
                await employeeAPI.create(formData);
                success('Employee created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Operation failed';
            error(errorMessage);
        }
    };

    const handleStaffSubmit = async (e) => {
        e.preventDefault();
        try {
            await authAPI.createStaff(staffFormData);
            success('Account created successfully');
            setShowStaffModal(false);
            resetStaffForm();
            fetchData();
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to create account';
            error(errorMessage);
        }
    };

    const resetStaffForm = () => {
        setStaffFormData({
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            phone: '',
            department: '',
            designation: '',
            role: 'EMPLOYEE'
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        try {
            await employeeAPI.delete(id);
            success('Employee deleted successfully');
            fetchData();
        } catch (err) {
            error(err.response?.data?.error || 'Failed to delete employee');
        }
    };

    const openEditModal = (employee) => {
        setSelectedEmployee(employee);
        setFormData({
            firstName: employee.firstName,
            lastName: employee.lastName,
            phone: employee.phone || '',
            department: employee.department || '',
            designation: employee.designation || '',
            active: employee.active,
            role: employee.role || 'EMPLOYEE'
        });
        setShowModal(true);
    };

    const openAddModal = () => {
        setSelectedEmployee(null);
        resetForm();
        setShowModal(true);
    };

    const openQRModal = (employee) => {
        setSelectedEmployee(employee);
        setShowQRModal(true);
    };

    const openFaceModal = (employee) => {
        setSelectedEmployee(employee);
        setShowFaceModal(true);
    };

    const openPhotoModal = (employee) => {
        setSelectedEmployee(employee);
        setPhotoPreview(employee.profileImage || null);
        setShowPhotoModal(true);
    };

    const compressImage = (file, maxSizeKB = 100) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    const maxDim = 300;
                    if (width > maxDim || height > maxDim) {
                        const ratio = Math.min(maxDim / width, maxDim / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    let quality = 0.8;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    while (dataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(dataUrl);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const compressed = await compressImage(file);
        setPhotoPreview(compressed);
    };

    const handlePhotoUpload = async () => {
        if (!photoPreview || !selectedEmployee) return;
        setPhotoUploading(true);
        try {
            await employeeAPI.uploadProfileImage(selectedEmployee.id, photoPreview);
            success('Profile picture updated successfully');
            setShowPhotoModal(false);
            fetchData();
        } catch (err) {
            error(err.response?.data?.error || 'Failed to upload profile picture');
        } finally {
            setPhotoUploading(false);
        }
    };

    const handleFaceRegistration = async (faceData) => {
        setFaceRegLoading(true);
        try {
            await employeeAPI.registerFace(selectedEmployee.employeeId, {
                primaryDescriptor: faceData.primaryDescriptor,
                allDescriptors: faceData.allDescriptors,
                captureCount: faceData.captureCount
            });
            success('Face registered successfully!');
            setShowFaceModal(false);
            fetchData();
        } catch (err) {
            error(err.response?.data?.error || 'Failed to register face');
        } finally {
            setFaceRegLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            employeeId: '',
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            phone: '',
            department: '',
            designation: '',
            role: 'EMPLOYEE'
        });
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.employeeId} ${emp.department}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="employee-management">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Employee Management</h1>
                    <p className="page-subtitle">Manage all employees in the organization</p>
                </div>
                <div className="flex gap-3">
                    {isSuperAdmin() && (
                        <button className="btn btn-primary" onClick={() => setShowStaffModal(true)}>
                            <FiUserPlus /> Create Staff Admin
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={openAddModal}>
                        <FiPlus /> Add Employee (Legacy)
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="card mb-6">
                <div className="search-bar">
                    <div className="search-input-wrapper">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            className="form-input search-input"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Employee Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Employee ID</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Face</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            {emp.profileImage ? (
                                                <img
                                                    src={emp.profileImage}
                                                    alt={`${emp.firstName} ${emp.lastName}`}
                                                    className="avatar"
                                                    style={{ objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div className="avatar">
                                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                                                <div className="text-sm text-muted">{emp.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{emp.employeeId}</td>
                                    <td>{emp.department || '-'}</td>
                                    <td>{emp.designation || '-'}</td>
                                    <td>
                                        <span className={`badge ${emp.faceRegistered ? 'badge-success' : 'badge-warning'}`}>
                                            {emp.faceRegistered ? 'Registered' : 'Pending'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${emp.active ? 'badge-success' : 'badge-error'}`}>
                                            {emp.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => openPhotoModal(emp)}
                                                title={emp.profileImage ? "Change Profile Picture" : "Upload Profile Picture"}
                                                style={{ color: emp.profileImage ? 'var(--primary)' : 'var(--text-muted)' }}
                                            >
                                                <FiImage />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => openFaceModal(emp)}
                                                title={emp.faceRegistered ? "Re-register Face" : "Register Face"}
                                                style={{ color: emp.faceRegistered ? 'var(--success)' : 'var(--warning)' }}
                                            >
                                                <FiCamera />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => openQRModal(emp)}
                                                title="View QR Code"
                                            >
                                                <FiDownload />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => openEditModal(emp)}
                                                title="Edit"
                                            >
                                                <FiEdit />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => handleDelete(emp.id)}
                                                title="Delete"
                                                style={{ color: 'var(--error)' }}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredEmployees.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <FiUser />
                        </div>
                        <h3 className="empty-state-title">No employees found</h3>
                        <p className="empty-state-description">
                            {searchTerm ? 'Try adjusting your search terms' : 'Add your first employee to get started'}
                        </p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {selectedEmployee ? 'Edit Employee' : 'Add Employee'}
                            </h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-2">
                                {!selectedEmployee && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Employee ID</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value="Auto-generated"
                                                disabled
                                                style={{ backgroundColor: '#f5f5f5', color: '#888' }}
                                            />
                                            <small style={{ color: '#666', fontSize: '0.8rem' }}>ID will be auto-generated by the system</small>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Email *</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Password *</label>
                                            <input
                                                type="password"
                                                className="form-input"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Designation</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <select
                                        className="form-input"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        required
                                    >
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="STAFF_ADMIN">Staff Admin</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>

                            </div>

                            <div className="flex justify-between mt-6">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {selectedEmployee ? 'Update Employee' : 'Create Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && selectedEmployee && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Employee QR Code</h2>
                            <button className="modal-close" onClick={() => setShowQRModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="text-center">
                            <div className="qr-container">
                                <QRCodeSVG
                                    value={selectedEmployee.qrCode}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <h3 className="mt-4 font-semibold">
                                {selectedEmployee.firstName} {selectedEmployee.lastName}
                            </h3>
                            <p className="text-muted">{selectedEmployee.employeeId}</p>
                            <p className="text-sm text-muted mt-2">
                                Scan this QR code to mark attendance
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Face Registration Modal */}
            {showFaceModal && selectedEmployee && (
                <div className="modal-overlay" onClick={() => !faceRegLoading && setShowFaceModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <FaceRegistration
                            employee={selectedEmployee}
                            onComplete={handleFaceRegistration}
                            onCancel={() => setShowFaceModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Staff Creation Modal */}
            {showStaffModal && (
                <div className="modal-overlay" onClick={() => setShowStaffModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create Staff Admin</h2>
                            <button className="modal-close" onClick={() => setShowStaffModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        <form onSubmit={handleStaffSubmit}>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">Staff ID</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value="Auto-generated"
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5', color: '#888' }}
                                    />
                                    <small style={{ color: '#666', fontSize: '0.8rem' }}>ID will be auto-generated by the system</small>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={staffFormData.email}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={staffFormData.password}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={staffFormData.firstName}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, firstName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={staffFormData.lastName}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, lastName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={staffFormData.phone}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={staffFormData.department}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Designation</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={staffFormData.designation}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, designation: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <select
                                        className="form-input"
                                        value={staffFormData.role}
                                        onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                                        required
                                    >
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="STAFF_ADMIN">Staff Admin</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-between mt-6">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowStaffModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Staff Admin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Profile Picture Upload Modal */}
            {showPhotoModal && selectedEmployee && (
                <div className="modal-overlay" onClick={() => !photoUploading && setShowPhotoModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Profile Picture</h2>
                            <button className="modal-close" onClick={() => !photoUploading && setShowPhotoModal(false)}>
                                <FiX />
                            </button>
                        </div>

                        <div className="text-center">
                            <div className="photo-preview-container">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="photo-preview" />
                                ) : (
                                    <div className="photo-placeholder">
                                        <FiUser style={{ fontSize: '3rem', color: 'var(--text-muted)' }} />
                                        <p className="text-muted mt-2">No photo uploaded</p>
                                    </div>
                                )}
                            </div>

                            <h3 className="mt-4 font-semibold">
                                {selectedEmployee.firstName} {selectedEmployee.lastName}
                            </h3>
                            <p className="text-muted">{selectedEmployee.employeeId}</p>

                            <div className="flex gap-3 justify-center mt-6">
                                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                    <FiImage /> Choose Photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoSelect}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                                <button
                                    className="btn btn-primary"
                                    onClick={handlePhotoUpload}
                                    disabled={!photoPreview || photoUploading}
                                >
                                    {photoUploading ? 'Uploading...' : 'Save Photo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .search-bar {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .search-input-wrapper {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input {
          padding-left: 2.75rem;
        }

        .qr-container {
          background: white;
          padding: 1rem;
          border-radius: var(--radius-lg);
          display: inline-block;
        }

        .photo-preview-container {
          width: 180px;
          height: 180px;
          margin: 0 auto;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
        }

        .photo-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
      `}</style>
        </div>
    );
}

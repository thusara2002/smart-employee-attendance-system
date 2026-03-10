import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, employeeAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiLock, FiDownload } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';

export default function Profile() {
    const { user, isEmployee } = useAuth();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [qrData, setQrData] = useState(null);
    const qrRef = useRef(null);
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
        department: user?.department || '',
        designation: user?.designation || ''
    });

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (isEmployee()) {
            fetchQRCode();
        }
    }, []);

    const fetchQRCode = async () => {
        try {
            const res = await employeeAPI.getMyQR();
            setQrData(res.data);
        } catch (err) {
            console.error('Failed to fetch QR code:', err);
        }
    };

    const downloadQR = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        // Make the downloaded image larger and higher quality
        const scale = 3;
        const size = 200 * scale;
        canvas.width = size + 80;
        canvas.height = size + 160;

        img.onload = () => {
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw QR code
            ctx.drawImage(img, 40, 30, size, size);

            // Draw employee info below QR
            ctx.fillStyle = '#333333';
            ctx.font = `bold ${16 * scale / 2}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(
                `${qrData.firstName} ${qrData.lastName}`,
                canvas.width / 2,
                size + 60
            );

            ctx.fillStyle = '#666666';
            ctx.font = `${14 * scale / 2}px Arial`;
            ctx.fillText(qrData.employeeId, canvas.width / 2, size + 85);

            ctx.fillStyle = '#999999';
            ctx.font = `${11 * scale / 2}px Arial`;
            ctx.fillText('Scan for Attendance', canvas.width / 2, size + 110);

            // Trigger download
            const link = document.createElement('a');
            link.download = `QR_${qrData.employeeId}_${qrData.firstName}_${qrData.lastName}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authAPI.updateProfile(profileData);
            success('Profile updated successfully');
        } catch (err) {
            error(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return error('Passwords do not match');
        }
        setLoading(true);
        try {
            await authAPI.changePassword({
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            success('Password changed successfully');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            error(err.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="page-header">
                <h1 className="page-title">Account Profile</h1>
                <p className="page-subtitle">Manage your personal information and security</p>
            </div>

            <div className="grid grid-2">
                {/* Profile Details */}
                <div className="card">
                    <h3 className="card-title mb-4"><FiUser /> Personal Information</h3>
                    <form onSubmit={updateProfile}>
                        <div className="grid grid-2 mb-4">
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input type="text" name="firstName" className="form-input"
                                    value={profileData.firstName} onChange={handleProfileChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input type="text" name="lastName" className="form-input"
                                    value={profileData.lastName} onChange={handleProfileChange} required />
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label"><FiMail /> Email Address</label>
                            <input type="email" className="form-input" value={user?.email} disabled />
                            <p className="text-xs text-muted mt-1">Email cannot be changed</p>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label"><FiPhone /> Phone Number</label>
                            <input type="text" name="phone" className="form-input"
                                value={profileData.phone} onChange={handleProfileChange} />
                        </div>

                        <div className="grid grid-2 mb-6">
                            <div className="form-group">
                                <label className="form-label"><FiBriefcase /> Department</label>
                                <input type="text" name="department" className="form-input"
                                    value={profileData.department} onChange={handleProfileChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Designation</label>
                                <input type="text" name="designation" className="form-input"
                                    value={profileData.designation} onChange={handleProfileChange} />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                            {loading ? 'Updating...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* Password Change */}
                <div className="card">
                    <h3 className="card-title mb-4"><FiLock /> Security</h3>
                    <form onSubmit={changePassword}>
                        <div className="form-group mb-4">
                            <label className="form-label">Current Password</label>
                            <input type="password" name="oldPassword" className="form-input"
                                value={passwordData.oldPassword} onChange={handlePasswordChange} required />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">New Password</label>
                            <input type="password" name="newPassword" className="form-input"
                                value={passwordData.newPassword} onChange={handlePasswordChange} required />
                        </div>
                        <div className="form-group mb-6">
                            <label className="form-label">Confirm New Password</label>
                            <input type="password" name="confirmPassword" className="form-input"
                                value={passwordData.confirmPassword} onChange={handlePasswordChange} required />
                        </div>
                        <button type="submit" className="btn btn-warning w-full" disabled={loading}>
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                </div>
            </div>

            {/* QR Code Section - Only for Employees */}
            {isEmployee() && qrData && (
                <div className="card mt-6">
                    <h3 className="card-title mb-4" style={{ textAlign: 'center' }}>
                        🔳 My Attendance QR Code
                    </h3>
                    <div className="qr-profile-section">
                        <div className="qr-profile-container" ref={qrRef}>
                            <div className="qr-profile-code">
                                <QRCodeSVG
                                    value={qrData.qrCode}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                    bgColor="#ffffff"
                                    fgColor="#1a1a2e"
                                />
                            </div>
                            <h3 className="mt-4 font-semibold">
                                {qrData.firstName} {qrData.lastName}
                            </h3>
                            <p className="text-muted">{qrData.employeeId}</p>
                            <p className="text-sm text-muted mt-1">
                                Scan this QR code at the kiosk to mark attendance
                            </p>
                        </div>
                        <button
                            className="btn btn-primary mt-4"
                            onClick={downloadQR}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <FiDownload /> Download QR Code
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .profile-page { max-width: 1000px; margin: 0 auto; }
                .form-group .form-label { display: flex; align-items: center; gap: 0.5rem; }
                .qr-profile-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 1.5rem 0;
                }
                .qr-profile-container {
                    text-align: center;
                }
                .qr-profile-code {
                    background: white;
                    padding: 1rem;
                    border-radius: var(--radius-lg);
                    display: inline-block;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    border: 2px solid var(--border);
                }
            `}</style>
        </div>
    );
}

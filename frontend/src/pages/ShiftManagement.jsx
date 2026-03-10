import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { shiftAPI } from '../services/api';
import { FiPlus, FiEdit, FiTrash2, FiClock, FiX } from 'react-icons/fi';

export default function ShiftManagement() {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [formData, setFormData] = useState({ name: '', startTime: '09:00', endTime: '17:00', gracePeriod: 15, workingDays: 'MON,TUE,WED,THU,FRI', breakHours: 1 });
    const { success, error } = useToast();

    useEffect(() => { fetchShifts(); }, []);

    const fetchShifts = async () => {
        try { const res = await shiftAPI.getAll(); setShifts(res.data); }
        catch (err) { error('Failed to fetch shifts'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Convert gracePeriod (minutes) to graceTime (HH:MM format) for backend
            const graceMinutes = parseInt(formData.gracePeriod) || 15;
            const graceHours = String(Math.floor(graceMinutes / 60)).padStart(2, '0');
            const graceMins = String(graceMinutes % 60).padStart(2, '0');
            const graceTime = `${graceHours}:${graceMins}`;

            // Convert working days string to bitmask (Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64)
            const dayMap = { MON: 1, TUE: 2, WED: 4, THU: 8, FRI: 16, SAT: 32, SUN: 64 };
            const workingDaysBitmask = formData.workingDays
                .split(',')
                .map(d => d.trim().toUpperCase())
                .filter(d => dayMap[d] !== undefined)
                .reduce((mask, d) => mask + dayMap[d], 0);

            const apiData = {
                name: formData.name,
                startTime: formData.startTime,
                endTime: formData.endTime,
                graceTime: graceTime,
                workingDays: workingDaysBitmask,
                breakHours: formData.breakHours
            };

            if (selectedShift) { await shiftAPI.update(selectedShift.id, apiData); success('Shift updated'); }
            else { await shiftAPI.create(apiData); success('Shift created'); }
            setShowModal(false); resetForm(); fetchShifts();
        } catch (err) { error(err.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this shift?')) return;
        try { await shiftAPI.delete(id); success('Shift deleted'); fetchShifts(); }
        catch (err) { error('Delete failed'); }
    };

    const dayMap = { MON: 1, TUE: 2, WED: 4, THU: 8, FRI: 16, SAT: 32, SUN: 64 };
    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const bitmaskToDays = (bitmask) => {
        if (!bitmask && bitmask !== 0) return '';
        return dayNames.filter((_, i) => bitmask & (1 << i)).join(',');
    };

    const graceTimeToMinutes = (graceTime) => {
        if (!graceTime) return 15;
        const parts = String(graceTime).split(':');
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    };

    const openEditModal = (shift) => {
        setSelectedShift(shift);
        setFormData({
            name: shift.name,
            startTime: shift.startTime?.substring(0, 5) || '09:00',
            endTime: shift.endTime?.substring(0, 5) || '17:00',
            gracePeriod: graceTimeToMinutes(shift.graceTime),
            workingDays: bitmaskToDays(shift.workingDays),
            breakHours: shift.breakHours
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setSelectedShift(null);
        setFormData({ name: '', startTime: '09:00', endTime: '17:00', gracePeriod: 15, workingDays: 'MON,TUE,WED,THU,FRI', breakHours: 1 });
    };

    if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

    return (
        <div className="shift-management">
            <div className="page-header">
                <div><h1 className="page-title">Shift Management</h1><p className="page-subtitle">Configure work shifts</p></div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}><FiPlus /> Add Shift</button>
            </div>

            <div className="grid grid-3">
                {shifts.map(shift => (
                    <div key={shift.id} className="card shift-card">
                        <div className="shift-header">
                            <div className="shift-icon"><FiClock /></div>
                            <div className="flex gap-2">
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(shift)}><FiEdit /></button>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(shift.id)} style={{ color: 'var(--error)' }}><FiTrash2 /></button>
                            </div>
                        </div>
                        <h3 className="shift-name">{shift.name}</h3>
                        <p className="shift-time">{shift.startTime?.substring(0, 5)} - {shift.endTime?.substring(0, 5)}</p>
                        <div className="shift-details">
                            <span>Grace: {graceTimeToMinutes(shift.graceTime)}min</span>
                            <span>Break: {shift.breakHours}hr</span>
                        </div>
                        <div className="shift-days">{bitmaskToDays(shift.workingDays).split(',').join(', ')}</div>
                        <span className={`badge ${shift.active ? 'badge-success' : 'badge-error'}`}>{shift.active ? 'Active' : 'Inactive'}</span>
                    </div>
                ))}
            </div>

            {shifts.length === 0 && (
                <div className="card"><div className="empty-state">
                    <div className="empty-state-icon"><FiClock /></div>
                    <h3 className="empty-state-title">No shifts</h3>
                    <p className="empty-state-description">Create your first shift</p>
                </div></div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{selectedShift ? 'Edit Shift' : 'Add Shift'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Name *</label>
                                <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group"><label className="form-label">Start Time</label>
                                    <input type="time" className="form-input" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                                </div>
                                <div className="form-group"><label className="form-label">End Time</label>
                                    <input type="time" className="form-input" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group"><label className="form-label">Grace (min)</label>
                                    <input type="number" className="form-input" value={formData.gracePeriod} onChange={e => setFormData({ ...formData, gracePeriod: parseInt(e.target.value) })} />
                                </div>
                                <div className="form-group"><label className="form-label">Break (hrs)</label>
                                    <input type="number" className="form-input" step="0.5" value={formData.breakHours} onChange={e => setFormData({ ...formData, breakHours: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Working Days</label>
                                <input type="text" className="form-input" placeholder="MON,TUE,WED,THU,FRI" value={formData.workingDays} onChange={e => setFormData({ ...formData, workingDays: e.target.value })} />
                            </div>
                            <div className="flex justify-between mt-6">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{selectedShift ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .shift-card { position: relative; }
        .shift-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .shift-icon { width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.25rem; }
        .shift-name { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem; }
        .shift-time { color: var(--text-secondary); font-size: 1rem; margin-bottom: 0.75rem; }
        .shift-details { display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .shift-days { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem; }
      `}</style>
        </div>
    );
}

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { parkingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { Plus, Search, Edit2, Trash2, X, ParkingCircle } from 'lucide-react';

const EMPTY_FORM = { code: '', name: '', totalSpaces: '', location: '', feePerHour: '' };

export default function ParkingsPage() {
  const { isAdmin } = useAuth();
  const [parkings, setParkings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchParkings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parkingAPI.getAll({ page, limit: 10, search });
      setParkings(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load parkings');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchParkings(); }, [fetchParkings]);

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setErrors({}); setShowModal(true); };
  const openEdit = (p) => {
    setEditItem(p);
    setForm({ code: p.code, name: p.name, totalSpaces: p.totalSpaces, location: p.location, feePerHour: p.feePerHour });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.code.trim()) errs.code = 'Required';
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.totalSpaces || form.totalSpaces < 1) errs.totalSpaces = 'Must be at least 1';
    if (!form.location.trim()) errs.location = 'Required';
    if (form.feePerHour === '' || form.feePerHour < 0) errs.feePerHour = 'Must be 0 or more';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, totalSpaces: parseInt(form.totalSpaces), feePerHour: parseFloat(form.feePerHour) };
      if (editItem) {
        await parkingAPI.update(editItem.code, payload);
        toast.success('Parking updated');
      } else {
        await parkingAPI.create(payload);
        toast.success('Parking registered');
      }
      setShowModal(false);
      fetchParkings();
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Deactivate parking ${code}?`)) return;
    try {
      await parkingAPI.delete(code);
      toast.success('Parking deactivated');
      fetchParkings();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  const set = (f) => (e) => { setForm(p => ({...p, [f]: e.target.value})); setErrors(p => ({...p, [f]: ''})); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Parking Locations</h2>
          <p>Manage parking lots across Rwanda</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> Register Parking
          </button>
        )}
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={14} />
          <input
            className="form-control"
            placeholder="Search by name, code or location..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Location</th>
              <th>Total</th>
              <th>Available</th>
              <th>Occupancy</th>
              <th>Fee/hr (RWF)</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner"/></td></tr>
            ) : parkings.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <ParkingCircle /><h3>No parkings found</h3>
                </div>
              </td></tr>
            ) : parkings.map(p => {
              const pct = parseFloat(p.occupancyRate);
              return (
                <tr key={p.id}>
                  <td><span className="mono" style={{ color: 'var(--accent)' }}>{p.code}</span></td>
                  <td><strong>{p.name}</strong></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.location}</td>
                  <td>{p.totalSpaces}</td>
                  <td>
                    <span className={`badge ${p.availableSpaces > 0 ? 'badge-green' : 'badge-red'}`}>
                      {p.availableSpaces}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress" style={{ width: 60 }}>
                        <div className={`progress-bar ${pct >= 90 ? 'high' : pct >= 60 ? 'mid' : 'low'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{pct}%</span>
                    </div>
                  </td>
                  <td><strong style={{ color: 'var(--accent)' }}>{p.feePerHour.toLocaleString()}</strong></td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(p)} title="Edit"><Edit2 size={13} /></button>
                        <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.code)} title="Deactivate"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editItem ? 'Edit Parking' : 'Register New Parking'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Parking Code *</label>
                    <input className="form-control" placeholder="e.g. KGL001" value={form.code} onChange={set('code')} style={{ textTransform: 'uppercase' }} />
                    {errors.code && <div className="form-error">{errors.code}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parking Name *</label>
                    <input className="form-control" placeholder="e.g. Kigali City Parking" value={form.name} onChange={set('name')} />
                    {errors.name && <div className="form-error">{errors.name}</div>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input className="form-control" placeholder="e.g. KG 7 Ave, Kigali, Rwanda" value={form.location} onChange={set('location')} />
                  {errors.location && <div className="form-error">{errors.location}</div>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Total Spaces *</label>
                    <input className="form-control" type="number" min="1" placeholder="e.g. 100" value={form.totalSpaces} onChange={set('totalSpaces')} />
                    {errors.totalSpaces && <div className="form-error">{errors.totalSpaces}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fee per Hour (RWF) *</label>
                    <input className="form-control" type="number" min="0" step="0.01" placeholder="e.g. 500" value={form.feePerHour} onChange={set('feePerHour')} />
                    {errors.feePerHour && <div className="form-error">{errors.feePerHour}</div>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : null}
                  {editItem ? 'Save Changes' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

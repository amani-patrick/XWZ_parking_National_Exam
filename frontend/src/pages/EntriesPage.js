import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { entryAPI, parkingAPI } from '../services/api';
import Pagination from '../components/Pagination';
import { Plus, Search, LogOut, Ticket, Receipt, X, Car } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const fmt = (dt) => dt ? format(new Date(dt), 'dd/MM/yyyy HH:mm') : '—';

export default function EntriesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(null);
  const [showTicket, setShowTicket] = useState(null);
  const [showBill, setShowBill] = useState(null);
  const [entryForm, setEntryForm] = useState({ plateNumber: '', parkingCode: '' });
  const [entryErrors, setEntryErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await entryAPI.getAll({ page, limit: 10, search, status: statusFilter });
      setEntries(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load entries'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    parkingAPI.getAll({ limit: 100 }).then(r => setParkings(r.data.data)).catch(() => {});
  }, []);

  const handleEntry = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!entryForm.plateNumber.trim()) errs.plateNumber = 'Plate number is required';
    if (!entryForm.parkingCode) errs.parkingCode = 'Parking is required';
    if (Object.keys(errs).length) { setEntryErrors(errs); return; }

    setSaving(true);
    try {
      const res = await entryAPI.create({ ...entryForm, plateNumber: entryForm.plateNumber.toUpperCase() });
      toast.success('Car entry registered!');
      setShowEntryModal(false);
      setShowTicket(res.data.data.ticket);
      setEntryForm({ plateNumber: '', parkingCode: '' });
      fetchEntries();
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to register entry';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const confirmExit = async () => {
    if (!showExitConfirm) return;
    try {
      const res = await entryAPI.exit(showExitConfirm.id, {});
      toast.success('Car exit registered!');
      setShowExitConfirm(null);
      setShowBill(res.data.data.bill);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register exit');
      setShowExitConfirm(null);
    }
  };

  const set = (f) => (e) => { setEntryForm(p => ({...p, [f]: e.target.value})); setEntryErrors(p => ({...p, [f]: ''})); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Car Entries</h2>
          <p>Track vehicle entries and exits across all parkings</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowEntryModal(true)}>
          <Plus size={15} /> Register Entry
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <Search size={14} />
          <input className="form-control" placeholder="Search plate, code or ticket..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="parked">Parked</option>
          <option value="exited">Exited</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Plate</th>
              <th>Parking</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Charged (RWF)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner"/></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><Car /><h3>No entries found</h3></div></td></tr>
            ) : entries.map(e => (
              <tr key={e.id}>
                <td><span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{e.ticketNumber}</span></td>
                <td><strong>{e.plateNumber}</strong></td>
                <td>
                  <div><strong>{e.parkingCode}</strong></div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.parkingName}</div>
                </td>
                <td>{fmt(e.entryDatetime)}</td>
                <td>{e.exitDatetime ? fmt(e.exitDatetime) : <span style={{ color: 'var(--text-muted)' }}>Still parked</span>}</td>
                <td>
                  {e.chargedAmount > 0
                    ? <strong style={{ color: 'var(--accent)' }}>{e.chargedAmount.toLocaleString()}</strong>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>
                  }
                </td>
                <td>
                  <span className={`badge ${e.status === 'parked' ? 'badge-yellow' : 'badge-green'}`}>
                    {e.status === 'parked' ? '🔵 Parked' : '✓ Exited'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {e.status === 'parked' && (user?.role === 'admin' || user?.id === e.attendantId) && (
                      <button className="btn btn-sm btn-danger" onClick={() => setShowExitConfirm(e)} title="Register Exit">
                        <LogOut size={12} /> Exit
                      </button>
                    )}
                    {e.status === 'exited' && (
                      <button className="btn btn-sm btn-success" onClick={() => setShowBill({
                        ticketNumber: e.ticketNumber,
                        plateNumber: e.plateNumber,
                        parkingCode: e.parkingCode,
                        parkingName: e.parkingName,
                        entryDatetime: e.entryDatetime,
                        exitDatetime: e.exitDatetime,
                        totalCharged: e.chargedAmount,
                        currency: 'RWF',
                      })}>
                        <Receipt size={12} /> Bill
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEntryModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Register Car Entry</h3>
              <button className="btn-icon" onClick={() => setShowEntryModal(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleEntry}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Plate Number *</label>
                  <input className="form-control" placeholder="e.g. RAC 001 A" value={entryForm.plateNumber}
                    onChange={set('plateNumber')} style={{ textTransform: 'uppercase' }} />
                  {entryErrors.plateNumber && <div className="form-error">{entryErrors.plateNumber}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Parking *</label>
                  <select className="form-control" value={entryForm.parkingCode} onChange={set('parkingCode')}>
                    <option value="">Select parking...</option>
                    {parkings.filter(p => p.availableSpaces > 0).map(p => (
                      <option key={p.code} value={p.code}>
                        {p.code} — {p.name} ({p.availableSpaces} free)
                      </option>
                    ))}
                  </select>
                  {entryErrors.parkingCode && <div className="form-error">{entryErrors.parkingCode}</div>}
                </div>
                {entryForm.parkingCode && (() => {
                  const pk = parkings.find(p => p.code === entryForm.parkingCode);
                  return pk ? (
                    <div className="alert alert-info">
                      <div>
                        <strong>{pk.name}</strong> · {pk.location}<br />
                        <span style={{ fontSize: 12 }}>Fee: {pk.feePerHour.toLocaleString()} RWF/hr · {pk.availableSpaces} spaces available</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEntryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner"/> : <Ticket size={14} />}
                  Generate Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowExitConfirm(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Confirm Exit</h3>
              <button className="btn-icon" onClick={() => setShowExitConfirm(null)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to register an exit for vehicle <strong style={{ color: 'var(--accent)' }}>{showExitConfirm.plateNumber}</strong>?</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowExitConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmExit}>Confirm Exit</button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {showTicket && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ color: 'var(--accent)' }}>🎫 Parking Ticket</h3>
              <button className="btn-icon" onClick={() => setShowTicket(null)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="ticket">
                <div className="ticket-header">
                  <h3>⬡ XWZ PARKING</h3>
                  <p>Official Entry Ticket</p>
                </div>
                <div className="ticket-row"><span>Ticket #</span><span className="mono">{showTicket.ticketNumber}</span></div>
                <div className="ticket-row"><span>Plate Number</span><span><strong>{showTicket.plateNumber}</strong></span></div>
                <div className="ticket-row"><span>Parking</span><span>{showTicket.parkingCode} — {showTicket.parkingName}</span></div>
                <div className="ticket-row"><span>Location</span><span>{showTicket.parkingLocation}</span></div>
                <div className="ticket-row"><span>Entry Time</span><span>{fmt(showTicket.entryDatetime)}</span></div>
                <div className="ticket-row ticket-total">
                  <span>Rate</span>
                  <span>{showTicket.feePerHour?.toLocaleString()} RWF/hr</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                Keep this ticket. Present on exit.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-full" onClick={() => setShowTicket(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBill && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ color: 'var(--success)' }}>🧾 Parking Bill</h3>
              <button className="btn-icon" onClick={() => setShowBill(null)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="ticket">
                <div className="ticket-header">
                  <h3>⬡ XWZ PARKING</h3>
                  <p>Official Parking Bill</p>
                </div>
                <div className="ticket-row"><span>Ticket #</span><span className="mono">{showBill.ticketNumber}</span></div>
                <div className="ticket-row"><span>Plate Number</span><span><strong>{showBill.plateNumber}</strong></span></div>
                <div className="ticket-row"><span>Parking</span><span>{showBill.parkingCode}{showBill.parkingName ? ` — ${showBill.parkingName}` : ''}</span></div>
                <div className="ticket-row"><span>Entry</span><span>{fmt(showBill.entryDatetime)}</span></div>
                <div className="ticket-row"><span>Exit</span><span>{fmt(showBill.exitDatetime)}</span></div>
                {showBill.duration && <div className="ticket-row"><span>Duration</span><span><strong>{showBill.duration}</strong></span></div>}
                {showBill.feePerHour && <div className="ticket-row"><span>Rate</span><span>{showBill.feePerHour?.toLocaleString()} RWF/hr</span></div>}
                <div className="ticket-row ticket-total">
                  <span>Total Charged</span>
                  <span>{showBill.totalCharged?.toLocaleString ? showBill.totalCharged.toLocaleString() : showBill.totalCharged} {showBill.currency}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                Thank you for using XWZ Parking!
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-full" onClick={() => setShowBill(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

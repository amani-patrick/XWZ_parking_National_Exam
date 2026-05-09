import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { reportAPI } from '../services/api';
import Pagination from '../components/Pagination';
import { Search, Download, BarChart3, Car, LogOut } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (dt) => dt ? format(new Date(dt), 'dd/MM/yyyy HH:mm') : '—';

const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
};

export default function ReportsPage() {
  const [tab, setTab] = useState('outgoing');
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [parkingCode, setParkingCode] = useState('');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (p = 1) => {
    if (!startDate || !endDate) { toast.error('Please select both start and end dates'); return; }
    if (new Date(endDate) < new Date(startDate)) { toast.error('End date must be after start date'); return; }
    setLoading(true);
    setPage(p);
    try {
      const params = { startDate: `${startDate}T00:00:00`, endDate: `${endDate}T23:59:59`, page: p, limit: 10 };
      if (parkingCode) params.parkingCode = parkingCode.toUpperCase();
      const res = tab === 'outgoing'
        ? await reportAPI.outgoing(params)
        : await reportAPI.entered(params);
      setData(res.data.data);
      setSummary(res.data.summary);
      setPagination(res.data.pagination);
      setSearched(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report');
    } finally { setLoading(false); }
  };

  const handlePageChange = (p) => handleSearch(p);

  const exportCSV = () => {
    if (!data.length) return;
    const headers = tab === 'outgoing'
      ? ['Ticket', 'Plate', 'Parking', 'Entry Time', 'Exit Time', 'Duration', 'Charged (RWF)']
      : ['Ticket', 'Plate', 'Parking', 'Entry Time', 'Status', 'Charged (RWF)'];
    const rows = data.map(e => tab === 'outgoing'
      ? [e.ticketNumber, e.plateNumber, e.parkingCode, fmt(e.entryDatetime), fmt(e.exitDatetime), '', e.chargedAmount]
      : [e.ticketNumber, e.plateNumber, e.parkingCode, fmt(e.entryDatetime), e.status, e.chargedAmount]
    );
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xwz-${tab}-report-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Generate detailed parking reports between date ranges</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'outgoing' ? 'active' : ''}`} onClick={() => { setTab('outgoing'); setData([]); setSummary(null); setSearched(false); }}>
          <LogOut size={13} style={{ display: 'inline', marginRight: 4 }} /> Outgoing Cars
        </button>
        <button className={`tab-btn ${tab === 'entered' ? 'active' : ''}`} onClick={() => { setTab('entered'); setData([]); setSummary(null); setSearched(false); }}>
          <Car size={13} style={{ display: 'inline', marginRight: 4 }} /> Entered Cars
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date *</label>
            <input className="form-control" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={endDate} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date *</label>
            <input className="form-control" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Parking Code (optional)</label>
            <input className="form-control" placeholder="e.g. KGL001" value={parkingCode} onChange={e => setParkingCode(e.target.value)} style={{ textTransform: 'uppercase' }} />
          </div>
          <button className="btn btn-primary" onClick={() => handleSearch(1)} disabled={loading}>
            {loading ? <span className="spinner" /> : <Search size={15} />}
            Generate
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon cyan"><BarChart3 size={22} /></div>
            <div className="stat-info">
              <strong>{summary.totalCars}</strong>
              <span>{tab === 'outgoing' ? 'Outgoing Cars' : 'Entered Cars'}</span>
            </div>
          </div>
          {tab === 'outgoing' && (
            <div className="stat-card">
              <div className="stat-icon green"><span style={{ fontSize: 18, fontWeight: 800 }}>₣</span></div>
              <div className="stat-info">
                <strong>{parseFloat(summary.totalRevenue).toLocaleString()}</strong>
                <span>Total Revenue (RWF)</span>
              </div>
            </div>
          )}
          <div className="stat-card">
            <div className="stat-icon yellow"><Car size={22} /></div>
            <div className="stat-info">
              <strong>{summary.period?.startDate?.split('T')[0]}</strong>
              <span>Start Date</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Car size={22} /></div>
            <div className="stat-info">
              <strong>{summary.period?.endDate?.split('T')[0]}</strong>
              <span>End Date</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {searched && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {pagination?.total || 0} records found
            </span>
            {data.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
                <Download size={13} /> Export CSV
              </button>
            )}
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Plate</th>
                  <th>Parking</th>
                  <th>Entry Time</th>
                  {tab === 'outgoing' && <th>Exit Time</th>}
                  <th>Status</th>
                  <th>Charged (RWF)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><BarChart3 /><h3>No records for selected period</h3></div></td></tr>
                ) : data.map(e => (
                  <tr key={e.id}>
                    <td><span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{e.ticketNumber}</span></td>
                    <td><strong>{e.plateNumber}</strong></td>
                    <td>
                      <div><strong>{e.parkingCode}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.parkingName}</div>
                    </td>
                    <td>{fmt(e.entryDatetime)}</td>
                    {tab === 'outgoing' && <td>{fmt(e.exitDatetime)}</td>}
                    <td>
                      <span className={`badge ${e.status === 'parked' ? 'badge-yellow' : 'badge-green'}`}>
                        {e.status === 'parked' ? 'Parked' : 'Exited'}
                      </span>
                    </td>
                    <td>
                      {e.chargedAmount > 0
                        ? <strong style={{ color: 'var(--accent)' }}>{e.chargedAmount.toLocaleString()}</strong>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>
        </div>
      )}

      {!searched && !loading && (
        <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: 60 }}>
          <BarChart3 />
          <h3>Select a date range and click Generate</h3>
          <p>Reports will appear here</p>
        </div>
      )}
    </div>
  );
}

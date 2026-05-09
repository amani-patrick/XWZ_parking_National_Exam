import React, { useState, useEffect } from 'react';
import { reportAPI, parkingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ParkingCircle, Car, CheckCircle, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [parkRes] = await Promise.all([parkingAPI.getAll({ limit: 50 })]);
        setParkings(parkRes.data.data);
        if (isAdmin) {
          const dashRes = await reportAPI.dashboard();
          setStats(dashRes.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (loading) return <div className="loading-full"><div className="spinner" /></div>;

  return (
    <div>
      {isAdmin && stats && (
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-icon cyan"><ParkingCircle size={22} /></div>
            <div className="stat-info">
              <strong>{stats.totalParkings}</strong>
              <span>Total Parkings</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={22} /></div>
            <div className="stat-info">
              <strong>{stats.availableSpaces}</strong>
              <span>Available Spaces</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Car size={22} /></div>
            <div className="stat-info">
              <strong>{stats.currentlyParked}</strong>
              <span>Currently Parked</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><DollarSign size={22} /></div>
            <div className="stat-info">
              <strong>{parseFloat(stats.todayRevenue).toLocaleString()}</strong>
              <span>Today's Revenue (RWF)</span>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h2>Parking Overview</h2>
          <p>Real-time status of all parking locations</p>
        </div>
      </div>

      {parkings.length === 0 ? (
        <div className="empty-state">
          <ParkingCircle />
          <h3>No parkings registered yet</h3>
          <p>Admins can add parking locations from the Parkings menu</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
          {parkings.map(p => {
            const pct = p.totalSpaces > 0 ? ((p.occupiedSpaces / p.totalSpaces) * 100) : 0;
            const barClass = pct >= 90 ? 'high' : pct >= 60 ? 'mid' : 'low';
            return (
              <div key={p.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span className="mono" style={{ color: 'var(--accent)', fontSize: 11 }}>{p.code}</span>
                      <span className={`badge ${p.availableSpaces > 0 ? 'badge-green' : 'badge-red'}`}>
                        {p.availableSpaces > 0 ? 'Available' : 'Full'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.location}</p>
                  </div>
                </div>

                <div className="progress" style={{ marginBottom: 8 }}>
                  <div className={`progress-bar ${barClass}`} style={{ width: `${pct}%` }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>{p.occupiedSpaces} occupied</span>
                  <span>{p.availableSpaces} free / {p.totalSpaces} total</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fee/hr</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne' }}>
                    {p.feePerHour.toLocaleString()} RWF
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

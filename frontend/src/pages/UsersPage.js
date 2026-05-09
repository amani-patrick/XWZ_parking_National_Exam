import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { authAPI } from '../services/api';
import Pagination from '../components/Pagination';
import { Search, UserCheck, UserX, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAPI.getUsers({ page, limit: 10, search });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggle = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.firstName} ${user.lastName}?`)) return;
    try {
      await authAPI.toggleUser(user.id);
      toast.success(`User ${action}d`);
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>User Management</h2>
          <p>Manage system users and their access</p>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <Search size={14} />
          <input className="form-control" placeholder="Search by name or email..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner"/></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><Users /><h3>No users found</h3></div></td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id}>
                <td style={{ color: 'var(--text-muted)' }}>{((page - 1) * 10) + i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0
                    }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <strong>{u.firstName} {u.lastName}</strong>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-cyan' : 'badge-gray'}`}>
                    {u.role === 'admin' ? '⚡ Admin' : '👤 Tenant'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                    {u.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {format(new Date(u.createdAt), 'dd MMM yyyy')}
                </td>
                <td>
                  <button
                    className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggle(u)}
                  >
                    {u.isActive ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}

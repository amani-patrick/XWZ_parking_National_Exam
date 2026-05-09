import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ParkingCircle, Car, BarChart3,
  Users, LogOut, ChevronRight, Activity
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, all: true },
  { path: '/parkings', label: 'Parkings', icon: ParkingCircle, all: true },
  { path: '/entries', label: 'Car Entries', icon: Car, all: true },
];
const adminItems = [
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/users', label: 'Users', icon: Users },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/parkings') return 'Parking Management';
    if (path === '/entries') return 'Car Entries';
    if (path === '/reports') return 'Reports & Analytics';
    if (path === '/users') return 'User Management';
    return 'XWZ Parking';
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>⬡ XWZ Parking</h2>
          <span>Management System</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">Main Menu</div>
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon />
                {item.label}
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <div className="nav-section">
              <div className="nav-section-label">Admin</div>
              {adminItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}

          <div className="nav-section">
            <div className="nav-section-label">System</div>
            <div style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}>
                <Activity size={12} />
                All services online
              </div>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="user-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <small style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</small>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div>
            <h1>{getPageTitle()}</h1>
          </div>
          <div className="topbar-actions">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-RW', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

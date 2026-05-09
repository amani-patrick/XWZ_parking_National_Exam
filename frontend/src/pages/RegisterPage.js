import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'parking_tenant' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    else if (form.firstName.length < 2) errs.firstName = 'Min 2 characters';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Min 8 characters';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password))
      errs.password = 'Must contain uppercase, lowercase, number & special character';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      login(res.data.data.user, res.data.data.token);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) toast.error(apiErrors[0]);
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => { setForm(p => ({...p, [field]: e.target.value})); setErrors(p => ({...p, [field]: ''})); };

  return (
    <div className="auth-page">
      <div className="auth-box" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <h1>⬡ XWZ Parking</h1>
          <p>Car Parking Management System</p>
        </div>

        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Create Account</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Fill in your details to get started</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-control" placeholder="John" value={form.firstName} onChange={set('firstName')} />
              {errors.firstName && <div className="form-error">{errors.firstName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-control" placeholder="Doe" value={form.lastName} onChange={set('lastName')} />
              {errors.lastName && <div className="form-error">{errors.lastName}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="john@example.com" value={form.email} onChange={set('email')} />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPass ? 'text' : 'password'}
                placeholder="Min 8 chars, uppercase, number, symbol"
                value={form.password}
                style={{ paddingRight: 40 }}
                onChange={set('password')}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-control" value={form.role} onChange={set('role')}>
              <option value="parking_tenant">Parking Tenant</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <span className="spinner" /> : <UserPlus size={16} />}
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

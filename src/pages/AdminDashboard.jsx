import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAdminDashboardData,
  verifyPropertyListing,
  deletePropertyListing,
  updateInquiryStatus,
} from '../lib/supabase';
import ScrollReveal from '../components/common/ScrollReveal';
import EditPropertyModal from '../components/common/EditPropertyModal';
import { BRAND } from '../config/brand';

export default function AdminDashboard() {
  const { user } = useAuth();

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('twistms_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [data, setData] = useState({
    listings: [],
    pendingListings: [],
    activeListings: [],
    rejectedListings: [],
    inquiries: [],
    stats: {
      totalListings: 0,
      pendingCount: 0,
      activeCount: 0,
      rejectedCount: 0,
      totalViews: 0,
      totalInquiries: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'active' | 'all' | 'inquiries'
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProperty, setEditingProperty] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const clean = passwordInput.trim();
    const envPass = import.meta.env.VITE_ADMIN_PASSWORD;
    const validPasswords = ['twistms2026', 'twistms@admin', 'admin123', 'twistms', envPass].filter(Boolean);

    if (validPasswords.includes(clean)) {
      sessionStorage.setItem('twistms_admin_auth', 'true');
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Invalid master password. Please enter the correct passphrase.');
    }
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem('twistms_admin_auth');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  async function loadData() {
    setLoading(true);
    try {
      const res = await getAdminDashboardData();
      setData(res);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = async (propId, approve = true) => {
    await verifyPropertyListing(propId, approve);
    setActionMessage(approve ? 'Listing verified and published live to website! ✓' : 'Listing unapproved and archived.');
    await loadData();
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleDelete = async (propId, title) => {
    if (window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      await deletePropertyListing(propId);
      setActionMessage('Listing deleted permanently.');
      await loadData();
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const handleToggleInquiry = async (inqId, currentStatus) => {
    const next = currentStatus === 'unread' ? 'contacted' : 'unread';
    await updateInquiryStatus(inqId, next);
    await loadData();
  };

  // Filter listings based on active tab and search query
  const getTabListings = () => {
    let list = [];
    if (activeTab === 'pending') list = data.pendingListings;
    else if (activeTab === 'active') list = data.activeListings;
    else list = data.listings;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p) =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.owner_name || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
    );
  };

  const currentListings = getTabListings();

  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#2B2B2B]/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1C1C1C] flex items-center justify-center p-3 shadow-md">
              <img src={BRAND.logo.color} alt="TwistMS" className="w-full h-full object-contain" />
            </div>
            <div className="pt-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                Restricted Administration Desk
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#111111] font-editorial pt-1">
              Admin Master Access
            </h1>
            <p className="text-xs text-[#555555]">
              Please enter the administration passphrase to review, verify, and edit platform listings.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1.5 font-mono uppercase tracking-wider">
                Master Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter admin password..."
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-[#2B2B2B]/20 bg-[#FBFBFB] text-sm text-[#111111] font-medium focus:bg-white focus:outline-none focus:border-[#111111] transition-all pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-black cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                  <span>⚠️</span> {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-widest bg-[#111111] text-[#FAFAFA] hover:bg-[#2B2B2B] transition-all shadow-md cursor-pointer"
            >
              Unlock Administration Portal →
            </button>
          </form>

          <div className="pt-3 border-t border-[#2B2B2B]/10 text-center">
            <p className="text-[11px] text-gray-400 font-mono">
              Default Master Key: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-bold">twistms2026</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Banner & Title */}
      <ScrollReveal direction="down">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B2B2B]/15 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                TwistMS Central Administration & Review Desk
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#111111] text-white">
                Full Master Access
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] font-editorial mt-1">
              Platform Master Management Portal
            </h1>
            <p className="text-xs text-[#555555] mt-1 font-medium">
              Review, verify, edit, and approve real estate listings across the marketplace before they go live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/submit"
              className="btn-luxury px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <span>+ Create Listing</span>
            </Link>
            <Link
              to="/dashboard"
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Seller View →
            </Link>
            <button
              onClick={handleLockAdmin}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#1C1C1C] text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Lock Admin Desk"
            >
              <span>🔒 Lock</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Action Flash Message */}
      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-emerald-700 hover:text-black font-bold">✕</button>
        </div>
      )}

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approval (High Priority) */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-500/20'
              : 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase font-bold text-amber-900">
            <span>Needs Verification</span>
            <span className="p-1.5 rounded-lg bg-amber-200 text-amber-900">⏳</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-950 font-editorial">
              {data.stats.pendingCount}
            </span>
            <span className="text-xs text-amber-800 font-semibold">in review</span>
          </div>
          <p className="mt-2 text-[10px] text-amber-800 font-mono">
            Requires admin deed approval to go live
          </p>
        </div>

        {/* Active & Published */}
        <div
          onClick={() => setActiveTab('active')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-500/20'
              : 'border-[#2B2B2B]/15 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase font-bold text-[#666666]">
            <span>Active & Published</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">✓</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#111111] font-editorial">
              {data.stats.activeCount}
            </span>
            <span className="text-xs text-emerald-700 font-semibold">live on site</span>
          </div>
          <p className="mt-2 text-[10px] text-[#666666] font-mono">
            Searchable on public catalog
          </p>
        </div>

        {/* Total Properties */}
        <div
          onClick={() => setActiveTab('all')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#111111] bg-gray-50 shadow-md ring-2 ring-black/10'
              : 'border-[#2B2B2B]/15 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase font-bold text-[#666666]">
            <span>Total Listings</span>
            <span className="p-1.5 rounded-lg bg-[#EAEAEA] text-[#111111]">🏛️</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#111111] font-editorial">
              {data.stats.totalListings}
            </span>
            <span className="text-xs text-gray-500 font-semibold">all parcels</span>
          </div>
          <p className="mt-2 text-[10px] text-[#666666] font-mono">
            {data.stats.totalViews.toLocaleString()} total views tracked
          </p>
        </div>

        {/* Buyer Inquiries */}
        <div
          onClick={() => setActiveTab('inquiries')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            activeTab === 'inquiries'
              ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-500/20'
              : 'border-[#2B2B2B]/15 bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase font-bold text-[#666666]">
            <span>Buyer Inquiries</span>
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">✉️</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-950 font-editorial">
              {data.stats.totalInquiries}
            </span>
            <span className="text-xs text-indigo-700 font-semibold">leads received</span>
          </div>
          <p className="mt-2 text-[10px] text-[#666666] font-mono">
            Messages from potential buyers
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2B2B2B]/15 pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'text-amber-900 bg-amber-100/70 hover:bg-amber-100'
            }`}
          >
            <span>Needs Verification</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-900 font-mono">
              {data.stats.pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-[#555555] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <span>Live on Site ({data.stats.activeCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-[#555555] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            All Inventory ({data.stats.totalListings})
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'inquiries'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'text-[#555555] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <span>Buyer Inquiries ({data.stats.totalInquiries})</span>
          </button>
        </div>

        {activeTab !== 'inquiries' && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, city, seller..."
              className="w-full sm:w-64 bg-white text-xs border border-[#2B2B2B]/20 rounded-xl px-3.5 py-2 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#888888] font-mono">
          Loading platform administration data...
        </div>
      ) : activeTab === 'inquiries' ? (
        /* INQUIRIES TAB */
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#111111] font-editorial">
            All Buyer Inquiries Across TwistMS Platform
          </h3>
          {data.inquiries.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-gray-200 bg-white text-xs text-gray-500">
              No buyer inquiries recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.inquiries.map((inq) => (
                <div key={inq.id} className="p-5 rounded-2xl bg-white border border-[#2B2B2B]/15 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#111111] text-sm">{inq.name}</h4>
                      <p className="text-[11px] text-gray-500">{inq.email} · {inq.phone || 'No phone'}</p>
                    </div>
                    <button
                      onClick={() => handleToggleInquiry(inq.id, inq.status)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer ${
                        inq.status === 'unread'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {inq.status === 'unread' ? '● Unread' : '✓ Contacted'}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-800 leading-relaxed font-medium">
                    "{inq.message}"
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t">
                    <span>Listing: <strong className="text-black">{inq.property_title || inq.property_id}</strong></span>
                    <a
                      href={`mailto:${inq.email}?subject=Regarding Inquiry: ${inq.property_title || ''}`}
                      className="text-black font-bold hover:underline"
                    >
                      Reply to Buyer →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* LISTINGS TAB (Pending, Active, or All) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#111111] font-editorial">
              {activeTab === 'pending'
                ? `Pending Verification Queue (${currentListings.length})`
                : activeTab === 'active'
                ? `Live Properties on Marketplace (${currentListings.length})`
                : `All Properties (${currentListings.length})`}
            </h3>
            {activeTab === 'pending' && currentListings.length > 0 && (
              <span className="text-xs text-amber-800 font-bold">
                ⚠️ Click "Verify & Publish" to push listing live to the website
              </span>
            )}
          </div>

          {currentListings.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-gray-200 bg-white text-xs text-gray-500 space-y-3">
              <p>
                {activeTab === 'pending'
                  ? 'Great job! No pending listings waiting for verification.'
                  : 'No listings match this filter.'}
              </p>
              {activeTab === 'pending' && (
                <Link
                  to="/submit"
                  className="btn-luxury px-4 py-2 rounded-xl text-xs font-bold inline-block"
                >
                  + Submit a Property Listing
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#2B2B2B]/15 bg-white shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2B2B2B]/15 bg-[#FAFAFA] text-[11px] font-mono uppercase text-[#444444]">
                      <th className="py-4 px-5 font-bold">Property Details</th>
                      <th className="py-4 px-4 font-bold">Seller Contact</th>
                      <th className="py-4 px-4 font-bold">Asking Price</th>
                      <th className="py-4 px-4 font-bold">Status & Verification</th>
                      <th className="py-4 px-5 font-bold text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B2B2B]/10">
                    {currentListings.map((prop) => {
                      const imageSrc = prop.image || (prop.images && prop.images[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80';
                      const isPending = prop.status === 'pending_review' || !prop.verified;

                      return (
                        <tr key={prop.id} className={`hover:bg-[#F9F9F9] transition-colors ${isPending ? 'bg-amber-50/30' : ''}`}>
                          {/* Property Details */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <img
                                src={imageSrc}
                                alt={prop.title}
                                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200 shadow-sm"
                              />
                              <div className="min-w-0 max-w-xs">
                                <Link
                                  to={`/property/${prop.id}`}
                                  className="font-bold text-[#111111] hover:underline line-clamp-1 text-sm font-editorial block"
                                >
                                  {prop.title}
                                </Link>
                                <p className="text-[11px] text-[#666666] truncate">
                                  {prop.address ? `${prop.address}, ` : ''}{prop.city || 'Regional'} {prop.stateCode || prop.state || ''}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-mono font-bold text-gray-500">
                                    {prop.category} · For {prop.type}
                                  </span>
                                  {prop.location_url && (
                                    <a
                                      href={prop.location_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-emerald-700 hover:underline font-mono"
                                      title="Open GPS Pin"
                                    >
                                      📍 Pin
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Seller Contact */}
                          <td className="py-4 px-4">
                            <div className="text-xs">
                              <p className="font-bold text-[#111111]">
                                {prop.owner_name || prop.agent?.name || 'Seller'}
                              </p>
                              <p className="text-[11px] text-gray-600 truncate max-w-[150px]">
                                {prop.owner_email || prop.agent?.email || '—'}
                              </p>
                              <p className="text-[11px] text-gray-600 font-mono">
                                {prop.owner_phone || prop.agent?.phone || '—'}
                              </p>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-4 px-4 font-mono font-bold text-[#111111]">
                            ${Number(prop.price).toLocaleString()}
                            <p className="text-[10px] text-gray-500 font-normal">
                              Tier: {prop.plan}
                            </p>
                          </td>

                          {/* Verification & Status */}
                          <td className="py-4 px-4">
                            {isPending ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <span>⏳</span> Under Verification
                                </span>
                                <p className="text-[10px] text-amber-800 font-medium">Hidden from search</p>
                              </div>
                            ) : prop.status === 'active' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <span>✓</span> Live & Verified
                                </span>
                                <p className="text-[10px] text-gray-500 font-mono">{prop.views_count || 0} views</p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-800">
                                {prop.status}
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Verify & Publish Button */}
                              {isPending ? (
                                <button
                                  onClick={() => handleVerify(prop.id, true)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold shadow-sm cursor-pointer transition-colors"
                                  title="Approve this deed and publish live to the website"
                                >
                                  ✓ Verify & Publish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleVerify(prop.id, false)}
                                  className="px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 text-[11px] font-semibold cursor-pointer"
                                  title="Unpublish this listing"
                                >
                                  Unpublish
                                </button>
                              )}

                              {/* Edit Each and Every Thing */}
                              <button
                                onClick={() => setEditingProperty(prop)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-[11px] font-bold text-gray-800 cursor-pointer transition-colors"
                                title="Edit each detail of this listing"
                              >
                                ✏️ Edit
                              </button>

                              {/* View Live */}
                              <Link
                                to={`/property/${prop.id}`}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-[11px] font-semibold text-gray-700 transition-colors"
                                title="View public post"
                              >
                                ↗
                              </Link>

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(prop.id, prop.title)}
                                className="px-2 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-[11px] font-bold cursor-pointer"
                                title="Delete listing"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <EditPropertyModal
          property={editingProperty}
          isOpen={Boolean(editingProperty)}
          isAdmin={true}
          onClose={() => setEditingProperty(null)}
          onUpdated={loadData}
        />
      )}

    </div>
  );
}

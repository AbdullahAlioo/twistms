import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getSellerDashboardData,
  deletePropertyListing,
  seedSampleListingForSeller,
  updateInquiryStatus,
} from '../lib/supabase';
import ScrollReveal from '../components/common/ScrollReveal';
import EditPropertyModal from '../components/common/EditPropertyModal';

export default function SellerDashboard() {
  const { user, profile, currentPlan, selectPlan, signOut } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    listings: [],
    inquiries: [],
    stats: {
      totalListings: 0,
      activeCount: 0,
      expiredCount: 0,
      totalViews: 0,
      totalInquiries: 0,
      averageViewsPerListing: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'inquiries' | 'plan'
  const [planMessage, setPlanMessage] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    try {
      const data = await getSellerDashboardData(user?.id);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load seller dashboard', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const handleCreateSampleListing = async () => {
    setSeeding(true);
    try {
      await seedSampleListingForSeller(user);
      await loadDashboard();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteListing = async (listingId, title) => {
    if (window.confirm(`Are you sure you want to remove the listing "${title}"?`)) {
      await deletePropertyListing(listingId);
      await loadDashboard();
    }
  };

  const handlePlanChange = async (newPlan) => {
    await selectPlan(newPlan);
    setPlanMessage(`Your account has been switched to ${newPlan} plan!`);
    await loadDashboard();
    setTimeout(() => setPlanMessage(''), 4500);
  };

  const handleToggleInquiryStatus = async (inqId, currentStatus) => {
    const nextStatus = currentStatus === 'unread' ? 'contacted' : 'unread';
    await updateInquiryStatus(inqId, nextStatus);
    await loadDashboard();
  };

  const handleCopyLink = (propId) => {
    const url = `${window.location.origin}/property/${propId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(propId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const calculateDaysRemaining = (expiresAt) => {
    if (!expiresAt) return 0;
    const diffTime = new Date(expiresAt).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredListings = dashboardData.listings.filter((item) => {
    if (!listingSearch.trim()) return true;
    const q = listingSearch.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.city || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner / Welcome */}
      <ScrollReveal direction="down">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B2B2B]/15 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#6E6E6E] font-extrabold">
                Seller Performance Command Center
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#111111] text-white">
                {currentPlan} Plan
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] font-editorial mt-1">
              Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'Seller'}
            </h1>
            <p className="text-xs text-[#555555] mt-1 font-medium">
              Real-time analytics for your property portfolio, view traffic, and prospective buyer leads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/submit"
              className="btn-luxury px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <span>+ Create New Listing</span>
            </Link>
            <button
              onClick={() => {
                signOut();
                navigate('/login');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#2B2B2B]/20 bg-white hover:bg-[#F5F5F5] text-[#222222] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Free Plan 90-Day Policy Alert */}
      {currentPlan === 'Free' && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-amber-950">
            <span className="text-xl">⏳</span>
            <div>
              <span className="font-bold">Free Plan Active: </span>
              <span>All posts on the Free Plan remain syndicated for exactly 90 days and are then automatically erased. Upgrade anytime with 1 click.</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('plan')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-900 text-white font-bold text-[11px] hover:bg-black transition-all shrink-0 cursor-pointer"
          >
            Upgrade Plan (Instant — No Card)
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Views Card */}
        <div className="glass-panel-luxury p-5 rounded-2xl border border-[#2B2B2B]/15 bg-white shadow-md">
          <div className="flex items-center justify-between text-xs text-[#666666] font-mono uppercase">
            <span>Total Views</span>
            <span className="p-1.5 rounded-lg bg-[#EAEAEA] text-[#111111]">👁️</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#111111] font-editorial">
              {dashboardData.stats.totalViews.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 font-mono">
              ~{dashboardData.stats.averageViewsPerListing} / post
            </span>
          </div>
          <p className="text-[11px] text-[#777777] mt-1">Live views recorded across active listings</p>
        </div>

        {/* Active Listings Card */}
        <div className="glass-panel-luxury p-5 rounded-2xl border border-[#2B2B2B]/15 bg-white shadow-md">
          <div className="flex items-center justify-between text-xs text-[#666666] font-mono uppercase">
            <span>Active Listings</span>
            <span className="p-1.5 rounded-lg bg-[#EAEAEA] text-[#111111]">🏡</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#111111] font-editorial">
              {dashboardData.stats.activeCount}
            </span>
            <span className="text-[11px] font-semibold text-[#555555]">
              of {dashboardData.stats.totalListings} total
            </span>
          </div>
          <p className="text-[11px] text-[#777777] mt-1">Currently syndicated & publicly searchable</p>
        </div>

        {/* Inquiries / Buyer Leads */}
        <div className="glass-panel-luxury p-5 rounded-2xl border border-[#2B2B2B]/15 bg-white shadow-md">
          <div className="flex items-center justify-between text-xs text-[#666666] font-mono uppercase">
            <span>Buyer Inquiries</span>
            <span className="p-1.5 rounded-lg bg-[#EAEAEA] text-[#111111]">📩</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#111111] font-editorial">
              {dashboardData.stats.totalInquiries}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 font-mono">Direct Leads</span>
          </div>
          <p className="text-[11px] text-[#777777] mt-1">Prospective buyers requesting viewings</p>
        </div>

        {/* Current Plan Card */}
        <div className="glass-panel-luxury p-5 rounded-2xl border border-[#2B2B2B]/15 bg-white shadow-md">
          <div className="flex items-center justify-between text-xs text-[#666666] font-mono uppercase">
            <span>Syndication Plan</span>
            <span className="p-1.5 rounded-lg bg-[#EAEAEA] text-[#111111]">⭐</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#111111] font-editorial">
              {currentPlan}
            </span>
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <p className="text-[11px] text-[#777777] mt-1">
            {currentPlan === 'Free' ? '90-Day auto-erase rule' : currentPlan === 'Paid' ? '180-Day duration' : '365-Day nationwide coverage'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#2B2B2B]/15 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'listings'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'text-[#555555] hover:text-[#111111] hover:bg-[#F2F2F2]'
          }`}
        >
          My Listings ({dashboardData.listings.length})
        </button>
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'inquiries'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'text-[#555555] hover:text-[#111111] hover:bg-[#F2F2F2]'
          }`}
        >
          Buyer Inquiries ({dashboardData.inquiries.length})
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'plan'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'text-[#555555] hover:text-[#111111] hover:bg-[#F2F2F2]'
          }`}
        >
          Account Plan & Duration
        </button>
      </div>

      {/* TAB 1: LISTINGS & VIEWS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#111111] font-editorial">
                Your Real Estate Listings & Traffic
              </h2>
              <p className="text-xs text-[#666666]">
                Track how many people viewed each post and monitor 90-day expiration countdowns.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Filter my listings..."
                className="bg-white text-xs border border-[#2B2B2B]/20 rounded-xl px-3 py-1.5 focus:outline-none"
              />
              <button
                onClick={handleCreateSampleListing}
                disabled={seeding}
                className="btn-luxury-outline px-3 py-1.5 rounded-xl text-xs font-bold text-[#111111] shrink-0"
                title="Populate a test listing immediately"
              >
                {seeding ? 'Creating...' : '+ Quick Test Post'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#888888]">Loading seller data...</div>
          ) : filteredListings.length === 0 ? (
            <div className="glass-panel-luxury p-12 text-center rounded-3xl border border-[#2B2B2B]/15 bg-white space-y-4">
              <p className="text-sm font-semibold text-[#555555]">
                {listingSearch ? 'No listings match your search.' : 'You have not posted any properties under this account yet.'}
              </p>
              <div className="flex justify-center gap-3">
                <Link to="/submit" className="btn-luxury px-6 py-3 rounded-xl text-xs font-bold inline-block">
                  Create Property Post (Free 90-Day Entry)
                </Link>
                <button
                  onClick={handleCreateSampleListing}
                  disabled={seeding}
                  className="btn-luxury-outline px-5 py-3 rounded-xl text-xs font-bold inline-block"
                >
                  {seeding ? 'Generating...' : '⚡ Generate Sample Post to Test'}
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel-luxury rounded-3xl border border-[#2B2B2B]/15 bg-white shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2B2B2B]/15 bg-[#FAFAFA] text-[11px] font-mono uppercase text-[#444444]">
                      <th className="py-4 px-6 font-bold">Property</th>
                      <th className="py-4 px-4 font-bold">Price</th>
                      <th className="py-4 px-4 font-bold">Views Count</th>
                      <th className="py-4 px-4 font-bold">Plan & Duration</th>
                      <th className="py-4 px-4 font-bold">90-Day Expiry Countdown</th>
                      <th className="py-4 px-6 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B2B2B]/10">
                    {filteredListings.map((prop) => {
                      const daysLeft = calculateDaysRemaining(prop.expires_at);
                      const isExpired = daysLeft <= 0;
                      const imageSrc = prop.image || (prop.images && prop.images[0]) || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80';
                      const maxDays = prop.plan === 'Free' ? 90 : prop.plan === 'Paid' ? 180 : 365;

                      return (
                        <tr key={prop.id} className="hover:bg-[#F9F9F9] transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={imageSrc}
                                alt={prop.title}
                                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#2B2B2B]/15 shadow-sm"
                              />
                              <div>
                                <Link
                                  to={`/property/${prop.id}`}
                                  className="font-bold text-[#111111] hover:underline line-clamp-1 text-sm font-editorial"
                                >
                                  {prop.title}
                                </Link>
                                <p className="text-[11px] text-[#666666]">
                                  {prop.city}, {prop.stateCode || prop.state_code || 'TX'} • {prop.category}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-bold text-[#111111] font-mono">
                            ${Number(prop.price).toLocaleString()}
                            {(prop.pricePeriod || prop.price_period) && (
                              <span className="text-[10px] text-gray-500 font-normal">
                                {prop.pricePeriod || prop.price_period}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-[#111111]">
                              <span className="text-gray-400">👁️</span>
                              <span className="font-mono text-sm">{Number(prop.views_count || 0)}</span>
                              <span className="text-[10px] text-gray-500 font-normal">views</span>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                                  prop.plan === 'Premium'
                                    ? 'bg-purple-100 text-purple-800'
                                    : prop.plan === 'Paid'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {prop.plan} Plan
                              </span>
                              <div>
                                {prop.verified && prop.status === 'active' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Verified Live
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Pending Review
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {isExpired ? (
                              <span className="text-red-600 font-bold text-[11px] flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-600" />
                                Expired (Erased)
                              </span>
                            ) : (
                              <div>
                                <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                                  <span className={daysLeft <= 15 ? 'text-amber-600 font-bold' : 'text-[#222222] font-semibold'}>
                                    {daysLeft} days left
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    of {maxDays}d
                                  </span>
                                </div>
                                <div className="w-32 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      daysLeft <= 15 ? 'bg-amber-500' : 'bg-[#111111]'
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(5, (daysLeft / maxDays) * 100)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingProperty(prop)}
                                className="px-3 py-1.5 rounded-lg border border-[#B4B4B4] bg-[#F7F7F7] text-[11px] font-bold text-[#111111] hover:bg-[#B4B4B4]/20 transition-colors shadow-sm"
                                title="Edit this listing"
                              >
                                ✏️ Edit
                              </button>
                              <Link
                                to={`/property/${prop.id}`}
                                className="px-3 py-1.5 rounded-lg border border-[#2B2B2B]/20 text-[11px] font-bold text-[#111111] hover:bg-[#F2F2F2] transition-colors"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => handleCopyLink(prop.id)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#2B2B2B]/15 text-[11px] text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
                                title="Copy public link"
                              >
                                {copiedId === prop.id ? '✓ Copied' : '🔗 Link'}
                              </button>
                              <button
                                onClick={() => handleDeleteListing(prop.id, prop.title)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete listing"
                              >
                                🗑️
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

      {/* TAB 2: INQUIRIES & LEADS */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#111111] font-editorial">
              Buyer Inquiries & Leads Inbox
            </h2>
            <span className="text-xs text-[#555555]">
              Direct contact requests sent by interested buyers.
            </span>
          </div>

          {dashboardData.inquiries.length === 0 ? (
            <div className="glass-panel-luxury p-12 text-center rounded-3xl border border-[#2B2B2B]/15 bg-white space-y-3">
              <p className="text-sm font-semibold text-[#555555]">
                No buyer inquiries received yet.
              </p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                When visitors browse your listings and click "Send Inquiry to Seller", their contact info and message will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="glass-panel-luxury p-6 rounded-2xl border border-[#2B2B2B]/15 bg-white shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#111111]">{inq.name}</h4>
                      <p className="text-[11px] text-gray-500 font-mono">
                        {new Date(inq.created_at).toLocaleDateString()} at{' '}
                        {new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleInquiryStatus(inq.id, inq.status)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        inq.status === 'unread'
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      ● {inq.status === 'unread' ? 'Unread (Click to Mark Contacted)' : 'Contacted'}
                    </button>
                  </div>

                  <div className="p-3 bg-[#F9F9F9] rounded-xl text-xs text-[#222222] italic">
                    "{inq.message}"
                  </div>

                  <div className="pt-2 border-t border-[#2B2B2B]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 text-[11px] text-[#555555]">
                      <div>Email: <a href={`mailto:${inq.email}`} className="font-semibold text-[#111111] underline">{inq.email}</a></div>
                      {inq.phone && <div>Phone: <span className="font-semibold text-[#111111]">{inq.phone}</span></div>}
                    </div>

                    <a
                      href={`mailto:${inq.email}?subject=Regarding your TwistMS property inquiry`}
                      className="btn-luxury px-3.5 py-1.5 rounded-lg text-[11px] font-bold"
                    >
                      Reply to Buyer
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PLAN SELECTION (DIRECT PICK - NO PAYMENT GATEWAY!) */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#111111] font-editorial">
              Account Syndication Plan
            </h2>
            <p className="text-xs text-[#555555] mt-1">
              Select any tier below to instantly update your account. No payment gateway or credit card required.
            </p>
          </div>

          {planMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
              ✓ {planMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div
              className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all bg-white ${
                currentPlan === 'Free'
                  ? 'border-[#111111] shadow-xl ring-2 ring-[#111111]'
                  : 'border-[#2B2B2B]/15 hover:border-[#888888]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#111111] font-editorial">Free Plan</h3>
                  {currentPlan === 'Free' && (
                    <span className="px-2 py-0.5 bg-[#111111] text-white text-[10px] font-mono font-bold rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-4 text-3xl font-extrabold text-[#111111] font-editorial">$0</div>
                <p className="text-xs text-[#666666] mt-1">For individual home sellers</p>

                <div className="mt-6 space-y-2.5 text-xs text-[#222222]">
                  <p className="font-bold text-amber-700 flex items-center gap-1.5">
                    <span>⏳</span> Erased / Expired after 90 days
                  </p>
                  <p>✓ 5–100 Photos support</p>
                  <p>✓ Seller analytics & real-time views</p>
                  <p>✓ Direct buyer inquiries</p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#2B2B2B]/10">
                <button
                  onClick={() => handlePlanChange('Free')}
                  disabled={currentPlan === 'Free'}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    currentPlan === 'Free'
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'btn-luxury'
                  }`}
                >
                  {currentPlan === 'Free' ? 'Active Plan' : 'Select Free Plan'}
                </button>
              </div>
            </div>

            {/* Paid Plan */}
            <div
              className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all bg-white relative ${
                currentPlan === 'Paid'
                  ? 'border-[#111111] shadow-xl ring-2 ring-[#111111]'
                  : 'border-[#2B2B2B]/15 hover:border-[#888888]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-[#111111] font-editorial">Paid Verified</h3>
                    <span className="text-[10px] font-mono text-[#666666]">180-Day Syndication</span>
                  </div>
                  {currentPlan === 'Paid' && (
                    <span className="px-2 py-0.5 bg-[#111111] text-white text-[10px] font-mono font-bold rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-4 text-3xl font-extrabold text-[#111111] font-editorial">$49</div>
                <p className="text-xs text-[#666666] mt-1">Direct pick — zero payment barrier</p>

                <div className="mt-6 space-y-2.5 text-xs text-[#222222]">
                  <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span>✓</span> Active for 180 Days (6 Months)
                  </p>
                  <p>✓ Verified Deed Badge</p>
                  <p>✓ Priority search ranking</p>
                  <p>✓ Social media promotion spotlight</p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#2B2B2B]/10">
                <button
                  onClick={() => handlePlanChange('Paid')}
                  disabled={currentPlan === 'Paid'}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    currentPlan === 'Paid'
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'btn-luxury'
                  }`}
                >
                  {currentPlan === 'Paid' ? 'Active Plan' : 'Switch to Paid Verified'}
                </button>
              </div>
            </div>

            {/* Premium Plan */}
            <div
              className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all bg-white ${
                currentPlan === 'Premium'
                  ? 'border-[#111111] shadow-xl ring-2 ring-[#111111]'
                  : 'border-[#2B2B2B]/15 hover:border-[#888888]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-[#111111] font-editorial">Premium Elite</h3>
                    <span className="text-[10px] font-mono text-[#666666]">365-Day Syndication</span>
                  </div>
                  {currentPlan === 'Premium' && (
                    <span className="px-2 py-0.5 bg-[#111111] text-white text-[10px] font-mono font-bold rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-4 text-3xl font-extrabold text-[#111111] font-editorial">$129</div>
                <p className="text-xs text-[#666666] mt-1">Full 1-year elite syndication</p>

                <div className="mt-6 space-y-2.5 text-xs text-[#222222]">
                  <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                    <span>👑</span> Active for 365 Days (1 Full Year)
                  </p>
                  <p>✓ Top featured home page placement</p>
                  <p>✓ Multi-channel video promotion</p>
                  <p>✓ Dedicated client concierge</p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#2B2B2B]/10">
                <button
                  onClick={() => handlePlanChange('Premium')}
                  disabled={currentPlan === 'Premium'}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    currentPlan === 'Premium'
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'btn-luxury'
                  }`}
                >
                  {currentPlan === 'Premium' ? 'Active Plan' : 'Switch to Premium Elite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Property Edit Modal for Admin/Seller */}
      <EditPropertyModal
        isOpen={!!editingProperty}
        property={editingProperty}
        onClose={() => setEditingProperty(null)}
        onSaved={() => {
          setEditingProperty(null);
          loadDashboard();
        }}
      />
    </div>
  );
}

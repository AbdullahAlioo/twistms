import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScrollReveal from '../components/common/ScrollReveal';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    agencyName: '',
    plan: 'Free', // Free, Paid, Premium
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanSelect = (planKey) => {
    setFormData((prev) => ({ ...prev, plan: planKey }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
        role: 'seller',
        plan: formData.plan,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20 space-y-8">
      <ScrollReveal direction="down">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#6E6E6E] font-extrabold">
            Join TwistMS Syndicate
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] font-editorial">
            Create Seller Account & Choose Plan
          </h1>
          <p className="text-xs text-[#555555] max-w-xl mx-auto">
            Choose your syndication plan with zero payment barrier. Free plan listings automatically expire after 90 days.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={50}>
        <div className="glass-panel-luxury p-8 sm:p-10 rounded-3xl border border-[#2B2B2B]/15 bg-white shadow-xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>⚠️</span>
                <span>{error.includes('rate limit') ? 'Supabase Email Rate Limit Exceeded' : 'Registration Alert'}</span>
              </div>
              <p className="leading-relaxed">
                {error.includes('rate limit')
                  ? 'Supabase limits free projects to 3 confirmation emails per hour by default. To disable this permanently: Go to Supabase Dashboard → Authentication → Providers → Email → Turn OFF "Confirm email" → Save.'
                  : error}
              </p>
              {error.includes('rate limit') && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('twistms_current_user_v2', JSON.stringify({
                        id: `seller-${Date.now()}`,
                        email: formData.email,
                        full_name: formData.fullName || 'Seller',
                        role: 'seller',
                        current_plan: formData.plan,
                        phone: formData.phone,
                      }));
                      window.location.href = '/dashboard';
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#111111] text-white font-bold text-[11px] hover:bg-[#333333] transition-colors"
                  >
                    ⚡ Continue to Seller Dashboard (Bypass Rate Limit) →
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Account Credentials */}
            <div className="space-y-4">
              <h2 className="text-sm font-mono uppercase font-bold text-[#111111] tracking-wider border-b border-[#2B2B2B]/10 pb-2">
                1. Seller Identity & Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Julian Montgomery"
                    className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#888888] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="julian@luxuryrealty.com"
                    className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#888888] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">
                    Direct Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (512) 555-0188"
                    className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#888888] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">
                    Create Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#888888] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Choose Plan (No payment gateway needed - direct pick!) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2B2B2B]/10 pb-2">
                <h2 className="text-sm font-mono uppercase font-bold text-[#111111] tracking-wider">
                  2. Choose Your Account Plan (Instant Access — No Credit Card Required)
                </h2>
                <span className="text-[11px] text-[#6E6E6E] font-medium mt-1 sm:mt-0">
                  Select any tier to activate immediately
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Free Plan */}
                <div
                  onClick={() => handlePlanSelect('Free')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.plan === 'Free'
                      ? 'border-[#111111] bg-[#FAFAFA] shadow-md ring-1 ring-[#111111]'
                      : 'border-[#2B2B2B]/15 bg-white hover:border-[#888888]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-[#111111] font-editorial">Free Plan</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'Free' ? 'border-[#111111] bg-[#111111]' : 'border-gray-300'}`}>
                      {formData.plan === 'Free' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-[#111111]">$0</div>
                  <p className="text-[11px] text-[#666666] mt-1 font-medium">Standard Homeowner entry</p>
                  
                  <div className="mt-3 pt-3 border-t border-[#2B2B2B]/10 space-y-1.5 text-[11px]">
                    <p className="text-amber-700 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Erased / Expired after 90 days
                    </p>
                    <p className="text-[#444444]">✓ Full Seller Analytics & Views</p>
                    <p className="text-[#444444]">✓ Buyer Lead Inbox</p>
                  </div>
                </div>

                {/* Paid Plan */}
                <div
                  onClick={() => handlePlanSelect('Paid')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    formData.plan === 'Paid'
                      ? 'border-[#111111] bg-[#FAFAFA] shadow-md ring-1 ring-[#111111]'
                      : 'border-[#2B2B2B]/15 bg-white hover:border-[#888888]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm text-[#111111] font-editorial">Paid Verified</span>
                      <span className="ml-2 text-[9px] font-mono font-bold bg-[#EAEAEA] text-[#222222] px-1.5 py-0.5 rounded">Popular</span>
                    </div>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'Paid' ? 'border-[#111111] bg-[#111111]' : 'border-gray-300'}`}>
                      {formData.plan === 'Paid' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-[#111111]">$49 <span className="text-xs font-normal text-gray-500">/ 180 Days</span></div>
                  <p className="text-[11px] text-[#666666] mt-1 font-medium">Verified Real Estate Deed</p>
                  
                  <div className="mt-3 pt-3 border-t border-[#2B2B2B]/10 space-y-1.5 text-[11px]">
                    <p className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Active for 180 Days (6 Months)
                    </p>
                    <p className="text-[#444444]">✓ Verified Deed Badge</p>
                    <p className="text-[#444444]">✓ Prioritized search ranking</p>
                  </div>
                </div>

                {/* Premium Plan */}
                <div
                  onClick={() => handlePlanSelect('Premium')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    formData.plan === 'Premium'
                      ? 'border-[#111111] bg-[#FAFAFA] shadow-md ring-1 ring-[#111111]'
                      : 'border-[#2B2B2B]/15 bg-white hover:border-[#888888]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-[#111111] font-editorial">Premium Elite</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'Premium' ? 'border-[#111111] bg-[#111111]' : 'border-gray-300'}`}>
                      {formData.plan === 'Premium' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-[#111111]">$129 <span className="text-xs font-normal text-gray-500">/ 365 Days</span></div>
                  <p className="text-[11px] text-[#666666] mt-1 font-medium">Nationwide Syndication</p>
                  
                  <div className="mt-3 pt-3 border-t border-[#2B2B2B]/10 space-y-1.5 text-[11px]">
                    <p className="text-indigo-700 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      Active for 365 Days (1 Full Year)
                    </p>
                    <p className="text-[#444444]">✓ Top Featured Placement</p>
                    <p className="text-[#444444]">✓ Social Push & VIP Leads</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl text-xs font-bold btn-luxury shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Your Account...' : `Register & Activate ${formData.plan} Plan`}
                <span>→</span>
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-[#555555]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#111111] underline hover:text-black">
              Sign In
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

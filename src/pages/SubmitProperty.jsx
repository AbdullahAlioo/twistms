import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ScrollReveal from '../components/common/ScrollReveal';
import MediaUploader from '../components/common/MediaUploader';
import { LISTING_RULES } from '../config/listingRules';
import { useAuth } from '../context/AuthContext';
import { createPropertyListing, convertFileToWebImage } from '../lib/supabase';

export default function SubmitProperty() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const queryPlan = searchParams.get('plan');

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdListing, setCreatedListing] = useState(null);
  const [refToken] = useState(() => `#TX-${Math.floor(1000 + Math.random() * 9000)}`);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [mediaError, setMediaError] = useState('');

  const { photos: PHOTO_LIMIT, videos: VIDEO_LIMIT } = LISTING_RULES;
  const mediaValid =
    photos.length >= PHOTO_LIMIT.min && photos.length <= PHOTO_LIMIT.max &&
    videos.length >= VIDEO_LIMIT.min && videos.length <= VIDEO_LIMIT.max;

  const goToStep3 = () => {
    if (!mediaValid) {
      const parts = [];
      if (photos.length < PHOTO_LIMIT.min) parts.push(`at least ${PHOTO_LIMIT.min} photos`);
      if (videos.length < VIDEO_LIMIT.min) parts.push(`at least ${VIDEO_LIMIT.min} video`);
      setMediaError(`Please add ${parts.join(' and ')} to continue.`);
      return;
    }
    setMediaError('');
    setStep(3);
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Residential',
    type: 'Sale',
    price: '',
    address: '',
    city: '',
    stateCode: '',
    zip: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    acreage: '',
    description: '',
    locationUrl: '', // Google Maps link / pin
    plan: 'Free', // Default to Free (90-day expiry rule)
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    hasDeed: true,
    hasTaxReceipt: true,
  });

  // Pre-fill user data if authenticated or plan from URL
  useEffect(() => {
    if (queryPlan && ['Free', 'Paid', 'Premium'].includes(queryPlan)) {
      setFormData((prev) => ({ ...prev, plan: queryPlan }));
    }
    if (user || profile) {
      setFormData((prev) => ({
        ...prev,
        ownerName: prev.ownerName || profile?.full_name || '',
        ownerEmail: prev.ownerEmail || user?.email || '',
        ownerPhone: prev.ownerPhone || profile?.phone || '',
        plan: queryPlan || prev.plan || profile?.current_plan || 'Free',
      }));
    }
  }, [user, profile, queryPlan]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Convert all uploaded photos into permanent universal web images (works on all phones)
      const convertedImages = await Promise.all(
        photos.map((p) => convertFileToWebImage(p, formData.category))
      );

      const imageUrls = convertedImages.filter(Boolean);
      if (imageUrls.length === 0) {
        imageUrls.push(
          formData.category === 'Land'
            ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'
            : formData.category === 'Commercial'
            ? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'
            : formData.category === 'Rental'
            ? 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
            : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
        );
      }

      const res = await createPropertyListing({
        title: formData.title,
        category: formData.category,
        type: formData.type,
        price: Number(formData.price) || 0,
        address: formData.address,
        city: formData.city,
        state: formData.stateCode || formData.city || 'Verified Location',
        stateCode: formData.stateCode || '',
        zip: formData.zip || '',
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        sqft: Number(formData.sqft) || 0,
        acreage: Number(formData.acreage) || 0,
        description: formData.description || 'Stunning luxury real estate with deed verification.',
        locationUrl: formData.locationUrl || '',
        plan: formData.plan,
        images: imageUrls,
        videos: videos.map((v) => v.name || 'video.mp4'),
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        hasDeed: formData.hasDeed,
        hasTaxReceipt: formData.hasTaxReceipt,
      }, user);

      setCreatedListing(res.data);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Error creating listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Page Header */}
      <ScrollReveal direction="down">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#6E6E6E] font-extrabold">
            Seller Syndication & Deed Portal
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#111111] font-editorial">
            Submit Property & Choose Plan
          </h1>
          <p className="text-sm text-[#2B2B2B] max-w-xl mx-auto font-medium leading-relaxed">
            All listings enter public syndication. Choose Free Plan for 90-day syndication, or pick Paid/Premium with zero checkout barrier.
          </p>
        </div>
      </ScrollReveal>

      {/* Step Progress Tracker */}
      <ScrollReveal direction="up" delay={50}>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono">
          <div className={`px-4 py-2 rounded-full border transition-all ${step === 1 ? 'bg-[#111111] text-white border-[#111111] font-bold shadow-md' : 'bg-white text-[#2B2B2B] border-[#2B2B2B]/25 font-semibold'}`}>
            01. Specs & Location
          </div>
          <span className="text-[#6E6E6E] font-bold">→</span>
          <div className={`px-4 py-2 rounded-full border transition-all ${step === 2 ? 'bg-[#111111] text-white border-[#111111] font-bold shadow-md' : 'bg-white text-[#2B2B2B] border-[#2B2B2B]/25 font-semibold'}`}>
            02. Media & Deed Compliance
          </div>
          <span className="text-[#6E6E6E] font-bold">→</span>
          <div className={`px-4 py-2 rounded-full border transition-all ${step === 3 ? 'bg-[#111111] text-white border-[#111111] font-bold shadow-md' : 'bg-white text-[#2B2B2B] border-[#2B2B2B]/25 font-semibold'}`}>
            03. Syndication Tier & Instant Activation
          </div>
        </div>
      </ScrollReveal>

      {/* Main Glass Card Form */}
      <ScrollReveal direction="up" delay={100}>
        <div className="glass-panel-luxury p-8 sm:p-12 rounded-3xl border border-[#2B2B2B]/15 shadow-2xl bg-white">
          
          {submitted ? (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-3xl font-bold font-editorial">
                ✓
              </div>
              <h2 className="text-3xl font-extrabold text-[#111111] font-editorial">
                Property Successfully Syndicated!
              </h2>
              <p className="text-xs text-[#2B2B2B] max-w-md mx-auto leading-relaxed font-medium">
                Your listing for <span className="font-bold text-[#111111]">{formData.title || 'the submitted parcel'}</span> has been activated under the <span className="font-bold text-[#111111]">{formData.plan} Plan</span> (Ref: <span className="font-mono text-[#6E6E6E] font-bold">{refToken}</span>).
              </p>

              {formData.plan === 'Free' ? (
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⏳</span> 90-Day Free Plan Duration Notice
                  </p>
                  <p>
                    This listing is scheduled to remain active for 90 days. It will automatically be erased and archived after 90 days unless upgraded.
                  </p>
                </div>
              ) : (
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>👑</span> {formData.plan} Plan Activated Instantly
                  </p>
                  <p>
                    Your listing is verified and prioritized with extended syndication and social media spotlight!
                  </p>
                </div>
              )}

              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <Link to="/dashboard" className="btn-luxury px-6 py-3 rounded-xl text-xs font-bold shadow-md">
                  Go to Seller Dashboard (Track Views & Leads)
                </Link>
                {createdListing && (
                  <Link
                    to={`/property/${createdListing.id}`}
                    className="btn-luxury-outline px-6 py-3 rounded-xl text-xs font-bold"
                  >
                    View Public Post
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* STEP 1: Specs & Location */}
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-[#111111] font-editorial border-b border-[#2B2B2B]/15 pb-3">
                    Step 1: Property Identity & Physical Specifications
                  </h3>

                  <div>
                    <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Listing Headline / Title *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. Modern Hill Country Estate with Equestrian Barns"
                      className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full bg-white text-xs text-[#111111] font-semibold border border-[#2B2B2B]/25 rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#B4B4B4] cursor-pointer shadow-sm"
                      >
                        <option value="Residential">Residential</option>
                        <option value="Land">Land / Timber / Farm</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Rental">Rental</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Listing Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full bg-white text-xs text-[#111111] font-semibold border border-[#2B2B2B]/25 rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#B4B4B4] cursor-pointer shadow-sm"
                      >
                        <option value="Sale">For Sale</option>
                        <option value="Rent">For Rent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Asking Price ($ USD) *</label>
                      <input
                        type="number"
                        name="price"
                        required
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="e.g. 1450000"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Street Address *</label>
                      <input
                        type="text"
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. 1204 Oak Ridge Dr"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">City / Area *</label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g. Austin or Islamabad"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">State / Province</label>
                      <input
                        type="text"
                        name="stateCode"
                        value={formData.stateCode}
                        onChange={handleChange}
                        placeholder="e.g. TX, Punjab, London"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Bedrooms</label>
                      <input
                        type="number"
                        name="bedrooms"
                        value={formData.bedrooms}
                        onChange={handleChange}
                        placeholder="4"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Bathrooms</label>
                      <input
                        type="number"
                        step="0.5"
                        name="bathrooms"
                        value={formData.bathrooms}
                        onChange={handleChange}
                        placeholder="3.5"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Acreage</label>
                      <input
                        type="number"
                        step="0.1"
                        name="acreage"
                        value={formData.acreage}
                        onChange={handleChange}
                        placeholder="10.5"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Square Feet</label>
                      <input
                        type="number"
                        name="sqft"
                        value={formData.sqft}
                        onChange={handleChange}
                        placeholder="3800"
                        className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Google Maps Pin & Direct Directions URL */}
                  <div>
                    <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold flex flex-wrap items-center justify-between gap-1">
                      <span>Google Maps Location Link, Map Pin, or GPS Coordinates</span>
                      <span className="text-[10px] text-[#6E6E6E] font-normal normal-case">
                        (Google Maps link or coordinates like 33.7214, 73.0583)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="locationUrl"
                      value={formData.locationUrl}
                      onChange={handleChange}
                      placeholder="e.g. https://maps.app.goo.gl/... or 33.7214, 73.0583 or Google Maps URL"
                      className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                    />
                    <p className="text-[10.5px] text-[#555555] mt-1 font-medium">
                      Tip: You can paste a link from Google Maps (Share → Copy link) or enter latitude/longitude coordinates (e.g. 33.7214, 73.0583) for an exact live satellite preview.
                    </p>
                  </div>

                  {/* Description / Architectural Highlights */}
                  <div>
                    <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">
                      Property Overview & Description *
                    </label>
                    <textarea
                      name="description"
                      rows={4}
                      required
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Detail the parcel highlights, architectural qualities, topography, access roads, utilities, privacy, or deed status..."
                      className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="btn-luxury px-6 py-3.5 rounded-xl text-xs font-bold"
                    >
                      Continue to Step 2: Media & Legal Deeds →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Media & Legal Deed Compliance */}
              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-[#111111] font-editorial border-b border-[#2B2B2B]/15 pb-3">
                    Step 2: Legal Verification & Media Files
                  </h3>

                  <p className="text-xs text-[#555555] font-medium -mt-2">
                    Add {PHOTO_LIMIT.min}–{PHOTO_LIMIT.max} photos and {VIDEO_LIMIT.min}–{VIDEO_LIMIT.max} videos. The first photo becomes the listing cover.
                  </p>
                  <MediaUploader kind="photo" files={photos} onChange={(f) => { setPhotos(f); setMediaError(''); }} min={PHOTO_LIMIT.min} max={PHOTO_LIMIT.max} />
                  <MediaUploader kind="video" files={videos} onChange={(f) => { setVideos(f); setMediaError(''); }} min={VIDEO_LIMIT.min} max={VIDEO_LIMIT.max} />
                  {mediaError && (
                    <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">{mediaError}</p>
                  )}

                  {/* Legal Attestation */}
                  <div className="p-5 rounded-2xl bg-[#EFEFEF]/60 border border-[#B4B4B4]/40 space-y-3">
                    <h4 className="text-xs font-bold text-[#111111] uppercase font-mono">
                      Administrative Compliance Checklist
                    </h4>
                    <label className="flex items-start gap-2.5 text-xs text-[#111111] cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        name="hasDeed"
                        checked={formData.hasDeed}
                        onChange={handleChange}
                        className="mt-0.5 accent-[#2B2B2B]"
                      />
                      <span>I confirm I possess the recorded Grant Deed, Title Policy, or written representative authority for this parcel.</span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs text-[#111111] cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        name="hasTaxReceipt"
                        checked={formData.hasTaxReceipt}
                        onChange={handleChange}
                        className="mt-0.5 accent-[#2B2B2B]"
                      />
                      <span>I confirm current county property tax records are current without unresolved ownership liens.</span>
                    </label>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn-luxury-outline px-5 py-3 rounded-xl text-xs font-bold"
                    >
                      ← Back to Step 1
                    </button>
                    <button
                      type="button"
                      onClick={goToStep3}
                      aria-disabled={!mediaValid}
                      className={`btn-luxury px-6 py-3.5 rounded-xl text-xs font-bold ${mediaValid ? '' : 'opacity-60'}`}
                    >
                      Continue to Step 3: Select Plan →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Plan Selection & Instant Submission (NO PAYMENT GATEWAY) */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-[#2B2B2B]/15 pb-3">
                    <h3 className="text-xl font-bold text-[#111111] font-editorial">
                      Step 3: Select Plan & Launch Post
                    </h3>
                    <p className="text-xs text-[#555555] mt-1">
                      Pick your syndication tier. No payment gateway or card needed — instantaneous post syndication.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Free Plan */}
                    <div
                      onClick={() => setFormData({ ...formData, plan: 'Free' })}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.plan === 'Free' ? 'border-[#111111] bg-[#FAFAFA] shadow-md ring-1 ring-[#111111]' : 'border-[#2B2B2B]/15 bg-white hover:border-[#888888]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono text-[#555555] uppercase font-bold">Standard Tier</span>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'Free' ? 'border-[#111111] bg-[#111111]' : 'border-gray-300'}`}>
                          {formData.plan === 'Free' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-[#111111] font-editorial mt-1">Free Listing</h4>
                      <p className="text-2xl font-extrabold font-editorial mt-1 text-[#111111]">$0</p>
                      
                      <div className="mt-3 pt-3 border-t border-[#2B2B2B]/10 space-y-1 text-[11px]">
                        <p className="text-amber-700 font-bold flex items-center gap-1">
                          <span>⏳</span> Erased after 90 days
                        </p>
                        <p className="text-[#555555]">Standard public syndication</p>
                        <p className="text-[#555555]">Seller views tracking included</p>
                      </div>
                    </div>

                    {/* Paid Plan */}
                    <div
                      onClick={() => setFormData({ ...formData, plan: 'Paid' })}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                        formData.plan === 'Paid' ? 'border-[#111111] bg-[#FAFAFA] shadow-md ring-1 ring-[#111111]' : 'border-[#2B2B2B]/15 bg-white hover:border-[#888888]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono text-[#6E6E6E] uppercase font-extrabold">Verified</span>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'Paid' ? 'border-[#111111] bg-[#111111]' : 'border-gray-300'}`}>
                          {formData.plan === 'Paid' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-[#111111] font-editorial mt-1">Paid Verified</h4>
                      <p className="text-2xl font-extrabold font-editorial mt-1 text-[#111111]">$49</p>

                      <div className="mt-3 pt-3 border-t border-[#2B2B2B]/10 space-y-1 text-[11px]">
                        <p className="text-emerald-700 font-bold flex items-center gap-1">
                          <span>✓</span> Active for 180 days (6 mo)
                        </p>
                        <p className="text-[#555555]">Verified Deed Badge</p>
                        <p className="text-[#555555]">Prioritized search rankings</p>
                      </div>
                    </div>

                    {/* Premium Plan */}
                    <div
                      onClick={() => setFormData({ ...formData, plan: 'Premium' })}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.plan === 'Premium' ? 'border-[#111111] bg-[#FAFAFA] shadow-md ring-1 ring-[#111111]' : 'border-[#2B2B2B]/15 bg-white hover:border-[#888888]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono text-[#555555] uppercase font-bold">Nationwide</span>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.plan === 'Premium' ? 'border-[#111111] bg-[#111111]' : 'border-gray-300'}`}>
                          {formData.plan === 'Premium' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-[#111111] font-editorial mt-1">Premium Elite</h4>
                      <p className="text-2xl font-extrabold font-editorial mt-1 text-[#111111]">$129</p>

                      <div className="mt-3 pt-3 border-t border-[#2B2B2B]/10 space-y-1 text-[11px]">
                        <p className="text-indigo-700 font-bold flex items-center gap-1">
                          <span>👑</span> Active for 365 days (1 yr)
                        </p>
                        <p className="text-[#555555]">Top homepage hero banner</p>
                        <p className="text-[#555555]">Social media campaign push</p>
                      </div>
                    </div>
                  </div>

                  {/* Submitter Contact */}
                  <div className="space-y-3 pt-4 border-t border-[#2B2B2B]/15">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider font-extrabold text-[#111111]">
                        Direct Seller Contact Information
                      </h4>
                      <p className="text-[11px] text-[#555555]">
                        Buyers will use these direct contact credentials to call, email, or chat with you on WhatsApp from your live listing.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Seller Full Name *</label>
                        <input
                          type="text"
                          name="ownerName"
                          required
                          value={formData.ownerName}
                          onChange={handleChange}
                          placeholder="e.g. David Vance"
                          className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Seller Email Address *</label>
                        <input
                          type="email"
                          name="ownerEmail"
                          required
                          value={formData.ownerEmail}
                          onChange={handleChange}
                          placeholder="david@domain.com"
                          className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1.5 font-bold">Seller Phone / WhatsApp *</label>
                        <input
                          type="tel"
                          name="ownerPhone"
                          required
                          value={formData.ownerPhone}
                          onChange={handleChange}
                          placeholder="+1 (512) 555-0199"
                          className="w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/25 rounded-xl px-4 py-3 placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#B4B4B4] shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="btn-luxury-outline px-5 py-3 rounded-xl text-xs font-bold"
                    >
                      ← Back to Step 2
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-luxury px-8 py-3.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      {submitting ? 'Publishing Listing...' : `Publish Listing on ${formData.plan} Plan →`}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}

        </div>
      </ScrollReveal>

    </div>
  );
}

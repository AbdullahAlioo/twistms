import React, { useState } from 'react';
import { updatePropertyListing } from '../../lib/supabase';

export default function EditPropertyModal({ property, isOpen, onClose, onUpdated, isAdmin = false }) {
  if (!isOpen || !property) return null;

  const [formData, setFormData] = useState({
    title: property.title || '',
    category: property.category || 'Residential',
    type: property.type || 'Sale',
    price: property.price || 0,
    pricePeriod: property.pricePeriod || property.price_period || '',
    address: property.address || '',
    city: property.city || '',
    stateCode: property.stateCode || property.state_code || '',
    zip: property.zip || '',
    locationUrl: property.location_url || property.locationUrl || '',
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    sqft: property.sqft || 0,
    acreage: property.acreage || 0,
    description: property.description || '',
    plan: property.plan || 'Free',
    status: property.status || 'pending_review',
    verified: Boolean(property.verified),
    ownerName: property.owner_name || property.ownerName || property.agent?.name || '',
    ownerEmail: property.owner_email || property.ownerEmail || property.agent?.email || '',
    ownerPhone: property.owner_phone || property.ownerPhone || property.agent?.phone || '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const res = await updatePropertyListing(property.id, formData);
      if (res.success) {
        if (onUpdated) onUpdated();
        onClose();
      } else {
        setErrorMsg('Failed to update listing. Please check inputs.');
      }
    } catch (err) {
      setErrorMsg('Error saving updates: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white rounded-3xl shadow-2xl border border-[#2B2B2B]/20 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-[#181818] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B4B4B4] font-bold">
                {isAdmin ? 'TwistMS Admin Portal' : 'Seller Listing Editor'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white">
                ID: {property.id?.substring(0, 8)}...
              </span>
            </div>
            <h3 className="text-xl font-bold font-editorial mt-0.5 text-[#FAFAFA]">
              Edit Property Listing
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold">
              {errorMsg}
            </div>
          )}

          {/* Core Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-editorial text-[#111111] border-b pb-2">
              1. Title & Financials
            </h4>
            <div>
              <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                Listing Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-4 py-2.5 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5 font-medium"
                >
                  <option value="Residential">Residential</option>
                  <option value="Land">Land / Farm</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Rental">Rental</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                  Listing Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5 font-medium"
                >
                  <option value="Sale">For Sale</option>
                  <option value="Rent">For Rent</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                  Asking Price ($ USD) *
                </label>
                <input
                  type="number"
                  name="price"
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-4 py-2.5 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Location & Maps */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-editorial text-[#111111] border-b pb-2">
              2. Location & Google Maps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                  City / Area
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                  State / Province
                </label>
                <input
                  type="text"
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold flex justify-between">
                <span>Google Maps Link or GPS Coordinates</span>
                <span className="text-[10px] text-gray-500 font-normal">e.g. https://maps.app.goo.gl/... or 33.7214, 73.0583</span>
              </label>
              <input
                type="text"
                name="locationUrl"
                value={formData.locationUrl}
                onChange={handleChange}
                placeholder="Google Maps link or latitude, longitude"
                className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5"
              />
            </div>
          </div>

          {/* Specs & Description */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-editorial text-[#111111] border-b pb-2">
              3. Specifications & Description
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-600">Bedrooms</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-600">Bathrooms</label>
                <input
                  type="number"
                  step="0.5"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-600">Square Feet</label>
                <input
                  type="number"
                  name="sqft"
                  value={formData.sqft}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-600">Acreage</label>
                <input
                  type="number"
                  step="0.1"
                  name="acreage"
                  value={formData.acreage}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#111111] uppercase mb-1 font-bold">
                Detailed Description *
              </label>
              <textarea
                name="description"
                rows={4}
                required
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-4 py-2.5 font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* Seller / Contact Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-editorial text-[#111111] border-b pb-2">
              4. Seller Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-600">Seller Name</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-600">Seller Email</label>
                <input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-600">Seller Phone / WhatsApp</label>
                <input
                  type="tel"
                  name="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-[#2B2B2B]/25 rounded-xl px-3 py-2.5"
                />
              </div>
            </div>
          </div>

          {/* Admin Verification & Status Controls */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-amber-950 flex items-center gap-1.5">
              <span>🛡️</span> Listing Status & Verification Tier
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-amber-900 mb-1">
                  Syndication Plan
                </label>
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-amber-300 rounded-xl px-3 py-2 font-bold"
                >
                  <option value="Free">Free (90-Day)</option>
                  <option value="Paid">Paid Verified (180-Day)</option>
                  <option value="Premium">Premium Elite (365-Day)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-amber-900 mb-1">
                  Publication Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-white text-xs border border-amber-300 rounded-xl px-3 py-2 font-bold"
                >
                  <option value="active">Active (Live on Website)</option>
                  <option value="pending_review">Pending Review (Under Verification)</option>
                  <option value="rejected">Rejected / Archived</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                  <input
                    type="checkbox"
                    name="verified"
                    checked={formData.verified}
                    onChange={handleChange}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>Verified Deed Badge</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-luxury px-7 py-2.5 rounded-xl font-bold text-xs shadow-md"
            >
              {saving ? 'Saving Changes...' : 'Save All Changes ✓'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { propertiesData } from '../data/properties';
import { getListingDetails } from '../data/propertyDetails';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { getPropertyById, recordPropertyView, submitPropertyInquiry, verifyPropertyListing } from '../lib/supabase';
import PropertyCard from '../components/common/PropertyCard';
import ScrollReveal from '../components/common/ScrollReveal';
import { whatsappLink } from '../config/brand';
import { EASE } from '../lib/motion';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'details', label: 'Details' },
  { id: 'location', label: 'Location' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'videos', label: 'Videos' },
  { id: 'verification', label: 'Verification' },
  { id: 'contact', label: 'Contact' },
];

const fmtUSD = (n) => `$${Number(n).toLocaleString()}`;

/** Card wrapper with a heading and a one-line explanation, used for every section. */
function InfoSection({ id, title, sub, children }) {
  return (
    <ScrollReveal direction="up" distance={20} duration={600}>
      <section id={id} className="scroll-mt-40 bg-white rounded-2xl border border-[#2B2B2B]/12 shadow-sm p-5 sm:p-7">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#111111] font-editorial">{title}</h2>
        {sub && <p className="text-xs text-[#555555] mt-1 font-medium">{sub}</p>}
        <div className="mt-5">{children}</div>
      </section>
    </ScrollReveal>
  );
}

function FactRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#2B2B2B]/10 last:border-0 text-xs">
      <dt className="text-[#555555] font-semibold">{label}</dt>
      <dd className="text-[#111111] font-bold text-right">{value}</dd>
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(() => propertiesData.find((p) => p.id === id) || null);
  const [loading, setLoading] = useState(!property);

  useEffect(() => {
    let active = true;
    async function loadProp() {
      const live = await getPropertyById(id);
      if (active) {
        setProperty((prev) => live || prev || propertiesData[0]);
        setLoading(false);
      }
    }
    loadProp();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading || !property) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono uppercase text-[#666666] tracking-wider">
          Retrieving Property Deed & Syndication Record...
        </p>
      </div>
    );
  }

  // key: a fresh page (form, lightbox) for every listing
  return <ListingPage key={property.id} property={property} />;
}

function ListingPage({ property }) {
  const reduce = useReducedMotion();
  const info = getListingDetails(property);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const favorited = isFavorite(property.id);

  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [localProp, setLocalProp] = useState(property);

  const isVerified = localProp.verified && localProp.status === 'active';

  const handleAdminVerify = async () => {
    setVerifying(true);
    try {
      await verifyPropertyListing(localProp.id, true);
      setLocalProp((prev) => ({ ...prev, verified: true, status: 'active' }));
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };
  const [inquiryForm, setInquiryForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: `I'm interested in ${property.title} (${property.id.toUpperCase()}). Please send more information.`
  });
  const [lightbox, setLightbox] = useState(null); // photo index or null
  const [shareMsg, setShareMsg] = useState('');

  const pricePerAcre = property.acreage > 0 && !property.pricePeriod ? Math.round(property.price / property.acreage) : null;
  const locationLine = [property.city, info.county, `${property.stateCode} ${property.zip}`].filter(Boolean).join(', ');
  // Closest matches first (same category or state), topped up to three listings
  const others = propertiesData.filter((p) => p.id !== property.id);
  const isClose = (p) => p.category === property.category || p.stateCode === property.stateCode;
  const similarList = [...others.filter(isClose), ...others.filter((p) => !isClose(p))].slice(0, 3);

  // Record view on visit
  useEffect(() => {
    window.scrollTo({ top: 0 });
    recordPropertyView(property.id, user?.id);
  }, [property.id, user?.id]);

  // Lightbox keyboard controls
  useEffect(() => {
    if (lightbox === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % info.photos.length);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + info.photos.length) % info.photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, info.photos.length]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied');
    } catch {
      setShareMsg('Copy the address bar link to share');
    }
    setTimeout(() => setShareMsg(''), 2200);
  };

  const quickFacts = [
    { label: 'Price', value: `${fmtUSD(property.price)}${property.pricePeriod || ''}` },
    property.acreage > 0 && { label: 'Acreage', value: `${property.acreage} acres` },
    property.bedrooms > 0 && { label: 'Bedrooms', value: property.bedrooms },
    property.bathrooms > 0 && { label: 'Bathrooms', value: property.bathrooms },
    property.sqft > 0 && { label: 'Living Area', value: `${property.sqft.toLocaleString()} sq ft` },
    { label: 'Type', value: info.propertyType },
  ].filter(Boolean);

  const inputCls =
    'input-luxury w-full bg-white text-xs text-[#111111] font-medium border border-[#2B2B2B]/20 rounded-xl px-3.5 py-2.5 placeholder:text-[#8A8A8A] focus:outline-none shadow-sm';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

      {/* Verification Review Notice */}
      {!isVerified && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-950 font-editorial">
                Under TwistMS Verification Review
              </p>
              <p className="text-[11px] sm:text-xs text-amber-800 font-medium mt-0.5">
                This listing was submitted and is currently being verified against deed records by the TwistMS Admin desk. It will be syndicated across the public marketplace once approved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdminVerify}
            disabled={verifying}
            className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            {verifying ? 'Verifying...' : '✓ Approve & Publish Listing'}
          </button>
        </div>
      )}

      {/* 1. Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[#555555] font-semibold">
        <Link to="/" className="hover:text-[#6E6E6E]">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/search" className="hover:text-[#6E6E6E]">Properties</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/search?st=${property.stateCode}`} className="hover:text-[#6E6E6E]">{property.state}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#111111] font-bold truncate max-w-[60vw]">{property.title}</span>
      </nav>

      {/* 2. Title, location, price & acreage */}
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#2B2B2B] text-white">{info.status}</span>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#EFEFEF] text-[#2B2B2B] border border-[#B4B4B4]/40">For {property.type}</span>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-white text-[#111111] border border-[#2B2B2B]/15">{property.category}</span>
            {property.verified && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-white text-[#111111] border border-[#2B2B2B]/15 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B4B4B4]" /> Verified Deed
              </span>
            )}
            <span className="text-[10px] font-mono font-bold text-[#555555] tracking-widest">ID {property.id.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111111] font-editorial tracking-tight text-balance">{property.title}</h1>
          <p className="mt-2 text-sm text-[#2B2B2B] font-semibold flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#B4B4B4] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {locationLine}
          </p>
        </div>

        <div className="lg:text-right shrink-0">
          <p className="text-3xl sm:text-4xl font-extrabold text-[#111111] font-editorial">
            {fmtUSD(property.price)}
            {property.pricePeriod && <span className="text-sm font-semibold text-[#555555] ml-1">{property.pricePeriod}</span>}
          </p>
          <p className="text-xs text-[#555555] font-bold mt-1">
            {property.acreage > 0 && <span>{property.acreage} Acres</span>}
            {pricePerAcre && <span> · {fmtUSD(pricePerAcre)} / acre</span>}
          </p>
          <div className="mt-3 flex flex-wrap lg:justify-end gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(property)}
              aria-pressed={favorited}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${favorited ? 'bg-red-500 text-white border-red-500' : 'bg-white text-[#111111] border-[#2B2B2B]/20 hover:border-[#B4B4B4]'}`}
            >
              {favorited ? '♥ Saved' : '♡ Save'}
            </button>
            <button type="button" onClick={handleShare} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-[#111111] border border-[#2B2B2B]/20 hover:border-[#B4B4B4] cursor-pointer">
              {shareMsg || 'Share'}
            </button>
            <button type="button" onClick={() => window.print()} className="hidden sm:inline-block px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-[#111111] border border-[#2B2B2B]/20 hover:border-[#B4B4B4] cursor-pointer">
              Print
            </button>
            <a href="#contact" className="px-4 py-2 rounded-xl text-xs font-bold btn-luxury">Contact Agent</a>
          </div>
        </div>
      </motion.header>

      {/* 3. Photo gallery */}
      <section aria-label="Property photos" className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[300px] sm:h-[420px] md:h-[480px] rounded-2xl overflow-hidden">
        {info.photos.slice(0, 5).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setLightbox(i)}
            className={`relative overflow-hidden bg-[#E8E8E8] group cursor-zoom-in ${i === 0 ? 'md:col-span-2 md:row-span-2' : 'hidden md:block'}`}
            aria-label={`Open photo ${i + 1} of ${info.photos.length}`}
          >
            <img
              src={src}
              alt={i === 0 ? property.title : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
            {i === 0 && (
              <span className="md:hidden absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-[#111111]/85 text-white text-[11px] font-bold">
                {info.photos.length} photos · tap to view
              </span>
            )}
            {i === Math.min(4, info.photos.length - 1) && (
              <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[#111111]/85 text-white text-[11px] font-bold backdrop-blur">
                View all {info.photos.length} photos
              </span>
            )}
          </button>
        ))}
      </section>

      {/* 4. Quick facts */}
      <ScrollReveal direction="up" distance={16} duration={600}>
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-white rounded-2xl border border-[#2B2B2B]/12 shadow-sm divide-x divide-y lg:divide-y-0 divide-[#2B2B2B]/10 overflow-hidden">
          {quickFacts.map((f) => (
            <div key={f.label} className="p-4 text-center">
              <dt className="text-[10px] uppercase tracking-wider font-bold text-[#555555]">{f.label}</dt>
              <dd className="mt-1 text-sm sm:text-base font-extrabold text-[#111111] font-editorial">{f.value}</dd>
            </div>
          ))}
        </dl>
      </ScrollReveal>

      {/* In-page section navigation */}
      <nav aria-label="Listing sections" className="sticky top-24 z-30 -mx-4 sm:mx-0 px-4 sm:px-2 py-2 bg-[#FAFAFA]/95 backdrop-blur border-y sm:border sm:rounded-xl border-[#2B2B2B]/10 flex gap-1 overflow-x-auto no-scrollbar">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-[#2B2B2B] hover:bg-[#EFEFEF] hover:text-[#111111] transition-colors">
            {s.label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: information sequence */}
        <div className="lg:col-span-8 space-y-6">

          <InfoSection id="overview" title="Property Overview" sub="A summary of the property written by the listing agent.">
            <p className="text-sm text-[#2B2B2B] leading-relaxed">{property.description}</p>
          </InfoSection>

          {info.features.length > 0 && (
            <InfoSection id="features" title="Property Features" sub="Key amenities and improvements included with this listing.">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {info.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-xs font-semibold text-[#111111] p-2.5 rounded-xl bg-[#EFEFEF]/50 border border-[#B4B4B4]/20">
                    <svg className="w-4 h-4 text-[#6E6E6E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </InfoSection>
          )}

          <InfoSection id="details" title="Property Details" sub="Price, size and record information at a glance.">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <FactRow label="Listing ID" value={property.id.toUpperCase()} />
                <FactRow label="Status" value={info.status} />
                <FactRow label="Listing Type" value={`For ${property.type}`} />
                <FactRow label="Property Type" value={info.propertyType} />
                <FactRow label="Price" value={`${fmtUSD(property.price)}${property.pricePeriod || ''}`} />
                {pricePerAcre && <FactRow label="Price per Acre" value={fmtUSD(pricePerAcre)} />}
              </div>
              <div>
                <FactRow label="Acreage" value={property.acreage > 0 ? `${property.acreage} acres` : '—'} />
                <FactRow label="Living Area" value={property.sqft > 0 ? `${property.sqft.toLocaleString()} sq ft` : '—'} />
                <FactRow label="Bedrooms / Baths" value={property.bedrooms > 0 ? `${property.bedrooms} bd / ${property.bathrooms} ba` : property.bathrooms > 0 ? `${property.bathrooms} ba` : '—'} />
                <FactRow label="Year Built" value={info.yearBuilt || '—'} />
                <FactRow label="Annual Taxes" value={info.annualTaxes ? fmtUSD(info.annualTaxes) : '—'} />
                <FactRow label="Zoning" value={info.zoning} />
              </div>
            </dl>
          </InfoSection>

          <InfoSection id="location" title="Location & Map Pin" sub="Where the property is, with an interactive map and direct GPS navigation.">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 mb-5">
              <div>
                <FactRow label="Address" value={property.address} />
                <FactRow label="City" value={property.city} />
                <FactRow label="County" value={info.county || '—'} />
              </div>
              <div>
                <FactRow label="State / Region" value={property.state || property.stateCode || '—'} />
                {property.zip && property.zip !== '78701' && (
                  <FactRow label="ZIP / Postal Code" value={property.zip} />
                )}
                <FactRow label="Terrain" value={info.topography} />
              </div>
            </dl>

            {/* Direct Google Maps Action Bar */}
            {(() => {
              const locationUrl = (property.location_url || property.locationUrl || '').trim();
              let iframeEmbedUrl = '';
              let directLink = locationUrl;

              if (locationUrl) {
                if (locationUrl.includes('output=embed') || locationUrl.includes('/embed')) {
                  iframeEmbedUrl = locationUrl;
                } else {
                  // 1. Direct coordinates: "33.7214, 73.0583" or "33.7214,73.0583"
                  const directCoord = locationUrl.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
                  if (directCoord) {
                    iframeEmbedUrl = `https://maps.google.com/maps?q=${directCoord[1]},${directCoord[2]}&z=15&output=embed`;
                    if (!directLink.startsWith('http')) {
                      directLink = `https://www.google.com/maps/search/?api=1&query=${directCoord[1]},${directCoord[2]}`;
                    }
                  } else {
                    // 2. Google Maps @lat,lng
                    const atCoord = locationUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (atCoord) {
                      iframeEmbedUrl = `https://maps.google.com/maps?q=${atCoord[1]},${atCoord[2]}&z=15&output=embed`;
                    } else {
                      // 3. Google Maps protobuf format !3d<lat>!4d<lng>
                      const protoCoord = locationUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
                      if (protoCoord) {
                        iframeEmbedUrl = `https://maps.google.com/maps?q=${protoCoord[1]},${protoCoord[2]}&z=15&output=embed`;
                      } else {
                        // 4. Query param q=lat,lng or q=place
                        const qMatch = locationUrl.match(/[?&](?:q|query)=([^&]+)/);
                        if (qMatch) {
                          iframeEmbedUrl = `https://maps.google.com/maps?q=${qMatch[1]}&z=15&output=embed`;
                        } else {
                          // 5. Place name in URL: /place/Place+Name
                          const placeMatch = locationUrl.match(/\/maps\/place\/([^\/@?]+)/);
                          if (placeMatch) {
                            iframeEmbedUrl = `https://maps.google.com/maps?q=${placeMatch[1]}&z=15&output=embed`;
                          }
                        }
                      }
                    }
                  }
                }
              }

              // Fallback if coordinates were not in the link: build accurate search query without artificial Texas defaults
              if (!iframeEmbedUrl) {
                const parts = [];
                if (property.address && property.address !== 'Confidential Address') parts.push(property.address);
                if (property.city) parts.push(property.city);
                if (property.state && !['Texas', 'TX'].includes(property.state)) parts.push(property.state);
                else if (property.stateCode && !['Texas', 'TX'].includes(property.stateCode)) parts.push(property.stateCode);
                if (property.zip && property.zip !== '78701') parts.push(property.zip);

                const cleanQuery = parts.length > 0 ? parts.join(', ') : (property.city || property.title);
                iframeEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(cleanQuery)}&z=14&output=embed`;

                if (!directLink) {
                  directLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`;
                }
              }

              if (!directLink) {
                directLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.city || property.title)}`;
              }

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#2B2B2B]/12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold shrink-0">
                        📍
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#111111]">
                            {locationUrl ? 'Seller-Provided Verified Map Pin' : 'Google Maps Location'}
                          </p>
                          {locationUrl && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                              Direct Pin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#555555] truncate max-w-xs sm:max-w-md">
                          {locationUrl || `${property.address}, ${property.city}`}
                        </p>
                      </div>
                    </div>
                    <a
                      href={directLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-luxury px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Open in Google Maps</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-[#2B2B2B]/15 h-64 sm:h-80 bg-[#E8E8E8] shadow-inner">
                    <iframe
                      title={`Map of ${property.title}`}
                      src={iframeEmbedUrl}
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              );
            })()}
          </InfoSection>

          {Object.keys(info.utilities).length > 0 && (
            <InfoSection id="utilities" title="Utilities & Access" sub="Power, water, sewer, internet and road access available on site.">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(info.utilities).map(([k, v]) => (
                  <div key={k} className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#2B2B2B]/12">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-[#555555]">{k}</span>
                    <span className="block mt-0.5 text-xs font-bold text-[#111111]">{v}</span>
                  </div>
                ))}
              </div>
            </InfoSection>
          )}

          {info.videos.length > 0 && (
            <InfoSection id="videos" title="Video Tours" sub="Walkthrough and drone videos supplied by the seller (1–5 per listing).">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {info.videos.map((v) => (
                  <a
                    key={v.title}
                    href="#contact"
                    className="group relative block aspect-video rounded-xl overflow-hidden bg-[#111111]"
                    aria-label={`${v.title}: request this video tour`}
                  >
                    <img src={v.poster} alt="" loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-95 group-hover:scale-105 transition-[transform,opacity] duration-700" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-14 h-14 rounded-full bg-[#B4B4B4] text-[#111111] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 ml-0.5 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </span>
                    <span className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-[#0A0A0A]/90 to-transparent text-white text-xs font-bold">{v.title}</span>
                  </a>
                ))}
              </div>
            </InfoSection>
          )}

          <InfoSection id="verification" title="Legal Verification" sub="Documents our review desk checked before this listing went live.">
            <div className="p-4 rounded-xl bg-[#EFEFEF]/60 border border-[#B4B4B4]/30 text-[#111111] text-xs mb-3">
              <span className="font-bold text-[#2B2B2B]">✓ Administrative Compliance Passed:</span> All ownership deeds, property tax receipts, and boundary surveys have been filed and vetted.
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['Grant Deed / Title Policy Record', 'VERIFIED ✓'],
                ['County Property Tax Assessment', 'CURRENT ✓'],
                ['Boundary & Topographic Survey', 'ON FILE ✓'],
              ].map(([doc, st]) => (
                <div key={doc} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#2B2B2B]/10">
                  <span className="text-[#111111] font-bold">{doc}</span>
                  <span className="text-[#2B2B2B] font-mono text-[11px] font-extrabold shrink-0">{st}</span>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-[#555555] font-medium">Syndication tier: <span className="font-bold text-[#6E6E6E]">{property.plan}</span></p>
            </div>
          </InfoSection>
        </div>

        {/* Right column: seller + inquiry (sticky on desktop) */}
        <aside id="contact" className="lg:col-span-4 scroll-mt-40 lg:sticky lg:top-40">
          <div className="bg-white rounded-2xl border border-[#2B2B2B]/12 shadow-xl overflow-hidden">
            {/* Header: Seller profile */}
            <div className="p-5 bg-[#1C1C1C] text-white flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#B4B4B4] text-[#111111] flex items-center justify-center font-editorial font-extrabold text-xl shrink-0">
                {((property.owner_name || property.agent?.name || 'S')[0]).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#D0D0D0] block">
                  {property.agent?.isDirectOwner || property.owner_name ? 'Direct Property Owner / Seller' : 'Listing Agent'}
                </span>
                <h3 className="text-base font-extrabold font-editorial truncate">
                  {property.owner_name || property.agent?.name || 'Verified TwistMS Seller'}
                </h3>
                <p className="text-xs text-white/70 font-medium truncate">
                  {property.agent?.agency || (property.owner_name ? 'Direct Property Owner' : 'TwistMS Elite Advisory')}
                </p>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div className="px-5 pt-4 grid grid-cols-2 gap-2 text-xs">
              <a
                href={`tel:${(property.owner_phone || property.agent?.phone || '+1 (512) 555-0199').replace(/[^+\d]/g, '')}`}
                className="py-2.5 rounded-xl text-center font-bold btn-luxury-outline flex items-center justify-center gap-1.5"
              >
                <span>📞 Call</span>
              </a>
              <a
                href={`mailto:${property.owner_email || property.agent?.email || 'seller@twistms.com'}?subject=${encodeURIComponent(`Inquiry: ${property.title} (${property.id.toUpperCase()})`)}`}
                className="py-2.5 rounded-xl text-center font-bold btn-luxury-outline flex items-center justify-center gap-1.5"
              >
                <span>✉️ Email</span>
              </a>
              <p className="col-span-2 text-[11px] text-[#555555] font-semibold text-center truncate">
                {property.owner_phone || property.agent?.phone || '+1 (512) 555-0199'} · {property.owner_email || property.agent?.email || 'seller@twistms.com'}
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-base font-extrabold text-[#111111] font-editorial">Request Information</h4>
                <p className="text-xs text-[#555555] font-medium">Ask a question or request a showing directly from the seller.</p>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {inquirySent ? (
                  <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5 rounded-xl bg-[#EFEFEF] border border-[#B4B4B4]/40 text-center space-y-2">
                    <p className="font-bold text-sm text-[#2B2B2B]">Inquiry Delivered to Seller!</p>
                    <p className="text-[#555555] text-[11px] font-medium">The listing owner has received your request in their seller dashboard.</p>
                    <button onClick={() => setInquirySent(false)} className="mt-2 text-[#6E6E6E] underline text-xs font-bold cursor-pointer">Send Another Inquiry</button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={false}
                    exit={{ opacity: 0 }}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setInquiryLoading(true);
                      await submitPropertyInquiry({
                        property_id: property.id,
                        property_title: property.title,
                        seller_id: property.user_id || 'demo-seller-101',
                        seller_email: property.owner_email || property.agent?.email,
                        seller_name: property.owner_name || property.agent?.name,
                        buyer_id: user?.id || null,
                        name: inquiryForm.name,
                        email: inquiryForm.email,
                        phone: inquiryForm.phone,
                        message: inquiryForm.message,
                      });
                      setInquiryLoading(false);
                      setInquirySent(true);
                    }}
                    className="space-y-3"
                  >
                    <label className="block">
                      <span className="block text-[11px] text-[#111111] uppercase mb-1 font-bold">Full Name</span>
                      <input
                        type="text"
                        required
                        value={inquiryForm.name}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                        placeholder="e.g. John Doe"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-[#111111] uppercase mb-1 font-bold">Email</span>
                      <input
                        type="email"
                        required
                        value={inquiryForm.email}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                        placeholder="you@domain.com"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-[#111111] uppercase mb-1 font-bold">Phone / WhatsApp</span>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-[#111111] uppercase mb-1 font-bold">Message</span>
                      <textarea
                        rows={3}
                        value={inquiryForm.message}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                        className={inputCls}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={inquiryLoading}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold btn-luxury cursor-pointer"
                    >
                      {inquiryLoading ? 'Sending Inquiry...' : 'Send Inquiry to Seller →'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Direct WhatsApp to Seller */}
              {(() => {
                const sellerPhone = property.owner_phone || property.agent?.phone || '';
                const cleanDigits = sellerPhone.replace(/[^\d]/g, '');
                const sellerWaLink = cleanDigits && cleanDigits.length >= 7
                  ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent(`Hi ${property.owner_name || property.agent?.name || 'there'}, I am inquiring about your listing on TwistMS: "${property.title}" (ID: ${property.id.toUpperCase()}). Is it still available?`)}`
                  : whatsappLink(`Hi, I am inquiring about TwistMS Property ${property.id} (${property.title})`);

                return (
                  <a
                    href={sellerWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold btn-luxury-outline flex items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                  >
                    <span>💬</span> Chat with Seller on WhatsApp
                  </a>
                );
              })()}
            </div>
          </div>
        </aside>
      </div>

      {/* Similar listings */}
      <section className="pt-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] font-editorial">Similar Properties</h2>
        <p className="text-xs text-[#555555] mt-1 font-medium mb-5">Other listings in the same category or state you may want to compare.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {similarList.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="fixed inset-0 z-[100] bg-[#0A0A0A]/95 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
          >
            <div className="flex items-center justify-between p-4 text-white text-xs font-bold">
              <span>{lightbox + 1} / {info.photos.length}</span>
              <button onClick={() => setLightbox(null)} className="px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10 cursor-pointer">Close ✕</button>
            </div>
            <div className="flex-1 relative flex items-center justify-center px-4 pb-4 min-h-0">
              <AnimatePresence mode="wait">
                <motion.img
                  key={lightbox}
                  src={info.photos[lightbox]}
                  alt={`Photo ${lightbox + 1} of ${property.title}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </AnimatePresence>
              <button onClick={() => setLightbox((i) => (i - 1 + info.photos.length) % info.photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer" aria-label="Previous photo">‹</button>
              <button onClick={() => setLightbox((i) => (i + 1) % info.photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl cursor-pointer" aria-label="Next photo">›</button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-4">
              {info.photos.map((src, i) => (
                <button key={src} onClick={() => setLightbox(i)} className={`shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 cursor-pointer ${i === lightbox ? 'border-[#B4B4B4]' : 'border-transparent opacity-60 hover:opacity-100'}`} aria-label={`Show photo ${i + 1}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

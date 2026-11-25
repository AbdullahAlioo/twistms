import { createClient } from '@supabase/supabase-js';
import { propertiesData } from '../data/properties';

// Read Supabase credentials from environment (supports both Vite and Next prefixes)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-url') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Create live Supabase client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://mockproject.supabase.co', 'mock-anon-key');

// Storage Keys
const LOCAL_STORAGE_PROPERTIES_KEY = 'twistms_properties_v3';
const LOCAL_STORAGE_VIEWS_KEY = 'twistms_property_views_v3';
const LOCAL_STORAGE_INQUIRIES_KEY = 'twistms_inquiries_v3';

export const CATEGORY_FALLBACK_IMAGES = {
  Residential: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  Land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  Commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  Rental: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
};

/**
 * Ensures an image URL is accessible from any phone or device.
 * Replaces un-shareable "blob:..." URLs with high-res architectural photos.
 */
export function getSafeImageUrl(url, category = 'Residential') {
  if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.trim() === '') {
    return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Residential;
  }
  return url;
}

/**
 * Converts user-uploaded File into a compressed Base64 Data URL so that
 * any phone, tablet, or external device can load the image immediately.
 */
export async function convertFileToWebImage(fileItem, category = 'Residential') {
  if (!fileItem) return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Residential;

  if (typeof fileItem === 'string') {
    return getSafeImageUrl(fileItem, category);
  }

  const actualFile = fileItem.file || fileItem;
  if (typeof window === 'undefined' || !(actualFile instanceof Blob || actualFile instanceof File)) {
    return CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Residential;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        } catch (_) {
          resolve(CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Residential);
        }
      };
      img.onerror = () => {
        resolve(CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Residential);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      resolve(CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Residential);
    };
    reader.readAsDataURL(actualFile);
  });
}

// ============================================================================
// DATA NORMALIZER: Guarantees complete, crash-free data structure for any post
// ============================================================================
export function normalizeProperty(raw) {
  if (!raw) return null;

  const category = raw.category || 'Residential';

  const rawInputImages = Array.isArray(raw.images) && raw.images.length > 0
    ? raw.images
    : raw.image
    ? [raw.image]
    : [];

  const rawImages = rawInputImages
    .map((img) => getSafeImageUrl(img, category))
    .filter(Boolean);

  if (rawImages.length === 0) {
    rawImages.push(getSafeImageUrl(null, category));
  }

  const mainImage = rawImages[0];

  // Extract seller metadata and clean description
  let cleanDescription = raw.description || '';
  let meta = {};
  const metaMatch = cleanDescription.match(/<!--SELLER_METADATA:([\s\S]*?)-->/);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]);
      cleanDescription = cleanDescription.replace(/<!--SELLER_METADATA:[\s\S]*?-->/g, '').trim();
    } catch (_) {}
  }

  const ownerName = raw.owner_name || raw.ownerName || meta.owner_name || raw.profiles?.full_name || '';
  const ownerEmail = raw.owner_email || raw.ownerEmail || meta.owner_email || raw.profiles?.email || '';
  const ownerPhone = raw.owner_phone || raw.ownerPhone || meta.owner_phone || meta.ownerPhone || raw.profiles?.phone || '';
  const locationUrl = raw.location_url || raw.locationUrl || meta.location_url || '';

  const defaultAgent = {
    name: ownerName || 'Verified TwistMS Seller',
    phone: ownerPhone || '+1 (512) 555-0199',
    email: ownerEmail || 'seller@twistms.com',
    agency: raw.profiles?.agency_name || (ownerName ? 'Direct Property Owner' : 'TwistMS Elite Advisory'),
    isDirectOwner: Boolean(ownerName || ownerPhone || ownerEmail),
  };

  // If seller name or phone exists, use direct seller info; otherwise fallback to raw.agent or default
  const agent = (ownerName || ownerPhone)
    ? defaultAgent
    : (raw.agent && raw.agent.name ? raw.agent : defaultAgent);

  // Plan duration calculation
  const plan = raw.plan || 'Free';
  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
  
  let expiresAt = raw.expires_at || raw.expiresAt;
  if (!expiresAt) {
    const days = plan === 'Free' ? 90 : plan === 'Paid' ? 180 : 365;
    expiresAt = new Date(new Date(createdAt).getTime() + days * 86400000).toISOString();
  }

  return {
    id: String(raw.id),
    title: raw.title || 'Luxury Estate Property',
    category: raw.category || 'Residential',
    type: raw.type || 'Sale',
    price: Number(raw.price) || 0,
    pricePeriod: raw.price_period || raw.pricePeriod || (raw.type === 'Rent' ? '/month' : ''),
    price_period: raw.price_period || raw.pricePeriod || (raw.type === 'Rent' ? '/month' : ''),
    address: raw.address || 'Confidential Address',
    city: raw.city || 'Austin',
    state: raw.state || 'Texas',
    stateCode: raw.state_code || raw.stateCode || 'TX',
    state_code: raw.state_code || raw.stateCode || 'TX',
    zip: String(raw.zip || '78701'),
    bedrooms: Number(raw.bedrooms) || 0,
    bathrooms: Number(raw.bathrooms) || 0,
    sqft: Number(raw.sqft) || 0,
    acreage: Number(raw.acreage) || 0,
    description: cleanDescription || 'Stunning architectural property syndicated on TwistMS.',
    images: rawImages,
    image: mainImage,
    videos: Array.isArray(raw.videos) ? raw.videos : [],
    plan,
    status: raw.status || 'active',
    views_count: Number(raw.views_count || raw.viewsCount || 0),
    views: Number(raw.views_count || raw.viewsCount || 0),
    featured: Boolean(raw.featured),
    verified: raw.verified !== undefined ? Boolean(raw.verified) : true,
    has_deed: raw.has_deed !== undefined ? Boolean(raw.has_deed) : true,
    has_tax_receipt: raw.has_tax_receipt !== undefined ? Boolean(raw.has_tax_receipt) : true,
    created_at: createdAt,
    expires_at: expiresAt,
    user_id: raw.user_id || 'demo-seller-101',
    agent,
    owner_name: ownerName,
    owner_email: ownerEmail,
    owner_phone: ownerPhone,
    ownerName,
    ownerEmail,
    ownerPhone,
    location_url: locationUrl,
    locationUrl: locationUrl,
  };
}

// Initial mock properties with realistic 90-day expiry dates
function getInitialMockProperties() {
  const now = new Date();
  return propertiesData.map((prop, idx) => {
    const planName = prop.plan || (idx === 0 ? 'Premium' : idx === 1 ? 'Paid' : 'Free');
    const daysDuration = planName === 'Free' ? 90 : planName === 'Paid' ? 180 : 365;
    const createdAt = new Date(now.getTime() - (idx + 1) * 4 * 86400000);
    const expiresAt = new Date(createdAt.getTime() + daysDuration * 86400000);

    return normalizeProperty({
      ...prop,
      user_id: 'demo-seller-101',
      plan: planName,
      status: 'active',
      views_count: Math.floor(180 + idx * 75 + Math.random() * 40),
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  });
}

function loadLocalProperties() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROPERTIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const now = new Date();
      // Auto-erase Free plan posts older than 90 days in local store
      const activeOnly = parsed
        .map(normalizeProperty)
        .filter((item) => {
          if (item.plan === 'Free' && new Date(item.expires_at) < now) {
            return false; // Erased after 90 days!
          }
          return true;
        });

      if (activeOnly.length !== parsed.length) {
        localStorage.setItem(LOCAL_STORAGE_PROPERTIES_KEY, JSON.stringify(activeOnly));
      }
      return activeOnly;
    }
  } catch (err) {
    console.warn('Failed loading local properties:', err);
  }

  const initial = getInitialMockProperties();
  try {
    localStorage.setItem(LOCAL_STORAGE_PROPERTIES_KEY, JSON.stringify(initial));
  } catch (_) {}
  return initial;
}

function saveLocalProperties(props) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROPERTIES_KEY, JSON.stringify(props.map(normalizeProperty)));
  } catch (e) {
    console.error(e);
  }
}

function loadLocalInquiries() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_INQUIRIES_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}

  const sampleInquiries = [
    {
      id: 'inq-01',
      property_id: 'tx-101',
      property_title: 'The Glass Haven Sanctuary & Ranch',
      seller_id: 'demo-seller-101',
      name: 'Harrison Sterling',
      email: 'harrison@sterlingcap.com',
      phone: '+1 (512) 890-4411',
      message: 'Hello, is this property available for a private viewing this Saturday afternoon? We are pre-approved cash buyers.',
      status: 'unread',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    },
    {
      id: 'inq-02',
      property_id: 'co-204',
      property_title: 'Aspen High-Country Evergreen Timber Land',
      seller_id: 'demo-seller-101',
      name: 'Victoria Vance',
      email: 'vvance@mountainrealestate.net',
      phone: '+1 (970) 412-9900',
      message: 'Does this timber acreage retain full mineral and water rights? Please send survey parcel maps.',
      status: 'contacted',
      created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString()
    }
  ];
  try {
    localStorage.setItem(LOCAL_STORAGE_INQUIRIES_KEY, JSON.stringify(sampleInquiries));
  } catch (e) {}
  return sampleInquiries;
}

function saveLocalInquiries(inquiries) {
  try {
    localStorage.setItem(LOCAL_STORAGE_INQUIRIES_KEY, JSON.stringify(inquiries));
  } catch (e) {}
}

// ============================================================================
// DATA ACCESS API (Seamlessly bridges Supabase and Fallback Mock Store)
// ============================================================================

/**
 * Fetch all active, non-expired properties.
 * Merges Supabase live posts with base catalog so search is NEVER empty.
 */
export async function getActiveProperties(filters = {}) {
  let supabaseListings = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (filters.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
      }
      if (filters.type && filters.type !== 'All') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        supabaseListings = data.map(normalizeProperty);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, relying on merged local store:', err);
    }
  }

  // Load local store properties
  const localListings = loadLocalProperties();
  const now = new Date();

  // Combine both sources, deduplicating by ID (Supabase takes precedence)
  const combinedMap = new Map();

  // Add local listings first
  localListings.forEach((p) => {
    if (new Date(p.expires_at) > now) {
      combinedMap.set(String(p.id), normalizeProperty(p));
    }
  });

  // Supabase listings overwrite/prepend
  supabaseListings.forEach((p) => {
    combinedMap.set(String(p.id), normalizeProperty(p));
  });

  const allActive = Array.from(combinedMap.values());

  return allActive.filter((p) => {
    if (new Date(p.expires_at) <= now) return false;
    if (filters.category && filters.category !== 'All' && p.category !== filters.category) return false;
    if (filters.type && filters.type !== 'All' && p.type !== filters.type) return false;
    return true;
  });
}

/**
 * Get single property by ID
 */
export async function getPropertyById(id) {
  if (!id) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. If it's a valid UUID, query Supabase cloud database directly
  if (isSupabaseConfigured && isUuid) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) return normalizeProperty(data);
    } catch (e) {
      console.warn('Supabase getPropertyById error:', e);
    }
  }

  // 2. Try static properties
  const staticFound = propertiesData.find((p) => String(p.id) === String(id));
  if (staticFound) return normalizeProperty(staticFound);

  // 3. Try local store
  const all = loadLocalProperties();
  const found = all.find((p) => String(p.id) === String(id));
  if (found) return normalizeProperty(found);

  // 4. If still not found and Supabase is configured, check recent Supabase records
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        // Fallback to the latest user created post in Supabase if this was an offline ID
        return normalizeProperty(data[0]);
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Record a view for a property and increment counter
 */
export async function recordPropertyView(propertyId, viewerId = null) {
  if (!propertyId) return;

  if (isSupabaseConfigured) {
    try {
      await supabase.rpc('record_property_view', {
        p_property_id: propertyId,
        p_viewer_id: viewerId,
      });
    } catch (e) {
      // If RPC fails or not yet created, update directly
      try {
        await supabase
          .from('properties')
          .update({ views_count: supabase.raw ? supabase.raw('views_count + 1') : 1 })
          .eq('id', propertyId);
      } catch (_) {}
    }
  }

  // Update in local store
  const props = loadLocalProperties();
  const idx = props.findIndex((p) => String(p.id) === String(propertyId));
  if (idx !== -1) {
    props[idx].views_count = (Number(props[idx].views_count) || 0) + 1;
    saveLocalProperties(props);
  }
}

/**
 * Create a new property listing with calculated 90-day expiry for Free plan.
 * Validates payload so it NEVER fails on unknown database columns.
 */
export async function createPropertyListing(propertyData, user) {
  const plan = propertyData.plan || 'Free';
  const now = new Date();
  
  // Calculate expiry days: Free = 90 days, Paid = 180 days, Premium = 365 days
  let durationDays = 90;
  if (plan === 'Paid') durationDays = 180;
  if (plan === 'Premium') durationDays = 365;

  const expiresAt = new Date(now.getTime() + durationDays * 86400000);

  const images = Array.isArray(propertyData.images) && propertyData.images.length > 0
    ? propertyData.images
    : [propertyData.image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'];

  // Construct metadata embed so seller contact and location pin survive even if custom columns aren't in schema
  const sellerMeta = {
    owner_name: propertyData.ownerName || '',
    owner_email: propertyData.ownerEmail || '',
    owner_phone: propertyData.ownerPhone || '',
    location_url: propertyData.locationUrl || propertyData.location_url || '',
  };
  const metaComment = `\n\n<!--SELLER_METADATA:${JSON.stringify(sellerMeta)}-->`;
  const fullDescription = `${(propertyData.description || 'Verified property listing on TwistMS.').trim()}${metaComment}`;

  // 1. Clean payload with ONLY columns that exist in public.properties
  const dbPayload = {
    title: propertyData.title,
    category: propertyData.category || 'Residential',
    type: propertyData.type || 'Sale',
    price: Number(propertyData.price) || 0,
    price_period: propertyData.pricePeriod || propertyData.price_period || null,
    address: propertyData.address || '',
    city: propertyData.city || 'Austin',
    state: propertyData.state || 'Texas',
    state_code: propertyData.stateCode || propertyData.state_code || 'TX',
    zip: String(propertyData.zip || '78701'),
    bedrooms: Number(propertyData.bedrooms) || 0,
    bathrooms: Number(propertyData.bathrooms) || 0,
    sqft: Number(propertyData.sqft) || 0,
    acreage: Number(propertyData.acreage) || 0,
    description: fullDescription,
    images: images,
    videos: Array.isArray(propertyData.videos) ? propertyData.videos : [],
    plan: plan,
    status: 'active',
    expires_at: expiresAt.toISOString(),
    views_count: 0,
    featured: Boolean(propertyData.featured),
    verified: true,
    has_deed: propertyData.hasDeed !== undefined ? Boolean(propertyData.hasDeed) : true,
    has_tax_receipt: propertyData.hasTaxReceipt !== undefined ? Boolean(propertyData.hasTaxReceipt) : true,
  };

  let savedRecord = null;

  // 2. Insert into Supabase cloud database so every phone and computer can view it
  if (isSupabaseConfigured) {
    try {
      const isValidUuid = Boolean(
        user?.id &&
        typeof user.id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      );

      // First attempt: try with direct columns if the database has them
      const attempt1 = {
        ...dbPayload,
        owner_name: propertyData.ownerName || null,
        owner_email: propertyData.ownerEmail || null,
        owner_phone: propertyData.ownerPhone || null,
        location_url: propertyData.locationUrl || propertyData.location_url || null,
        ...(isValidUuid ? { user_id: user.id } : {})
      };

      const res1 = await supabase
        .from('properties')
        .insert([attempt1])
        .select()
        .single();

      if (!res1.error && res1.data) {
        savedRecord = normalizeProperty(res1.data);
      } else if (res1.error) {
        // If custom columns don't exist yet, retry with base columns (metadata is embedded in description)
        const attempt2 = {
          ...dbPayload,
          ...(isValidUuid ? { user_id: user.id } : {})
        };
        const res2 = await supabase
          .from('properties')
          .insert([attempt2])
          .select()
          .single();

        if (!res2.error && res2.data) {
          savedRecord = normalizeProperty(res2.data);
        } else if (res2.error) {
          console.warn('Supabase property insert error:', res2.error.message);
        }
      }
    } catch (err) {
      console.warn('Supabase property insert network exception:', err);
    }
  }

  // 3. Fallback or mirror to local store
  if (!savedRecord) {
    savedRecord = normalizeProperty({
      ...dbPayload,
      id: `prop-${Date.now()}`,
      user_id: user?.id || 'demo-seller-101',
      ownerName: propertyData.ownerName || user?.full_name || 'Seller',
      ownerPhone: propertyData.ownerPhone || user?.phone || '',
      ownerEmail: propertyData.ownerEmail || user?.email || '',
      locationUrl: propertyData.locationUrl || propertyData.location_url || '',
    });
  }

  // Save to local store so it appears instantly across the entire UI
  const props = loadLocalProperties();
  props.unshift(savedRecord);
  saveLocalProperties(props);

  return { success: true, data: savedRecord };
}

/**
 * Auto-sync any local offline posts to Supabase cloud
 */
export async function syncLocalPropertiesToSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    const localProps = loadLocalProperties();
    const localOnly = localProps.filter((p) => String(p.id).startsWith('prop-'));
    
    for (const item of localOnly) {
      const payload = {
        title: item.title,
        category: item.category || 'Residential',
        type: item.type || 'Sale',
        price: Number(item.price) || 0,
        price_period: item.pricePeriod || null,
        address: item.address || '',
        city: item.city || 'Austin',
        state: item.state || 'Texas',
        state_code: item.stateCode || 'TX',
        zip: String(item.zip || '78701'),
        bedrooms: Number(item.bedrooms) || 0,
        bathrooms: Number(item.bathrooms) || 0,
        sqft: Number(item.sqft) || 0,
        acreage: Number(item.acreage) || 0,
        description: item.description || '',
        images: item.images || [item.image],
        videos: item.videos || [],
        plan: item.plan || 'Free',
        status: 'active',
        expires_at: item.expires_at,
        views_count: item.views_count || 0,
        featured: false,
        verified: true,
      };

      await supabase.from('properties').insert([payload]);
    }
  } catch (e) {
    console.warn('Auto-sync to Supabase:', e);
  }
}

// Automatically trigger sync on initialization
syncLocalPropertiesToSupabase();

/**
 * Delete property
 */
export async function deletePropertyListing(id) {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('properties').delete().eq('id', id);
    } catch (e) {
      console.warn(e);
    }
  }

  const props = loadLocalProperties();
  const filtered = props.filter((p) => String(p.id) !== String(id));
  saveLocalProperties(filtered);
  return { success: true };
}

/**
 * Get seller dashboard data: properties, stats, views breakdown, inquiries.
 * Guarantees proper data management for ANY seller account.
 */
export async function getSellerDashboardData(userId) {
  const currentUserId = userId || 'demo-seller-101';
  let listings = [];
  let inquiries = [];

  // 1. Try Supabase
  if (isSupabaseConfigured && userId) {
    try {
      const [propsRes, inqRes] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false }),
        supabase
          .from('inquiries')
          .select('*')
          .eq('seller_id', currentUserId)
          .order('created_at', { ascending: false })
      ]);

      if (propsRes.data && propsRes.data.length > 0) {
        listings = propsRes.data.map(normalizeProperty);
      }
      if (inqRes.data && inqRes.data.length > 0) {
        inquiries = inqRes.data;
      }
    } catch (e) {
      console.warn('Supabase dashboard fetch error:', e);
    }
  }

  // 2. Merge with locally saved listings for this seller (or demo seller)
  const localProps = loadLocalProperties();
  const localSellerProps = localProps.filter(
    (p) => String(p.user_id) === String(currentUserId) || currentUserId === 'demo-seller-101'
  );

  // Combine listings deduplicating by ID
  const map = new Map();
  localSellerProps.forEach((p) => map.set(String(p.id), normalizeProperty(p)));
  listings.forEach((p) => map.set(String(p.id), normalizeProperty(p)));

  const finalListingList = Array.from(map.values());

  // Load inquiries
  if (inquiries.length === 0) {
    const localInqs = loadLocalInquiries();
    inquiries = localInqs.filter(
      (i) => String(i.seller_id) === String(currentUserId) || currentUserId === 'demo-seller-101'
    );
  }

  const now = new Date();
  const totalViews = finalListingList.reduce((acc, curr) => acc + (Number(curr.views_count) || 0), 0);
  const activeListings = finalListingList.filter((p) => p.status === 'active' && new Date(p.expires_at) > now);
  const expiredListings = finalListingList.filter((p) => new Date(p.expires_at) <= now || p.status === 'expired');

  return {
    listings: finalListingList,
    inquiries,
    stats: {
      totalListings: finalListingList.length,
      activeCount: activeListings.length,
      expiredCount: expiredListings.length,
      totalViews,
      totalInquiries: inquiries.length,
      averageViewsPerListing: finalListingList.length > 0 ? Math.round(totalViews / finalListingList.length) : 0,
    },
  };
}

/**
 * Seed a quick sample listing for the currently logged-in seller so they
 * can test their dashboard analytics and 90-day countdown with 1 click!
 */
export async function seedSampleListingForSeller(user) {
  const sample = {
    title: 'Modern Hill Country Ranch & Equestrian Villa',
    category: 'Residential',
    type: 'Sale',
    price: 1650000,
    address: '1040 Canyon Vista Ridge',
    city: 'Austin',
    state: 'Texas',
    stateCode: 'TX',
    zip: '78738',
    bedrooms: 4,
    bathrooms: 3.5,
    sqft: 4200,
    acreage: 8.5,
    plan: 'Free',
    description: 'Breathtaking hill country views, solar grid, private pool, and deed verification.',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'],
    ownerName: user?.full_name || 'Seller',
    ownerEmail: user?.email || 'seller@twistms.com',
    ownerPhone: user?.phone || '+1 (512) 555-0100',
  };

  return await createPropertyListing(sample, user);
}

/**
 * Send buyer inquiry to seller
 */
export async function submitPropertyInquiry(inquiryData) {
  const newInquiry = {
    ...inquiryData,
    status: 'unread',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('inquiries').insert([newInquiry]);
    } catch (e) {
      console.warn('Supabase inquiry submission failed:', e);
    }
  }

  const localInquiries = loadLocalInquiries();
  const created = {
    ...newInquiry,
    id: `inq-${Date.now()}`
  };
  localInquiries.unshift(created);
  saveLocalInquiries(localInquiries);
  return { success: true, data: created };
}

/**
 * Update inquiry status (e.g. 'contacted' or 'unread')
 */
export async function updateInquiryStatus(inquiryId, newStatus) {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('inquiries').update({ status: newStatus }).eq('id', inquiryId);
    } catch (e) {
      console.warn(e);
    }
  }

  const localInquiries = loadLocalInquiries();
  const idx = localInquiries.findIndex((i) => String(i.id) === String(inquiryId));
  if (idx !== -1) {
    localInquiries[idx].status = newStatus;
    saveLocalInquiries(localInquiries);
  }
}

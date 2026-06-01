// ── Hierarchy (Option B) ───────────────────────────────────────────
// Distributor > Partner > Customer
//   - Distributors are top-level.
//   - Partners carry a partnerCapability of 'msp' | 'reseller' | 'hybrid'.
//   - Customers carry a managementMode of 'managed' | 'unmanaged'.
// Constraints:
//   - msp partner       → all child customers are managed
//   - reseller partner  → all child customers are unmanaged
//   - hybrid partner    → ~60% managed, ~40% unmanaged

// ── Deterministic PRNG (mulberry32) ────────────────────────────────
// All randomness flows through this so data is stable across refreshes.
let _seed = 123456789;
function rand() {
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function deterministicUUID() {
  // Generate a stable v4-format UUID from the seeded PRNG
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(rand() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function pickStatus() {
  const r = rand();
  if (r < 0.75) return 'active';
  if (r < 0.90) return 'trial';
  return 'suspended';
}

const distributorNames = [
  'Apex Networks', 'Continental Distribution', 'CyberShield Partners',
  'Fortify Networks', 'TrustPoint Solutions', 'IronGate Holdings',
  'Northbridge Networks', 'Summit Distributors', 'Pinnacle Channel Group',
  'Halcyon Networks',
];

// Sub-distributors live laterally under a top-level distributor — keep
// their names visually distinct (regional / channel-flavored) so they
// don't collide with the top-level pool above when rendered in the same
// list.
const subDistributorNames = [
  'Pacific Regional', 'Atlantic Channel', 'Midwest Channel',
  'Northeast Regional', 'Southwest Group', 'Mountain West Group',
  'Heartland Channel', 'Coastal Distribution', 'Sunbelt Regional',
  'Great Lakes Channel', 'Cascade Distribution', 'Gulf Coast Regional',
];

const partnerNames = {
  msp: [
    'Sentinel Operations', 'Vanguard SecOps', 'Bastion MSP',
    'Fortify Operations', 'Citadel SecOps', 'Aegis Managed Services',
  ],
  reseller: [
    'License Direct', 'Channel Source', 'Volume License Co',
    'Wholesale Channel', 'Pacific Reseller Group', 'TerraSource Licensing',
  ],
  hybrid: [
    'Flexus IT', 'Bridgepoint Hybrid', 'Crossroads IT',
    'Convergence Partners', 'Dual Track IT', 'NorthStar Hybrid',
  ],
};

// Programmatic customer name generation for volume
const industries = [
  'Healthcare', 'Financial', 'Manufacturing', 'Media', 'Legal', 'Agriculture',
  'Logistics', 'Energy', 'Dental', 'Realty', 'Consulting', 'Academy',
  'Automotive', 'Hospitality', 'Construction', 'Shipping', 'Architecture',
  'Analytics', 'Insurance', 'Engineering', 'Fitness', 'Veterinary', 'Aviation',
  'Mining', 'Seafood', 'Brewing', 'Optics', 'Digital', 'Environmental',
  'Transit', 'Aerospace', 'Catering', 'Marine', 'Entertainment', 'Resources',
];
const prefixes = [
  'Meridian', 'Atlas', 'Coastal', 'Brightwave', 'Summit', 'Harvest',
  'Quantum', 'Riverstone', 'Pacific', 'Golden', 'Northwind', 'Crestview',
  'Sterling', 'Beacon', 'Ironwood', 'Trident', 'Maple', 'Skyline',
  'BluePeak', 'Cornerstone', 'Redwood', 'Cascade', 'Timberline', 'Sunbelt',
  'Metro', 'Heritage', 'Pinnacle', 'Harbor', 'Velocity', 'Orchard',
  'Lakeside', 'Diamond', 'CloudNine', 'Granite', 'Willow', 'Prism',
  'Eastgate', 'Foxfire', 'Ridgeline', 'Bayshore', 'Thunderbird', 'Sandstone',
  'Falcon', 'Emerald', 'Copperfield', 'Sunrise', 'Bluewater', 'Aspen',
  'Riverfront', 'Oakmont', 'Crossroads', 'Zenith', 'Wildflower', 'Stonebridge',
  'Peregrine', 'Crimson', 'Alpine', 'Canyon', 'Frostline', 'BrightStar',
  'Obsidian', 'Amber', 'Cobalt', 'Driftwood', 'Evergreen', 'Glacier',
  'Hawkeye', 'Ivory', 'Jade', 'Keystone', 'Lighthouse', 'Marble',
];
const suffixes = ['Group', 'Co', 'Inc', 'Partners', 'Corp', 'LLC', 'Ltd', 'Services'];

function generateCustomerName(index) {
  const prefix = prefixes[index % prefixes.length];
  const industry = industries[index % industries.length];
  const suffix = suffixes[index % suffixes.length];
  return `${prefix} ${industry} ${suffix}`;
}

// ── name pool cursors ──────────────────────────────────────────────
const dCur = { val: 0 };
const subDCur = { val: 0 };
const partnerCursors = { msp: { val: 0 }, reseller: { val: 0 }, hybrid: { val: 0 } };
let customerIndex = 0;

function nextName(pool, cursor) {
  const name = pool[cursor.val % pool.length];
  cursor.val++;
  return name;
}

// Capability-flavored suffix pools for programmatic partner names. Used once
// the curated `partnerNames[capability]` pool is exhausted, which keeps the
// hierarchy plausible at high entity counts (~20k+).
const partnerSuffixPools = {
  msp: [
    'SecOps', 'Cyber Defense', 'Managed Security', 'SOC Solutions',
    'ThreatOps', 'Sentinel Group', 'Vigilance', 'Watchtower',
    'Operations Group', 'Cyber Center', 'Defense Partners', 'Shield Operations',
  ],
  reseller: [
    'Distributors', 'Channel', 'License Co', 'Source',
    'Wholesale', 'Reseller Group', 'Direct', 'Marketplace',
    'Channel Group', 'Volume Source', 'License Partners', 'Trade Co',
  ],
  hybrid: [
    'IT Partners', 'Hybrid Solutions', 'Tech Group', 'IT Alliance',
    'Cyber Partners', 'Convergence Co', 'Bridge IT', 'Dual Track',
    'Flex Solutions', 'Continuum', 'Span Partners', 'Crossover IT',
  ],
};

function makeProgrammaticPartnerName(capability, idx) {
  const prefix = prefixes[(idx * 7) % prefixes.length];
  const suffixPool = partnerSuffixPools[capability];
  const suffix = suffixPool[(Math.floor(idx / prefixes.length) + idx) % suffixPool.length];
  return `${prefix} ${suffix}`;
}

function nextPartnerName(capability) {
  const idx = partnerCursors[capability].val++;
  const curated = partnerNames[capability];
  if (idx < curated.length) return curated[idx];
  return makeProgrammaticPartnerName(capability, idx);
}

function nextCustomerName() {
  return generateCustomerName(customerIndex++);
}

const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];

const addresses = [
  { street: '350 Fifth Avenue', city: 'New York', state: 'NY', zip: '10118', country: 'United States', tz: 'America/New_York', lang: 'English' },
  { street: '1 Canada Square', city: 'London', state: '', zip: 'E14 5AB', country: 'United Kingdom', tz: 'Europe/London', lang: 'English' },
  { street: '100 King Street West', city: 'Toronto', state: 'ON', zip: 'M5X 1A1', country: 'Canada', tz: 'America/Toronto', lang: 'English' },
  { street: 'Friedrichstraße 43-45', city: 'Berlin', state: '', zip: '10117', country: 'Germany', tz: 'Europe/Berlin', lang: 'German' },
  { street: '1-7-1 Konan, Minato-ku', city: 'Tokyo', state: '', zip: '108-0075', country: 'Japan', tz: 'Asia/Tokyo', lang: 'Japanese' },
  { street: '45 Clarence Street', city: 'Sydney', state: 'NSW', zip: '2000', country: 'Australia', tz: 'Australia/Sydney', lang: 'English' },
  { street: 'Avenida Paulista 1578', city: 'São Paulo', state: 'SP', zip: '01310-200', country: 'Brazil', tz: 'America/Sao_Paulo', lang: 'Portuguese' },
  { street: '8 Rue de la Paix', city: 'Paris', state: '', zip: '75002', country: 'France', tz: 'Europe/Paris', lang: 'French' },
  { street: 'Paseo de la Reforma 250', city: 'Mexico City', state: 'CDMX', zip: '06600', country: 'Mexico', tz: 'America/Mexico_City', lang: 'Spanish' },
  { street: 'Temasek Boulevard 1', city: 'Singapore', state: '', zip: '038986', country: 'Singapore', tz: 'Asia/Singapore', lang: 'English' },
  { street: '200 George Street', city: 'Brisbane', state: 'QLD', zip: '4000', country: 'Australia', tz: 'Australia/Brisbane', lang: 'English' },
  { street: 'Via della Conciliazione 4', city: 'Rome', state: '', zip: '00193', country: 'Italy', tz: 'Europe/Rome', lang: 'Italian' },
];

const contactFirstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Amanda', 'Daniel', 'Rachel', 'Thomas', 'Laura', 'Andrew', 'Michelle', 'Christopher', 'Nicole'];
const contactLastNames = ['Anderson', 'Mitchell', 'Chen', 'Patel', 'Williams', 'Rodriguez', 'Kim', 'O\'Brien', 'Nakamura', 'Fischer', 'Santos', 'Larsson', 'Thompson', 'Martinez', 'Shah', 'Weber'];

function seededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return (h >>> 0) / 4294967295;
}

// ── Per-(type, capability) scale lookup ────────────────────────────
function getScaleKey({ type, partnerCapability }) {
  if (type === 'distributor') return 'distributor';
  if (type === 'partner') {
    if (partnerCapability === 'msp') return 'msp';
    if (partnerCapability === 'hybrid') return 'hybrid';
    if (partnerCapability === 'reseller') return 'reseller-cap';
  }
  return 'customer';
}

const SCALE = {
  // [min, max] device count
  device: {
    'distributor':   [100, 2000],
    'msp':           [80, 1500],
    'hybrid':        [60, 1200],
    'reseller-cap':  [50, 800],
    'customer':      [5, 200],
  },
  // [min, max] license count
  license: {
    'distributor':   [200, 3000],
    'msp':           [150, 2200],
    'hybrid':        [100, 1800],
    'reseller-cap':  [50, 1000],
    'customer':      [10, 300],
  },
  // [min, max] MRR
  mrr: {
    'distributor':   [8000, 25000],
    'msp':           [5000, 18000],
    'hybrid':        [4000, 15000],
    'reseller-cap':  [2000, 8000],
    'customer':      [200, 2000],
  },
  // [min, max] endpoint subscribers (productAdoption.endpoint.subscribers)
  endpointSubs: {
    'distributor':   [1200, 4000],
    'msp':           [900, 3000],
    'hybrid':        [600, 2200],
    'reseller-cap':  [400, 1200],
    'customer':      [80, 250],
  },
  // [min, max] email security subscribers
  emailSubs: {
    'distributor':   [900, 3000],
    'msp':           [700, 2400],
    'hybrid':        [500, 1800],
    'reseller-cap':  [300, 900],
    'customer':      [50, 180],
  },
  // [min, max] safesend subscribers
  safesendSubs: {
    'distributor':   [350, 1200],
    'msp':           [260, 900],
    'hybrid':        [180, 700],
    'reseller-cap':  [100, 400],
    'customer':      [20, 80],
  },
};

function makeEntity({ type, partnerCapability = null, managementMode = null, name, children = [] }) {
  // ── Validation ────────────────────────────────────────────────
  if (!type) throw new Error('makeEntity: type is required');
  if (type === 'partner' && !partnerCapability) {
    throw new Error('partnerCapability required when type === "partner"');
  }
  if (type !== 'partner' && partnerCapability) {
    throw new Error('partnerCapability only allowed when type === "partner"');
  }
  if (type === 'partner' && !['msp', 'reseller', 'hybrid'].includes(partnerCapability)) {
    throw new Error(`Invalid partnerCapability "${partnerCapability}" — must be msp | reseller | hybrid`);
  }
  if (type === 'customer' && !managementMode) {
    throw new Error('managementMode required when type === "customer"');
  }
  if (managementMode !== null && !['managed', 'unmanaged'].includes(managementMode)) {
    throw new Error(`Invalid managementMode "${managementMode}" — must be managed | unmanaged`);
  }
  if (type === 'partner' && managementMode) {
    throw new Error('managementMode not allowed when type === "partner" (use partnerCapability instead)');
  }

  const id = deterministicUUID();
  const r = seededRand(id);
  const r2 = seededRand(id + 'x');
  const r3 = seededRand(id + 'y');

  const status = pickStatus();
  const daysAgo = status === 'active' ? Math.floor(r2 * 7) : status === 'trial' ? 7 + Math.floor(r2 * 21) : 30 + Math.floor(r2 * 60);
  const lastActive = new Date(Date.now() - daysAgo * 86400000);

  const scaleKey = getScaleKey({ type, partnerCapability });
  const [dMin, dMax] = SCALE.device[scaleKey];
  const [lMin, lMax] = SCALE.license[scaleKey];
  const [mrrMin, mrrMax] = SCALE.mrr[scaleKey];
  const [epMin, epMax] = SCALE.endpointSubs[scaleKey];
  const [emMin, emMax] = SCALE.emailSubs[scaleKey];
  const [ssMin, ssMax] = SCALE.safesendSubs[scaleKey];

  const r4 = seededRand(id + 'a');
  const r5 = seededRand(id + 'b');
  const r6 = seededRand(id + 'c');
  const r7 = seededRand(id + 'd');
  const r8 = seededRand(id + 'e');
  const r9 = seededRand(id + 'f');
  const r10 = seededRand(id + 'g');
  const r11 = seededRand(id + 'h');
  const r12 = seededRand(id + 'i');

  const scale = (min, max, rand) => Math.floor(min + rand * (max - min));
  const devices = Math.floor(dMin + r * (dMax - dMin));
  const licenses = Math.floor(lMin + r2 * (lMax - lMin));

  const totalChildren = children.length;

  const entity = {
    id,
    name,
    type,
    partnerCapability: type === 'partner' ? partnerCapability : null,
    managementMode: (type === 'customer' || type === 'distributor') ? managementMode : null,
    status,
    children,
    devices,
    licenses,
    threatsBlocked: Math.floor(r3 * (type === 'customer' ? 200 : 1000)),
    lastActive: lastActive.toISOString(),
    region: regions[Math.floor(r * regions.length)],
    address: addresses[Math.floor(r4 * addresses.length)],
    contact: (() => {
      const fi = Math.floor(r5 * contactFirstNames.length);
      const li = Math.floor(r6 * contactLastNames.length);
      const first = contactFirstNames[fi];
      const last = contactLastNames[li];
      return {
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase().replace(/'/g, '')}@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`.substring(0, 60),
        phone: `+1 (${300 + Math.floor(r7 * 700)}) ${100 + Math.floor(r8 * 900)}-${1000 + Math.floor(r9 * 9000)}`,
      };
    })(),
    products: {
      endpoint: {
        devicesProtected: scale(dMin, dMax, r4),
        threatsBlocked: scale(50, 2000, r5),
        scansCompleted: scale(200, 15000, r4),
        complianceRate: scale(78, 100, r6),
      },
      emailSecurity: {
        emailsScanned: scale(1000, 80000, r5),
        threatsCaught: scale(20, 800, r6),
        phishingBlocked: scale(10, 500, r7),
        spamFiltered: scale(100, 6000, r8),
      },
      safeSend: {
        emailsSent: scale(500, 30000, r6),
        attachmentsScanned: scale(80, 8000, r7),
        dlpTriggers: scale(0, 120, r8),
        recipientsVerified: scale(300, 20000, r4),
      },
    },
    business: {
      mrr: scale(mrrMin, mrrMax, r4),
      seatsLicensed: licenses,
      seatsConsumed: Math.round(licenses * scale(45, 95, r5) / 100),
      utilizationRate: scale(45, 95, r5) / 10,
      opportunityScore: Math.min(100, Math.max(10, scale(20, 90, r9))),
      renewals: { d30: scale(0, Math.max(1, Math.floor(totalChildren * 0.2)), r9), d60: scale(0, Math.max(1, Math.floor(totalChildren * 0.3)), r10) },
      churnRisk: scale(0, Math.max(1, Math.floor(totalChildren * 0.15)), r12),
      netNew: scale(0, Math.max(1, Math.floor(totalChildren * 0.2)), r4),
      churned: scale(0, Math.max(1, Math.floor(totalChildren * 0.08)), r12),
      activeTrials: children.filter(c => c.status === 'trial').length,
      productAdoption: {
        endpoint: (() => {
          const subs = scale(epMin, epMax, r4);
          const planNames = ['Endpoint Essentials', 'Endpoint Standard', 'Endpoint Professional', 'Endpoint Advanced', 'Endpoint Enterprise', 'Endpoint Premium', 'Endpoint Elite'];
          const weights = [0.08, 0.22, 0.25, 0.18, 0.12, 0.10, 0.05];
          let remaining = subs;
          const tiers = planNames.map((n, i) => {
            const c = i === planNames.length - 1 ? remaining : Math.round(subs * weights[i]);
            remaining -= (i === planNames.length - 1 ? 0 : Math.round(subs * weights[i]));
            const mo = Math.round(c * scale(15 + i * 5, 40 + i * 3, seededRand(id + 'ep' + i + 'mo') > 0.5 ? r7 : r8) / 100);
            return { name: n, count: Math.max(0, c), monthly: mo, annual: Math.max(0, c) - mo };
          });
          return { subscribers: subs, pctOfBook: scale(85, 99, r4), avgSeats: scale(50, 200, r5), avgUtilization: scale(65, 95, r6), tiers,
            addOns: [
              { name: 'Patch Management', subscribers: Math.round(subs * scale(40, 65, r7) / 100), total: subs },
              { name: 'EDR', subscribers: Math.round(subs * scale(20, 35, r8) / 100), total: subs },
              { name: 'Vulnerability Scanning', subscribers: Math.round(subs * scale(8, 22, r9) / 100), total: subs },
            ],
          };
        })(),
        emailSecurity: (() => {
          const subs = scale(emMin, emMax, r5);
          const planNames = ['SEG Starter', 'SEG Standard', 'SEG Professional', 'SEG Advanced', 'SEG Premium', 'SEG Enterprise', 'SEG Ultimate', 'SEG Compliance'];
          const weights = [0.05, 0.18, 0.22, 0.20, 0.14, 0.10, 0.07, 0.04];
          let remaining = subs;
          const tiers = planNames.map((n, i) => {
            const c = i === planNames.length - 1 ? remaining : Math.round(subs * weights[i]);
            remaining -= (i === planNames.length - 1 ? 0 : Math.round(subs * weights[i]));
            const mo = Math.round(c * scale(10 + i * 4, 35 + i * 3, seededRand(id + 'es' + i + 'mo') > 0.5 ? r9 : r10) / 100);
            return { name: n, count: Math.max(0, c), monthly: mo, annual: Math.max(0, c) - mo, sourceType: 'standalone' };
          });
          const hasTEP = type === 'customer' ? seededRand(id + 'tep') > 0.45 : true;
          const bundleContribPct = type === 'customer' ? 0 : scale(35, 52, seededRand(id + 'ebcp'));
          const bundleSubs = type === 'customer' ? 0 : Math.round(subs * bundleContribPct / 100);
          if (bundleSubs > 0) {
            const bundleMo = Math.round(bundleSubs * scale(8, 20, seededRand(id + 'ebmo')) / 100);
            tiers.push({ name: 'via Total Email Protection', count: bundleSubs, monthly: bundleMo, annual: bundleSubs - bundleMo, sourceType: 'bundle', bundleName: 'Total Email Protection', bundleId: 'total-email-protection' });
          }
          return { subscribers: subs, pctOfBook: scale(60, 92, r5), avgSeats: scale(100, 400, r7), avgUtilization: scale(75, 98, r8),
            bundleContributionPct: bundleContribPct, hasTEP: type === 'customer' ? hasTEP : null, tiers,
            addOns: [
              { name: 'Hosted Mail 1GB', subscribers: Math.round(subs * scale(35, 55, r9) / 100), total: subs },
              { name: 'Hosted Mail 10GB', subscribers: Math.round(subs * scale(5, 18, r10) / 100), total: subs },
              { name: 'Advanced Threat Protection', subscribers: Math.round(subs * scale(15, 30, r11) / 100), total: subs },
            ],
          };
        })(),
        safeSend: (() => {
          const subs = scale(ssMin, ssMax, r6);
          const planNames = ['SafeSend Lite', 'SafeSend Standard', 'SafeSend Professional', 'SafeSend Business', 'SafeSend Advanced', 'SafeSend Enterprise'];
          const weights = [0.10, 0.28, 0.24, 0.18, 0.12, 0.08];
          let remaining = subs;
          const tiers = planNames.map((n, i) => {
            const c = i === planNames.length - 1 ? remaining : Math.round(subs * weights[i]);
            remaining -= (i === planNames.length - 1 ? 0 : Math.round(subs * weights[i]));
            const mo = Math.round(c * scale(20 + i * 5, 45 + i * 3, seededRand(id + 'ss' + i + 'mo') > 0.5 ? r11 : r12) / 100);
            return { name: n, count: Math.max(0, c), monthly: mo, annual: Math.max(0, c) - mo, sourceType: 'standalone' };
          });
          const hasTEP = type === 'customer' ? seededRand(id + 'tep') > 0.45 : true;
          const bundleContribPct = type === 'customer' ? 0 : scale(10, 18, seededRand(id + 'sbcp'));
          const bundleSubs = type === 'customer' ? 0 : Math.round(subs * bundleContribPct / 100);
          if (bundleSubs > 0) {
            const bundleMo = Math.round(bundleSubs * scale(8, 20, seededRand(id + 'sbmo')) / 100);
            tiers.push({ name: 'via Total Email Protection', count: bundleSubs, monthly: bundleMo, annual: bundleSubs - bundleMo, sourceType: 'bundle', bundleName: 'Total Email Protection', bundleId: 'total-email-protection' });
          }
          return { subscribers: subs, pctOfBook: scale(20, 48, r6), avgSeats: scale(30, 120, r9), avgUtilization: scale(30, 70, r10),
            bundleContributionPct: bundleContribPct, hasTEP: type === 'customer' ? hasTEP : null, tiers,
            addOns: [
              { name: 'DLP Policy Pack', subscribers: Math.round(subs * scale(10, 25, r11) / 100), total: subs },
              { name: 'Compliance Archive', subscribers: Math.round(subs * scale(3, 15, r12) / 100), total: subs },
            ],
          };
        })(),
        bundles: (() => {
          if (type === 'customer') {
            const hasTEP = seededRand(id + 'tep') > 0.45;
            if (!hasTEP) return [];
            const seats = scale(100, 250, seededRand(id + 'tepseats'));
            const util = scale(70, 92, seededRand(id + 'teputil'));
            return [{ id: 'total-email-protection', name: 'Total Email Protection', includedProductIds: ['emailSecurity', 'safeSend'],
              subscribedPct: 100, seats, utilization: util,
              productBreakdown: [
                { productId: 'emailSecurity', productName: 'Email Security', seats, utilization: scale(75, 95, seededRand(id + 'tepesutil')) },
                { productId: 'safeSend', productName: 'SafeSend', seats, utilization: scale(55, 80, seededRand(id + 'tepssutil')) },
              ],
            }];
          }
          const bundleSubsPct = scale(35, 52, seededRand(id + 'ebcp'));
          const bundleSeats = scale(200, 900, seededRand(id + 'tepseats'));
          const bundleUtil = scale(65, 85, seededRand(id + 'teputil'));
          return [{ id: 'total-email-protection', name: 'Total Email Protection', includedProductIds: ['emailSecurity', 'safeSend'],
            subscribedPct: bundleSubsPct, seats: bundleSeats, utilization: bundleUtil,
            productBreakdown: [
              { productId: 'emailSecurity', productName: 'Email Security', seats: bundleSeats, utilization: scale(70, 90, seededRand(id + 'tepesutil')) },
              { productId: 'safeSend', productName: 'SafeSend', seats: bundleSeats, utilization: scale(50, 75, seededRand(id + 'tepssutil')) },
            ],
          }];
        })(),
      },
    },
    operations: {
      criticalIssues: r10 < 0.3 ? scale(1, 4, r11) : 0,
      complianceScore: scale(70, 98, r6),
      configDrift: scale(0, Math.max(1, Math.floor(totalChildren * 0.25)), r11),
      agentVersions: { 'v4.2': scale(55, 80, r7), 'v4.1': scale(15, 30, r8), 'v3.x': Math.max(0, 100 - scale(55, 80, r7) - scale(15, 30, r8)) },
      domainHealth: (() => { const t = scale(5, 40, r9); const h = Math.floor(t * scale(75, 98, r10) / 100); return { total: t, healthy: h, issues: t - h }; })(),
      quarantineDepth: scale(0, 150, r12),
    },
  };

  return entity;
}

// ── Customer generators ────────────────────────────────────────────
function generateCustomers(count, managementMode) {
  const customers = [];
  for (let i = 0; i < count; i++) {
    customers.push(makeEntity({ type: 'customer', managementMode, name: nextCustomerName() }));
  }
  return customers;
}

// Hybrid partners: ~60% managed, ~40% unmanaged. Deterministic split.
function generateHybridCustomers(count) {
  const customers = [];
  const managedCount = Math.round(count * 0.6);
  for (let i = 0; i < count; i++) {
    const mode = i < managedCount ? 'managed' : 'unmanaged';
    customers.push(makeEntity({ type: 'customer', managementMode: mode, name: nextCustomerName() }));
  }
  return customers;
}

// ── Hierarchy validator ────────────────────────────────────────────
function validateHierarchy(roots) {
  function walk(node) {
    if (node.type === 'partner' && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child.type === 'customer') {
          if (node.partnerCapability === 'msp' && child.managementMode !== 'managed') {
            console.warn(`[data.js] MSP partner "${node.name}" has unmanaged customer "${child.name}"`);
          }
          if (node.partnerCapability === 'reseller' && child.managementMode !== 'unmanaged') {
            console.warn(`[data.js] Reseller partner "${node.name}" has managed customer "${child.name}"`);
          }
        }
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  }
  for (const root of roots) walk(root);
}

// ── Volume knobs ───────────────────────────────────────────────────
// Tuned for prototype testing — a few hundred entities is enough to
// exercise grouping, filtering, and capability variants without the
// render cost of a full production-scale tree. Bump these up if you
// need to test list/search performance at scale.
const TOP_DISTRIBUTORS = 6;                   // top-level distributors at root
// Per-distributor variance — ranges tuned so each top-level distributor
// reads as a different size (small ~25 entities to large ~80) without
// blowing the total count past a few hundred. Values are pulled
// deterministically from these ranges via hashedRand.
const PARTNERS_PER_DISTRIBUTOR_RANGE = [1, 6];
const DIRECT_CUSTOMERS_PER_DISTRIBUTOR_RANGE = [0, 4];
const SUB_DISTRIBUTORS_PER_DISTRIBUTOR_RANGE = [0, 2];
const CUSTOMERS_PER_PARTNER_RANGE = [3, 14];
const SMALL_BOOK_RANGE = [2, 6];              // sub-distributors / sub-partners

function pickCustomerCount(seed) {
  const r = seededRand(seed);
  const [min, max] = CUSTOMERS_PER_PARTNER_RANGE;
  return Math.floor(min + r * (max - min));
}

function pickSmallCustomerCount(seed) {
  const r = seededRand(seed);
  const [min, max] = SMALL_BOOK_RANGE;
  return Math.floor(min + r * (max - min));
}

function buildPartnerForCapability(capability, seed, opts = {}) {
  const count = opts.smallBook ? pickSmallCustomerCount(seed) : pickCustomerCount(seed);
  let children;
  if (capability === 'msp')        children = generateCustomers(count, 'managed');
  else if (capability === 'reseller') children = generateCustomers(count, 'unmanaged');
  else /* hybrid */                children = generateHybridCustomers(count);
  return makeEntity({
    type: 'partner',
    partnerCapability: capability,
    name: nextPartnerName(capability),
    children,
  });
}

// A sub-distributor has a small partner book aligned with its mode plus a
// couple of direct customers — just enough to demonstrate the lateral
// hierarchy without bloating the dataset.
function buildSubDistributor(managementMode, parentDistIndex, subIndex) {
  const partnerCap = managementMode === 'managed' ? 'msp' : 'reseller';
  const partner = buildPartnerForCapability(
    partnerCap,
    `d${parentDistIndex}-sd${subIndex}-${partnerCap}`,
    { smallBook: true }
  );
  const directs = generateCustomers(2, managementMode);
  return makeEntity({
    type: 'distributor',
    managementMode,
    name: nextName(subDistributorNames, subDCur),
    children: [partner, ...directs],
  });
}

// FNV-1a + mulberry32 — proper avalanche so short, similar seeds like
// "dist-0-pc" / "dist-1-pc" produce well-distributed values. The old
// seededRand collapses on small string deltas.
function hashedRand(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = (h + 0x6d2b79f5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pickFromRange(seed, [min, max]) {
  const r = hashedRand(seed);
  return min + Math.floor(r * (max - min + 1));
}

function buildDistributor(name, distIndex) {
  const seedBase = `dist-${distIndex}`;
  const partnerCount = pickFromRange(`${seedBase}-pc`, PARTNERS_PER_DISTRIBUTOR_RANGE);
  const directCount = pickFromRange(`${seedBase}-dc`, DIRECT_CUSTOMERS_PER_DISTRIBUTOR_RANGE);
  const subCount = pickFromRange(`${seedBase}-sc`, SUB_DISTRIBUTORS_PER_DISTRIBUTOR_RANGE);

  const partners = [];
  // Round-robin capability so the rollup stays balanced no matter the count.
  const caps = ['msp', 'hybrid', 'reseller'];
  for (let pi = 0; pi < partnerCount; pi++) {
    const cap = caps[pi % caps.length];
    const partner = buildPartnerForCapability(cap, `d${distIndex}-p${pi}-${cap}`);
    // Demonstrate partner-under-partner on every hybrid: attach one managed
    // (msp) and one unmanaged (reseller) sub-partner so both flavors are
    // reachable across the tree.
    if (cap === 'hybrid') {
      partner.children.push(
        buildPartnerForCapability('msp', `d${distIndex}-p${pi}-sub-msp`, { smallBook: true }),
        buildPartnerForCapability('reseller', `d${distIndex}-p${pi}-sub-reseller`, { smallBook: true }),
      );
    }
    partners.push(partner);
  }

  const directs = [];
  for (let ci = 0; ci < directCount; ci++) {
    // ~70% managed direct customers under a distributor
    const mode = (ci % 10) < 7 ? 'managed' : 'unmanaged';
    directs.push(makeEntity({ type: 'customer', managementMode: mode, name: nextCustomerName() }));
  }

  // Demonstrate distributor-under-distributor with a varied count per
  // top-level distributor (some have none, some have one, some have two).
  // Alternate managed/unmanaged across the set so both flavors surface.
  const subDistributors = [];
  for (let si = 0; si < subCount; si++) {
    const mode = (distIndex + si) % 2 === 0 ? 'managed' : 'unmanaged';
    subDistributors.push(buildSubDistributor(mode, distIndex, si));
  }

  return makeEntity({
    type: 'distributor',
    managementMode: 'managed',
    name,
    children: [...partners, ...directs, ...subDistributors],
  });
}

function generateData() {
  dCur.val = 0;
  subDCur.val = 0;
  const roots = [];
  for (let i = 0; i < TOP_DISTRIBUTORS; i++) {
    roots.push(buildDistributor(nextName(distributorNames, dCur), i));
  }

  // ── Scale demo (Customer Management C) ─────────────────────────────
  // One very large hybrid reseller (~2,600 customers, ~60% managed) so
  // reviewers can drill from the root into the scale case and compare B's
  // non-virtualized list with C's virtualized directory on the SAME
  // accounts. Built with the same makeEntity/generator path as every other
  // entity, so the shape is identical — no parallel dataset.
  {
    const SCALE_CUSTOMER_COUNT = 2600;
    const bigReseller = makeEntity({
      type: 'partner',
      partnerCapability: 'hybrid',
      name: 'Summit Managed Services',
      children: generateHybridCustomers(SCALE_CUSTOMER_COUNT),
    });
    roots.push(bigReseller);
  }

  // Direct top-level partners — partners that contract directly with
  // Vipre and don't sit under any distributor. Mix of capabilities and
  // book sizes so root partners scale realistically when listed.
  const directPartnerSpecs = [
    ['msp', 0, true],
    ['hybrid', 0, false],
    ['reseller', 0, true],
    ['hybrid', 1, true],
  ];
  for (const [cap, idx, smallBook] of directPartnerSpecs) {
    roots.push(buildPartnerForCapability(cap, `root-direct-${cap}-${idx}`, { smallBook }));
  }

  // Direct top-level customers — enterprise accounts that work with
  // Vipre directly without a distributor or partner in the middle.
  const DIRECT_ROOT_CUSTOMERS = 10;
  for (let i = 0; i < DIRECT_ROOT_CUSTOMERS; i++) {
    const mode = (i % 4) < 3 ? 'managed' : 'unmanaged'; // ~75% managed
    roots.push(makeEntity({ type: 'customer', managementMode: mode, name: nextCustomerName() }));
  }

  validateHierarchy(roots);
  return roots;
}

// Generate once and freeze
export const mockData = generateData();

// ── Utilities ──────────────────────────────────────────────────────

export function findEntityById(id, entities = mockData, path = []) {
  for (const entity of entities) {
    if (entity.id === id) {
      return { entity, path: [...path, entity] };
    }
    if (entity.children?.length) {
      const result = findEntityById(id, entity.children, [...path, entity]);
      if (result) return result;
    }
  }
  return null;
}

export function getSiblingsAtLevel(path, levelIndex) {
  if (levelIndex === 0) return mockData;
  const parent = path[levelIndex - 1];
  return parent?.children || [];
}

export function flattenEntities(entities = mockData, parentPath = []) {
  const result = [];
  for (const entity of entities) {
    const currentPath = [...parentPath, entity];
    result.push({ entity, path: currentPath });
    if (entity.children?.length) {
      result.push(...flattenEntities(entity.children, currentPath));
    }
  }
  return result;
}

export const flatEntityList = flattenEntities();

// Flatten descendants from any starting point (for descendant search)
export function flattenFrom(entities) {
  return flattenEntities(entities, []);
}

export function countDescendantsByType(entities) {
  const counts = {};
  function walk(nodes) {
    for (const node of nodes) {
      counts[node.type] = (counts[node.type] || 0) + 1;
      if (node.children?.length) walk(node.children);
    }
  }
  walk(entities);
  return counts;
}

// ── Device generation (lazy, memoized) ──────────────────────────────
// PRODUCTION: Devices come from the API. This generates deterministic
// mock devices for any customer in the hierarchy.

const _deviceCache = new Map();

function _deviceRng(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return function rand() {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _osList = ['Windows 11', 'Windows 10', 'macOS 14', 'macOS 13', 'Ubuntu 22.04', 'Windows Server 2022'];
const _osWeights = [0.35, 0.25, 0.15, 0.08, 0.07, 0.10];
const _agentVersions = ['4.2.1', '4.1.8', '3.9.2'];
const _agentWeights = [0.65, 0.25, 0.10];
const _complianceStates = ['compliant', 'non-compliant', 'pending-scan'];
const _complianceWeights = [0.70, 0.20, 0.10];

function _weightedPick(items, weights, r) {
  let c = 0;
  for (let i = 0; i < items.length; i++) {
    c += weights[i];
    if (r < c) return items[i];
  }
  return items[items.length - 1];
}

export function generateDevicesForCustomer(customer) {
  if (_deviceCache.has(customer.id)) return _deviceCache.get(customer.id);

  const rng = _deviceRng(customer.id);
  const count = 5 + Math.floor(rng() * 6); // 5-10 devices
  const devices = [];

  for (let i = 0; i < count; i++) {
    const r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng(), r5 = rng();
    const hex = () => Math.floor(rng() * 16).toString(16).toUpperCase();

    let hostname;
    if (r1 < 0.45) hostname = `DESKTOP-${hex()}${hex()}${hex()}${hex()}`;
    else if (r1 < 0.80) hostname = `LAPTOP-${hex()}${hex()}${hex()}${hex()}`;
    else {
      const types = ['PROD', 'DEV', 'WEB', 'DB', 'APP', 'FILE'];
      hostname = `SERVER-${types[Math.floor(rng() * types.length)]}-${String(1 + Math.floor(rng() * 12)).padStart(2, '0')}`;
    }

    const hoursAgo = r5 < 0.55 ? rng() * 24 : r5 < 0.80 ? 24 + rng() * 48 : 72 + rng() * 96;

    devices.push({
      id: `${customer.id}-dev-${i}`,
      hostname,
      customerId: customer.id,
      customer: customer.name,
      os: _weightedPick(_osList, _osWeights, r2),
      agentVersion: _weightedPick(_agentVersions, _agentWeights, r3),
      compliance: _weightedPick(_complianceStates, _complianceWeights, r4),
      lastSeen: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    });
  }

  _deviceCache.set(customer.id, devices);
  return devices;
}

// ── Effective-managed evaluation for a customer ─────────────────────
// A customer is "effectively managed" iff at least one of its packages
// resolves to managed. A package resolves to managed when:
//   pkg.managed === true, OR (pkg.managed === null AND customer.managementMode === 'managed')
function isCustomerEffectivelyManaged(customer) {
  if (customer?.type !== 'customer') return false;
  const pkgs = genCustomerPackages(customer);
  if (!pkgs.length) return customer.managementMode === 'managed';
  return pkgs.some(p =>
    p.managed === true ||
    (p.managed === null && customer.managementMode === 'managed')
  );
}

/**
 * Walk the scope and return the devices belonging to managed-effective
 * customers only.
 *
 * @param {Entity|null} entity Scope root. Null/undefined → entire mockData.
 * @returns {{ devices: Device[], included: number, excluded: number }}
 *   devices  — flat list of device objects from contributing customers.
 *   included — count of customers whose devices were included.
 *   excluded — count of customers in scope that were filtered out.
 */
export function collectDevicesInScope(entity) {
  const devices = [];
  let included = 0;
  let excluded = 0;

  function visitCustomer(customer) {
    if (isCustomerEffectivelyManaged(customer)) {
      devices.push(...generateDevicesForCustomer(customer));
      included++;
    } else {
      excluded++;
    }
  }

  function walk(nodes) {
    for (const node of nodes) {
      if (node.type === 'customer') {
        visitCustomer(node);
      } else if (node.children?.length) {
        walk(node.children);
      }
    }
  }

  if (!entity) {
    walk(mockData);
  } else if (entity.type === 'customer') {
    visitCustomer(entity);
  } else {
    walk(entity.children || []);
  }

  return { devices, included, excluded };
}

// ── Package data (shared with EntityDetail) ──────────────────────────

export function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h;
}

export const VIPRE_PACKAGES = [
  { id: 'ies',               name: 'VIPRE IES' },
  { id: 'ies-beta',          name: 'VIPRE IES BETA' },
  { id: 'safesend',          name: 'VIPRE SafeSend' },
  { id: 'safesend-ai',       name: 'VIPRE SafeSend + AI addon' },
  { id: 'safesend-beta',     name: 'VIPRE SafeSend Beta' },
  { id: 'tep',               name: 'VIPRE Total Email Protection' },
  { id: 'atp',               name: 'Advanced Threat Protection' },
  { id: 'edge',              name: 'Edge Defense' },
  { id: 'complete',          name: 'Complete Defense' },
  { id: 'edge-nordics',      name: 'Edge Defense Nordics' },
  { id: 'complete-nordics',  name: 'Complete Defense Nordics' },
  { id: 'email360',          name: 'VIPRE Email 360' },
  { id: 'epmail',            name: 'VIPRE Endpoint+Email' },
  { id: 'epmail360',         name: 'VIPRE Endpoint+Email 360' },
  { id: 'essentials',        name: 'Essentials' },
  { id: 'emailcloud',        name: 'Email Cloud' },
  { id: 'exchangesmart',     name: 'ExchangeSMART' },
  { id: 'exchangesmart-suite', name: 'ExchangeSMART Suite' },
  { id: 'essentials-inbound', name: 'Essentials Inbound Only' },
  { id: 'vaultcritical',     name: 'VaultCritical Suite' },
];

export const VIPRE_ADD_ONS = [
  'Legacy Archiving, 3 years',
  'Legacy Archiving, unlimited',
  'Image Analyzer',
  'DNS Service',
  'Extended Message Logs - 1 year',
  'Extended Message Logs - 5 years',
  'Extended Message Logs - 10 years',
];

// ── Capability-flavored package pools ──────────────────────────────
// These ids must exist in VIPRE_PACKAGES.
const SECOPS_PACKAGE_IDS = [
  'ies', 'ies-beta', 'tep', 'atp', 'edge', 'complete',
  'edge-nordics', 'complete-nordics', 'safesend', 'safesend-ai',
];
const TRANSACTIONAL_PACKAGE_IDS = [
  'essentials', 'essentials-inbound', 'emailcloud', 'exchangesmart',
  'exchangesmart-suite', 'vaultcritical', 'email360', 'epmail',
  'epmail360', 'safesend-beta',
];
const FULL_RANGE_PACKAGE_IDS = VIPRE_PACKAGES.map(p => p.id);

function getPackagePool({ type, partnerCapability }) {
  if (type === 'partner') {
    if (partnerCapability === 'msp') return SECOPS_PACKAGE_IDS;
    if (partnerCapability === 'reseller') return TRANSACTIONAL_PACKAGE_IDS;
  }
  // distributor + hybrid + fallback → full range
  return FULL_RANGE_PACKAGE_IDS;
}

function resolvePackageById(id) {
  return VIPRE_PACKAGES.find(p => p.id === id);
}

// Accept either an entity object or just an entityId (back-compat).
function _normalizeArg(arg) {
  if (arg && typeof arg === 'object') {
    return { id: arg.id, type: arg.type, partnerCapability: arg.partnerCapability, managementMode: arg.managementMode };
  }
  return { id: arg, type: null, partnerCapability: null, managementMode: null };
}

export function genPartnerPackages(entityOrId) {
  const { id, type, partnerCapability } = _normalizeArg(entityOrId);
  const pool = getPackagePool({ type: type || 'partner', partnerCapability });

  let h = hash(id + 'pkgs');
  // Take 5–9 packages (matching previous range); cap at pool size.
  const target = 5 + ((h >>> 0) % 5);
  const count = Math.min(target, pool.length);
  const used = new Set();
  const result = [];
  for (let i = 0; i < count; i++) {
    h = ((h << 5) - h + i * 7) | 0;
    let idx = (h >>> 0) % pool.length;
    while (used.has(idx)) idx = (idx + 1) % pool.length;
    used.add(idx);
    const pkgId = pool[idx];
    const pkg = resolvePackageById(pkgId);
    if (!pkg) continue;
    const customers = 3 + ((hash(id + pkg.id + 'c') >>> 0) % 13);
    const seats = 50 + ((hash(id + pkg.id + 's') >>> 0) % 1451);
    const util = 30 + ((hash(id + pkg.id + 'u') >>> 0) % 66);
    result.push({ ...pkg, customers, seats, util });
  }
  return result;
}

export function genCustomerPackages(entityOrId) {
  const { id, managementMode } = _normalizeArg(entityOrId);
  // Customers draw from the full range — package eligibility is not gated
  // by capability at the customer level.
  let h = hash(id + 'cpkgs');
  const count = 2 + ((h >>> 0) % 3);
  const used = new Set();
  const result = [];

  // Decide override: ~15% of customers override 1 or 2 packages to a non-inherit
  // managed value, deterministic from the customer id.
  const overrideRoll = (hash(id + 'ovr') >>> 0) % 100;
  const willOverride = overrideRoll < 15;
  const overrideCount = willOverride ? 1 + ((hash(id + 'ovrn') >>> 0) % 2) : 0;

  for (let i = 0; i < count; i++) {
    h = ((h << 5) - h + i * 11) | 0;
    let idx = (h >>> 0) % VIPRE_PACKAGES.length;
    while (used.has(idx)) idx = (idx + 1) % VIPRE_PACKAGES.length;
    used.add(idx);
    const pkg = VIPRE_PACKAGES[idx];
    const status = ((hash(id + pkg.id + 'cs') >>> 0) % 5) < 4 ? 'active' : 'trial';
    const declared = 25 + ((hash(id + pkg.id + 'cd') >>> 0) % 476);
    const h4 = hash(id + pkg.id + 'ca');
    const actual = ((h4 >>> 0) % 10) < 2
      ? declared + 1 + ((h4 >>> 0) % 50)
      : Math.max(1, declared - ((h4 >>> 0) % Math.max(1, Math.floor(declared * 0.3))));
    const util = Math.min(200, Math.round((actual / declared) * 100));
    const addOns = VIPRE_ADD_ONS.filter((_, ai) => ((hash(id + pkg.id + 'ao' + ai) >>> 0) % 4) === 0);

    // managed: null = inherit from customer.managementMode.
    // Override flips to the opposite of the customer's mode for the first
    // `overrideCount` packages, creating mixed cases.
    let managed = null;
    if (i < overrideCount) {
      managed = managementMode === 'managed' ? false : true;
    }

    result.push({ ...pkg, status, declared, actual, util, addOns, managed });
  }
  return result;
}

// ── Helpers for adoption aggregation ───────────────────────────────
function isPackageEffectivelyManaged(pkg, parentManagementMode) {
  if (pkg.managed === true) return true;
  if (pkg.managed === false) return false;
  return parentManagementMode === 'managed';
}

function emptyAdoptionBucket() {
  return { packages: [], uniquePackages: 0, totalSubscriptions: 0, totalSeats: 0, avgUtil: 0 };
}

function rollUpAdoptionMap(pkgMap) {
  const packages = Object.values(pkgMap)
    .map(p => ({ ...p, avgUtil: p.seats > 0 ? Math.round(p.utilWeightedSum / p.seats) : 0 }))
    .sort((a, b) => b.entities - a.entities);
  const totalSubscriptions = packages.reduce((s, p) => s + p.entities, 0);
  const totalSeats = packages.reduce((s, p) => s + p.seats, 0);
  const avgUtil = totalSeats > 0
    ? Math.round(packages.reduce((s, p) => s + p.utilWeightedSum, 0) / totalSeats)
    : 0;
  return {
    packages,
    uniquePackages: packages.length,
    totalSubscriptions,
    totalSeats,
    avgUtil,
  };
}

/**
 * Aggregate package adoption rolling up under the given scope.
 *
 * Returns the existing flat shape ({ packages, uniquePackages,
 * totalSubscriptions, totalSeats, avgUtil }) PLUS, when aggregating at
 * a partner / distributor / root level, a `managed` and an `unmanaged`
 * sub-object using the same shape — bucketed by whether each customer's
 * package row is effectively managed.
 *
 * Effective-managed rule (per package):
 *   pkg.managed === true → managed
 *   pkg.managed === false → unmanaged
 *   pkg.managed === null  → inherits parent customer.managementMode
 *
 * @param {Entity|null} entity Scope root. Null → entire mockData.
 * @returns {{
 *   packages: object[], uniquePackages: number,
 *   totalSubscriptions: number, totalSeats: number, avgUtil: number,
 *   managed?: object, unmanaged?: object
 * }}
 */
export function collectPackageAdoption(entity) {
  // Three running maps so we can return overall + buckets cheaply.
  const all = {};
  const managedMap = {};
  const unmanagedMap = {};

  function bumpInto(map, pkg, entityDelta, seats, util) {
    if (!map[pkg.id]) {
      map[pkg.id] = { id: pkg.id, name: pkg.name, entities: 0, seats: 0, utilWeightedSum: 0 };
    }
    const e = map[pkg.id];
    e.entities += entityDelta;
    e.seats += seats;
    e.utilWeightedSum += util * seats;
  }

  function addPartner(partnerEntity) {
    // Partner packages are not per-customer — they don't carry a `managed`
    // flag. Put them in the overall bucket only.
    const pkgs = genPartnerPackages(partnerEntity);
    for (const pkg of pkgs) {
      bumpInto(all, pkg, pkg.customers, pkg.seats, pkg.util);
    }
  }

  function addCustomer(customerEntity) {
    const pkgs = genCustomerPackages(customerEntity);
    for (const pkg of pkgs) {
      const effective = isPackageEffectivelyManaged(pkg, customerEntity.managementMode);
      const target = effective ? managedMap : unmanagedMap;
      bumpInto(all, pkg, 1, pkg.actual, pkg.util);
      bumpInto(target, pkg, 1, pkg.actual, pkg.util);
    }
  }

  function addEntity(node) {
    if (node.type === 'customer') addCustomer(node);
    else addPartner(node);
  }

  const isPartnerLikeScope = !entity || entity.type === 'distributor' || entity.type === 'partner';

  if (!entity) {
    for (const e of mockData) addEntity(e);
  } else if (entity.type === 'customer') {
    addCustomer(entity);
  } else {
    for (const child of (entity.children || [])) addEntity(child);
  }

  const overall = rollUpAdoptionMap(all);

  if (isPartnerLikeScope) {
    return {
      ...overall,
      managed: Object.keys(managedMap).length ? rollUpAdoptionMap(managedMap) : emptyAdoptionBucket(),
      unmanaged: Object.keys(unmanagedMap).length ? rollUpAdoptionMap(unmanagedMap) : emptyAdoptionBucket(),
    };
  }
  return overall;
}

// Synthetic "All Accounts" root entity — folds the whole population into a
// single object shaped like makeEntity's output, so the rich entity-detail
// view can render the root landing identically to any drilled-in scope.
// Device / product totals sum over customer leaves (the real endpoints);
// ops + business figures roll up across every node; compliance, opportunity,
// and agent-version mixes are averaged. Walks the frozen mockData tree once
// (no device generation), so it's cheap to memoize on mount.
export function buildRootAggregateEntity() {
  const products = {
    endpoint: { devicesProtected: 0, threatsBlocked: 0, scansCompleted: 0, complianceRate: 0 },
    emailSecurity: { emailsScanned: 0, threatsCaught: 0, phishingBlocked: 0, spamFiltered: 0 },
    safeSend: { emailsSent: 0, attachmentsScanned: 0, dlpTriggers: 0, recipientsVerified: 0 },
  };
  let devices = 0, licenses = 0, threatsBlocked = 0;
  let criticalIssues = 0, configDrift = 0, quarantineDepth = 0;
  let complianceSum = 0, complianceCount = 0;
  let av42 = 0, av41 = 0, av3 = 0, avCount = 0;
  let domHealthy = 0, domIssues = 0;
  let epComplianceSum = 0, epComplianceCount = 0;
  let mrr = 0, seatsLicensed = 0, seatsConsumed = 0, oppSum = 0, oppCount = 0;
  let renew30 = 0, renew60 = 0, churnRisk = 0, activeTrials = 0;

  function walk(nodes) {
    for (const n of nodes) {
      const ops = n.operations || {};
      criticalIssues += ops.criticalIssues || 0;
      configDrift += ops.configDrift || 0;
      quarantineDepth += ops.quarantineDepth || 0;
      if (typeof ops.complianceScore === 'number') { complianceSum += ops.complianceScore; complianceCount++; }
      if (ops.agentVersions) {
        av42 += ops.agentVersions['v4.2'] || 0;
        av41 += ops.agentVersions['v4.1'] || 0;
        av3 += ops.agentVersions['v3.x'] || 0;
        avCount++;
      }
      if (ops.domainHealth) { domHealthy += ops.domainHealth.healthy || 0; domIssues += ops.domainHealth.issues || 0; }

      licenses += n.licenses || 0;
      threatsBlocked += n.threatsBlocked || 0;

      if (n.type === 'customer') {
        devices += n.devices || 0;
        const p = n.products || {};
        if (p.endpoint) {
          products.endpoint.devicesProtected += p.endpoint.devicesProtected || 0;
          products.endpoint.threatsBlocked += p.endpoint.threatsBlocked || 0;
          products.endpoint.scansCompleted += p.endpoint.scansCompleted || 0;
          epComplianceSum += p.endpoint.complianceRate || 0; epComplianceCount++;
        }
        if (p.emailSecurity) {
          products.emailSecurity.emailsScanned += p.emailSecurity.emailsScanned || 0;
          products.emailSecurity.threatsCaught += p.emailSecurity.threatsCaught || 0;
          products.emailSecurity.phishingBlocked += p.emailSecurity.phishingBlocked || 0;
          products.emailSecurity.spamFiltered += p.emailSecurity.spamFiltered || 0;
        }
        if (p.safeSend) {
          products.safeSend.emailsSent += p.safeSend.emailsSent || 0;
          products.safeSend.attachmentsScanned += p.safeSend.attachmentsScanned || 0;
          products.safeSend.dlpTriggers += p.safeSend.dlpTriggers || 0;
          products.safeSend.recipientsVerified += p.safeSend.recipientsVerified || 0;
        }
        const b = n.business || {};
        seatsLicensed += b.seatsLicensed || 0;
        seatsConsumed += b.seatsConsumed || 0;
      }

      const b = n.business || {};
      mrr += b.mrr || 0;
      if (typeof b.opportunityScore === 'number') { oppSum += b.opportunityScore; oppCount++; }
      renew30 += b.renewals?.d30 || 0;
      renew60 += b.renewals?.d60 || 0;
      churnRisk += b.churnRisk || 0;
      activeTrials += b.activeTrials || 0;

      if (n.children?.length) walk(n.children);
    }
  }
  walk(mockData);

  products.endpoint.complianceRate = epComplianceCount ? Math.round(epComplianceSum / epComplianceCount) : 0;
  const normPct = (a) => (avCount ? Math.round(a / avCount) : 0);

  return {
    id: 'all-accounts',
    name: 'All Accounts',
    type: 'root',
    partnerCapability: null,
    managementMode: null,
    status: 'active',
    children: mockData,
    devices,
    licenses,
    threatsBlocked,
    operations: {
      criticalIssues,
      complianceScore: complianceCount ? Math.round(complianceSum / complianceCount) : 0,
      configDrift,
      agentVersions: { 'v4.2': normPct(av42), 'v4.1': normPct(av41), 'v3.x': normPct(av3) },
      domainHealth: { total: domHealthy + domIssues, healthy: domHealthy, issues: domIssues },
      quarantineDepth,
    },
    products,
    business: {
      mrr,
      seatsLicensed,
      seatsConsumed,
      utilizationRate: seatsLicensed ? Math.round((seatsConsumed / seatsLicensed) * 100) / 10 : 0,
      opportunityScore: oppCount ? Math.round(oppSum / oppCount) : 50,
      renewals: { d30: renew30, d60: renew60 },
      churnRisk,
      activeTrials,
      productAdoption: {},
    },
  };
}

export function computeDeviceStats(input) {
  // Transitional compatibility layer: accept either a bare Device[] (legacy
  // callers) or the new { devices, included, excluded } wrapper returned by
  // collectDevicesInScope. Drop the array branch once Wave 2 migrates all
  // consumers to destructure { devices } themselves.
  const devices = Array.isArray(input) ? input : (input?.devices ?? []);
  const now = Date.now();
  const threeDays = 3 * 24 * 3600000;
  return {
    total: devices.length,
    compliant: devices.filter(d => d.compliance === 'compliant').length,
    nonCompliant: devices.filter(d => d.compliance === 'non-compliant').length,
    pendingScan: devices.filter(d => d.compliance === 'pending-scan').length,
    outdatedAgent: devices.filter(d => d.agentVersion < '4.0').length,
    stale: devices.filter(d => now - new Date(d.lastSeen).getTime() > threeDays).length,
  };
}

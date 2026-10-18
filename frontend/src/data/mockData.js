export const overviewStats = [
  { label: 'Total clicks', value: '248,392', change: '+18.6%', icon: 'MousePointer2', tone: 'mint' },
  { label: 'Active links', value: '1,284', change: '+12.4%', icon: 'Link2', tone: 'blue' },
  { label: 'Unique visitors', value: '184,205', change: '+9.2%', icon: 'UsersRound', tone: 'violet' },
]

export const trendData = [
  { date: 'Oct 01', clicks: 3200, visitors: 2400 }, { date: 'Oct 02', clicks: 4100, visitors: 3050 },
  { date: 'Oct 03', clicks: 3600, visitors: 2700 }, { date: 'Oct 04', clicks: 5200, visitors: 3900 },
  { date: 'Oct 05', clicks: 4750, visitors: 3500 }, { date: 'Oct 06', clicks: 6100, visitors: 4500 },
  { date: 'Oct 07', clicks: 5450, visitors: 4120 }, { date: 'Oct 08', clicks: 7200, visitors: 5300 },
  { date: 'Oct 09', clicks: 6800, visitors: 4950 }, { date: 'Oct 10', clicks: 8200, visitors: 6120 },
  { date: 'Oct 11', clicks: 7400, visitors: 5520 }, { date: 'Oct 12', clicks: 9100, visitors: 6800 },
]

export const initialLinks = [
  { id: 'lnk-01', alias: 'fall-launch', shortUrl: 'lnk.pulse/fall-launch', destination: 'https://acme.studio/products/autumn-collection', clicks: 8420, status: 'Active', created: 'Oct 12, 2026', campaign: 'Fall launch', source: 'Instagram' },
  { id: 'lnk-02', alias: 'product-tour', shortUrl: 'lnk.pulse/product-tour', destination: 'https://acme.studio/resources/product-tour?utm_source=linkedin', clicks: 6214, status: 'Active', created: 'Oct 10, 2026', campaign: 'Product awareness', source: 'LinkedIn' },
  { id: 'lnk-03', alias: 'newsletter-24', shortUrl: 'lnk.pulse/newsletter-24', destination: 'https://acme.studio/journal/issue-24', clicks: 4082, status: 'Active', created: 'Oct 08, 2026', campaign: 'October newsletter', source: 'Email' },
  { id: 'lnk-04', alias: 'partner-kit', shortUrl: 'lnk.pulse/partner-kit', destination: 'https://acme.studio/partners/brand-assets', clicks: 2960, status: 'Active', created: 'Oct 06, 2026', campaign: 'Partner program', source: 'Direct' },
  { id: 'lnk-05', alias: 'webinar-oct', shortUrl: 'lnk.pulse/webinar-oct', destination: 'https://events.acme.studio/analytics-live', clicks: 1840, status: 'Expiring soon', created: 'Oct 04, 2026', campaign: 'Live events', source: 'X' },
  { id: 'lnk-06', alias: 'beta-waitlist', shortUrl: 'lnk.pulse/beta-waitlist', destination: 'https://acme.studio/beta?ref=community', clicks: 1256, status: 'Active', created: 'Oct 02, 2026', campaign: 'Beta access', source: 'Reddit' },
  { id: 'lnk-07', alias: 'summer-sale', shortUrl: 'lnk.pulse/summer-sale', destination: 'https://acme.studio/offers/summer', clicks: 980, status: 'Expired', created: 'Sep 28, 2026', campaign: 'Summer campaign', source: 'Instagram' },
]

export const topLinks = initialLinks.slice(0, 4)

export const sourceData = [
  { name: 'Instagram', value: 38, color: '#73e2c1' }, { name: 'Direct', value: 24, color: '#68a9ff' },
  { name: 'LinkedIn', value: 18, color: '#a98aff' }, { name: 'Email', value: 12, color: '#f2bb69' },
  { name: 'Other', value: 8, color: '#5a6a70' },
]

export const deviceData = [
  { name: 'Mobile', value: 58, color: '#73e2c1' }, { name: 'Desktop', value: 34, color: '#68a9ff' },
  { name: 'Tablet', value: 8, color: '#a98aff' },
]

export const campaigns = [
  { name: 'Fall launch', links: 12, clicks: '32,840', change: '+24.8%', progress: 82, status: 'Active' },
  { name: 'Product awareness', links: 8, clicks: '18,204', change: '+12.2%', progress: 64, status: 'Active' },
  { name: 'October newsletter', links: 5, clicks: '9,482', change: '+8.1%', progress: 46, status: 'Active' },
  { name: 'Partner program', links: 4, clicks: '6,120', change: '+3.4%', progress: 28, status: 'Paused' },
]

export const trafficRows = [
  { source: 'Instagram', share: '38.2%', clicks: '94,890', trend: '+21%' },
  { source: 'Direct', share: '24.1%', clicks: '59,860', trend: '+8%' },
  { source: 'LinkedIn', share: '18.4%', clicks: '45,710', trend: '+14%' },
  { source: 'Email', share: '12.6%', clicks: '31,290', trend: '+6%' },
  { source: 'Other', share: '6.7%', clicks: '16,642', trend: '+2%' },
]

export const adminUsers = [
  { name: 'Maya Chen', email: 'maya@northstar.co', plan: 'Growth', links: 42, joined: 'Oct 12, 2026', status: 'Active' },
  { name: 'Oliver Grant', email: 'oliver@frame.io', plan: 'Pro', links: 128, joined: 'Oct 11, 2026', status: 'Active' },
  { name: 'Aisha Patel', email: 'aisha@mono.design', plan: 'Starter', links: 16, joined: 'Oct 09, 2026', status: 'Review' },
  { name: 'Noah Williams', email: 'noah@northpeak.app', plan: 'Growth', links: 73, joined: 'Oct 08, 2026', status: 'Active' },
]

// One "edition" per community. Change this file (or load it from the DB) to launch
// the same platform for Kenyan, Nigerian, Rwandan... communities under their own brand.
export const edition = {
  slug: 'ug-dfw',
  name: 'Ugandan Community of DFW',
  tagline: 'A shared picture of who we are and what we need',
  country: 'Uganda',
  codePrefix: 'UG-DFW',
  kMin: 5, // smallest group the dashboard will show (privacy)
  milestones: [
    { n: 50, label: 'Pilot', note: 'Prove survey, intake and welcome flow' },
    { n: 200, label: 'Vendor leverage', note: 'Enough data to negotiate group rates' },
    { n: 500, label: 'Self-sustaining', note: 'Dues cover software and staff hours' },
  ],
  languages: ['English', 'Luganda', 'Runyankore/Rukiga', 'Acholi', 'Lusoga', 'Swahili', 'Other'],
  sectors: ['Healthcare', 'Tech/Engineering', 'Business owner', 'Education', 'Corporate/Finance', 'Transport/Logistics', 'Service industry', 'Gig economy', 'Retired/Unemployed'],
  tiers: {
    basic: { label: 'Basic', monthly: 10, poolShare: 0, perks: 'Directory, State of Community reports' },
    standard: { label: 'Standard', monthly: 15, poolShare: 5, perks: 'Group rates: bereavement pool, legal retainers' },
    premium: { label: 'Premium', monthly: 30, poolShare: 5, perks: 'Priority concierge, discounted cross-border consults' },
  },
} as const

export const incomeBands = ['Under $40k', '$40-70k', '$70-100k', '$100-150k', '$150k+']
export const incomeMid = [30, 55, 85, 125, 175] // $k midpoints for the estimate
export const remitBands = ['None', 'Under $2k', '$2-5k', '$5-10k', '$10k+']

export const services = [
  { id: 'bereavement', name: 'Bereavement & repatriation pool', pillar: 'Cross-border', launched: false },
  { id: 'taxlegal', name: 'Cross-border tax & estate advisory', pillar: 'Cross-border', launched: false },
  { id: 'credential', name: 'Credential & licensing network', pillar: 'Careers', launched: false },
  { id: 'susu', name: 'Digital susu / community loan pool', pillar: 'Wealth', launched: false },
  { id: 'incubator', name: 'Business incubator & angel fund', pillar: 'Wealth', launched: false },
  { id: 'health', name: 'Culturally attuned health & senior care', pillar: 'Family', launched: false },
  { id: 'youth', name: 'Youth heritage & immersion fellowships', pillar: 'Family', launched: false },
  { id: 'mutualaid', name: 'Emergency mutual aid fund', pillar: 'Safety net', launched: false },
] as const

export const needsList = ['Bereavement costs', 'Getting my degree recognized', 'Cross-border tax help', 'Senior care', 'Business capital', 'Life insurance', 'Youth mentorship', 'Something else']

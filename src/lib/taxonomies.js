// Used until GET /public/taxonomies responds (and if it fails). The API is the source of truth.
export const FALLBACK_TAXONOMIES = {
  sectors: ['Fintech', 'eCommerce', 'Logistics', 'Mobility', 'Edtech', 'Healthtech', 'Foodtech', 'Agritech', 'SaaS', 'Media', 'Internet search','Travel', 'Proptech', 'Other'],
  cities: ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Other'],
  failureCategories: [
    'No product-market fit',
    'Ran out of funding',
    'Unit economics / cash burn',
    'Regulatory / licensing',
    'Competition',
    'Team / co-founder conflict',
    'Governance / compliance issues',
    'Operations / logistics',
    'Market timing',
    'Macroeconomic (FX, inflation)',
    'Legal',
    'No business model',
    'Funding dependency',
    'Distribution and marketing',
    'Product quality and momentum',
    'Ownership and team continuity',
    'Customer trust',
    'Cash flow / funding model',
    'Other',
  ],
  outcomes: ['Shut down', 'Acquired', 'Dormant', 'Pivoted', 'Defunct'],
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

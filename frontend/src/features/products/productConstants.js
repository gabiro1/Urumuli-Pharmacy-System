export const PRODUCT_TYPES = [
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'PHARMACY_CARE', label: 'Pharmacy Care' },
]

export const PRODUCT_TYPE_LABELS = {
  MEDICINE: 'Medicine',
  PHARMACY_CARE: 'Pharmacy Care',
}

export const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Cream',
  'Ointment',
  'Gel',
  'Drops',
  'Suppository',
  'Powder',
  'Solution',
  'Suspension',
  'Inhaler',
  'Spray',
  'Patch',
]

export const ROUTES_OF_ADMINISTRATION = [
  'Oral',
  'Topical',
  'Intravenous',
  'Intramuscular',
  'Subcutaneous',
  'Inhalation',
  'Ophthalmic',
  'Otic',
  'Nasal',
  'Rectal',
  'Vaginal',
  'Sublingual',
]

export const CLASSIFICATIONS = [
  { value: 'OTC', label: 'OTC' },
  { value: 'PRESCRIPTION_REQUIRED', label: 'Prescription required' },
  { value: 'RESTRICTED', label: 'Restricted' },
]

export const STOCK_REASONS = [
  { value: 'STOCK_RECEIVED', label: 'Stock received' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'RETURN', label: 'Return to supplier' },
  { value: 'OTHER', label: 'Other' },
]

export const STOCK_STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
]

export const EXPIRY_OPTIONS = [
  { value: 'VALID', label: 'Valid' },
  { value: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { value: 'EXPIRED', label: 'Expired' },
]

export const PRESCRIPTION_OPTIONS = [
  { value: 'REQUIRED', label: 'Prescription Required' },
  { value: 'OTC', label: 'OTC' },
]

export const SORT_OPTIONS = [
  { value: 'name_ASC', label: 'Name: A → Z' },
  { value: 'name_DESC', label: 'Name: Z → A' },
  { value: 'price_ASC', label: 'Price: Low → High' },
  { value: 'price_DESC', label: 'Price: High → Low' },
  { value: 'current_stock_ASC', label: 'Stock: Low → High' },
  { value: 'current_stock_DESC', label: 'Stock: High → Low' },
  { value: 'created_at_DESC', label: 'Newest' },
  { value: 'created_at_ASC', label: 'Oldest' },
  { value: 'expiry_date_ASC', label: 'Expiry Date' },
  { value: 'updated_at_DESC', label: 'Recently Updated' },
]

export const EXPIRY_THRESHOLD_DAYS = 90

export const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024

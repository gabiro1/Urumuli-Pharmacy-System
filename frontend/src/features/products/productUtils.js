import { PRODUCT_TYPE_LABELS, EXPIRY_THRESHOLD_DAYS, IMAGE_ACCEPTED_TYPES, IMAGE_MAX_BYTES } from './productConstants'

export const money = (value) => `RWF ${Number(value || 0).toLocaleString()}`

export const productTypeLabel = (type) => PRODUCT_TYPE_LABELS[type] || 'Medicine'

export function expiryState(product) {
  if (!product?.expiryDate) return null
  const expiry = new Date(product.expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (expiry < today) {
    return { label: 'Expired', variant: 'red', severity: 'expired' }
  }
  const soon = new Date(today)
  soon.setDate(soon.getDate() + EXPIRY_THRESHOLD_DAYS)
  if (expiry <= soon) {
    const days = Math.round((expiry - today) / 86400000)
    return { label: `Expires in ${days}d`, variant: 'orange', severity: 'expiring' }
  }
  return { label: 'Valid', variant: 'default', severity: 'valid' }
}

export function stockState(product) {
  const stock = Number(product?.currentStock ?? 0)
  if (stock <= 0) return { label: 'Out of Stock', variant: 'red', severity: 'out' }
  const threshold = Number(product?.minStockLevel ?? product?.reorderPoint ?? 0)
  if (stock <= threshold) return { label: 'Low Stock', variant: 'orange', severity: 'low' }
  return { label: 'In Stock', variant: 'green', severity: 'in' }
}

export function formatDateOnly(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function validateImageFile(file) {
  if (!IMAGE_ACCEPTED_TYPES.includes(file.type)) {
    return 'Unsupported file type. Use JPG, PNG, or WEBP.'
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return 'Image is too large. Maximum size is 5 MB.'
  }
  return null
}

export function buildQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      search.set(key, value)
    }
  })
  return search.toString()
}

export const EMPTY_FORM = {
  name: '',
  productType: 'MEDICINE',
  categoryId: '',
  subcategory: '',
  brandName: '',
  sku: '',
  barcode: '',
  manufacturer: '',
  description: '',
  price: '',
  costPrice: '',
  currentStock: '0',
  minStockLevel: '10',
  reorderPoint: '20',
  sellingUnit: 'pack',
  supplierId: '',
  expiryDate: '',
  imageUrl: null,
  genericName: '',
  strength: '',
  dosageForm: '',
  routeOfAdministration: '',
  requiresPrescription: false,
  isControlled: false,
  classification: 'OTC',
  activeIngredients: '',
  packSize: '',
  dosageInstructions: '',
  contraindications: '',
  warnings: '',
  storageConditions: '',
  carePurpose: '',
  ingredients: '',
  usageInstructions: '',
  sizeDescription: '',
}

export function toFormValues(product) {
  if (!product) return { ...EMPTY_FORM }
  return {
    name: product.name || '',
    productType: product.productType || 'MEDICINE',
    categoryId: product.categoryId || '',
    subcategory: product.subcategory || '',
    brandName: product.brandName || '',
    sku: product.sku || '',
    barcode: product.barcode || '',
    manufacturer: product.manufacturer || '',
    description: product.description || '',
    price: product.price ?? '',
    costPrice: product.costPrice ?? '',
    currentStock: product.currentStock ?? '0',
    minStockLevel: product.minStockLevel ?? '10',
    reorderPoint: product.reorderPoint ?? '20',
    sellingUnit: product.sellingUnit || 'pack',
    supplierId: product.supplierId || '',
    expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : '',
    imageUrl: product.imageUrl || null,
    genericName: product.genericName || '',
    strength: product.strength || '',
    dosageForm: product.dosageForm || '',
    routeOfAdministration: product.routeOfAdministration || '',
    requiresPrescription: Boolean(product.requiresPrescription),
    isControlled: Boolean(product.isControlled),
    classification: product.classification || 'OTC',
    activeIngredients: product.activeIngredients || '',
    packSize: product.packSize || '',
    dosageInstructions: product.dosageInstructions || '',
    contraindications: product.contraindications || '',
    warnings: product.generalWarnings || '',
    storageConditions: product.storageConditions || '',
    carePurpose: product.carePurpose || '',
    ingredients: product.ingredients || '',
    usageInstructions: product.usageInstructions || '',
    sizeDescription: product.sizeDescription || '',
  }
}

export function asPayload(form) {
  const numeric = (value) => (value === '' || value === null || value === undefined ? null : Number(value))
  const optional = (value) => (value === '' ? null : value)

  const payload = {
    name: form.name.trim(),
    productType: form.productType,
    categoryId: form.categoryId || null,
    subcategory: optional(form.subcategory),
    brandName: optional(form.brandName),
    sku: optional(form.sku),
    barcode: optional(form.barcode),
    manufacturer: optional(form.manufacturer),
    description: optional(form.description),
    price: numeric(form.price),
    costPrice: numeric(form.costPrice),
    currentStock: numeric(form.currentStock),
    minStockLevel: numeric(form.minStockLevel),
    reorderPoint: numeric(form.reorderPoint),
    sellingUnit: form.sellingUnit.trim() || 'pack',
    supplierId: form.supplierId || null,
    expiryDate: optional(form.expiryDate),
    storageConditions: optional(form.storageConditions),
    generalWarnings: optional(form.warnings),
  }

  if (form.productType === 'MEDICINE') {
    Object.assign(payload, {
      genericName: optional(form.genericName),
      strength: optional(form.strength),
      dosageForm: optional(form.dosageForm),
      routeOfAdministration: optional(form.routeOfAdministration),
      requiresPrescription: Boolean(form.requiresPrescription),
      isControlled: Boolean(form.isControlled),
      classification: form.classification || 'OTC',
      activeIngredients: optional(form.activeIngredients),
      packSize: optional(form.packSize),
      dosageInstructions: optional(form.dosageInstructions),
      contraindications: optional(form.contraindications),
    })
  } else {
    Object.assign(payload, {
      carePurpose: optional(form.carePurpose),
      ingredients: optional(form.ingredients),
      usageInstructions: optional(form.usageInstructions),
      sizeDescription: optional(form.sizeDescription),
    })
  }

  return payload
}

export function canManageProducts(role) {
  return ['ADMIN', 'MANAGER', 'PHARMACIST', 'INVENTORY_MANAGER'].includes(role)
}

export function canAdjustStock(role) {
  return ['ADMIN', 'MANAGER', 'PHARMACIST', 'INVENTORY_MANAGER'].includes(role)
}

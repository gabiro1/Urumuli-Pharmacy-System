import test from 'node:test';
import assert from 'node:assert/strict';
import { mapMedicine } from '../src/utils/serializers.js';

const medicine = {
  id: 'm1',
  name: 'Amoxicillin 500mg',
  generic_name: 'Amoxicillin',
  brand_name: 'Amoxil',
  category_id: 'c1',
  category_name: 'Antibiotic',
  price: 1500,
  cost_price: 900,
  requires_prescription: true,
  is_active: true,
  is_controlled: false,
  strength: '500mg',
  dosage_form: 'tablet',
  unit_of_measure: 'strip',
  current_stock: 12,
  min_stock_level: 5,
  max_stock_level: 100,
  reorder_point: 10,
  barcode: 'ABC123',
  description: 'Penicillin-class antibiotic',
  symptoms: 'fever, infection',
  side_effects: 'diarrhoea',
  contraindications: 'penicillin allergy',
  manufacturer: 'Cipla',
  pack_size: '10 tablets',
  selling_unit: 'strip',
  image_url: 'https://example.test/amox.jpg',
};

test('mapMedicine emits snake_case aliases for the public catalogue', () => {
  const mapped = mapMedicine(medicine);
  assert.equal(mapped.generic_name, 'Amoxicillin');
  assert.equal(mapped.genericName, 'Amoxicillin');
  assert.equal(mapped.requires_prescription, true);
  assert.equal(mapped.dosage_form, 'tablet');
  assert.equal(mapped.category, 'Antibiotic');
  assert.equal(mapped.category_name, 'Antibiotic');
  assert.equal(mapped.brand_name, 'Amoxil');
  assert.equal(mapped.image_url, 'https://example.test/amox.jpg');
  assert.equal(mapped.availability_status, 'IN_STOCK');
  assert.equal(mapped.current_stock, 12);
});

test('mapMedicine handles a null medicine', () => {
  assert.equal(mapMedicine(null), null);
});
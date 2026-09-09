-- Curated pharmacy-care starter products. These remain in the existing catalog table
-- so stock, sales, ordering, and permissions use the same product source of truth.
INSERT INTO categories (name, slug, description, is_active)
VALUES
  ('Skin Care', 'skin-care', 'Pharmacy-appropriate skin care and dermatological products', true),
  ('Hair Care', 'hair-care', 'Pharmacy-appropriate hair and scalp care products', true),
  ('Oral Care', 'oral-care', 'Oral hygiene and dental care products', true),
  ('Personal Hygiene', 'personal-hygiene', 'Personal hygiene and sanitizing products', true),
  ('Baby Care', 'baby-care', 'Baby skin and hygiene products', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO medicines (
  name, brand_name, category_id, manufacturer, description, price, cost_price,
  requires_prescription, is_active, unit_of_measure, min_stock_level, max_stock_level,
  current_stock, reorder_point, image_url, classification, pack_size, selling_unit,
  availability_status, product_type, sku, care_purpose, ingredients, usage_instructions,
  size_description, storage_conditions
)
SELECT p.name, p.brand, c.id, p.manufacturer, p.description, p.price, p.cost_price,
  false, true, 'PACK', 8, 250, p.stock, 12, p.image_url, 'OTC', p.size, 'unit',
  CASE WHEN p.stock = 0 THEN 'UNAVAILABLE' WHEN p.stock <= 12 THEN 'LOW_STOCK' ELSE 'IN_STOCK' END,
  'PHARMACY_CARE', p.sku, p.purpose, p.ingredients, p.instructions, p.size, p.storage
FROM (VALUES
  ('CeraVe Moisturizing Cream', 'CeraVe', 'Skin Care', 'CeraVe', 'Dermatological moisturizer for dry to very dry and sensitive skin.', 18000::numeric, 12400::numeric, 18, 'CARE-CERAVE-340', 'Dermatological moisturizer', 'Ceramides and hyaluronic acid', 'Apply generously to face and body as needed.', '340 g', 'Store in a cool, dry place.', 'https://www.cerave.ca/en-ca/%27/-/media/project/loreal/brand-sites/cerave/americas/ca/products/moisturizing-cream/700x875/moisturizing-cream.png?hash=8BCCE9F76F519B05117E2D8F9BD30A43%27&rev=0a694b0195744975a2bf9efb4ac087b0&w=500'),
  ('NIVEA Soft Moisturizing Cream', 'NIVEA', 'Skin Care', 'Beiersdorf', 'Light daily moisturizer suitable for face, hands, and body.', 8500::numeric, 5600::numeric, 24, 'CARE-NIVEA-SOFT-100', 'Daily skin moisturizer', 'Jojoba oil and vitamin E', 'Apply to clean skin and massage until absorbed.', '100 ml', 'Store below 30°C.', 'https://cdn.mafrservices.com/sys-master-root/h2a/h92/9431925653534/318024_main.jpg?im=Resize%3D480'),
  ('Anti-Dandruff Shampoo', 'Head & Shoulders', 'Hair Care', 'P&G', 'Pharmacy hair-care shampoo for dandruff-prone scalp.', 7200::numeric, 4800::numeric, 9, 'CARE-HS-200', 'Anti-dandruff scalp care', 'Zinc pyrithione shampoo base', 'Massage into wet hair, rinse, and repeat when needed.', '200 ml', 'Store at room temperature.', 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=700&q=80'),
  ('Colgate Total Toothpaste', 'Colgate', 'Oral Care', 'Colgate-Palmolive', 'Fluoride toothpaste for daily oral hygiene and cavity protection.', 4500::numeric, 2900::numeric, 30, 'CARE-COLGATE-100', 'Daily oral hygiene', 'Fluoride toothpaste', 'Brush twice daily. Do not swallow.', '100 ml', 'Store in a dry place.', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=700&q=80'),
  ('Johnson’s Baby Lotion', 'Johnson’s', 'Baby Care', 'Kenvue', 'Gentle daily baby lotion for delicate skin.', 9600::numeric, 6500::numeric, 14, 'CARE-JOHNSONS-300', 'Baby skin moisturizer', 'Gentle moisturizing emollients', 'Apply gently to clean, dry baby skin.', '300 ml', 'Keep out of reach of children.', 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=700&q=80'),
  ('Dettol Hand Sanitizer', 'Dettol', 'Personal Hygiene', 'Reckitt', 'Alcohol-based hand sanitizer for routine personal hygiene.', 3800::numeric, 2400::numeric, 6, 'CARE-DETTOL-50', 'Hand hygiene', 'Ethyl alcohol antiseptic gel', 'Rub hands together until dry. External use only.', '50 ml', 'Keep away from heat and flame.', 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=700&q=80')
) AS p(name, brand, category, manufacturer, description, price, cost_price, stock, sku, purpose, ingredients, instructions, size, storage, image_url)
JOIN categories c ON c.name = p.category
WHERE NOT EXISTS (SELECT 1 FROM medicines m WHERE m.sku = p.sku);

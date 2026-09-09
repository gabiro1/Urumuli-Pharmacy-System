-- Urumuli Pharmacy System - Postgres Full-Text Search for Medicines
-- Replaces ILIKE string matching with a tsvector + GIN index for faster,
-- relevance-ranked search on the medicines catalog.

-- 1. Add a generated tsvector column populated from key searchable fields.
--    We use setweight() to boost matches in more important fields (name,
--    generic_name, brand_name) over longer descriptive text.
ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Populate existing rows.
UPDATE medicines m
SET search_vector =
      setweight(to_tsvector('english', COALESCE(m.name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(m.generic_name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(m.brand_name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(m.sku, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(m.barcode, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(m.description, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(m.symptoms, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(m.indications, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(m.contraindications, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(array_to_string(m.tags, ' '), '')), 'B');

-- 3. GIN index for fast @@ queries.
CREATE INDEX IF NOT EXISTS idx_medicines_search_vector
  ON medicines USING GIN(search_vector);

-- 4. Trigger so the vector stays in sync on INSERT/UPDATE.
CREATE OR REPLACE FUNCTION medicines_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
      setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(NEW.generic_name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(NEW.brand_name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(NEW.barcode, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(NEW.symptoms, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(NEW.indications, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(NEW.contraindications, '')), 'C') ||
      setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medicines_search_vector ON medicines;
CREATE TRIGGER trg_medicines_search_vector
  BEFORE INSERT OR UPDATE OF name, generic_name, brand_name, sku, barcode,
                          description, symptoms, indications, contraindications, tags
  ON medicines
  FOR EACH ROW
  EXECUTE FUNCTION medicines_search_vector_update();

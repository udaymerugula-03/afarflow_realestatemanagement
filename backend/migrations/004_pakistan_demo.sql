-- Restore the original market labels; numeric non-demo amounts are not FX-converted.
ALTER TABLE properties ALTER COLUMN currency SET DEFAULT 'PKR';
UPDATE properties SET currency='PKR' WHERE currency='INR';

UPDATE properties SET
  title='Contemporary family home in DHA', city='Lahore', locality='DHA Phase 6',
  address='DHA Phase 6, Lahore, Pakistan', price=42500000, area=10, area_unit='marla'
WHERE reference_code='AF-001' AND city='Bengaluru'
  AND description LIKE 'Illustrative demonstration listing%';

UPDATE properties SET
  title='Bright apartment with city views', city='Islamabad', locality='Bahria Town',
  address='Bahria Town, Islamabad, Pakistan', price=85000, area=1450, area_unit='sq ft'
WHERE reference_code='AF-002' AND city='Hyderabad'
  AND description LIKE 'Illustrative demonstration listing%';

UPDATE properties SET
  title='Corner plot in established community', city='Karachi', locality='Scheme 33',
  address='Scheme 33, Karachi, Pakistan', price=18000000, area=240, area_unit='sq yd'
WHERE reference_code='AF-003' AND city='Pune'
  AND description LIKE 'Illustrative demonstration listing%';

UPDATE leads SET phone='+923001234567'
WHERE email='customer@example.com' AND name='Demo Customer' AND phone='+919000000000';

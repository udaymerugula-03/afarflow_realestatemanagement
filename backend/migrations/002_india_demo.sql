ALTER TABLE properties ALTER COLUMN currency SET DEFAULT 'INR';
UPDATE properties SET currency='INR' WHERE currency='PKR';
ALTER TABLE properties DROP CONSTRAINT properties_area_unit_check;
ALTER TABLE properties ADD CONSTRAINT properties_area_unit_check
  CHECK (area_unit IN ('sq ft','sq yd','sq m','acre','cent','marla','kanal'));

UPDATE properties SET
  title='Contemporary villa in Whitefield', city='Bengaluru', locality='Whitefield',
  address='Whitefield, Bengaluru, Karnataka, India', price=18500000, area=2400, area_unit='sq ft',
  images=CASE WHEN jsonb_array_length(images)=0 THEN '["/demo-media/villa.svg","/demo-media/neighborhood.svg"]'::jsonb ELSE images END
WHERE reference_code='AF-001' AND city='Lahore'
  AND description LIKE 'Illustrative demonstration listing%';

UPDATE properties SET
  title='Bright apartment in Gachibowli', city='Hyderabad', locality='Gachibowli',
  address='Gachibowli, Hyderabad, Telangana, India', price=35000, area=1450, area_unit='sq ft',
  images=CASE WHEN jsonb_array_length(images)=0 THEN '["/demo-media/apartment.svg","/demo-media/neighborhood.svg"]'::jsonb ELSE images END
WHERE reference_code='AF-002' AND city='Islamabad'
  AND description LIKE 'Illustrative demonstration listing%';

UPDATE properties SET
  title='Residential plot in Hinjewadi', city='Pune', locality='Hinjewadi',
  address='Hinjewadi, Pune, Maharashtra, India', price=6500000, area=2400, area_unit='sq ft',
  images=CASE WHEN jsonb_array_length(images)=0 THEN '["/demo-media/plot.svg","/demo-media/neighborhood.svg"]'::jsonb ELSE images END
WHERE reference_code='AF-003' AND city='Karachi'
  AND description LIKE 'Illustrative demonstration listing%';

UPDATE leads SET phone='+919000000000'
WHERE email='customer@example.com' AND name='Demo Customer' AND phone='+923001234567';

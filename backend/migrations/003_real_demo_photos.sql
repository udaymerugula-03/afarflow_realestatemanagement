UPDATE properties AS p SET images=(
  SELECT COALESCE(jsonb_agg(
    CASE asset.value
      WHEN '/demo-media/villa.svg' THEN '/demo-media/villa.jpg'
      WHEN '/demo-media/apartment.svg' THEN '/demo-media/apartment.jpg'
      WHEN '/demo-media/plot.svg' THEN '/demo-media/plot.jpg'
      ELSE asset.value
    END ORDER BY asset.position
  ), '[]'::jsonb)
  FROM jsonb_array_elements_text(p.images) WITH ORDINALITY AS asset(value, position)
  WHERE asset.value <> '/demo-media/neighborhood.svg'
)
WHERE p.images ?| ARRAY[
  '/demo-media/villa.svg', '/demo-media/apartment.svg',
  '/demo-media/plot.svg', '/demo-media/neighborhood.svg'
];

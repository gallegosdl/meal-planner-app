-- First remove any duplicate recipe names if they exist
DELETE FROM recipes a USING recipes b 
WHERE a.id > b.id 
AND a.name = b.name;

-- Add unique constraint to name column
ALTER TABLE recipes
ADD CONSTRAINT recipes_name_unique UNIQUE (name);

-- Add index for better performance on name lookups
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name); 
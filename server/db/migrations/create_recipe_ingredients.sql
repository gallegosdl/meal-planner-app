-- Create recipe_ingredients table
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount TEXT,
    unit TEXT,
    notes TEXT,
    category TEXT, -- Produce, Meat, Dairy, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Optional nutritional info per ingredient
    calories_per_unit FLOAT,
    protein_g_per_unit FLOAT,
    carbs_g_per_unit FLOAT,
    fat_g_per_unit FLOAT
);

-- Create indexes for better performance
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_name ON recipe_ingredients(name);

-- Function to migrate existing ingredients from JSONB to new table
CREATE OR REPLACE FUNCTION migrate_ingredients() 
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, ingredients FROM recipes WHERE ingredients IS NOT NULL AND ingredients::text != 'null'
    LOOP
        INSERT INTO recipe_ingredients (recipe_id, name, amount, notes)
        SELECT 
            r.id,
            ing->>'name' as name,
            ing->>'amount' as amount,
            ing->>'notes' as notes
        FROM jsonb_array_elements(r.ingredients) as ing
        WHERE ing->>'name' IS NOT NULL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing data
SELECT migrate_ingredients();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_ingredients();

-- Add comment to indicate JSONB column is now duplicated
COMMENT ON COLUMN recipes.ingredients IS 'Deprecated: Data now also stored in recipe_ingredients table'; 
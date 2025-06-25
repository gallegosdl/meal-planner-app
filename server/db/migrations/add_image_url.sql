-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recipes' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE recipes ADD COLUMN image_url TEXT;
    END IF;
END $$; 
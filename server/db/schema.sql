CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- Main, Side, Dessert, Breakfast, etc.
  cuisine_type TEXT,      -- Italian, Mexican, Asian, etc.
  difficulty TEXT,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  servings INTEGER,
  instructions TEXT,
  plating TEXT,
  image_url TEXT,
  source_url TEXT,
  
  -- Nutrition per serving
  calories INTEGER,
  protein FLOAT,
  carbs FLOAT,
  fat FLOAT,
  fiber FLOAT,
  sugar FLOAT,
  sodium FLOAT,
  cholesterol FLOAT,
  
  -- Diet categories
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_dairy_free BOOLEAN DEFAULT FALSE,
  is_keto_friendly BOOLEAN DEFAULT FALSE,
  is_low_carb BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER,
  name TEXT NOT NULL,
  amount TEXT,
  unit TEXT,
  notes TEXT,
  category TEXT, -- Produce, Meat, Dairy, etc.
  calories_per_unit FLOAT,
  protein_per_unit FLOAT,
  carbs_per_unit FLOAT,
  fat_per_unit FLOAT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE recipe_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER,
  user_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE user_recipe_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  recipe_id INTEGER,
  is_favorite BOOLEAN DEFAULT FALSE,
  times_cooked INTEGER DEFAULT 0,
  last_cooked TIMESTAMP,
  personal_notes TEXT,
  custom_modifications TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE nutrition_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  height FLOAT,  -- in cm
  weight FLOAT,  -- in kg
  age INTEGER,
  gender TEXT,
  activity_level TEXT, -- Sedentary, Light, Moderate, Very Active, Extra Active
  bmr FLOAT,
  tdee FLOAT,   -- Total Daily Energy Expenditure
  goal TEXT,    -- Maintain, Lose, Gain
  target_calories INTEGER,
  target_protein FLOAT,
  target_carbs FLOAT,
  target_fat FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  recipe_id INTEGER,
  date DATE,
  meal_type TEXT, -- Breakfast, Lunch, Dinner, Snack
  servings FLOAT,
  actual_calories INTEGER,
  actual_protein FLOAT,
  actual_carbs FLOAT,
  actual_fat FLOAT,
  notes TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Users table - Storing only essential user data
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  oauth_sub_id TEXT UNIQUE,  -- Google OAuth subject ID
  oauth_provider TEXT,       -- 'google', 'github', etc.
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Active sessions
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Login audit trail
CREATE TABLE login_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User preferences (app-specific, non-PII data)
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Authentication and Profile
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  display_name TEXT,
  bio TEXT,
  location TEXT,
  timezone TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  language_preference TEXT DEFAULT 'en',
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "weekly_summary": true}',
  privacy_settings JSONB DEFAULT '{"profile_public": false, "share_recipes": false, "share_progress": false}',
  theme_preference TEXT DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Health and Fitness Data
CREATE TABLE health_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  height FLOAT,  -- in cm
  weight FLOAT,  -- in kg
  target_weight FLOAT,
  age INTEGER,
  gender TEXT,
  activity_level TEXT,
  health_conditions TEXT[], -- Array of health conditions
  allergies TEXT[],        -- Array of allergies
  medications TEXT[],      -- Array of current medications
  blood_type TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Dietary Preferences
CREATE TABLE dietary_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  diet_type TEXT,  -- vegetarian, vegan, keto, etc.
  excluded_ingredients TEXT[],
  preferred_ingredients TEXT[],
  cuisine_preferences TEXT[],
  spice_tolerance TEXT,
  portion_size_preference TEXT,
  meal_prep_frequency TEXT,
  budget_per_meal DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Fitness Goals
CREATE TABLE fitness_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  goal_type TEXT,  -- weight_loss, muscle_gain, maintenance
  weekly_goal FLOAT,  -- in kg
  target_date DATE,
  activity_target INTEGER,  -- minutes per week
  calories_target INTEGER,
  protein_target FLOAT,
  carbs_target FLOAT,
  fat_target FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Weight History
CREATE TABLE weight_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  weight FLOAT,
  measurement_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Meal Planning Preferences
CREATE TABLE meal_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  meals_per_day INTEGER DEFAULT 3,
  snacks_per_day INTEGER DEFAULT 2,
  preferred_meal_times JSONB DEFAULT '{"breakfast": "08:00", "lunch": "12:00", "dinner": "18:00"}',
  meal_prep_days TEXT[],
  batch_cooking_preference BOOLEAN DEFAULT false,
  leftover_preference BOOLEAN DEFAULT true,
  variety_preference INTEGER DEFAULT 3,  -- 1-5 scale for recipe variety
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Shopping Preferences
CREATE TABLE shopping_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  preferred_stores TEXT[],
  preferred_brands JSONB,  -- Store brand preferences by category
  organic_preference BOOLEAN DEFAULT false,
  budget_period TEXT DEFAULT 'weekly',
  max_budget DECIMAL(10,2),
  shopping_day TEXT,
  bulk_buying_preference BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Kitchen Inventory Locations
CREATE TABLE inventory_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,  -- pantry, fridge, freezer, etc.
  temperature_zone TEXT,  -- room_temp, cold, frozen
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Kitchen Inventory Items
CREATE TABLE inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity FLOAT,
  unit TEXT,
  purchase_date DATE,
  expiry_date DATE,
  price DECIMAL(10,2),
  brand TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES inventory_locations(id)
);

-- Achievement System
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB,  -- Achievement criteria
  badge_url TEXT,
  points INTEGER DEFAULT 0
);

CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- Social Features
CREATE TABLE social_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  connected_user_id INTEGER NOT NULL,
  connection_type TEXT DEFAULT 'friend',  -- friend, family, coach, etc.
  status TEXT DEFAULT 'pending',  -- pending, accepted, blocked
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (connected_user_id) REFERENCES users(id)
);

CREATE TABLE shared_recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  shared_by_user_id INTEGER NOT NULL,
  shared_with_user_id INTEGER NOT NULL,
  share_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id),
  FOREIGN KEY (shared_by_user_id) REFERENCES users(id),
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id)
);

-- Progress Tracking
CREATE TABLE progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  log_date DATE,
  weight FLOAT,
  body_fat_percentage FLOAT,
  measurements JSONB,  -- Body measurements
  energy_level INTEGER,  -- 1-5 scale
  mood TEXT,
  sleep_hours FLOAT,
  water_intake FLOAT,  -- in liters
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_users_oauth_sub ON users(oauth_sub_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX idx_login_history_user ON login_history(user_id, created_at);
CREATE INDEX idx_recipe_category ON recipes(category);
CREATE INDEX idx_recipe_cuisine ON recipes(cuisine_type);
CREATE INDEX idx_inventory_expiry ON inventory_items(expiry_date);
CREATE INDEX idx_progress_date ON progress_logs(log_date);
CREATE INDEX idx_weight_date ON weight_history(measurement_date);
CREATE INDEX idx_auth_logs_user_created ON login_history(user_id, created_at);
CREATE INDEX idx_security_events_user_severity ON login_history(user_id, oauth_sub_id);

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN oauth_sub_id VARCHAR(255),
ADD COLUMN oauth_provider VARCHAR(50),
ADD COLUMN email_verified BOOLEAN DEFAULT false; 
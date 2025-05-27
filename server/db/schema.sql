CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  difficulty TEXT,
  prep_time TEXT,
  instructions TEXT,
  plating TEXT,
  calories INTEGER,
  protein FLOAT,
  carbs FLOAT,
  fat FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER,
  name TEXT NOT NULL,
  amount TEXT,
  notes TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE recipe_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
); 
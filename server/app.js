const express = require('express');
const app = express();

const pantryRoutes = require('./routes/pantry');

app.use(express.json()); 

// Register routes
app.use('/api/pantry', pantryRoutes);

// In app.js
console.log('Registering /api/pantry routes');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 
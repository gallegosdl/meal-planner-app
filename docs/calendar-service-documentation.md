# Calendar Service Documentation

## Overview
The `calendarService.js` provides functionality to export meal plans as downloadable ICS (iCalendar) files that can be imported into any calendar application including Google Calendar, Outlook, Apple Calendar, and others.

## Architecture

### Core Components

#### 1. CalendarService Class
A static utility class that handles ICS file generation and download functionality.

```javascript
// Location: client/src/services/calendarService.js
class CalendarService {
  static generateICSFile(mealPlan)
  static getMealTime(mealType, date)
  static formatDescription(meal)
  static createICSContent(events)
  static formatDateTime(date)
  static escapeICSText(text)
  static downloadICS(content, filename)
}
```

#### 2. Integration Component
The calendar service is integrated into the `UserMealPlanCalendar.jsx` component through an export button.

## Detailed Method Documentation

### `generateICSFile(mealPlan)`
**Purpose**: Main entry point that converts a meal plan object into ICS format.

**Input**: 
- `mealPlan` (Object): Meal plan with dates and meals structure
  ```javascript
  {
    dates: {
      "2024-01-15": {
        meals: {
          breakfast: { recipe: { name: "Oatmeal", ingredients: [...] } },
          lunch: { recipe: { name: "Salad", ingredients: [...] } },
          dinner: { recipe: { name: "Pasta", ingredients: [...] } }
        }
      }
    }
  }
  ```

**Output**: String containing complete ICS file content

**Process**:
1. Iterates through meal plan dates
2. Creates calendar events for each meal
3. Assigns appropriate times (breakfast: 8AM, lunch: 12PM, dinner: 6PM)
4. Formats event descriptions with ingredients and nutrition
5. Returns formatted ICS content

### `getMealTime(mealType, date)`
**Purpose**: Assigns standard times to different meal types.

**Time Assignments**:
- Breakfast: 8:00 AM (1-hour duration)
- Lunch: 12:00 PM (1-hour duration) 
- Dinner: 6:00 PM (1-hour duration)
- Default: 12:00 PM (for unknown meal types)

### `formatDescription(meal)`
**Purpose**: Creates detailed event descriptions with meal information.

**Content Includes**:
- Ingredients list (comma-separated)
- Cooking instructions
- Nutritional information (calories, protein, carbs, fat)
- Fallback messages for missing data

**Example Output**:
```
Ingredients: chicken breast, olive oil, garlic, broccoli

Instructions: Season chicken and cook in pan with olive oil...

Nutrition:
Calories: 450
Protein: 35g
Carbs: 12g
Fat: 18g
```

### `createICSContent(events)`
**Purpose**: Converts event objects into RFC 5545 compliant ICS format.

**ICS Structure**:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Meal Planner AI//Meal Plan//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:20240115T080000Z-abc123@mealplanner.ai
DTSTART:20240115T080000Z
DTEND:20240115T090000Z
SUMMARY:Breakfast: Oatmeal with Berries
DESCRIPTION:Ingredients: oats\, milk\, berries...
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR
```

### `formatDateTime(date)`
**Purpose**: Converts JavaScript Date objects to ICS-compliant datetime format.

**Format**: `YYYYMMDDTHHMMSSZ` (UTC)
**Example**: `20240115T080000Z` (January 15, 2024 at 8:00 AM UTC)

### `escapeICSText(text)`
**Purpose**: Properly escapes special characters for ICS compliance.

**Escape Rules**:
- Backslashes: `\` → `\\`
- Semicolons: `;` → `\;`
- Commas: `,` → `\,`
- Newlines: `\n` → `\n`
- Carriage returns: removed

### `downloadICS(content, filename)`
**Purpose**: Triggers browser download of ICS file.

**Process**:
1. Creates Blob with `text/calendar` MIME type
2. Generates temporary download URL
3. Creates invisible anchor element
4. Triggers click to start download
5. Cleans up temporary resources

## Browser Download Mechanism

### File Creation Process
```javascript
// 1. Create Blob with proper MIME type
const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });

// 2. Generate temporary URL
const link = document.createElement('a');
link.href = window.URL.createObjectURL(blob);
link.download = filename;

// 3. Trigger download
document.body.appendChild(link);
link.click();

// 4. Cleanup
document.body.removeChild(link);
window.URL.revokeObjectURL(link.href);
```

### Browser Compatibility
- **Chrome/Edge**: Full support, downloads to default download folder
- **Firefox**: Full support, may prompt for location
- **Safari**: Full support, downloads to Downloads folder
- **Mobile browsers**: Downloads to default location or opens share dialog

## Integration Guide

### Basic Implementation
```javascript
import CalendarService from '../services/calendarService';

const handleExportCalendar = () => {
  try {
    const icsContent = CalendarService.generateICSFile(mealPlan);
    CalendarService.downloadICS(icsContent, 'my-meal-plan.ics');
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

### Error Handling
```javascript
const handleExportCalendar = async () => {
  try {
    setIsExporting(true);
    
    if (!mealPlans.length) {
      throw new Error('No meal plans to export');
    }

    const mealPlan = mealPlans[0];
    const icsContent = CalendarService.generateICSFile(mealPlan);
    CalendarService.downloadICS(icsContent, `meal-plan-${Date.now()}.ics`);
    
    // Success feedback
    toast.success('Calendar file downloaded successfully!');
  } catch (error) {
    // Error feedback
    toast.error(`Export failed: ${error.message}`);
  } finally {
    setIsExporting(false);
  }
};
```

## Import Instructions for Users

### Google Calendar
1. Open Google Calendar
2. Click Settings (gear icon) → "Import & export"
3. Select "Import" 
4. Choose the downloaded .ics file
5. Select destination calendar
6. Click "Import"

### Outlook
1. Open Outlook
2. Go to File → Open & Export → Import/Export
3. Select "Import an iCalendar (.ics) or vCalendar file"
4. Browse and select the .ics file
5. Choose import options
6. Click "OK"

### Apple Calendar
1. Open Calendar app
2. Go to File → Import
3. Select the .ics file
4. Choose destination calendar
5. Click "Import"

### Other Calendar Apps
Most calendar applications support .ics import through:
- File → Import menu
- Settings → Import option
- Drag and drop functionality

## Technical Specifications

### ICS Format Compliance
- **Standard**: RFC 5545 (Internet Calendaring and Scheduling Core Object Specification)
- **Version**: 2.0
- **Character Encoding**: UTF-8
- **Line Endings**: CRLF (`\r\n`)
- **Maximum Line Length**: 75 characters (with folding)

### Event Properties
- **UID**: Unique identifier using timestamp and random string
- **DTSTART/DTEND**: UTC datetime format
- **SUMMARY**: Event title (escaped)
- **DESCRIPTION**: Detailed meal information (escaped)
- **STATUS**: CONFIRMED
- **SEQUENCE**: 0 (no updates)

### Data Validation
- Ensures meal plan contains events before export
- Validates date formats
- Handles missing or null recipe data
- Provides fallback values for incomplete information

## Troubleshooting

### Common Issues

#### "0 events imported"
- **Cause**: Invalid ICS format or missing events
- **Solution**: Check console logs for validation errors

#### "Unable to process file"
- **Cause**: Text encoding or special character issues
- **Solution**: Verify `escapeICSText()` is working properly

#### Download not starting
- **Cause**: Browser security restrictions
- **Solution**: Ensure user interaction triggered the download

#### Events show wrong times
- **Cause**: Timezone conversion issues
- **Solution**: Verify UTC datetime formatting

### Debug Mode
Enable console logging to troubleshoot:
```javascript
console.log('Exporting meal plan:', mealPlan);
console.log('Generated events:', events.length);
console.log('ICS content preview:', icsContent.substring(0, 500));
```

## Security Considerations

### File Generation
- All content is generated client-side
- No server communication required
- User data never leaves the browser

### Download Safety
- Uses browser's native download mechanism
- Temporary URLs are properly cleaned up
- No external dependencies or CDNs

### Data Sanitization
- All user input is escaped before inclusion
- XSS prevention through proper text encoding
- No execution of user-provided content

## Performance Notes

### File Size
- Typical file size: 2-10 KB for weekly meal plan
- Scales linearly with number of meals
- No compression applied (not necessary for text files)

### Generation Speed
- Processing time: < 100ms for typical meal plan
- Memory usage: Minimal (temporary string concatenation)
- No blocking operations

### Browser Limits
- Most browsers handle files up to several MB
- No practical limit for meal plan exports
- Cleanup prevents memory leaks

## Future Enhancements

### Potential Features
- Custom meal timing configuration
- Recurring event support
- Attendee/sharing capabilities
- Calendar color customization
- Timezone selection

### Extensibility
The service is designed to be easily extended:
- Additional export formats (CSV, JSON)
- Custom event properties
- Integration with other calendar services
- Batch export functionality

---

## API Reference

### Complete Method Signatures

```javascript
CalendarService.generateICSFile(mealPlan: Object): string
CalendarService.getMealTime(mealType: string, date: Date): Date
CalendarService.formatDescription(meal: Object): string
CalendarService.createICSContent(events: Array): string
CalendarService.formatDateTime(date: Date): string
CalendarService.escapeICSText(text: string): string
CalendarService.downloadICS(content: string, filename?: string): void
```

### Type Definitions

```typescript
interface MealPlan {
  dates: {
    [dateString: string]: {
      meals: {
        [mealType: string]: {
          recipe?: {
            name: string;
            ingredients: Array<{name: string}>;
            instructions: string;
            nutrition?: {
              calories: number;
              protein_g: number;
              carbs_g: number;
              fat_g: number;
            };
          };
        };
      };
    };
  };
}

interface CalendarEvent {
  title: string;
  description: string;
  start: Date;
  end: Date;
}
```

## Meal Plan Data Retrieval Architecture

### **Data Flow Overview**

The calendar service depends on a robust meal plan retrieval system:

```
User Request → Frontend Component → API Endpoint → Database Query → Data Transformation → Frontend Processing
```

### **Data Retrieval Process**

#### **Frontend Initiation**
Two main components fetch meal plan data:

**A. UserMealPlanCalendar.jsx (Weekly Data)**
```javascript
const fetchMealPlans = async () => {
  const startDate = moment().startOf('week').format('YYYY-MM-DD');
  const endDate = moment().endOf('week').format('YYYY-MM-DD');
  
  const response = await fetch(
    `/api/meal-plans/user-meal-plans/${userId}?startDate=${startDate}&endDate=${endDate}`
  );
}
```

**B. UserMealPlan.jsx (All Data for Analytics)**
```javascript
const fetchMealPlans = async () => {
  const response = await fetch(`/api/meal-plans/user-meal-plans/${userId}`);
}
```

#### **Backend API Route**
```javascript
// server/routes/mealPlan.js
router.get('/user-meal-plans/:userId?', async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.params.userId || req.user?.id;
  
  const mealPlanGenerator = new MealPlanGenerator();
  const mealPlans = await mealPlanGenerator.getMealPlansForUser(
    userId, 
    startDate ? new Date(startDate) : null,
    endDate ? new Date(endDate) : null
  );
  res.json(mealPlans);
});
```

### **Database Schema & Relationships**

The meal plan data is stored across multiple related tables:

**Table Structure:**
- `meal_plans` - Main meal plan records (id, title, user_id, start_date, end_date)
- `meal_plan_dates` - Individual dates within a plan (id, meal_plan_id, date)
- `meal_plan_meals` - Individual meals for each date/meal type (id, meal_plan_date_id, recipe_id, meal_type, planned_macros)
- `recipes` - Recipe details (id, name, ingredients, instructions, nutrition)
- `meal_plan_meal_notes` - User ratings/comments (id, meal_plan_meal_id, user_rating, user_comment)

**Core Database Query:**
```sql
SELECT 
  mp.id as meal_plan_id,
  mp.title,
  mp.start_date,
  mp.end_date,
  mpd.id as date_id,
  mpd.date,
  mpm.meal_type,
  mpm.planned_macros,
  mpm.planned_image_url,
  r.name as recipe_name,
  r.difficulty,
  r.prep_time,
  r.instructions,
  r.ingredients,
  r.image_url as recipe_image_url,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', mpn.id,
      'rating', mpn.user_rating,
      'comment', mpn.user_comment,
      'created_at', mpn.created_at
    ))
    FROM meal_plan_meal_notes mpn
    WHERE mpn.meal_plan_meal_id = mpm.id),
    '[]'::json
  ) as notes
FROM meal_plans mp
JOIN meal_plan_dates mpd ON mp.id = mpd.meal_plan_id
JOIN meal_plan_meals mpm ON mpd.id = mpm.meal_plan_date_id
JOIN recipes r ON mpm.recipe_id = r.id
WHERE mp.user_id = $1
ORDER BY mpd.date, meal_type
```

### **Data Transformation**

Raw database results are transformed from flat to nested structure:

**Raw Database Result:**
```javascript
[
  { meal_plan_id: 1, date: '2024-01-15', meal_type: 'breakfast', recipe_name: 'Oatmeal' },
  { meal_plan_id: 1, date: '2024-01-15', meal_type: 'lunch', recipe_name: 'Salad' },
  { meal_plan_id: 1, date: '2024-01-15', meal_type: 'dinner', recipe_name: 'Pasta' }
]
```

**Transformed Structure (Used by Calendar Service):**
```javascript
[
  {
    id: 1,
    title: 'Weekly Plan',
    startDate: '2024-01-15',
    endDate: '2024-01-21',
    dates: {
      '2024-01-15': {
        id: 101,
        date: '2024-01-15',
        meals: {
          breakfast: {
            recipe: { 
              name: 'Oatmeal', 
              ingredients: [{ name: 'oats', amount: '1 cup' }],
              instructions: 'Cook oats with milk...',
              nutrition: { calories: 300, protein_g: 10, carbs_g: 45, fat_g: 8 }
            },
            plannedMacros: { calories: 300, protein_g: 10, carbs_g: 45, fat_g: 8 },
            plannedImageUrl: '/uploads/oatmeal.jpg',
            notes: [{ id: 1, rating: 5, comment: 'Delicious!' }]
          },
          lunch: { recipe: {...}, plannedMacros: {...}, ... },
          dinner: { recipe: {...}, plannedMacros: {...}, ... }
        }
      },
      '2024-01-16': { ... }
    }
  }
]
```

### **Calendar Service Data Access Patterns**

#### **Date-based Iteration for ICS Generation**
```javascript
// CalendarService.generateICSFile()
Object.entries(mealPlan.dates).forEach(([dateStr, dateData]) => {
  Object.entries(dateData.meals || {}).forEach(([mealType, meal]) => {
    const startTime = this.getMealTime(mealType, new Date(dateStr));
    const event = {
      title: `${mealType}: ${meal.recipe?.name || 'Unknown meal'}`,
      description: this.formatDescription(meal),
      start: startTime,
      end: endTime
    };
    events.push(event);
  });
});
```

#### **Meal Type Processing**
```javascript
// Standard meal type handling
const mealTypes = ['breakfast', 'lunch', 'dinner'];
mealTypes.forEach(mealType => {
  const meal = dateData.meals[mealType];
  if (meal) {
    // Process meal for calendar event
  }
});
```

#### **Recipe Data Extraction**
```javascript
// Accessing recipe information
const recipe = meal.recipe || meal;
const ingredients = recipe.ingredients ? 
  recipe.ingredients.map(ing => ing.name || ing).join(', ') : 
  'No ingredients listed';
const instructions = recipe.instructions || 'No instructions provided';
const nutrition = recipe.nutrition || meal.plannedMacros;
```

### **Performance Optimizations**

#### **Server-side Optimizations**
- **JOIN queries** minimize database round trips
- **Date range filtering** reduces data transfer
- **JSON aggregation** for notes reduces separate queries
- **Indexed queries** on user_id and date columns

#### **Client-side Optimizations**
- **Lazy loading** via useEffect hooks
- **Date range queries** for calendar view (weekly data only)
- **Memoization** of transformed data structures
- **Efficient iteration** patterns for large datasets

#### **Caching Strategy**
```javascript
// Example caching in frontend components
const [mealPlans, setMealPlans] = useState([]);
const [lastFetchTime, setLastFetchTime] = useState(null);

const fetchMealPlans = async () => {
  // Only fetch if data is stale (older than 5 minutes)
  if (lastFetchTime && Date.now() - lastFetchTime < 300000) {
    return;
  }
  // Fetch fresh data...
  setLastFetchTime(Date.now());
};
```

### **Data Filtering Capabilities**

#### **Server-side Filtering**
```javascript
// Date range filtering
if (startDate) {
  query += ` AND mpd.date >= $${params.length + 1}`;
  params.push(startDate);
}
if (endDate) {
  query += ` AND mpd.date <= $${params.length + 1}`;
  params.push(endDate);
}
```

#### **Client-side Filtering**
```javascript
// Meal type filtering
Object.entries(dateData.meals).forEach(([mealType, meal]) => {
  if (selectedMealTypes.includes(mealType)) {
    // Process this meal
  }
});

// Date range filtering for analytics
if (dateRange === 'week' && mealDate < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) return;
if (dateRange === 'month' && mealDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) return;
```

### **Error Handling & Data Validation**

#### **Missing Data Handling**
```javascript
// Safe data access patterns used throughout the calendar service
const mealName = meal.recipe?.name || meal.name || 'Unknown meal';
const ingredients = recipe.ingredients || [];
const nutrition = recipe.nutrition || meal.plannedMacros || {};
const calories = nutrition.calories || 0;
```

#### **Data Validation**
```javascript
// Validation before ICS generation
if (events.length === 0) {
  throw new Error('No events found in meal plan');
}

// Date validation
const mealTime = new Date(dateStr);
if (isNaN(mealTime.getTime())) {
  console.warn(`Invalid date: ${dateStr}`);
  return;
}
```

### **Integration Points**

The calendar service integrates with multiple parts of the meal planning system:

1. **Meal Plan Generation** - Creates the base data structure
2. **Recipe Management** - Provides detailed recipe information
3. **User Preferences** - Influences meal timing and selections
4. **Nutrition Tracking** - Provides macro information for events
5. **User Feedback** - Incorporates ratings and comments

### **Future Data Enhancements**

#### **Planned Improvements**
- **Meal timing customization** - User-defined meal times
- **Recurring meal patterns** - Template-based meal planning
- **Collaborative planning** - Shared meal plans between users
- **Ingredient substitutions** - Alternative ingredient tracking
- **Cost tracking** - Budget integration with meal plans

#### **Scalability Considerations**
- **Database partitioning** by date ranges for large datasets
- **Caching layers** for frequently accessed meal plans
- **API pagination** for users with extensive meal history
- **Background processing** for heavy data transformations

---

*Documentation generated for Meal Planner AI Calendar Service v1.0*
*Last updated: January 2024*
*Includes comprehensive meal plan data retrieval architecture* 
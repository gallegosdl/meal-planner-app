// Calendar service for generating ICS files
class CalendarService {
  static generateICSFile(mealPlan) {
    const events = [];
    
    console.log('Generating ICS for meal plan:', mealPlan);
    
    // Generate events for each meal
    if (mealPlan.dates) {
      // Handle the dates format from your current meal plans
      Object.entries(mealPlan.dates).forEach(([dateStr, dateData]) => {
        Object.entries(dateData.meals || {}).forEach(([mealType, meal]) => {
          const startTime = this.getMealTime(mealType, new Date(dateStr));
          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 1);
          
          const event = {
            title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${meal.recipe?.name || meal.name || 'Unknown meal'}`,
            description: this.formatDescription(meal),
            start: startTime,
            end: endTime
          };
          
          console.log('Created event:', event);
          events.push(event);
        });
      });
    }
    
    console.log(`Generated ${events.length} events for ICS file`);
    
    if (events.length === 0) {
      throw new Error('No events found in meal plan');
    }
    
    return this.createICSContent(events);
  }
  
  static getMealTime(mealType, date) {
    const mealTime = new Date(date);
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        mealTime.setHours(8, 0, 0, 0);
        break;
      case 'lunch':
        mealTime.setHours(12, 0, 0, 0);
        break;
      case 'dinner':
        mealTime.setHours(18, 0, 0, 0);
        break;
      default:
        mealTime.setHours(12, 0, 0, 0);
    }
    return mealTime;
  }
  
  static formatDescription(meal) {
    const recipe = meal.recipe || meal;
    const ingredients = recipe.ingredients ? 
      recipe.ingredients.map(ing => ing.name || ing).join(', ') : 
      'No ingredients listed';
    const instructions = recipe.instructions || 'No instructions provided';
    const nutrition = recipe.nutrition ? 
      `Calories: ${recipe.nutrition.calories || 0}\nProtein: ${recipe.nutrition.protein_g || 0}g\nCarbs: ${recipe.nutrition.carbs_g || 0}g\nFat: ${recipe.nutrition.fat_g || 0}g` :
      'No nutrition info';
    
    return `Ingredients: ${ingredients}\n\nInstructions: ${instructions}\n\nNutrition:\n${nutrition}`;
  }
  
  static createICSContent(events) {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Meal Planner AI//Meal Plan//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    events.forEach(event => {
      const startStr = this.formatDateTime(event.start);
      const endStr = this.formatDateTime(event.end);
      const uid = `${startStr}-${Math.random().toString(36).substr(2, 9)}@mealplanner.ai`;
      
      // Escape special characters in title and description
      const title = this.escapeICSText(event.title);
      const description = this.escapeICSText(event.description);
      
      ics.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT'
      );
    });
    
    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  }
  
  static formatDateTime(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  
  static escapeICSText(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/;/g, '\\;')    // Escape semicolons
      .replace(/,/g, '\\,')    // Escape commas
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '');     // Remove carriage returns
  }
  
  static downloadICS(content, filename = 'meal-plan.ics') {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }
}

export default CalendarService; 
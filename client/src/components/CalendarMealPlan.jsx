//src/components/CalendarMealPlan.jsx
import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const CalendarMealPlan = ({ mealPlan }) => {
  // Convert meal plan to calendar events
  const events = mealPlan.days.flatMap(day => 
    Object.entries(day.meals).map(([mealType, meal]) => ({
      id: `${day.day}-${mealType}`,
      title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${meal.name}`,
      start: moment().add(day.day - 1, 'days').hour(
        mealType === 'breakfast' ? 8 :
        mealType === 'lunch' ? 12 : 18
      ).toDate(),
      end: moment().add(day.day - 1, 'days').hour(
        mealType === 'breakfast' ? 9 :
        mealType === 'lunch' ? 13 : 19
      ).toDate(),
      meal,
      mealType
    }))
  );

  return (
    <div className="h-[600px] bg-[#252B3B]/50 rounded-xl p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        views={['week', 'day']}
        min={moment().hour(6).minute(0).toDate()}
        max={moment().hour(21).minute(0).toDate()}
        eventPropGetter={(event) => ({
          className: `bg-[#2A3142] text-white rounded-lg p-2 border border-[#ffffff1a] hover:bg-[#313748]`,
        })}
        tooltipAccessor={(event) => {
          const meal = event.meal;
          return `${meal.name}\n\nIngredients: ${meal.ingredients.length}\nInstructions available`;
        }}
      />
    </div>
  );
};

export default CalendarMealPlan; 
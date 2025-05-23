import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useGoogleLogin } from '@react-oauth/google';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const CalendarMealPlan = ({ mealPlan }) => {
  const login = useGoogleLogin({
    onSuccess: async (response) => {
      await syncWithGoogleCalendar(response.access_token, mealPlan);
    }
  });

  // Convert meal plan to calendar events
  const events = mealPlan.days.flatMap(day => 
    Object.entries(day.meals).map(([mealType, meal]) => ({
      id: `${day.day}-${mealType}`,
      title: meal.name,
      start: moment().add(day.day - 1, 'days').hour(
        mealType === 'breakfast' ? 8 :
        mealType === 'lunch' ? 12 : 18
      ).toDate(),
      end: moment().add(day.day - 1, 'days').hour(
        mealType === 'breakfast' ? 9 :
        mealType === 'lunch' ? 13 : 19
      ).toDate(),
      meal
    }))
  );

  return (
    <div className="h-screen p-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => login()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Sync with Google Calendar
        </button>
      </div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 'calc(100vh - 100px)' }}
        views={['week', 'day']}
        defaultView="week"
        eventPropGetter={(event) => ({
          className: `bg-[#2A3142] rounded-lg p-2`,
        })}
      />
    </div>
  );
};

// Google Calendar sync function
async function syncWithGoogleCalendar(accessToken, mealPlan) {
  const calendar = google.calendar({ version: 'v3', auth: accessToken });
  
  for (const day of mealPlan.days) {
    for (const [mealType, meal] of Object.entries(day.meals)) {
      await calendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: meal.name,
          description: `Ingredients:\n${meal.ingredients.map(i => 
            `- ${i.name}: ${i.amount}`).join('\n')}\n\nInstructions:\n${meal.instructions}`,
          start: {
            dateTime: moment().add(day.day - 1, 'days').hour(
              mealType === 'breakfast' ? 8 :
              mealType === 'lunch' ? 12 : 18
            ).toISOString()
          },
          end: {
            dateTime: moment().add(day.day - 1, 'days').hour(
              mealType === 'breakfast' ? 9 :
              mealType === 'lunch' ? 13 : 19
            ).toISOString()
          }
        }
      });
    }
  }
}

export default CalendarMealPlan; 
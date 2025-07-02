import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'react-hot-toast';
import CalendarService from '../services/calendarService';

const localizer = momentLocalizer(moment);

const UserMealPlanCalendar = forwardRef(({ userId }, ref) => {
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [consumedMeals, setConsumedMeals] = useState(new Set());

  const fetchMealPlans = async () => {
    if (!userId) return;
    
    try {
      setIsRefreshing(true);
      // Get meal plans for current week
      const startDate = moment().startOf('week').format('YYYY-MM-DD');
      const endDate = moment().endOf('week').format('YYYY-MM-DD');
      
      const response = await fetch(`/api/meal-plans/user-meal-plans/${userId}?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meal plans');
      }
      const data = await response.json();
      console.log('Fetched meal plans data:', data);
      setMealPlans(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSyncToCalendar = async (mealPlanId) => {
    try {
      setIsSyncing(true);
      
      // Get the access token from the current session
      const accessToken = sessionStorage.getItem('google_access_token');
      console.log('Access token found:', !!accessToken);
      console.log('All session storage keys:', Object.keys(sessionStorage));
      
      if (!accessToken) {
        console.log('No access token found in session storage');
        // Trigger Google login if no token is found
        const googleLoginButton = document.querySelector('[data-testid="google-login"]');
        if (googleLoginButton) {
          googleLoginButton.click();
          return;
        }
        toast.error('Please sign in with Google first to sync your calendar. Close the welcome modal and try again.');
        return;
      }

      console.log('Sending sync request with token');
      const response = await fetch('/api/meal-plans/sync-to-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealPlanId,
          accessToken
        })
      });

      console.log('Sync response status:', response.status);

      if (response.status === 401) {
        console.log('Token expired, clearing storage');
        // Token expired, clear it and trigger re-login
        sessionStorage.removeItem('google_access_token');
        const googleLoginButton = document.querySelector('[data-testid="google-login"]');
        if (googleLoginButton) {
          googleLoginButton.click();
        } else {
          toast.error('Your Google session has expired. Please sign in again.');
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Sync failed:', errorData);
        throw new Error(`Failed to sync calendar: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sync successful:', data);
      toast.success(`Meal plan synced to Google Calendar! Created ${data.events?.length || 0} events.`);
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      toast.error(`Failed to sync with Google Calendar: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle meal event click
  const handleSelectEvent = (event) => {
    setSelectedMeal(event);
    setShowMealModal(true);
  };

  // Mark meal as consumed
  const handleMarkConsumed = (eventId) => {
    const newConsumedMeals = new Set(consumedMeals);
    if (newConsumedMeals.has(eventId)) {
      newConsumedMeals.delete(eventId);
    } else {
      newConsumedMeals.add(eventId);
    }
    setConsumedMeals(newConsumedMeals);
    setShowMealModal(false);
    
    toast.success(
      newConsumedMeals.has(eventId) ? 'Meal marked as consumed!' : 'Meal unmarked as consumed',
      { duration: 2000 }
    );
  };

  // Edit meal time
  const handleEditMealTime = (eventId, newTime) => {
    // For now, just show a toast - you can implement time editing logic here
    toast.success(`Meal time updated to ${newTime}`, { duration: 2000 });
    setShowMealModal(false);
  };

  // Add ICS export function
  const handleExportToCalendar = async () => {
    try {
      setIsExporting(true);
      
      if (!mealPlans.length) {
        toast.error('No meal plans to export');
        return;
      }

      // Use the first meal plan for export
      const mealPlan = mealPlans[0];
      console.log('Exporting meal plan:', mealPlan);
      
      const icsContent = CalendarService.generateICSFile(mealPlan);
      console.log('Generated ICS content preview:', icsContent.substring(0, 500) + '...');
      
      CalendarService.downloadICS(icsContent, `meal-plan-${moment().format('YYYY-MM-DD')}.ics`);
      
      toast.success(
        'Calendar file downloaded! Import it into any calendar app:\\n• Google Calendar: Settings → Import & Export\\n• Outlook: File → Import/Export\\n• Apple Calendar: File → Import',
        { duration: 6000 }
      );
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast.error('Failed to export calendar file');
    } finally {
      setIsExporting(false);
    }
  };

  // Expose the refresh function to parent components
  useImperativeHandle(ref, () => ({
    refresh: fetchMealPlans
  }));

  useEffect(() => {
    if (userId) {
      fetchMealPlans();
    }
  }, [userId]);

  // Convert meal plans to calendar events
  const events = (mealPlans || []).flatMap(plan => 
    Object.entries(plan.dates || {}).flatMap(([dateStr, dateData]) =>
      Object.entries(dateData?.meals || {}).map(([mealType, meal]) => {
        const eventId = `${dateStr}-${mealType}`;
        
        // Ensure dateStr is in proper format and create a valid moment
        let mealDate;
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Already in YYYY-MM-DD format
          mealDate = moment(dateStr, 'YYYY-MM-DD');
        } else {
          // Try to parse as ISO string or fallback to moment parsing
          mealDate = moment(dateStr);
        }
        
        // Validate the date is valid
        if (!mealDate.isValid()) {
          console.warn(`Invalid date format: ${dateStr}`);
          mealDate = moment(); // fallback to today
        }
        
        return {
          id: eventId,
          title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${meal.recipe?.name || 'Unknown meal'}`,
          start: mealDate.clone().hour(
            mealType === 'breakfast' ? 8 :
            mealType === 'lunch' ? 12 : 18
          ).minute(0).second(0).toDate(),
          end: mealDate.clone().hour(
            mealType === 'breakfast' ? 9 :
            mealType === 'lunch' ? 13 : 19
          ).minute(0).second(0).toDate(),
          meal: meal.recipe,
          mealType,
          resource: mealType,
          consumed: consumedMeals.has(eventId),
          plannedMacros: meal.plannedMacros
        };
      })
    )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-lg bg-red-100/10">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="relative">
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="h-full flex flex-col bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Weekly Meal Calendar</h2>
            <button
              onClick={fetchMealPlans}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh calendar"
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-2">
            {/* ICS Export Button */}
            <button
              onClick={handleExportToCalendar}
              disabled={isExporting || !mealPlans.length}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download ICS</span>
                </>
              )}
            </button>

            {/* Google Calendar Sync Button */}
            <button
              onClick={() => handleSyncToCalendar(mealPlans[0]?.id)}
              disabled={isSyncing || !mealPlans.length}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Sync to Google Calendar</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-[600px] calendar-container">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={['week', 'day']}
            min={moment().hour(6).minute(0).toDate()}
            max={moment().hour(21).minute(0).toDate()}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={(event) => ({
              className: `meal-event ${event.consumed ? 'consumed' : ''} ${
                event.resource === 'breakfast' ? 'breakfast-event' :
                event.resource === 'lunch' ? 'lunch-event' :
                'dinner-event'
              }`,
            })}
            tooltipAccessor={(event) => {
              const meal = event.meal;
              return `${meal.name}\n\nCalories: ${meal.nutrition?.calories || 'N/A'}\nProtein: ${meal.nutrition?.protein_g || 'N/A'}g\nCarbs: ${meal.nutrition?.carbs_g || 'N/A'}g\nFat: ${meal.nutrition?.fat_g || 'N/A'}g\n\nClick to edit or mark as consumed`;
            }}
          />
        </div>

        <style jsx="true" global>{`
          .calendar-container :global(.rbc-today) {
            background-color: rgba(59, 130, 246, 0.1) !important;
          }
          
          .calendar-container :global(.rbc-current-time-indicator) {
            background-color: rgba(59, 130, 246, 0.6) !important;
            height: 2px !important;
          }
          
          .calendar-container :global(.meal-event) {
            background: #2A3142 !important;
            color: white !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            padding: 4px 8px !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
          }
          
          .calendar-container :global(.meal-event:hover) {
            background: #313748 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
          }
          
          .calendar-container :global(.breakfast-event) {
            border-left: 4px solid #fbbf24 !important;
          }
          
          .calendar-container :global(.lunch-event) {
            border-left: 4px solid #10b981 !important;
          }
          
          .calendar-container :global(.dinner-event) {
            border-left: 4px solid #3b82f6 !important;
          }
          
          .calendar-container :global(.consumed) {
            opacity: 0.6 !important;
            text-decoration: line-through !important;
            background: #16a34a !important;
          }
          
          .calendar-container :global(.consumed::after) {
            content: "✓" !important;
            margin-left: 8px !important;
            color: #22c55e !important;
            font-weight: bold !important;
          }
        `}</style>
      </div>

      {/* Meal Interaction Modal */}
      {showMealModal && selectedMeal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black opacity-50" 
              onClick={() => setShowMealModal(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-[#1F2937] rounded-lg w-full max-w-md p-6 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {selectedMeal.title}
                </h3>
                <button
                  onClick={() => setShowMealModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Meal Details */}
              <div className="mb-6 space-y-3">
                <div className="text-gray-300">
                  <p><strong>Time:</strong> {moment(selectedMeal.start).format('h:mm A')} - {moment(selectedMeal.end).format('h:mm A')}</p>
                  <p><strong>Date:</strong> {moment(selectedMeal.start).format('MMMM Do, YYYY')}</p>
                </div>
                
                {selectedMeal.plannedMacros && (
                  <div className="bg-[#374151] p-3 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Nutrition Info</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                      <div>Calories: {selectedMeal.plannedMacros.calories || 0}</div>
                      <div>Protein: {selectedMeal.plannedMacros.protein_g || 0}g</div>
                      <div>Carbs: {selectedMeal.plannedMacros.carbs_g || 0}g</div>
                      <div>Fat: {selectedMeal.plannedMacros.fat_g || 0}g</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleMarkConsumed(selectedMeal.id)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    consumedMeals.has(selectedMeal.id)
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {consumedMeals.has(selectedMeal.id) ? 
                    '✓ Mark as Not Consumed' : 
                    '✓ Mark as Consumed'
                  }
                </button>

                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Quick Time Changes:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedMeal.mealType === 'breakfast' ? (
                      <>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '7:00 AM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">7:00 AM</button>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '8:00 AM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">8:00 AM</button>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '9:00 AM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">9:00 AM</button>
                      </>
                    ) : selectedMeal.mealType === 'lunch' ? (
                      <>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '11:00 AM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">11:00 AM</button>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '12:00 PM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">12:00 PM</button>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '1:00 PM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">1:00 PM</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '5:00 PM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">5:00 PM</button>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '6:00 PM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">6:00 PM</button>
                        <button onClick={() => handleEditMealTime(selectedMeal.id, '7:00 PM')} className="py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">7:00 PM</button>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowMealModal(false)}
                  className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default UserMealPlanCalendar; 
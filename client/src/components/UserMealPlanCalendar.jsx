import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { toast } from 'react-hot-toast';
import CalendarService from '../services/calendarService';
import MealSummaryModal from './MealSummaryModal';
import MealRecipeModal from './MealRecipeModal';
import api from '../services/api';

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
  const [showRecipeView, setShowRecipeView] = useState(false);
  const [consumedMeals, setConsumedMeals] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('day');
  const [currentDate, setCurrentDate] = useState(moment().toDate());

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
      
      // Set initial view based on screen size
      if (isMobileDevice && mobileView === 'week') {
        setMobileView('day');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchMealPlans = async () => {
    if (!userId) return;
    
    try {
      setIsRefreshing(true);
      // Get meal plans for current week AND next 2 weeks to capture all generated meals
      const startDate = moment().startOf('week').format('YYYY-MM-DD');
      const endDate = moment().endOf('week').add(2, 'weeks').format('YYYY-MM-DD');
      
      console.log(`🗓️ Fetching meal plans from ${startDate} to ${endDate}`);
      
      const response = await api.get(`/api/meal-plans/user-meal-plans/${userId}?startDate=${startDate}&endDate=${endDate}`);
      const data = response.data;
      console.log('Fetched meal plans data:', data);
      
      // ✅ Normalize date keys to YYYY-MM-DD format
      for (const plan of data) {
        if (plan.dates) {
          for (const [key, value] of Object.entries(plan.dates)) {
            if (!key.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const m = moment(new Date(key));
              if (m.isValid()) {
                delete plan.dates[key];
                plan.dates[m.format('YYYY-MM-DD')] = value;
              }
            }
          }
        }
      }
      
      console.log(`📊 Found ${data.length} meal plans covering ${Object.keys(data.reduce((acc, plan) => ({...acc, ...plan.dates}), {})).length} unique dates`);
      
      setMealPlans(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
      setError(err.response?.data?.error || err.message);
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
      const response = await api.post('/api/meal-plans/sync-to-calendar', {
        mealPlanId,
        accessToken
      });

      console.log('Sync response status:', response.status);
      const data = response.data;
      console.log('Sync successful:', data);
      toast.success(`Meal plan synced to Google Calendar! Created ${data.events?.length || 0} events.`);
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      
      if (error.response?.status === 401) {
        console.log('Token expired, clearing storage');
        sessionStorage.removeItem('google_access_token');
        const googleLoginButton = document.querySelector('[data-testid="google-login"]');
        if (googleLoginButton) {
          googleLoginButton.click();
        } else {
          toast.error('Your Google session has expired. Please sign in again.');
        }
        return;
      }
      
      toast.error(`Failed to sync with Google Calendar: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle meal event click
  const handleSelectEvent = (event) => {
    setSelectedMeal(event);
    setShowRecipeView(false); // Reset to summary view
    setShowMealModal(true);
  };

  // Mark meal as consumed
  const handleMarkConsumed = async (eventId) => {
    const newConsumedMeals = new Set(consumedMeals);
    const isMarking = !newConsumedMeals.has(eventId);
    
    if (isMarking) {
      // Mark as consumed - reduce pantry items
      try {
        const selectedMealData = selectedMeal;
        if (!selectedMealData || !selectedMealData.meal) {
          toast.error('Meal data not available');
          return;
        }

        console.log('Calling consume-meal API with:', {
          eventId,
          userId,
          meal: selectedMealData.meal
        });

        const response = await api.post('/api/meal-plans/consume-meal', {
          eventId,
          userId,
          meal: selectedMealData.meal
        });

        const result = response.data;
        console.log('Meal consumption result:', result);

        newConsumedMeals.add(eventId);
        setConsumedMeals(newConsumedMeals);
        setShowMealModal(false);

        // Show detailed success message based on improved response
        if (result.success) {
          const { summary } = result;
          const { totalReductions, totalInsufficientItems, totalNoMatchItems, totalIngredients, successRate } = summary;
          
          if (totalReductions > 0) {
            toast.success(
              <>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Meal consumed!</span>
                  <span className="text-sm">
                    Reduced {totalReductions} pantry items ({successRate}% success rate)
                  </span>
                </div>
              </>,
              { duration: 3000 }
            );
            
            // Show detailed breakdown for partial success
            if (totalInsufficientItems > 0 || totalNoMatchItems > 0) {
              setTimeout(() => {
                let warningMessage = '';
                if (totalInsufficientItems > 0) {
                  warningMessage += `${totalInsufficientItems} ingredients had insufficient pantry quantities. `;
                }
                if (totalNoMatchItems > 0) {
                  warningMessage += `${totalNoMatchItems} ingredients not found in pantry.`;
                }
                
                toast.error(warningMessage, { duration: 5000 });
              }, 1000);
            }
          } else {
            // No pantry items were reduced
            toast.success('Meal marked as consumed!', { duration: 2000 });
            
            if (totalNoMatchItems > 0) {
              setTimeout(() => {
                toast.error(
                  `No pantry items were found matching the ${totalIngredients} recipe ingredients.`,
                  { duration: 4000 }
                );
              }, 500);
            }
          }

          // Log detailed breakdown for debugging
          if (result.reductionLog?.length > 0) {
            console.log('Pantry reductions:', result.reductionLog);
          }
          if (result.insufficientItems?.length > 0) {
            console.log('Insufficient items:', result.insufficientItems);
          }
          if (result.noMatchItems?.length > 0) {
            console.log('No match items:', result.noMatchItems);
          }
        }

      } catch (error) {
        console.error('Error marking meal as consumed:', error);
        toast.error(`Failed to process meal consumption: ${error.response?.data?.error || error.message}`);
        return;
      }
    } else {
      // Unmark as consumed - just remove from consumed set (no pantry restoration for now)
      newConsumedMeals.delete(eventId);
      setConsumedMeals(newConsumedMeals);
      setShowMealModal(false);
      toast.success('Meal unmarked as consumed', { duration: 2000 });
    }
  };

  // Edit meal time
  const handleEditMealTime = (eventId, newTime) => {
    // Parse the new time
    const [time, period] = newTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    // Update meal plans with new time
    const updatedMealPlans = mealPlans.map(plan => {
      const newPlan = { ...plan };
      if (newPlan.dates) {
        const newDates = { ...newPlan.dates };
        
        // Find and update the specific meal
        Object.keys(newDates).forEach(dateKey => {
          const dateData = { ...newDates[dateKey] };
          if (dateData.meals) {
            const newMeals = { ...dateData.meals };
            
            Object.keys(newMeals).forEach(mealType => {
              const testEventId = `${dateKey}-${mealType}`;
              if (testEventId === eventId) {
                // Update the meal's time metadata if it exists
                newMeals[mealType] = {
                  ...newMeals[mealType],
                  customTime: {
                    hour: hour24,
                    minute: minutes || 0
                  }
                };
              }
            });
            
            dateData.meals = newMeals;
          }
          newDates[dateKey] = dateData;
        });
        
        newPlan.dates = newDates;
      }
      return newPlan;
    });

    setMealPlans(updatedMealPlans);
    setShowMealModal(false);
    toast.success(`Meal time updated to ${newTime}`, { duration: 2000 });
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
        'Calendar file downloaded! Import it into any calendar app:\n• Google Calendar: Settings → Import & Export\n• Outlook: File → Import/Export\n• Apple Calendar: File → Import',
        { duration: 6000 }
      );
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast.error('Failed to export calendar file');
    } finally {
      setIsExporting(false);
    }
  };

  // Mobile navigation functions
  const navigateDate = (direction) => {
    const increment = mobileView === 'day' ? 1 : 7;
    const newDate = moment(currentDate).add(direction * increment, 'days').toDate();
    setCurrentDate(newDate);
  };

  // Mobile view toggle
  const toggleMobileView = () => {
    setMobileView(prev => prev === 'day' ? 'week' : 'day');
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

    // Convert meal plans to calendar events with deduplication
  const events = useMemo(() => {
    const eventMap = new Map(); // Use Map to deduplicate by eventId
    
    console.log(`🔄 Processing ${mealPlans?.length || 0} meal plans for calendar events...`);
    
    (mealPlans || []).forEach((plan, planIndex) => {
      console.log(`📋 Processing meal plan ${planIndex + 1}: "${plan.title}" with ${Object.keys(plan.dates || {}).length} dates`);
      
      Object.entries(plan.dates || {}).forEach(([dateStr, dateData]) => {
        console.log(`📅 Processing date: ${dateStr} with ${Object.keys(dateData?.meals || {}).length} meals`);
        
        Object.entries(dateData?.meals || {}).forEach(([mealType, meal]) => {
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
          
          // ✅ STABLE EVENT ID using standardized date format
          const eventId = `${mealDate.format('YYYY-MM-DD')}-${mealType}`;
          
          // Skip if we already have this event (deduplication)
          if (eventMap.has(eventId)) {
            console.log(`🔍 Skipping duplicate event: ${eventId}`);
            return;
          }
          
          // Use custom time if available, otherwise use default times
          const customTime = meal.customTime;
          const defaultHour = mealType === 'breakfast' ? 8 : mealType === 'lunch' ? 12 : 18;
          const startHour = customTime ? customTime.hour : defaultHour;
          const startMinute = customTime ? customTime.minute : 0;
          
          const event = {
            id: eventId,
            title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${meal.recipe?.name || 'Unknown meal'}`,
            start: mealDate.clone().hour(startHour).minute(startMinute).second(0).toDate(),
            end: mealDate.clone().hour(startHour).minute(startMinute + 60).second(0).toDate(),
            meal: meal.recipe,
            mealType,
            resource: mealType,
            consumed: consumedMeals.has(eventId),
            plannedMacros: meal.plannedMacros
          };
          
          console.log(`✅ Created event: ${eventId} - ${event.title} on ${mealDate.format('YYYY-MM-DD')}`);
          eventMap.set(eventId, event);
        });
      });
    });
    
    const uniqueEvents = Array.from(eventMap.values());
    console.log(`📅 Generated ${uniqueEvents.length} unique events from ${mealPlans?.length || 0} meal plans`);
    console.log(`🗓️ Event dates: ${uniqueEvents.map(e => moment(e.start).format('MM-DD')).join(', ')}`);
    return uniqueEvents;
  }, [mealPlans, consumedMeals]);

  // Get events for current date in mobile day view
  const todaysEvents = useMemo(() => {
    if (!isMobile || mobileView !== 'day') return [];
    
    const currentDateStr = moment(currentDate).format('YYYY-MM-DD');
    return events.filter(event => 
      moment(event.start).format('YYYY-MM-DD') === currentDateStr
    ).sort((a, b) => moment(a.start).hour() - moment(b.start).hour());
  }, [events, currentDate, isMobile, mobileView]);

  // Mobile List View Component
  const MobileListView = () => (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-[#2A3142] rounded-lg p-4">
        <button
          onClick={() => navigateDate(-1)}
          className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-center">
          <div className="text-lg font-semibold">
            {moment(currentDate).format('dddd')}
          </div>
          <div className="text-sm text-gray-400">
            {moment(currentDate).format('MMMM Do, YYYY')}
          </div>
        </div>
        
        <button
          onClick={() => navigateDate(1)}
          className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Meals List */}
      <div className="space-y-3">
        {todaysEvents.length > 0 ? (
          todaysEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => handleSelectEvent(event)}
              className={`bg-[#2A3142] rounded-lg p-4 cursor-pointer transition-all duration-200 hover:bg-[#374151] border-l-4 ${
                event.resource === 'breakfast' ? 'border-yellow-400' :
                event.resource === 'lunch' ? 'border-green-400' :
                'border-blue-400'
              } ${event.consumed ? 'opacity-60 bg-red-900/20' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium capitalize text-gray-300">
                      {event.mealType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {moment(event.start).format('h:mm A')}
                    </span>
                    {event.consumed && (
                      <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                        Consumed ✓
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white mb-2 leading-tight">
                    {event.meal?.name || 'Unknown meal'}
                  </h3>
                  {event.plannedMacros && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <span>🔥 {event.plannedMacros.calories || 0} cal</span>
                      <span>🥩 {event.plannedMacros.protein_g || 0}g protein</span>
                      <span>🍞 {event.plannedMacros.carbs_g || 0}g carbs</span>
                      <span>🥑 {event.plannedMacros.fat_g || 0}g fat</span>
                    </div>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No meals planned for this day</p>
          </div>
        )}
      </div>
    </div>
  );

  // Modal close handler
  const handleCloseModal = () => {
    setShowRecipeView(false);
    setShowMealModal(false);
  };

  // Switch to recipe view
  const handleViewRecipe = () => {
    setShowRecipeView(true);
  };

  // Switch back to summary view
  const handleBackToSummary = () => {
    setShowRecipeView(false);
  };

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

      <div className="h-full flex flex-col bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-3 md:p-6 border border-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_12px_3px_rgba(59,130,246,0.25)]">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <h2 className="text-lg md:text-2xl font-bold">
              {isMobile ? 'Meal Calendar' : 'Weekly Meal Calendar'}
            </h2>
            <button
              onClick={fetchMealPlans}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh calendar"
            >
              <svg className={`w-4 h-4 md:w-5 md:h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-2">
            {/* Mobile View Toggle */}
            {isMobile && (
              <button
                onClick={toggleMobileView}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {mobileView === 'day' ? 'Week' : 'Day'}
              </button>
            )}
            
            {/* ICS Export Button */}
            <button
              onClick={handleExportToCalendar}
              disabled={isExporting || !mealPlans.length}
              className="px-2 md:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 md:gap-2 text-sm"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden md:inline">Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden md:inline">Download ICS</span>
                  <span className="md:hidden">Export</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className={`flex-1 ${isMobile ? 'min-h-0' : 'min-h-[600px]'} calendar-container`}>
          {isMobile && mobileView === 'day' ? (
            <MobileListView />
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              defaultView={isMobile ? 'day' : 'week'}
              views={isMobile ? ['day', 'week'] : ['week', 'day']}
              date={currentDate}
              onNavigate={setCurrentDate}
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
          )}
        </div>

        <style>{`
          .rbc-today {
            background-color: rgba(59, 130, 246, 0.1) !important;
          }
          
          .rbc-current-time-indicator {
            background-color: rgba(59, 130, 246, 0.6) !important;
            height: 2px !important;
          }
          
          .meal-event {
            background:rgb(114, 140, 201) !important;
            color: white !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            padding: 4px 8px !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            font-size: ${isMobile ? '11px' : '12px'} !important;
            line-height: 1.2 !important;
          }
          
          .meal-event:hover {
            background: #313748 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
          }
          
          .breakfast-event {
            border-left: 4px solid #fbbf24 !important;
          }
          
          .lunch-event {
            border-left: 4px solid #10b981 !important;
          }
          
          .dinner-event {
            border-left: 4px solid #3b82f6 !important;
          }
          
          .meal-event.consumed {
            opacity: 0.9 !important;
            text-decoration: line-through !important;
            background: #dc2626 !important;
            border: 1px solid #991b1b !important;
            border-left: 4px solid #991b1b !important;
          }
          
          .meal-event.consumed::after {
            content: "✓" !important;
            margin-left: 8px !important;
            color: #ffffff !important;
            font-weight: bold !important;
          }

          /* Mobile specific calendar styles */
          @media (max-width: 768px) {
            .rbc-toolbar {
              flex-direction: column !important;
              gap: 8px !important;
              margin-bottom: 16px !important;
            }
            
            .rbc-toolbar-label {
              font-size: 16px !important;
              font-weight: 600 !important;
              margin: 0 !important;
            }
            
            .rbc-btn-group {
              gap: 4px !important;
            }
            
            .rbc-btn-group button {
              padding: 8px 12px !important;
              font-size: 12px !important;
              border-radius: 6px !important;
            }
            
            .rbc-time-view .rbc-time-gutter {
              width: 50px !important;
              font-size: 11px !important;
            }
            
            .rbc-time-view .rbc-time-content {
              margin-left: 50px !important;
            }
            
            .rbc-time-slot {
              height: 40px !important;
            }
            
            .rbc-day-slot .rbc-time-slot {
              border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            
            .rbc-header {
              padding: 8px 4px !important;
              font-size: 12px !important;
              font-weight: 600 !important;
            }
            
            .rbc-week-view .rbc-header {
              font-size: 10px !important;
            }
            
            .rbc-event {
              font-size: 10px !important;
              padding: 2px 4px !important;
            }
          }

          /* Ensure mobile touch targets are large enough */
          @media (max-width: 768px) {
            .rbc-event {
              min-height: 32px !important;
              display: flex !important;
              align-items: center !important;
            }
          }
        `}</style>
      </div>

      {/* Mobile-optimized Meal Modal */}
      {showMealModal && selectedMeal && (
        <div className={`fixed inset-0 z-50 ${showRecipeView ? '' : 'flex items-center justify-center p-2 md:p-4'}`}>
          {!showRecipeView && (
            <div className="flex items-center justify-center w-full h-full">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={handleCloseModal}
              />
              
              {/* Summary Modal */}
              <div className="relative bg-[#252B3B]/95 backdrop-blur-lg rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-8 shadow-[0_0_0_1px_rgba(59,130,246,0.6),0_0_24px_6px_rgba(59,130,246,0.25)] border border-blue-500/20">
                <MealSummaryModal
                  selectedMeal={selectedMeal}
                  consumedMeals={consumedMeals}
                  onClose={handleCloseModal}
                  onViewRecipe={handleViewRecipe}
                  onMarkConsumed={handleMarkConsumed}
                  onEditMealTime={handleEditMealTime}
                />
              </div>
            </div>
          )}
          
          {/* Fullscreen Recipe Modal */}
          {showRecipeView && (
            <div className="fixed inset-0 bg-[#1F2937] flex flex-col">
              {/* Header */}
              <div className="bg-[#252B3B]/95 backdrop-blur-lg px-4 py-3 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBackToSummary}
                    className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-center flex-1">
                    <h2 className="text-xl font-bold text-white">
                      {selectedMeal.meal?.name}
                    </h2>
                    <p className="text-blue-400 text-sm">
                      {selectedMeal.mealType.charAt(0).toUpperCase() + selectedMeal.mealType.slice(1)} Recipe
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-h-0 p-4">
                <MealRecipeModal
                  selectedMeal={selectedMeal}
                  onBack={handleBackToSummary}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default UserMealPlanCalendar; 
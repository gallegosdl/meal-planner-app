import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const DraggableMealPlan = ({ mealPlan: initialMealPlan }) => {
  // Local state to manage meal arrangements
  // Using initialMealPlan as starting point but allowing modifications
  const [meals, setMeals] = useState(initialMealPlan);

  // Handler called when a drag operation completes
  const handleDragEnd = (result) => {
    // If dropped outside valid drop zone, ignore
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Prevent unnecessary state updates if dropped in same location
    if (source.droppableId === destination.droppableId) {
      return;
    }

    // Extract day number and meal type from the droppableIds
    // Format: "1-breakfast" -> day: 1, type: breakfast
    const [sourceDay, sourceType] = source.droppableId.split('-');
    const [destDay, destType] = destination.droppableId.split('-');
    
    // Update meals state with swapped meals
    setMeals(prevMeals => {
      // Deep clone to avoid state mutations
      const newMeals = JSON.parse(JSON.stringify(prevMeals));
      
      // Get references to the meals we're swapping
      // Subtract 1 from day because array is 0-based but days start at 1
      const sourceMeal = newMeals.days[sourceDay - 1].meals[sourceType];
      const destMeal = newMeals.days[destDay - 1].meals[destType];
      
      // Perform the swap
      newMeals.days[sourceDay - 1].meals[sourceType] = destMeal;
      newMeals.days[destDay - 1].meals[destType] = sourceMeal;
      
      return newMeals;
    });
  };

  return (
    // DragDropContext provides drag and drop functionality to its children
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Grid layout for days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Map through each day in the meal plan */}
        {meals.days.map((day) => (
          <div key={day.day} className="bg-[#252B3B]/50 p-4 rounded-xl">
            <h3 className="text-xl font-bold mb-4">Day {day.day}</h3>
            {/* Map through each meal type (breakfast, lunch, dinner) */}
            {Object.entries(day.meals).map(([mealType, meal]) => (
              // Droppable component defines a valid drop zone
              <Droppable 
                droppableId={`${day.day}-${mealType}`} 
                key={mealType}
                type="meal" // Type ensures meals can only be dropped in meal zones
              >
                {/* Render props pattern - provided contains necessary props/refs */}
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef} // Required for drag and drop to work
                    {...provided.droppableProps} // Spreads necessary drop zone props
                    className={`mb-4 p-2 rounded-lg ${
                      // Visual feedback when dragging over this zone
                      snapshot.isDraggingOver ? 'bg-[#313748]' : ''
                    }`}
                  >
                    <h4 className="capitalize text-gray-400 mb-2">{mealType}</h4>
                    {/* Draggable component makes its children draggable */}
                    <Draggable
                      draggableId={`${day.day}-${mealType}`}
                      index={0} // Required for ordering, single item so index is 0
                    >
                      {/* Another render props pattern for draggable items */}
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps} // Makes the element draggable
                          {...provided.dragHandleProps} // Allows the element to be grabbed
                          className={`bg-[#2A3142] p-4 rounded-lg cursor-move 
                            ${// Visual feedback while dragging
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
                            }
                            hover:bg-[#313748] transition-all`}
                        >
                          <h5 className="font-medium mb-2">{meal.name}</h5>
                          <p className="text-sm text-gray-400">
                            {meal.ingredients.length} ingredients • {meal.difficulty}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{meal.prepTime}</p>
                        </div>
                      )}
                    </Draggable>
                    {/* Placeholder maintains space while dragging */}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default DraggableMealPlan; 
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const DraggableMealPlan = ({ mealPlan: initialMealPlan }) => {
  const [meals, setMeals] = useState(initialMealPlan);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // Don't do anything if dropped in same spot
    if (source.droppableId === destination.droppableId) {
      return;
    }

    const [sourceDay, sourceType] = source.droppableId.split('-');
    const [destDay, destType] = destination.droppableId.split('-');
    
    setMeals(prevMeals => {
      const newMeals = JSON.parse(JSON.stringify(prevMeals));
      
      // Get the meals we're swapping
      const sourceMeal = newMeals.days[sourceDay - 1].meals[sourceType];
      const destMeal = newMeals.days[destDay - 1].meals[destType];
      
      // Swap the meals
      newMeals.days[sourceDay - 1].meals[sourceType] = destMeal;
      newMeals.days[destDay - 1].meals[destType] = sourceMeal;
      
      return newMeals;
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-5 gap-4">
        {meals.days.map((day) => (
          <div key={day.day} className="bg-[#252B3B]/50 p-4 rounded-xl">
            <h3 className="text-xl font-bold mb-4">Day {day.day}</h3>
            {Object.entries(day.meals).map(([mealType, meal]) => (
              <Droppable 
                droppableId={`${day.day}-${mealType}`} 
                key={mealType}
                type="meal"
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`mb-4 p-2 rounded-lg ${
                      snapshot.isDraggingOver ? 'bg-[#313748]' : ''
                    }`}
                  >
                    <h4 className="capitalize text-gray-400 mb-2">{mealType}</h4>
                    <Draggable
                      draggableId={`${day.day}-${mealType}-${meal.name}`}
                      index={0}
                      key={`${day.day}-${mealType}-${meal.name}`}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-[#2A3142] p-4 rounded-lg cursor-move 
                            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}
                            hover:bg-[#313748] transition-all`}
                        >
                          <h5 className="font-medium mb-2">{meal.name}</h5>
                          <p className="text-sm text-gray-400">
                            {meal.ingredients.length} ingredients
                          </p>
                        </div>
                      )}
                    </Draggable>
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
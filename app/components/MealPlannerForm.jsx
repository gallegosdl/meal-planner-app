import PantryModal from './PantryModal';

const MealPlannerForm = () => {
  const [isPantryOpen, setIsPantryOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsPantryOpen(true)}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
      >
        <span className="material-icons">kitchen</span>
        Pantry
      </button>

      <PantryModal 
        isOpen={isPantryOpen}
        onClose={() => setIsPantryOpen(false)}
      />
    </div>
  );
};

export default MealPlannerForm; 
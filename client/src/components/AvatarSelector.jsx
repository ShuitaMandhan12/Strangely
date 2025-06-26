const avatars = ["👨", "👩", "🧑", "👨‍🦰", "👩‍🦰", "👨‍🦱", "👩‍🦱", "👨‍💼", "👩‍💼", "🧔", "🧓", "👳‍♂️", "👲", "🧕", "👮‍♂️"];

export default function AvatarSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-5 gap-3">
      {avatars.map((avatar, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={`aspect-square text-3xl sm:text-4xl rounded-full flex items-center justify-center w-full transition-transform duration-300
            ${selected === index 
              ? 'ring-4 ring-purple-400 bg-purple-900/30 scale-110 shadow-lg shadow-purple-500/30' 
              : 'hover:bg-gray-700 hover:scale-105 hover:shadow-md hover:shadow-purple-500/10'}`}
        >
          {avatar}
        </button>
      ))}
    </div>
  );
}

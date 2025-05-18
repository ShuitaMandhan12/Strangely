import { Search, X } from 'lucide-react'

export default function MessageSearch({ 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  setShowSearch,
  scrollToMessage
}) {
  return (
    <div className="absolute top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 z-50 w-80">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium dark:text-white">Search Messages</h3>
        <button 
          onClick={() => setShowSearch(false)}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="flex items-center space-x-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-9 pr-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
      
      {searchResults.length > 0 ? (
        <div className="max-h-60 overflow-y-auto">
          {searchResults.map(msg => (
            <div 
              key={msg.id} 
              className="p-2 border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => {
                scrollToMessage(msg.id);
                setShowSearch(false);
              }}
            >
              <p className="text-sm font-medium dark:text-white">{msg.username}</p>
              <p className="text-sm truncate dark:text-gray-300">
                {msg.type === 'file' ? `File: ${msg.name}` : msg.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
          {searchQuery ? 'No results found' : 'Enter a search term'}
        </p>
      )}
    </div>
  )
}
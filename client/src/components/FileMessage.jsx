import { FileIcon, Download } from 'lucide-react'

export default function FileMessage({ message, isOwnMessage }) {
  const fileSize = (size) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={`p-2 border rounded-lg ${isOwnMessage ? 'bg-blue-50 dark:bg-blue-900' : 'bg-gray-50 dark:bg-gray-700'}`}>
      <div className="flex items-center space-x-2">
        <FileIcon size={24} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{message.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {fileSize(message.size)}
          </p>
        </div>
      </div>
      <a 
        href={message.url} 
        download={message.name}
        className={`inline-flex items-center text-sm mt-2 ${
          isOwnMessage ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'
        } hover:underline`}
      >
        <Download size={16} className="mr-1" />
        Download
      </a>
    </div>
  )
}
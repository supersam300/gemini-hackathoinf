export default function Header() {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-vs-dark-600 border-b border-gray-800 select-none shrink-0">
      {/* Logo and Title */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent-blue flex items-center justify-center text-white font-bold text-sm">
          ◇
        </div>
        <h1 className="text-sm font-semibold text-gray-100">
          SimuIDE
        </h1>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
          ⚙️
        </button>
        <button className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
          ☰
        </button>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <header className="flex items-center gap-3 h-11 px-4 bg-white border-b border-surface-border select-none shrink-0">
      <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors">
        <span className="text-base leading-none">+</span> Upload
      </button>
      <button className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors">
        Debug
      </button>
    </header>
  );
}

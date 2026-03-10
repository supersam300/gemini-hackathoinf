import { useState, useRef } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, FolderOpen, Folder, Upload, File, X, Search,
  ChevronDown, ChevronRight, FolderUp,
} from 'lucide-react';

export interface FileEntry {
  id: string;
  name: string;
  kind: 'file' | 'folder';
  size: number;
  lastModified: number;
  children?: FileEntry[];
}

interface FilePanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  entries: FileEntry[];
  onAddEntries: (entries: FileEntry[]) => void;
  onRemoveEntry: (id: string) => void;
  onOpenFile: (file: FileEntry) => void;
  activeFileId: string | null;
  darkMode?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx) : '';
}

function extensionColor(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.pkt': return 'from-[#ff9800] to-[#f57c00]';
    case '.ckt': return 'from-[#4caf50] to-[#388e3c]';
    case '.ino': return 'from-[#00897b] to-[#00695c]';
    case '.cpp': case '.c': case '.h': return 'from-[#1565c0] to-[#0d47a1]';
    case '.json': return 'from-[#fdd835] to-[#f9a825]';
    default: return 'from-[#78909c] to-[#546e7a]';
  }
}

/** Count all files (not folders) recursively. */
function countFiles(entries: FileEntry[]): number {
  let n = 0;
  for (const e of entries) {
    if (e.kind === 'file') n++;
    if (e.children) n += countFiles(e.children);
  }
  return n;
}

/** Build a tree of FileEntry nodes from a flat browser FileList that came from a folder picker. */
function buildFolderTree(fileList: globalThis.File[]): FileEntry[] {
  // Intermediate map: path-segment → { files, subfolders }
  interface Node { files: FileEntry[]; sub: Map<string, Node>; }
  const root: Node = { files: [], sub: new Map() };

  for (const f of fileList) {
    // webkitRelativePath looks like "folderName/sub/file.txt"
    const rel: string = (f as any).webkitRelativePath || f.name;
    const parts = rel.split('/');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur.sub.has(parts[i])) cur.sub.set(parts[i], { files: [], sub: new Map() });
      cur = cur.sub.get(parts[i])!;
    }
    cur.files.push({
      id: `${Date.now()}-${rel}`,
      name: parts[parts.length - 1],
      kind: 'file',
      size: f.size,
      lastModified: f.lastModified,
    });
  }

  function convert(node: Node): FileEntry[] {
    const entries: FileEntry[] = [];
    // folders first
    for (const [name, child] of node.sub) {
      entries.push({
        id: `${Date.now()}-folder-${name}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        kind: 'folder',
        size: 0,
        lastModified: 0,
        children: convert(child),
      });
    }
    // then files
    entries.push(...node.files);
    return entries;
  }

  return convert(root);
}

/** Check if any entry (recursively) matches a search string. */
function matchesSearch(entry: FileEntry, q: string): boolean {
  if (entry.name.toLowerCase().includes(q)) return true;
  if (entry.children) return entry.children.some(c => matchesSearch(c, q));
  return false;
}

/* ─── Tree row component ─── */
function EntryRow({
  entry, depth, activeFileId, onOpenFile, onRemoveEntry, expandedIds, toggleExpand, darkMode,
}: {
  entry: FileEntry; depth: number; activeFileId: string | null;
  onOpenFile: (f: FileEntry) => void; onRemoveEntry: (id: string) => void;
  expandedIds: Set<string>; toggleExpand: (id: string) => void;
  darkMode?: boolean;
}) {
  const dm = darkMode;
  const isFolder = entry.kind === 'folder';
  const isExpanded = expandedIds.has(entry.id);
  const isActive = entry.id === activeFileId;
  const ext = isFolder ? '' : getFileExtension(entry.name);

  return (
    <>
      <div
        className={`group flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer transition-colors mb-px ${
          isActive
            ? dm ? 'bg-[#1e3a5f] border border-[#4285f4]/40' : 'bg-[#e0edff] border border-[#4285f4]/30'
            : dm ? 'hover:bg-[#333] border border-transparent' : 'hover:bg-[#eee] border border-transparent'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => isFolder ? toggleExpand(entry.id) : onOpenFile(entry)}
        title={entry.name}
      >
        {/* Expand/collapse arrow for folders */}
        {isFolder ? (
          <button
            className={`shrink-0 p-0 ${dm ? 'text-[#999] hover:text-[#ccc]' : 'text-[#888] hover:text-[#555]'}`}
            onClick={(e) => { e.stopPropagation(); toggleExpand(entry.id); }}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-[12px] shrink-0" /> /* spacer so files align with folder names */
        )}

        {/* Icon */}
        {isFolder ? (
          <Folder size={14} className={isExpanded ? 'text-[#f59e0b]' : dm ? 'text-[#777]' : 'text-[#999]'} />
        ) : (
          <div className={`w-[18px] h-[18px] rounded flex items-center justify-center shrink-0 bg-gradient-to-br ${extensionColor(ext)} shadow-sm`}>
            <File size={9} className="text-white" />
          </div>
        )}

        {/* Name + size */}
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] truncate leading-tight ${isFolder ? `font-semibold ${dm ? 'text-[#ccc]' : 'text-[#444]'}` : `font-medium ${dm ? 'text-[#bbb]' : 'text-[#333]'}`}`}>
            {entry.name}
          </p>
          {!isFolder && (
            <p className={`text-[9px] leading-tight ${dm ? 'text-[#777]' : 'text-[#aaa]'}`}>{formatSize(entry.size)}</p>
          )}
        </div>

        {/* Remove */}
        <button
          className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all shrink-0 ${dm ? 'hover:bg-[#444] text-[#777] hover:text-[#ccc]' : 'hover:bg-[#ddd] text-[#999] hover:text-[#666]'}`}
          onClick={(e) => { e.stopPropagation(); onRemoveEntry(entry.id); }}
          title={isFolder ? 'Remove folder' : 'Remove file'}
        >
          <X size={11} />
        </button>
      </div>

      {/* Folder children */}
      {isFolder && isExpanded && entry.children && entry.children.map(child => (
        <EntryRow
          key={child.id}
          entry={child}
          depth={depth + 1}
          activeFileId={activeFileId}
          onOpenFile={onOpenFile}
          onRemoveEntry={onRemoveEntry}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          darkMode={darkMode}
        />
      ))}
    </>
  );
}

/* ─── Main panel ─── */
export function FilePanel({
  collapsed, onToggleCollapse, entries, onAddEntries, onRemoveEntry, onOpenFile, activeFileId, darkMode,
}: FilePanelProps) {
  const dm = darkMode;
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newEntries: FileEntry[] = Array.from(selected).map(f => ({
      id: `${Date.now()}-${f.name}`,
      name: f.name,
      kind: 'file' as const,
      size: f.size,
      lastModified: f.lastModified,
    }));
    onAddEntries(newEntries);
    e.target.value = '';
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    const tree = buildFolderTree(Array.from(selected));
    onAddEntries(tree);
    // auto-expand top-level folders
    setExpandedIds(prev => {
      const next = new Set(prev);
      tree.forEach(t => { if (t.kind === 'folder') next.add(t.id); });
      return next;
    });
    e.target.value = '';
  };

  const totalFiles = countFiles(entries);
  const q = search.toLowerCase();
  const filtered = q ? entries.filter(e => matchesSearch(e, q)) : entries;

  // Collapsed state — thin vertical strip
  if (collapsed) {
    return (
      <div className={`shrink-0 flex flex-col items-center border-r w-[36px] ${dm ? 'bg-[#1e1e1e] border-[#333]' : 'bg-[#f0f0f2] border-[#d0d0d0]'}`}>
        <button
          onClick={onToggleCollapse}
          className={`mt-2 p-1.5 rounded transition-colors ${dm ? 'hover:bg-[#333] text-[#999]' : 'hover:bg-[#e0e0e0] text-[#666]'}`}
          title="Open Files Panel"
        >
          <PanelLeftOpen size={16} />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <p
            className={`text-[11px] whitespace-nowrap ${dm ? 'text-[#777]' : 'text-[#aaa]'}`}
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-[220px] shrink-0 flex flex-col overflow-hidden shadow-sm ${dm ? 'bg-[#1e1e1e] border-r border-[#333]' : 'bg-[#fafafa] border-r border-[#d0d0d0]'}`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className={`flex items-center h-[34px] px-3 border-b shrink-0 ${dm ? 'bg-gradient-to-r from-[#2a2a2a] to-[#252525] border-[#333]' : 'bg-gradient-to-r from-[#f0f0f0] to-[#e8e8e8] border-[#c8c8c8]'}`}>
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className={dm ? 'text-[#999]' : 'text-[#666]'} />
          <span className={`text-[12px] font-semibold ${dm ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'}`}>Files</span>
          {totalFiles > 0 && (
            <span className={`text-[10px] px-1.5 rounded-full ${dm ? 'text-[#999] bg-[#333]' : 'text-[#999] bg-[#e4e4e4]'}`}>{totalFiles}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            className={`p-1 rounded ${dm ? 'hover:bg-[#333] text-[#999]' : 'hover:bg-[#ddd] text-[#666]'}`}
            onClick={onToggleCollapse}
            title="Close Panel"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      {/* Upload buttons */}
      <div className={`px-3 py-2 border-b shrink-0 flex gap-2 ${dm ? 'border-[#333]' : 'border-[#e4e4e4]'}`}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleFolderUpload}
          {...({ webkitdirectory: '', directory: '' } as any)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium border border-dashed rounded-md transition-colors ${dm ? 'border-[#555] bg-[#2a2a2a] hover:bg-[#1e3a5f] hover:border-[#4285f4] hover:text-[#7abaff] text-[#999]' : 'border-[#b0b0b0] bg-white hover:bg-[#e8f0fe] hover:border-[#4285f4] hover:text-[#1565c0] text-[#666]'}`}
        >
          <Upload size={11} />
          Files
        </button>
        <button
          onClick={() => folderInputRef.current?.click()}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium border border-dashed rounded-md transition-colors ${dm ? 'border-[#555] bg-[#2a2a2a] hover:bg-[#1e3a5f] hover:border-[#4285f4] hover:text-[#7abaff] text-[#999]' : 'border-[#b0b0b0] bg-white hover:bg-[#e8f0fe] hover:border-[#4285f4] hover:text-[#1565c0] text-[#666]'}`}
        >
          <FolderUp size={11} />
          Folder
        </button>
      </div>

      {/* Search (only if entries exist) */}
      {entries.length > 0 && (
        <div className={`px-3 py-1.5 border-b shrink-0 ${dm ? 'border-[#333]' : 'border-[#e4e4e4]'}`}>
          <div className={`flex items-center gap-1.5 border rounded px-2 py-1 focus-within:border-[#4285f4] transition-colors ${dm ? 'bg-[#2a2a2a] border-[#444]' : 'bg-white border-[#d0d0d0]'}`}>
            <Search size={11} className={dm ? 'text-[#777] shrink-0' : 'text-[#aaa] shrink-0'} />
            <input
              type="text"
              className={`flex-1 bg-transparent outline-none text-[11px] ${dm ? 'text-[#ccc] placeholder-[#666]' : 'text-[#333] placeholder-[#bbb]'}`}
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* File / folder tree */}
      <div
        className="flex-1 overflow-y-auto px-1 py-1.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#c0c0c0 transparent' }}
      >
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <FolderOpen size={28} className={dm ? 'text-[#555]' : 'text-[#ccc]'} />
            <p className={`text-[11px] leading-relaxed ${dm ? 'text-[#666]' : 'text-[#aaa]'}`}>
              No files yet.<br />Upload files or a folder to get started.
            </p>
          </div>
        )}
        {entries.length > 0 && filtered.length === 0 && (
          <p className={`text-[11px] text-center py-4 ${dm ? 'text-[#666]' : 'text-[#aaa]'}`}>No matching files.</p>
        )}
        {filtered.map(entry => (
          <EntryRow
            key={entry.id}
            entry={entry}
            depth={0}
            activeFileId={activeFileId}
            onOpenFile={onOpenFile}
            onRemoveEntry={onRemoveEntry}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
}

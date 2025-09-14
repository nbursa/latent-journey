import { useState, useEffect, useRef } from "react";
import {
  Search,
  Camera,
  Map,
  Brain,
  RotateCcw,
  Eye,
  Filter,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraFocus?: (cluster: string) => void;
  onToggleSpeechOnly?: () => void;
  onSetWaypoint?: () => void;
  onCompareAB?: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onCameraFocus,
  onToggleSpeechOnly,
  onSetWaypoint,
  onCompareAB,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    {
      id: "focus-camera-top",
      label: "Focus camera on top view",
      description: "Set camera to top-down perspective",
      icon: Camera,
      action: () => onCameraFocus?.("top"),
      keywords: ["camera", "top", "view", "focus"],
    },
    {
      id: "focus-camera-isometric",
      label: "Focus camera on isometric view",
      description: "Set camera to isometric perspective",
      icon: Camera,
      action: () => onCameraFocus?.("isometric"),
      keywords: ["camera", "isometric", "view", "focus"],
    },
    {
      id: "focus-camera-free",
      label: "Focus camera on free view",
      description: "Set camera to free orbit mode",
      icon: Camera,
      action: () => onCameraFocus?.("free"),
      keywords: ["camera", "free", "orbit", "view"],
    },
    {
      id: "toggle-speech-only",
      label: "Toggle speech only mode",
      description: "Show only speech events in the visualization",
      icon: Filter,
      action: () => onToggleSpeechOnly?.(),
      keywords: ["speech", "only", "filter", "toggle"],
    },
    {
      id: "set-waypoint",
      label: "Set waypoint from selection",
      description: "Create a waypoint from currently selected event",
      icon: Map,
      action: () => onSetWaypoint?.(),
      keywords: ["waypoint", "set", "selection", "bookmark"],
    },
    {
      id: "compare-ab",
      label: "Compare A ↔ B",
      description: "Open A/B comparison view",
      icon: Brain,
      action: () => onCompareAB?.(),
      keywords: ["compare", "ab", "comparison", "diff"],
    },
    {
      id: "reset-camera",
      label: "Reset camera position",
      description: "Reset camera to default position",
      icon: RotateCcw,
      action: () => onCameraFocus?.("reset"),
      keywords: ["reset", "camera", "position", "default"],
    },
    {
      id: "toggle-3d",
      label: "Toggle 3D/2D view",
      description: "Switch between 3D and 2D visualization",
      icon: Eye,
      action: () => {},
      keywords: ["toggle", "3d", "2d", "view", "switch"],
    },
  ];

  const filteredCommands = commands.filter(
    (command) =>
      command.keywords.some((keyword) =>
        keyword.toLowerCase().includes(query.toLowerCase())
      ) ||
      command.label.toLowerCase().includes(query.toLowerCase()) ||
      command.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedItem = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="glass p-0 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-ui-border">
            <Search className="w-5 h-5 text-ui-dim" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-ui-text placeholder-ui-dim outline-none font-mono text-sm"
            />
            <kbd className="hud-element text-xs">⌘K</kbd>
          </div>

          {/* Commands List */}
          <div ref={listRef} className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-ui-dim">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              filteredCommands.map((command, index) => {
                const Icon = command.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={command.id}
                    onClick={() => {
                      command.action();
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      isSelected
                        ? "bg-ui-accent/10 border-l-2 border-ui-accent"
                        : "hover:bg-ui-surface/50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? "text-ui-accent" : "text-ui-dim"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          isSelected ? "text-ui-accent" : "text-ui-text"
                        }`}
                      >
                        {command.label}
                      </div>
                      <div className="text-xs text-ui-dim truncate">
                        {command.description}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-ui-border bg-ui-surface/30">
            <div className="flex items-center gap-4 text-xs text-ui-dim">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>⎋ Close</span>
            </div>
            <div className="text-xs text-ui-dim">
              {filteredCommands.length} command
              {filteredCommands.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

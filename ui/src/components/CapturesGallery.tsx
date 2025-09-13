import { Camera, Image } from "lucide-react";

interface CapturesGalleryProps {
  captures: string[];
}

export default function CapturesGallery({ captures }: CapturesGalleryProps) {
  return (
    <div className="flex-1 min-w-0 glass flat p-3">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Camera className="w-4 h-4" />
        Captures ({captures.length})
      </h3>
      {captures.length > 0 ? (
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="flex gap-2 min-w-max">
            {captures.map((capture, index) => (
              <img
                key={index}
                src={capture}
                alt={`Capture ${index + 1}`}
                className="h-16 w-auto flat glass-border object-cover flex-shrink-0 hover-scale"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <Image className="w-3 h-3" />
          Click "Capture & Analyze" to take photos
        </div>
      )}
    </div>
  );
}

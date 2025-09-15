import { Camera, Image } from "lucide-react";
import { useState } from "react";
import { ImagePreviewModal } from "./Modal";

interface CapturesGalleryProps {
  captures: string[];
}

export default function CapturesGallery({ captures }: CapturesGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    title?: string;
    index: number;
  } | null>(null);

  const handleImageClick = (src: string, index: number) => {
    setSelectedImage({
      src,
      alt: `Capture ${index + 1}`,
      title: `Capture ${index + 1}`,
      index,
    });
  };

  const handlePrevious = () => {
    if (selectedImage && selectedImage.index > 0) {
      const newIndex = selectedImage.index - 1;
      setSelectedImage({
        src: captures[newIndex],
        alt: `Capture ${newIndex + 1}`,
        title: `Capture ${newIndex + 1}`,
        index: newIndex,
      });
    }
  };

  const handleNext = () => {
    if (selectedImage && selectedImage.index < captures.length - 1) {
      const newIndex = selectedImage.index + 1;
      setSelectedImage({
        src: captures[newIndex],
        alt: `Capture ${newIndex + 1}`,
        title: `Capture ${newIndex + 1}`,
        index: newIndex,
      });
    }
  };
  return (
    <>
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
                  className="h-16 w-auto flat glass-border object-cover flex-shrink-0 hover-scale cursor-pointer"
                  onClick={() => handleImageClick(capture, index)}
                  title="Click to view larger"
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

      {/* Image Preview Modal - Rendered outside parent container */}
      {selectedImage && (
        <ImagePreviewModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          src={selectedImage.src}
          alt={selectedImage.alt}
          title={selectedImage.title}
          images={captures}
          currentIndex={selectedImage.index}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      )}
    </>
  );
}

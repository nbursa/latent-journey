import { useEffect, useRef } from "react";
import {
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?:
    | "default"
    | "confirmation"
    | "info"
    | "success"
    | "warning"
    | "error"
    | "image";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  title?: string;
  images?: string[];
  currentIndex?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-full mx-4",
};

const iconMap = {
  confirmation: AlertTriangle,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  image: ImageIcon,
  default: null,
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  type = "default",
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = "",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const IconComponent = iconMap[type];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={handleOverlayClick}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden glass flat ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              {IconComponent && (
                <IconComponent
                  className={`w-5 h-5 ${
                    type === "confirmation"
                      ? "text-red-500"
                      : type === "warning"
                      ? "text-yellow-500"
                      : "text-ui-accent"
                  }`}
                />
              )}
              {title && (
                <h2 className="text-lg font-semibold text-ui-text">{title}</h2>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 btn-secondary"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  isLoading = false,
}: ConfirmationModalProps) {
  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: "text-red-500",
          confirmButton: "btn-danger",
        };
      case "warning":
        return {
          icon: "text-yellow-500",
          confirmButton: "btn-secondary",
        };
      case "info":
        return {
          icon: "text-blue-500",
          confirmButton: "btn-primary",
        };
      default:
        return {
          icon: "text-ui-accent",
          confirmButton: "btn-primary",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type={type === "danger" ? "confirmation" : "warning"}
      size="sm"
      closeOnOverlayClick={!isLoading}
    >
      <div className="space-y-4">
        <p className="text-ui-text">{message}</p>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm flat btn-secondary disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm flat ${styles.confirmButton} disabled:opacity-50 flex items-center gap-2`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-1 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Image Preview Modal Component
export function ImagePreviewModal({
  isOpen,
  onClose,
  src,
  alt = "Preview",
  title,
  images = [],
  currentIndex = 0,
  onPrevious,
  onNext,
}: ImagePreviewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type="image"
      size="xl"
      className="max-h-[95vh]"
      closeOnOverlayClick={true}
    >
      <div className="space-y-4">
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className="w-full h-auto max-h-[70vh] object-contain rounded"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=";
            }}
          />

          {/* Navigation Controls */}
          {images.length > 1 && (
            <>
              {/* Previous Button */}
              {onPrevious && currentIndex > 0 && (
                <button
                  onClick={onPrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 btn-primary rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  title="Previous image"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}

              {/* Next Button */}
              {onNext && currentIndex < images.length - 1 && (
                <button
                  onClick={onNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 btn-primary rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  title="Next image"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        {/* Image Info */}
        <div className="flex items-center justify-between text-sm text-ui-dim">
          <div>{alt}</div>
          {images.length > 1 && (
            <div>
              {currentIndex + 1} of {images.length}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

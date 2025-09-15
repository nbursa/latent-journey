import { useState, useCallback } from "react";

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useModal(initialState: boolean = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export interface UseConfirmationModalProps {
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export interface UseConfirmationModalReturn extends UseModalReturn {
  confirm: (props?: Partial<UseConfirmationModalProps>) => void;
  confirmationProps: UseConfirmationModalProps;
  onConfirm: () => void | Promise<void>;
}

export function useConfirmationModal(
  defaultProps: UseConfirmationModalProps
): UseConfirmationModalReturn {
  const modal = useModal();
  const [confirmationProps, setConfirmationProps] = useState(defaultProps);
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback(
    (props?: Partial<UseConfirmationModalProps>) => {
      if (props) {
        setConfirmationProps((prev) => ({ ...prev, ...props }));
      }
      modal.open();
    },
    [modal]
  );

  const handleConfirm = useCallback(async () => {
    try {
      setIsLoading(true);
      await confirmationProps.onConfirm();
      modal.close();
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [confirmationProps.onConfirm, modal]);

  return {
    ...modal,
    confirm,
    confirmationProps: {
      ...confirmationProps,
      isLoading,
    },
    onConfirm: handleConfirm,
  };
}

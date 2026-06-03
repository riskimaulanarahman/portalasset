import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeMap: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: ModalSize;
  /** If true, clicking the backdrop does NOT close the modal */
  persistent?: boolean;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  persistent = false,
  footer,
}) => {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !persistent) onClose();
    };
    document.addEventListener('keydown', handler);
    // Lock scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, persistent]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm animate-fade-in"
        onClick={persistent ? undefined : onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl shadow-black/30 border border-gray-100 flex flex-col animate-scale-in',
          sizeMap[size],
          'max-h-[90vh]',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 id="modal-title" className="text-base font-bold text-forest-900 leading-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-forest-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-forest-300 hover:text-forest-600 hover:bg-forest-50 rounded-lg p-1.5 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;

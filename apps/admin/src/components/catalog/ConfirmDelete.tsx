interface ConfirmDeleteProps {
  open: boolean;
  recordLabel: string;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDelete({
  open,
  recordLabel,
  isPending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
              Confirm deletion
            </h2>
          </div>
          <p className="text-sm text-[#40484f] mb-4">
            Are you sure you want to delete <span className="font-medium text-[#061d30]">{recordLabel}</span>? This action cannot be undone.
          </p>
          {error ? (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p role="alert" className="text-sm text-[#ba1a1a]">
                {error}
              </p>
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-[#c0c7d0] px-4 py-2 text-sm text-[#40484f] transition-colors hover:bg-[#f5f7fa]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

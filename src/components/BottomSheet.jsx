import { IconClose } from "./icons.jsx";

// Mobile bottom drawer with a tap-to-close backdrop (same pattern as the auth
// modal, sliding up from the bottom with safe-area padding).
export default function BottomSheet({ title, onClose, children }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export default function Modal({ title, onClose, children, footer, wide }) {
  const maxWidth = wide ? (typeof wide === 'number' ? wide : 720) : undefined;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-header">
          <h3 style={{ fontSize: 15 }}>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

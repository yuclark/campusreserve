import React from 'react';
import '../styles/SuccessModal.css';

function SuccessModal({ isOpen, onClose, title, message, buttonText = "Continue" }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <div className="success-checkmark">
            <div className="check-icon">
              <span className="icon-line line-tip"></span>
              <span className="icon-line line-long"></span>
              <div className="icon-circle"></div>
              <div className="icon-fix"></div>
            </div>
          </div>
        </div>
        
        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>
        
        <button onClick={onClose} className="modal-button">
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export default SuccessModal;

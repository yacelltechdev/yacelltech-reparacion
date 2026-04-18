import React, { useState } from 'react';

export default function RejectModal({ onConfirm, onCancel }) {
  const [nota, setNota] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nota.trim() === '') {
      alert("La nota no puede estar vacía.");
      return;
    }
    onConfirm(nota.trim());
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px', backdropFilter: 'blur(2px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', animation: 'scaleIn 0.2s ease-out' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#991B1B' }}>Equipo Devuelto Sin Reparar</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '14px' }}>
          Por favor, detalla la razón técnica o comercial por la cual se devuelve el equipo al cliente en mal estado.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <textarea
              autoFocus
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: La placa base tiene un corto irreparable / Cliente no aceptó el presupuesto..."
              rows="4"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', resize: 'vertical' }}
            ></textarea>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#DC2626', border: 'none' }}>Guardar Razón</button>
          </div>
        </form>
      </div>
    </div>
  );
}

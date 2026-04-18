import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import RepairModal from './RepairModal';

import RejectModal from './RejectModal';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [rejectPromptId, setRejectPromptId] = useState(null);

  useEffect(() => {
    loadRepairs();
    const interval = setInterval(loadRepairs, 10000);
    return () => clearInterval(interval);
  }, [user.username]);

  const loadRepairs = async () => {
    try {
      const all = await api.getRepairs();
      const filtered = all.filter(r => 
        r.tecnico && 
        r.tecnico.toLowerCase() === user.username.toLowerCase() &&
        ['En reparación', 'Listo para entregar', 'No se pudo reparar'].includes(r.status)
      );
      setRepairs(filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (repairId, newStatus, nota = '') => {
    try {
      if (newStatus === 'No se pudo reparar' && !nota) {
        setRejectPromptId(repairId);
        return;
      }
      
      const payload = { status: newStatus };
      if (nota) payload.notaDevolucion = nota;

      await api.updateRepair(repairId, payload);
      setRejectPromptId(null);
      loadRepairs();
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock className="text-primary" /> Mis Reparaciones Pendientes
        </h2>
        <p style={{ color: '#64748B' }}>Aquí verás los equipos que tienes asignados y que aún no has terminado.</p>
      </div>

      {repairs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '16px', border: '2px dashed #E2E8F0' }}>
          <CheckCircle size={48} style={{ color: '#10B981', marginBottom: '1rem' }} />
          <h3>¡Todo al día!</h3>
          <p>No tienes reparaciones pendientes asignadas en este momento.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {repairs.map(repair => (
            <div key={repair.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4F46E5', background: '#EEF2FF', padding: '2px 8px', borderRadius: '4px' }}>
                    {repair.codigo}
                  </span>
                  <h3 style={{ margin: '0.5rem 0 0.25rem 0' }}>{repair.marca} {repair.modelo}</h3>
                  <div style={{ fontSize: '0.875rem', color: '#64748B' }}>Cliente: <strong>{repair.cliente}</strong></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Recibido:</div>
                   <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{new Date(repair.fecha).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <strong style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Falla Reportada:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: '600' }}>{repair.sintoma}</p>
              </div>

              {repair.checklist && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(repair.checklist).filter(([_, v]) => v === false).map(([k]) => (
                    <span key={k} style={{ fontSize: '10px', background: '#FEF2F2', color: '#991B1B', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      ❌ {k === 'faceid' ? 'FaceID' : k === 'camara' ? 'Cámara' : k === 'senal' ? 'Señal' : k}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setSelectedRepair(repair)}
                  className="btn btn-secondary" 
                  style={{ flex: 1, fontSize: '0.875rem' }}
                >
                  Ver Detalles
                </button>
                {repair.status === 'En reparación' ? (
                  <>
                    <button 
                      onClick={() => handleStatusUpdate(repair.id, 'Listo para entregar')}
                      className="btn btn-primary" 
                      style={{ flex: 1.5, fontSize: '0.875rem', background: '#10B981' }}
                    >
                      <CheckCircle size={16} /> ¡Está Lista!
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(repair.id, 'No se pudo reparar')}
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.875rem', color: '#EF4444' }}
                      title="No se pudo reparar"
                    >
                      <AlertTriangle size={16} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleStatusUpdate(repair.id, 'En reparación')}
                    className="btn btn-secondary" 
                    style={{ flex: 2, fontSize: '0.875rem', border: '2px dashed #CBD5E1', color: '#64748B' }}
                  >
                    ↺ Revertir a Pendiente
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRepair && (
        <RepairModal 
          repair={selectedRepair} 
          onClose={() => setSelectedRepair(null)} 
        />
      )}

      {rejectPromptId && (
        <RejectModal 
          onConfirm={(nota) => handleStatusUpdate(rejectPromptId, 'No se pudo reparar', nota)}
          onCancel={() => setRejectPromptId(null)}
        />
      )}
    </div>
  );
}

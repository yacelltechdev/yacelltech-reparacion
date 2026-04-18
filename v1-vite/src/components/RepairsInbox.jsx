import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import RepairModal from './RepairModal';
import RejectModal from './RejectModal';
import StatusSelector from './StatusSelector';
import { formatDate } from '../utils';

export default function RepairsInbox() {
  const { user } = useAuth();
  const [activeRepairs, setActiveRepairs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [rejectPromptId, setRejectPromptId] = useState(null);
  
  // Pre-cargar el audio para evitar delays
  const [notificationSound] = useState(new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3'));

  useEffect(() => {
    loadInbox();
    const interval = setInterval(loadInbox, 6000); // Polling cada 6s
    return () => clearInterval(interval);
  }, [searchTerm]);

  const loadInbox = async () => {
    try {
      const allRepairs = await api.getRepairs();
      
      const today = new Date().toISOString().split('T')[0];
      const activeStatuses = ['En reparación', 'Listo para entregar', 'No se pudo reparar'];
      let pending = allRepairs.filter(r => {
        if (activeStatuses.includes(r.status)) return true;
        if (r.fecha_despacho && r.fecha_despacho.startsWith(today)) return true;
        return false;
      });
      
      const currentDone = pending.filter(r => 
        r.status === 'Listo para entregar' || r.status === 'No se pudo reparar'
      ).length;
      
      if (lastReadyCount !== -1 && currentDone > lastReadyCount) {
        playNotification();
      }
      setLastReadyCount(currentDone);

      if (searchTerm.trim() !== '') {
         const lower = searchTerm.toLowerCase();
         pending = pending.filter(r => 
           (r.codigo && r.codigo.toLowerCase().includes(lower)) ||
           (r.cliente && r.cliente.toLowerCase().includes(lower)) ||
           (r.modelo && r.modelo.toLowerCase().includes(lower))
         );
      }
      
      pending.sort((a, b) => {
         if (a.status === 'En reparación' && b.status !== 'En reparación') return -1;
         if (a.status !== 'En reparación' && b.status === 'En reparación') return 1;
         return b.id - a.id;
      });
      
      setActiveRepairs(pending);
    } catch (error) {
      console.error("Error loading inbox:", error);
    }
  };

  const playNotification = () => {
    notificationSound.volume = 0.9;
    notificationSound.currentTime = 0; // Reiniciar por si suena seguido
    notificationSound.play().catch(e => {
      console.warn("Audio bloqueado. Interactúa con la página.");
    });
    
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🚀 Yacelltech: ¡Equipo Finalizado!", { 
        body: "Un equipo cambió a 'Listo' o 'No se pudo reparar'. Revisa la bandeja.",
        icon: "/favicon.ico"
      });
    }
  };

  const handleStatusChange = async (id, newStatus, nota = '') => {
    const updatePayload = { status: newStatus };
    if (newStatus === 'Entregado malo') {
       if (!nota) {
          setRejectPromptId(id);
          return;
       }
       updatePayload.notaDevolucion = nota;
       updatePayload.fecha_despacho = new Date().toISOString();
    } else if (newStatus === 'Entregado bueno') {
       updatePayload.fecha_despacho = new Date().toISOString();
    } else {
       updatePayload.fecha_despacho = null;
    }
    await api.updateRepair(id, updatePayload);
    setRejectPromptId(null);
    loadInbox(); 
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <Clock color="#F59E0B" /> Bandeja y Entregas (Hoy)
           <span className="badge" style={{ background: '#EEF2FF', color: '#4F46E5', marginLeft: '10px' }}>{activeRepairs.length} Movimientos</span>
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={playNotification}
            style={{ fontSize: '11px', padding: '6px 12px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            🔊 Probar Sonido
          </button>
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ width: '250px', padding: '0.5rem' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Entrada</th>
              <th>Cliente</th>
              <th>Modelo / Técnico</th>
              <th>Síntoma / Detalles</th>
              <th>Acción Rápida</th>
            </tr>
          </thead>
          <tbody>
            {activeRepairs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  <CheckCircle size={48} color="#10B981" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <br />
                  No hay equipos pendientes en la bandeja ni despachados hoy.
                </td>
              </tr>
            ) : (
              activeRepairs.map(r => {
                const isLocked = r.status === 'Entregado bueno' || r.status === 'Entregado malo';
                const canEdit = user?.role === 'admin' || !isLocked;
 
                return (
                <tr key={r.id}>
                  <td><strong>{r.codigo}</strong></td>
                  <td style={{ fontSize: '0.85rem' }}>{formatDate(r.fecha)}</td>
                  <td>{r.cliente}<br/><span style={{fontSize: '0.8rem', color: '#64748B'}}>{r.telefono}</span></td>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{r.modelo}</div>
                    {r.tecnico && (
                      <div style={{ fontSize: '11px', color: '#166534', background: '#DCFCE7', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>
                        🛠️ {r.tecnico}
                      </div>
                    )}
                    {r.status === 'No se pudo reparar' && r.notaDevolucion && (
                      <div style={{ fontSize: '11px', color: '#991B1B', background: '#FEF2F2', padding: '6px', borderRadius: '4px', marginTop: '6px', border: '1px solid #FECACA' }}>
                        <strong>Nota técnica:</strong> {r.notaDevolucion}
                      </div>
                    )}
                    {r.status === 'Listo para entregar' && (
                      <div style={{ fontSize: '11px', color: '#065F46', background: '#ECFDF5', padding: '4px 8px', borderRadius: '4px', marginTop: '6px', border: '1px solid #10B981', fontWeight: 'bold' }}>
                        ✨ EQUIPO LISTO
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '5px' }}>
                      {r.sintoma}
                    </div>
                    <button 
                      onClick={() => setSelectedRepair(r)}
                      style={{ fontSize: '11px', padding: '3px 8px', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer', color: '#334155', fontWeight: 'bold' }}
                    >
                      Ver diagnóstico y formato
                    </button>
                  </td>
                  <td>
                    <StatusSelector 
                      status={r.status} 
                      canEdit={canEdit} 
                      onChange={(newStatus) => handleStatusChange(r.id, newStatus)} 
                    />
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <RepairModal repair={selectedRepair} onClose={() => setSelectedRepair(null)} />

      {rejectPromptId && (
        <RejectModal 
          onConfirm={(nota) => handleStatusChange(rejectPromptId, 'Entregado malo', nota)}
          onCancel={() => {
            setRejectPromptId(null);
            loadInbox(); 
          }}
        />
      )}
    </div>
  );
}

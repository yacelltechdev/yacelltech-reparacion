import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Database } from 'lucide-react';
import { useAuth } from '../AuthContext';
import RepairModal from './RepairModal';
import RejectModal from './RejectModal';
import StatusSelector from './StatusSelector';
import { formatDate, formatMoney, getTotalCosto } from '../utils';

export default function Historial() {
  const { user } = useAuth();
  const [allRepairs, setAllRepairs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [rejectPromptId, setRejectPromptId] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadHistory();
    setCurrentPage(1);
  }, [searchTerm]);

  const loadHistory = async () => {
    try {
      let repairs = await api.getRepairs();
      
      if (searchTerm.trim() !== '') {
         const lower = searchTerm.toLowerCase();
         repairs = repairs.filter(r => 
           (r.codigo && r.codigo.toLowerCase().includes(lower)) ||
           (r.cliente && r.cliente.toLowerCase().includes(lower)) ||
           (r.modelo && r.modelo.toLowerCase().includes(lower)) ||
           (r.telefono && r.telefono.includes(lower)) ||
           (r.serie && r.serie.toLowerCase().includes(lower))
         );
      }
      
      setAllRepairs(repairs); // sorted DESC in server
    } catch (e) {
      console.error(e);
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
    loadHistory(); 
  };

  const statusClass = (status) => {
    switch(status) {
      case 'En reparación': return 'badge status-en-reparacion';
      case 'Entregado bueno': return 'badge status-entregado-bueno';
      case 'Entregado malo': return 'badge status-entregado-malo';
      default: return 'badge';
    }
  };

  const totalPages = Math.max(1, Math.ceil(allRepairs.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRepairs = allRepairs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <Database color="#4F46E5" /> Historial General
           <span className="badge" style={{ background: '#F1F5F9', color: '#475569', marginLeft: '10px' }}>{allRepairs.length} Registros</span>
        </h2>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="Buscar por código, IMEI, cliente, modelo..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ width: '350px', padding: '0.5rem 0.5rem 0.5rem 2.5rem' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Ingreso</th>
              <th>Cliente / Teléfono</th>
              <th>Equipo</th>
              <th>Estado Actual</th>
              <th>TOTAL A PAGAR</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRepairs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  No se encontraron resultados en toda la base de datos.
                </td>
              </tr>
            ) : (
              paginatedRepairs.map(r => {
                const isLocked = r.status === 'Entregado bueno' || r.status === 'Entregado malo';
                const canEdit = user?.role === 'admin' || !isLocked;

                return (
                <tr key={r.id}>
                  <td>
                    <strong>{r.codigo}</strong><br/>
                    <button 
                      onClick={() => setSelectedRepair(r)}
                      style={{ fontSize: '10px', padding: '2px 6px', marginTop: '4px', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer', color: '#334155' }}
                    >
                      Inspeccionar
                    </button>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{formatDate(r.fecha)}</td>
                  <td>{r.cliente}<br/><span style={{fontSize: '0.8rem', color: '#64748B'}}>{r.telefono}</span></td>
                  <td>{r.marca} {r.modelo}<br/><span style={{fontSize: '0.8rem', color: '#64748B'}}>IMEI: {r.serie || 'N/A'}</span></td>
                  <td>
                    <span className={statusClass(r.status)}>{r.status}</span>
                  </td>
                  <td><strong>{formatMoney(getTotalCosto(r))}</strong></td>
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderRadius: '0 0 8px 8px' }}>
           <button 
             className="btn btn-secondary" 
             disabled={currentPage === 1} 
             onClick={() => setCurrentPage(p => p - 1)}
           >
             Anterior
           </button>
           <span style={{ fontSize: '14px', color: '#64748B' }}>
             Página <strong>{currentPage}</strong> de {totalPages}
           </span>
           <button 
             className="btn btn-secondary" 
             disabled={currentPage === totalPages} 
             onClick={() => setCurrentPage(p => p + 1)}
           >
             Siguiente
           </button>
        </div>
      )}

      <RepairModal repair={selectedRepair} onClose={() => setSelectedRepair(null)} />

      {rejectPromptId && (
        <RejectModal 
          onConfirm={(nota) => handleStatusChange(rejectPromptId, 'Entregado malo', nota)}
          onCancel={() => {
            setRejectPromptId(null);
            loadHistory(); 
          }}
        />
      )}
    </div>
  );
}

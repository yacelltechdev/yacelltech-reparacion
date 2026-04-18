import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { RefreshCcw, DollarSign } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { formatMoney, getTotalCosto } from '../utils';
import RejectModal from './RejectModal';
import StatusSelector from './StatusSelector';

export default function DailyReport() {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [reportType, setReportType] = useState('diario');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectPromptId, setRejectPromptId] = useState(null);
  const [totals, setTotals] = useState({
    enReparacion: 0,
    entregadoBueno: 0,
    entregadoMalo: 0,
    montoTotal: 0
  });

  useEffect(() => {
    loadRepairs();
    const interval = setInterval(loadRepairs, 15000);
    return () => clearInterval(interval);
  }, [dateStr, searchTerm]);

  const loadRepairs = async () => {
    try {
      const allRepairs = await api.getRepairs();
      let filteredRepairs = [];
      
      if (searchTerm.trim() !== '') {
         const lower = searchTerm.toLowerCase();
         filteredRepairs = allRepairs.filter(r => 
           (r.codigo && r.codigo.toLowerCase().includes(lower)) ||
           (r.cliente && r.cliente.toLowerCase().includes(lower)) ||
           (r.telefono && r.telefono.includes(lower)) ||
           (r.modelo && r.modelo.toLowerCase().includes(lower))
         );
      } else {
         filteredRepairs = allRepairs.filter(r => r.fecha && r.fecha.startsWith(dateStr));
      }
      
      setRepairs(filteredRepairs);
      
      let stats = { enReparacion: 0, entregadoBueno: 0, entregadoMalo: 0, montoTotal: 0 };
      
      filteredRepairs.forEach(r => {
        if (r.status === 'En reparación' || r.status === 'Listo para entregar' || r.status === 'No se pudo reparar') {
          stats.enReparacion++;
        } else if (r.status === 'Entregado bueno') {
          stats.entregadoBueno++;
          stats.montoTotal += getTotalCosto(r);
        } else if (r.status === 'Entregado malo') {
          stats.entregadoMalo++;
        }
      });

      setTotals(stats);
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
    loadRepairs(); 
  };

  const exportData = async () => {
    const allRepairs = await api.getRepairs();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allRepairs));
    const dt = new Date();
    const el = document.createElement('a');
    el.setAttribute("href", dataStr);
    el.setAttribute("download", "yacelltech_backup_" + dt.getTime() + ".json");
    document.body.appendChild(el);
    el.click();
    el.remove();
  };

  const statusClass = (status) => {
    switch(status) {
      case 'En reparación': return 'badge status-en-reparacion';
      case 'Entregado bueno': return 'badge status-entregado-bueno';
      case 'Entregado malo': return 'badge status-entregado-malo';
      default: return 'badge';
    }
  };

  return (
    <div className="card print-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="no-print">
        <h2>{reportType === 'diario' ? 'Cuadre Diario' : 'Reporte Mensual'}</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              if (e.target.value === 'mensual') {
                setDateStr(new Date().toISOString().slice(0, 7)); // YYYY-MM
              } else {
                setDateStr(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
              }
              setSearchTerm('');
            }}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="diario">Diario</option>
            <option value="mensual">Mensual</option>
          </select>

          <input 
            type="text" 
            placeholder="Buscar código, cliente..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ width: '220px', padding: '0.5rem' }}
          />
          {reportType === 'diario' ? (
            <input 
              type="date" 
              value={dateStr.length === 10 ? dateStr : ''} 
              onChange={(e) => { setDateStr(e.target.value); setSearchTerm(''); }} 
              style={{ width: 'auto', padding: '0.5rem' }}
            />
          ) : (
            <input 
              type="month" 
              value={dateStr.length === 7 ? dateStr : ''} 
              onChange={(e) => { setDateStr(e.target.value); setSearchTerm(''); }} 
              style={{ width: 'auto', padding: '0.5rem' }}
            />
          )}
          <button className="btn btn-secondary" onClick={loadRepairs}>
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      {/* Resumen Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>Total Ingresos (Entregado bueno)</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <DollarSign size={24} /> {formatMoney(totals.montoTotal)}
          </div>
        </div>

        <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>Estado: Entregado bueno</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0F172A', marginTop: '0.5rem' }}>
            {totals.entregadoBueno} equipos
          </div>
        </div>

        <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>Estado: Entregado malo</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0F172A', marginTop: '0.5rem' }}>
            {totals.entregadoMalo} equipos
          </div>
        </div>

      </div>

      {/* Tabla de Reparaciones del Día */}
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Modelo</th>
              <th>TOTAL A PAGAR</th>
              <th>Estado Actual</th>
              <th className="no-print">Acción</th>
            </tr>
          </thead>
          <tbody>
            {repairs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  No hay reparaciones registradas en esta fecha.
                </td>
              </tr>
            ) : (
              repairs.map(r => {
                const isLocked = r.status === 'Entregado bueno' || r.status === 'Entregado malo';
                const canEdit = user?.role === 'admin' || !isLocked;
                
                return (
                 <tr key={r.id}>
                  <td><strong>{r.codigo}</strong></td>
                  <td>{r.cliente}<br/><span style={{fontSize: '0.8rem', color: '#64748B'}}>{r.telefono}</span></td>
                  <td>{r.modelo}</td>
                  <td>RD$ {formatMoney(getTotalCosto(r))}</td>
                  <td>
                    <span className={statusClass(r.status)}>{r.status}</span>
                  </td>
                  <td className="no-print">
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

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }} className="no-print">
         <button className="btn btn-secondary" onClick={exportData}>
            Exportar DB (Backup Supabase)
         </button>
         <button className="btn btn-primary" onClick={() => window.print()}>
            Imprimir Reporte (Cuadre)
         </button>
      </div>

      {rejectPromptId && (
        <RejectModal 
          onConfirm={(nota) => handleStatusChange(rejectPromptId, 'Entregado malo', nota)}
          onCancel={() => {
            setRejectPromptId(null);
            loadRepairs(); 
          }}
        />
      )}
    </div>
  );
}

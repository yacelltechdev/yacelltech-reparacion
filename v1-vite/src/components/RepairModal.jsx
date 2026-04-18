import React, { useState } from 'react';
import PatternLock from './PatternLock';
import PrintTicket from './PrintTicket';
import { formatMoney, getTotalCosto } from '../utils';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function RepairModal({ repair, onClose }) {
  const { user } = useAuth();
  const [isPrinting, setIsPrinting] = useState(false);
  const [addingCargo, setAddingCargo] = useState(false);
  const [cargoDesc, setCargoDesc] = useState('');
  const [cargoMonto, setCargoMonto] = useState('');
  const [tempUpdate, setTempUpdate] = useState(0);

  if (!repair) return null;

  const handleAddCargo = async (e) => {
     e.preventDefault();
     if (!cargoDesc.trim() || !cargoMonto) return;
     const nuevoCargo = {
        id: Date.now(),
        desc: cargoDesc.trim(),
        monto: Number(cargoMonto)
     };
     const updatedCargos = repair.cargosAdicionales ? [...repair.cargosAdicionales, nuevoCargo] : [nuevoCargo];
     
     // Usamos el API Shared
     await api.updateRepair(repair.id, { cargosAdicionales: updatedCargos });
     
     repair.cargosAdicionales = updatedCargos;
     setAddingCargo(false);
     setCargoDesc('');
     setCargoMonto('');
     setTempUpdate(u => u + 1);
  };

  const handleReprint = () => {
     setIsPrinting(true);
     document.body.classList.add('force-ticket-print');
     setTimeout(() => {
        window.print();
        document.body.classList.remove('force-ticket-print');
        setIsPrinting(false);
     }, 300);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(2px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Detalles - Orden: <span style={{color: '#DC2626'}}>{repair.codigo}</span></h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748B', padding: 0, lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
           <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
             <strong style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '5px', textTransform: 'uppercase' }}>Datos del Cliente</strong>
             <div style={{ fontWeight: 'bold', color: '#0F172A' }}>{repair.cliente}</div>
             <div style={{ fontSize: '13px', color: '#334155' }}>Tel: {repair.telefono}</div>
             {repair.cedula && <div style={{ fontSize: '13px', color: '#334155' }}>Cédula: {repair.cedula}</div>}
           </div>
           <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
             <strong style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '5px', textTransform: 'uppercase' }}>Equipo Recibido</strong>
             <div style={{ fontWeight: 'bold', color: '#0F172A' }}>{repair.marca} {repair.modelo}</div>
             <div style={{ fontSize: '13px', color: '#334155' }}>Color: {repair.color || 'N/A'} | IMEI: {repair.serie || 'N/A'}</div>
             <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}><strong>Estado Inicial:</strong> {repair.estadoInicial || 'No especificado'}</div>
             {repair.tecnico && <div style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold', marginTop: '6px' }}>🛠️ Técnico Asignado: {repair.tecnico}</div>}
           </div>
        </div>

         <div style={{ display: 'grid', gridTemplateColumns: repair.observacion ? '1fr 1fr' : '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
           <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <strong style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>Causa o Síntoma Reportado</strong>
              <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#1E293B', fontWeight: 'bold' }}>{repair.sintoma}</p>
           </div>
           {repair.observacion && (
             <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <strong style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>Observaciones Técnicas / Recepción</strong>
                <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#475569', fontStyle: 'italic' }}>{repair.observacion}</p>
             </div>
           )}
         </div>
 
         {/* CHECKLIST DE ENTRADA */}
         <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
           <strong style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '10px', textTransform: 'uppercase' }}>Revisión de Entrada (Checklist)</strong>
           {repair.estadoInicial === 'Encendido' ? (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
               {repair.checklist && Object.entries(repair.checklist).map(([key, value]) => (
                 <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                   <span>{value ? '✅' : '❌'}</span>
                   <span style={{ fontWeight: '600', textTransform: 'capitalize', color: '#1E293B' }}>
                     {key === 'faceid' ? 'FaceID' : 
                      key === 'camara' ? 'Cámara' : 
                      key === 'senal' ? 'Señal' : 
                      key === 'microfono' ? 'Micrófono' : 
                      key === 'flash' ? 'Flash/Luz' : 
                      key}
                   </span>
                 </div>
               ))}
               {!repair.checklist && <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#64748B' }}>Este equipo no tiene checklist registrado.</div>}
             </div>
           ) : (
             <div style={{ textAlign: 'center', padding: '10px', color: '#991B1B', fontWeight: 'bold', fontSize: '13px', background: '#FEF2F2', borderRadius: '6px' }}>
               🚫 Equipo recibido APAGADO. No se realizó revisión previa.
             </div>
           )}
         </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
           <div style={{ background: '#FEF2F2', padding: '20px', borderRadius: '8px', border: '2px solid #FECACA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
             <strong style={{ fontSize: '12px', color: '#991B1B', textTransform: 'uppercase', marginBottom: '15px', letterSpacing: '1px' }}>Seguridad</strong>
             {repair.tipoClave === 'sin clave' && <div style={{ color: '#991B1B', fontWeight: 'bold', fontStyle: 'italic' }}>Desbloqueado</div>}
             {repair.tipoClave === 'texto' && (
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '11px', color: '#7F1D1D', marginBottom: '5px' }}>PIN / CONTRASEÑA:</div>
                 <div style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold', color: '#7F1D1D', letterSpacing: '2px', background: '#fff', padding: '5px 15px', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
                   {repair.claveTexto}
                 </div>
               </div>
             )}
             {repair.tipoClave === 'patron' && <PatternLock pattern={repair.patronArray || []} size={110} readOnly={true} />}
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ background: '#F0FDF4', padding: '20px', borderRadius: '8px', border: '2px solid #BBF7D0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
               <strong style={{ fontSize: '12px', color: '#166534', textTransform: 'uppercase', marginBottom: '8px' }}>Total a Pagar</strong>
               <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803D' }}>RD$ {formatMoney(getTotalCosto(repair))}</div>
               
               {repair.cargosAdicionales && repair.cargosAdicionales.length > 0 && (
                 <div style={{ width: '100%', marginTop: '10px', fontSize: '11px', color: '#166534', background: '#DCFCE7', padding: '8px', borderRadius: '4px' }}>
                   <strong>Desglose:</strong>
                   <ul style={{ margin: '5px 0 0 0', paddingLeft: '15px' }}>
                     <li>Recepción: RD$ {formatMoney(repair.costo)}</li>
                     {repair.cargosAdicionales.map(c => (
                        <li key={c.id}>{c.desc}: RD$ {formatMoney(c.monto)}</li>
                     ))}
                   </ul>
                 </div>
               )}
               
               {(!repair.status.includes('Entregado') || user?.role === 'admin') && (
                 <button onClick={() => setAddingCargo(true)} style={{ marginTop: '10px', fontSize: '10px', padding: '4px 8px', background: '#fff', border: '1px solid #86EFAC', borderRadius: '4px', color: '#166534', cursor: 'pointer' }}>+ Añadir Cargo</button>
               )}
             </div>
             <div style={{ background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #E2E8F0', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <strong style={{ display: 'block', fontSize: '11px', color: '#64748B', marginBottom: '5px', textTransform: 'uppercase' }}>Estado Actual</strong>
               <div style={{ fontSize: '16px', fontWeight: 'bold', color: repair.status.includes('bueno') ? '#10B981' : repair.status.includes('malo') ? '#EF4444' : '#F59E0B' }}>
                 {repair.status}
               </div>
             </div>
           </div>
        </div>

        {addingCargo && (
          <div style={{ marginBottom: '1.5rem', background: '#F8FAFC', padding: '15px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
             <strong style={{ display: 'block', fontSize: '12px', color: '#334155', marginBottom: '10px' }}>Añadir Cargo Adicional</strong>
             <form onSubmit={handleAddCargo} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
               <input type="text" placeholder="Concepto (Ej: Batería)" value={cargoDesc} onChange={e=>setCargoDesc(e.target.value)} required style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
               <input type="number" placeholder="RD$" value={cargoMonto} onChange={e=>setCargoMonto(e.target.value)} required style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
               <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>Guardar</button>
               <button type="button" className="btn btn-secondary" onClick={()=>setAddingCargo(false)} style={{ padding: '8px 12px' }}>Cancelar</button>
             </form>
          </div>
        )}

        {repair.status === 'Entregado malo' && repair.notaDevolucion && (
          <div style={{ marginBottom: '1.5rem', background: '#FEF2F2', padding: '15px', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
             <strong style={{ display: 'block', fontSize: '11px', color: '#991B1B', marginBottom: '8px', textTransform: 'uppercase' }}>Razón de Devolución Sin Reparar</strong>
             <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#7F1D1D' }}>{repair.notaDevolucion}</p>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleReprint} 
            disabled={isPrinting}
            style={{ padding: '0.75rem 1.5rem', background: '#4F46E5', gap: '0.5rem', display: 'flex', alignItems: 'center' }}
          >
             🖨️ Reimprimir Ticket
          </button>
          
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.75rem 1.5rem' }}>
            Cerrar Ventana
          </button>
        </div>

        {isPrinting && (
           <div className="print-only">
             <PrintTicket repair={repair} copies={1} />
           </div>
        )}
      </div>
    </div>
  );
}

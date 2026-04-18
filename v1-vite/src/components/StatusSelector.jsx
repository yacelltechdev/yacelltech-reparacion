import { getSelectStyle } from '../utils';
import { useAuth } from '../AuthContext';

export default function StatusSelector({ status, canEdit, onChange }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isCaja = user?.role === 'caja' || user?.role === 'admin'; // Admin can also do caja work
  const isTech = user?.role === 'tech' || user?.role === 'admin';
  
  const activeStatuses = ['En reparación', 'Listo para entregar', 'No se pudo reparar'];

  if (!activeStatuses.includes(status)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div style={{ ...getSelectStyle(status, false), display: 'inline-block', padding: '0.4rem 0.8rem', textAlign: 'center' }}>
          {status}
        </div>
        {isAdmin && (
          <button 
            onClick={() => onChange('En reparación')} 
            title="Revertir a En reparación"
            style={{ padding: '0.3rem 0.5rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', color: '#64748B' }}
          >
            ↻ Revertir
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '150px' }}>
      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }}>Estado Actual: {status}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
        {status === 'En reparación' && isTech && (
           <>
              <button onClick={() => onChange('Listo para entregar')} style={{ ...getSelectStyle('Listo para entregar', canEdit), fontSize: '11px' }}>✔ Listo para entregar</button>
              <button onClick={() => onChange('No se pudo reparar')} style={{ ...getSelectStyle('No se pudo reparar', canEdit), fontSize: '11px' }}>✖ No se pudo reparar</button>
           </>
        )}
        {(status === 'Listo para entregar' || status === 'No se pudo reparar') && (
           <>
              {isCaja ? (
                <>
                  {/* Si está Listo o soy Admin, puedo Entregar Bueno */}
                  {(status === 'Listo para entregar' || isAdmin) && (
                    <button onClick={() => onChange('Entregado bueno')} style={{ ...getSelectStyle('Entregado bueno', canEdit), fontSize: '11px' }}>
                      💰 Entregar y Cobrar (Reparado)
                    </button>
                  )}
                  {/* Si No se pudo o soy Admin, puedo Entregar Malo */}
                  {(status === 'No se pudo reparar' || isAdmin) && (
                    <button onClick={() => onChange('Entregado malo')} style={{ ...getSelectStyle('Entregado malo', canEdit), fontSize: '11px' }}>
                      📦 Entregar Sin Reparación
                    </button>
                  )}
                  {/* Opción para que caja pueda devolver a reparación si hubo un error */}
                  <br/>
                  <button onClick={() => onChange('En reparación')} style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '4px', fontSize: '10px', color: '#64748B', cursor: 'pointer' }}>
                    Revertir a taller
                  </button>
                </>
              ) : (
                <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#64748B' }}>Esperando a que Caja despache...</div>
              )}
           </>
        )}
      </div>
    </div>
  );
}

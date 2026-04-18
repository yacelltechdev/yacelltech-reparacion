import React, { useState, useEffect } from 'react';
import { getNextCode } from '../db';
import { api } from '../api';
import { Save } from 'lucide-react';
import PrintTicket from './PrintTicket';
import PatternLock from './PatternLock';

export default function RepairForm() {
  const [form, setForm] = useState({
    cliente: '',
    cedula: '',
    telefono: '',
    marca: '',
    modelo: '',
    color: '',
    serie: '',
    sintoma: '',
    costo: '',
    claveTexto: '',
    status: 'En reparación',
    tecnico: 'Oscar',
    estadoInicial: 'Encendido',
    observacion: '',
    checklist: {
      camara: null,
      faceid: null,
      bocinas: null,
      microfono: null,
      botones: null,
      carga: null,
      flash: null,
      senal: null
    }
  });
  const [pattern, setPattern] = useState([]);
  const [codigoActual, setCodigoActual] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [latestRepair, setLatestRepair] = useState(null);

  const [models, setModels] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [colores, setColores] = useState([]);

  useEffect(() => {
    loadNextCode();
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    const [m, brand, col] = await Promise.all([
      api.getCatalog('models'),
      api.getCatalog('marcas'),
      api.getCatalog('colores')
    ]);
    setModels(m);
    setMarcas(brand);
    setColores(col);
  };

  const loadNextCode = async () => {
    const code = await getNextCode();
    setCodigoActual(code);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckChange = (item) => {
    setForm({
      ...form,
      checklist: {
        ...form.checklist,
        [item]: form.checklist[item] === true ? false : (form.checklist[item] === false ? true : true)
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.estadoInicial === 'Encendido') {
        const incomplete = Object.values(form.checklist).some(v => v === null);
        if (incomplete) {
          alert("Por favor, complete todos los puntos de la revisión inicial antes de continuar.");
          return;
        }
      }

      if (form.marca && form.marca.trim() !== '') {
        await api.addToCatalog('marcas', form.marca.trim());
      }
      if (form.modelo && form.modelo.trim() !== '') {
        await api.addToCatalog('models', form.modelo.trim());
      }
      if (form.color && form.color.trim() !== '') {
        await api.addToCatalog('colores', form.color.trim());
      }

      const repairBody = {
        ...form,
        codigo: codigoActual,
        patronArray: form.tipoClave === 'patron' ? pattern : [],
        costo: Number(form.costo) || 0,
        fecha: new Date().toISOString()
      };

      const res = await api.addRepair(repairBody);
      setLatestRepair({ id: res.id, ...repairBody });
      
      setForm({
        cliente: '',
        cedula: '',
        telefono: '',
        marca: '',
        modelo: '',
        color: '',
        serie: '',
        sintoma: '',
        costo: '',
        tipoClave: 'sin clave',
        claveTexto: '',
        status: 'En reparación',
        tecnico: 'Oscar',
        estadoInicial: 'Encendido',
        observacion: '',
        checklist: {
          camara: null,
          faceid: null,
          bocinas: null,
          microfono: null,
          botones: null,
          carga: null,
          flash: null,
          senal: null
        }
      });
      setPattern([]);
      loadNextCode();
      loadCatalogs();

      setIsPrinting(true);
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 500);

    } catch (error) {
      console.error("Error al guardar: ", error);
      alert("Ocurrió un error al guardar.");
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Recepción de Equipo</h2>
        <div style={{ background: '#EEF2FF', color: '#4F46E5', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold' }}>
          {codigoActual}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="no-print">
        
        {/* Fila 1: Cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Cliente</label>
            <input name="cliente" value={form.cliente} onChange={handleChange} required placeholder="Nombre completo" />
          </div>
          <div className="form-group">
            <label>Cédula</label>
            <input name="cedula" value={form.cedula} onChange={handleChange} required placeholder="000-0000000-0" />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange} required placeholder="809-XXX-XXXX" />
          </div>
        </div>

        {/* Fila 2: Equipo y Técnico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          <div className="form-group">
            <label>Técnico (Asignado)</label>
            <select name="tecnico" value={form.tecnico} onChange={handleChange} required style={{ width: '100%', padding: '0.675rem', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
              <option value="Oscar">Oscar</option>
              <option value="Carlos">Carlos</option>
              <option value="Freddy">Freddy</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado Inicial</label>
            <select name="estadoInicial" value={form.estadoInicial} onChange={handleChange} required style={{ width: '100%', padding: '0.675rem', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
              <option value="Encendido">Encendido</option>
              <option value="Apagado">Apagado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Marca</label>
            <input name="marca" value={form.marca} onChange={handleChange} required list="marca-suggestions" placeholder="Ej. Apple, Samsung" />
            <datalist id="marca-suggestions">
              {marcas.map(m => (<option key={m.id} value={m.nombre} />))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Modelo</label>
            <input name="modelo" value={form.modelo} onChange={handleChange} required list="model-suggestions" placeholder="Ej. iPhone 13" />
            <datalist id="model-suggestions">
              {models.map(m => (<option key={m.id} value={m.nombre} />))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Color</label>
            <input name="color" value={form.color} onChange={handleChange} list="color-suggestions" placeholder="Ej. Negro" />
            <datalist id="color-suggestions">
              {colores.map(c => (<option key={c.id} value={c.nombre} />))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Serie / IMEI (Opcional)</label>
            <input name="serie" value={form.serie} onChange={handleChange} placeholder="Número de serie" />
          </div>
        </div>

        {/* Fila 3: Seguridad Didáctica */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', background: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Contraseña o Patrón</label>
            <select name="tipoClave" value={form.tipoClave} onChange={handleChange} style={{ background: '#fff' }}>
              <option value="sin clave">Ninguna / Desbloqueado</option>
              <option value="texto">PIN / Contraseña Normal</option>
              <option value="patron">Patrón Visual</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: '80px' }}>
            {form.tipoClave === 'texto' && (
              <div className="form-group" style={{ marginBottom: 0, width: '100%' }}>
                <input name="claveTexto" value={form.claveTexto} onChange={handleChange} required placeholder="Escriba la clave ej: 1234 o 'Yacelltech'" style={{ background: '#fff' }} />
              </div>
            )}
            {form.tipoClave === 'patron' && (
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <PatternLock pattern={pattern} onChange={setPattern} size={120} />
                <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
                  Dibuje el patrón directamente en la cuadrícula uniendo los puntos.<br/>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', marginTop: '0.5rem', fontSize: '0.75rem' }} onClick={() => setPattern([])}>
                    Borrar Patrón
                  </button>
                </div>
              </div>
            )}
            {form.tipoClave === 'sin clave' && (
              <div style={{ color: '#64748B', fontSize: '0.875rem', fontStyle: 'italic' }}>El equipo está desbloqueado o sin seguridad.</div>
            )}
          </div>
        </div>

        {/* Fila Checklist Inicial */}
        {form.estadoInicial === 'Encendido' ? (
          <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
            <label style={{ marginBottom: '1rem', display: 'block', fontSize: '1rem', fontWeight: 'bold', color: '#1E293B' }}>
              📋 Revisión Previa (Checklist Inicial) - <span style={{ color: '#DC2626', fontSize: '0.8rem' }}>Requerido</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
              {Object.keys(form.checklist).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleCheckChange(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: form.checklist[item] === null ? '#CBD5E1' : (form.checklist[item] ? '#10B981' : '#EF4444'),
                    backgroundColor: form.checklist[item] === null ? '#F8FAFC' : (form.checklist[item] ? '#ECFDF5' : '#FEF2F2'),
                    color: form.checklist[item] === null ? '#64748B' : (form.checklist[item] ? '#065F46' : '#991B1B'),
                    cursor: 'pointer',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.8rem' }}>
                    {item === 'faceid' ? 'FaceID' : 
                     item === 'senal' ? 'Señal' : 
                     item === 'camara' ? 'Cámara' : 
                     item === 'microfono' ? 'Micrófono' : 
                     item === 'flash' ? 'Flash/Luz' : 
                     item}
                  </span>
                  <span>{form.checklist[item] === null ? '❓' : (form.checklist[item] ? '✅' : '❌')}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '1rem', color: '#991B1B', textAlign: 'center', fontWeight: 'bold' }}>
            ⚠️ EL EQUIPO RECIBIDO ESTÁ APAGADO. SE OMITIRÁ LA REVISIÓN INICIAL.
          </div>
        )}

        {/* Fila 4: Detalles Fijos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label>Síntoma / Problema reportado</label>
            <textarea name="sintoma" value={form.sintoma} onChange={handleChange} rows="3" required placeholder="Detalles precisos sobre el problema del equipo..."></textarea>
          </div>
          <div className="form-group">
            <label>Observación</label>
            <textarea name="observacion" value={form.observacion} onChange={handleChange} rows="3" placeholder="Ej: Pantalla astillada, rayones..."></textarea>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Costo Estimado / Precio (RD$)</label>
            <input type="number" name="costo" value={form.costo} onChange={handleChange} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Estado Inicial</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="En reparación">En reparación (Entra a la bandeja)</option>
              <option value="Entregado bueno">Entregado bueno (Ya reparado)</option>
              <option value="Entregado malo">Entregado malo (Sin solución)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={20} /> Generar Ticket y Recibir Equipo
          </button>
        </div>
      </form>

      {/* Vista de Impresión oculta */}
      {latestRepair && (
        <div className="print-only">
           <PrintTicket repair={latestRepair} copies={2} />
        </div>
      )}
    </div>
  );
}

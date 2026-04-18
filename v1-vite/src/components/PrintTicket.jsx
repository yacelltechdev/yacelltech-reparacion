import React from 'react';
import PatternLock from './PatternLock';
import { formatDate, formatMoney, getTotalCosto } from '../utils';

export default function PrintTicket({ repair, copies = 2 }) {
  const tickets = Array.from({ length: copies });

  return (
    <div className="ticket-wrapper">
      {tickets.map((_, index) => (
        <div key={index} className="ticket" style={{ display: 'flex', flexDirection: 'column', padding: '10mm 15mm 15mm 15mm' }}>
          
          <div style={{ border: '2px solid #000', borderRadius: '12px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', borderBottom: '2px solid #000', padding: '20px' }}>
              <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <img src="/logo.png" alt="YACELLTECH" style={{ maxWidth: '160px', maxHeight: '65px', marginBottom: '12px' }} />
                <div style={{ fontSize: '11px', color: '#1E293B', lineHeight: '1.5' }}>
                  <div><strong>💬 WhatsApp:</strong> (829) 266-0404 <span style={{fontSize: '9px', fontWeight: 'bold'}}>(SOLO MENSAJES, NO LLAMADAS)</span> 🙅🏻‍♂️📲</div>
                  <div><strong>🛒 L-S:</strong> 8AM - 7:30PM | <strong>D:</strong> 8AM - 3PM</div>
                  <div><strong>📍</strong> Calle Duarte esquina Dr. Teofilo ferry #54<br/>La Romana, Dominican Republic 22000</div>
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1E293B', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Orden de Servicio
                </h1>
                <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
                  <strong>Orden No.:</strong> <span style={{ fontSize: '18px', color: '#DC2626', fontWeight: 'bold' }}>{repair.codigo}</span><br />
                  <strong>Fecha:</strong> {formatDate(repair.fecha)}<br />
                  <strong>Estado Inicial:</strong> <span style={{ fontWeight: 'bold', color: repair.estadoInicial === 'Encendido' ? '#166534' : '#991B1B' }}>{repair.estadoInicial}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              
              {/* DATOS DEL CLIENTE */}
              <div style={{ border: '1px solid #94A3B8', borderRadius: '8px', marginBottom: '15px', overflow: 'hidden' }}>
                <div style={{ background: '#F1F5F9', borderBottom: '1px solid #94A3B8', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: '#334155' }}>
                  Datos del Cliente
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', fontSize: '14px' }}>
                  <div><strong>Nombre/Razón:</strong> {repair.cliente}</div>
                  <div><strong>Teléfono:</strong> {repair.telefono}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Cédula/RNC:</strong> {repair.cedula || 'No especificada'}</div>
                </div>
              </div>

              {/* DATOS DEL EQUIPO & SEGURIDAD */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div style={{ border: '1px solid #94A3B8', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#F1F5F9', borderBottom: '1px solid #94A3B8', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: '#334155' }}>
                    Descripción del Equipo
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', fontSize: '13px' }}>
                    <div><strong>Marca:</strong> {repair.marca}</div>
                    <div><strong>Modelo:</strong> {repair.modelo}</div>
                    <div><strong>Color:</strong> {repair.color || 'N/A'}</div>
                    <div><strong>Serie/IMEI:</strong> {repair.serie || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ border: '1px solid #94A3B8', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#F1F5F9', borderBottom: '1px solid #94A3B8', padding: '6px 12px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', textAlign: 'center', color: '#334155' }}>
                    Seguridad
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', height: 'calc(100% - 31px)' }}>
                    {repair.tipoClave === 'sin clave' && <span style={{ fontWeight: 'bold', color: '#1E293B', fontSize: '14px' }}>SIN CONTRASEÑA</span>}
                    {repair.tipoClave === 'texto' && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0', fontSize: '11px', color: '#64748B' }}>PIN / CLAVE:</p>
                        <p style={{ margin: '2px 0 0 0', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px' }}>{repair.claveTexto}</p>
                      </div>
                    )}
                    {repair.tipoClave === 'patron' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-5px' }}>
                        <PatternLock pattern={repair.patronArray || []} size={70} readOnly={true} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SINTOMA Y OBSERVACION */}
              <div style={{ display: 'grid', gridTemplateColumns: repair.observacion ? '1fr 1fr' : '1fr', gap: '15px', marginBottom: '15px', flexGrow: 1 }}>
                <div style={{ border: '1px solid #94A3B8', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: '#F1F5F9', borderBottom: '1px solid #94A3B8', padding: '6px 12px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Problema Reportado</span>
                  </div>
                  <div style={{ padding: '12px', fontSize: '18px', fontWeight: 'bold', lineHeight: '1.4', color: '#1E293B', flexGrow: 1 }}>
                    {repair.sintoma}
                  </div>
                </div>

                {repair.observacion && (
                  <div style={{ border: '1px solid #94A3B8', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: '#F1F5F9', borderBottom: '1px solid #94A3B8', padding: '6px 12px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Observación</span>
                    </div>
                    <div style={{ padding: '12px', fontSize: '16px', lineHeight: '1.4', color: '#444', flexGrow: 1, fontStyle: 'italic', fontWeight: '500' }}>
                      {repair.observacion}
                    </div>
                  </div>
                )}
              </div>
 
              {/* CHECKLIST INICIAL */}
              <div style={{ border: '1px solid #94A3B8', borderRadius: '8px', marginBottom: '15px', overflow: 'hidden' }}>
                <div style={{ background: '#F1F5F9', borderBottom: '1px solid #94A3B8', padding: '4px 12px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', color: '#334155' }}>
                  Revisión Inicial de Funciones
                </div>
                {repair.estadoInicial === 'Encendido' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '10px 12px', fontSize: '12px' }}>
                    {Object.entries(repair.checklist || {}).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px' }}>{value ? '✅' : '❌'}</span>
                        <span style={{ fontWeight: '600', textTransform: 'capitalize', color: '#334155' }}>
                          {key === 'faceid' ? 'FaceID' : 
                           key === 'camara' ? 'Cámara' : 
                           key === 'senal' ? 'Señal' : 
                           key === 'microfono' ? 'Micrófono' : 
                           key === 'flash' ? 'Flash/Luz' : 
                           key}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', fontSize: '13px', color: '#991B1B', fontWeight: '900', background: '#FEF2F2' }}>
                    ⚠️ EQUIPO RECIBIDO APAGADO - NO SE PUDO REALIZAR REVISIÓN INICIAL
                  </div>
                )}
              </div>

              {/* TOTAL A PAGAR */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <div style={{ width: '250px', border: '2px solid #000', borderRadius: '8px', padding: '10px 15px', background: '#FEF2F2', textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#991B1B', textTransform: 'uppercase' }}>Total a Pagar</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#DC2626', marginTop: '2px' }}>
                    RD$ {formatMoney(getTotalCosto(repair))}
                  </div>
                  {repair.cargosAdicionales && repair.cargosAdicionales.length > 0 && (
                    <div style={{ marginTop: '5px', fontSize: '10px', color: '#7F1D1D', textAlign: 'right', borderTop: '1px solid #FCA5A5', paddingTop: '5px' }}>
                      Costo Inicial: RD$ {formatMoney(repair.costo)}<br/>
                      {repair.cargosAdicionales.map(c => (
                        <div key={c.id}>
                          + {c.desc}: RD$ {formatMoney(c.monto)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            <div style={{ padding: '0 20px 10px 20px', fontSize: '16px', color: '#1E293B' }}>
              <strong>👷 Técnico Asignado:</strong> <span style={{ fontSize: '20px', textTransform: 'uppercase', fontWeight: '900' }}>{repair.tecnico}</span>
            </div>

            {/* TERMINOS Y CONDICIONES (GARANTÍA) */}
            <div style={{ padding: '0 20px 20px 20px', fontSize: '10px', lineHeight: '1.4', color: '#475569', textAlign: 'justify' }}>
              <strong>TÉRMINOS Y GARANTÍA:</strong> Después de 15 días no somos responsables de equipos dejados en el taller; luego de este tiempo el equipo será asumido para cubrir gastos incurridos en dicha reparación. Sin factura no hay reclamaciones ni se le entregará el equipo (pagar a la hora de recibir su equipo). No somos responsables de ninguna Sim Card o Memoria SD dejada en el dispositivo.
              <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 'bold', color: '#1E293B' }}>
                No somos responsables de problemas ocultos distintos a los que se reportaron al momento de entregar el equipo en mostrador.
              </div>
            </div>

            {/* FIRMAS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px 30px 40px', marginTop: 'auto' }}>
              <div style={{ width: '40%', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '6px', fontSize: '12px', color: '#1E293B' }}>
                <strong>Firma y Cédula (Cliente)</strong><br/>
                <span style={{ fontSize: '10px', color: '#64748B' }}>Acepto las condiciones detalladas</span>
              </div>
              <div style={{ width: '40%', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '6px', fontSize: '12px', color: '#1E293B' }}>
                <strong>YACELLTECH</strong><br/>
                <span style={{ fontSize: '10px', color: '#64748B' }}>Recibido conforme</span>
              </div>
            </div>

            {/* MARCA DE AGUA INFERIOR */}
            <div style={{ borderTop: '2px solid #000', background: '#f1f5f9', color: '#000', textAlign: 'center', padding: '8px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
               COPIA DE {index === 0 ? 'CLIENTE / COMPROBANTE DE RECEPCIÓN' : 'TALLER / USO INTERNO'}
            </div>

          </div>
        </div>
      </div>
    ))}
  </div>
  );
}

// Configuración de variables de entorno seguras para entorno de test
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.yacelltech.local';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key-test-only';
}

import assert from 'node:assert/strict';
import {
  calculateTotalCost,
  computeVersionHash,
  sanitizeRepair,
  validateBusinessRules,
} from '../src/lib/mcp/validation';
import { sanitizeSnapshot } from '../src/lib/mcp/audit';
import { createYacelltechMcpServer } from '../src/lib/mcp/server';
import { Repair } from '../src/lib/types';

// Mock repair para pruebas unitarias sin tocar la base de datos de producción
const mockRepair: Repair = {
  id: 125,
  codigo: 'REP-00125',
  cliente: 'Juan Perez',
  cedula: '402-1234567-8',
  telefono: '809-555-0100',
  marca: 'Apple',
  modelo: 'iPhone 12',
  color: 'Negro',
  serie: 'F17D9890XXXX',
  sintoma: 'No enciende',
  costo: 2500,
  claveTexto: 'password_super_secreto_123',
  tipoClave: 'texto',
  status: 'En reparación',
  tecnico: 'Freddy',
  estadoInicial: 'Apagado',
  observacion: 'Equipo mojado',
  fecha: '2026-11-05T10:00:00',
  checklist: { encendido: false, carga: false },
  patronArray: [1, 2, 3],
  cargosAdicionales: [{ id: 1, desc: 'Revisión inicial', monto: 200 }],
  tipoPantalla: 'OLED',
  trabajoARealizar: 'Cambio de pantalla y batería',
  esChequeo: false,
};

async function runTests() {
  console.log('🧪 Iniciando pruebas unitarias del Servidor MCP...');

  // Test 1: calculateTotalCost
  console.log('1. Probando cálculo de costo total...');
  const total = calculateTotalCost(mockRepair);
  assert.equal(total, 2700, 'El costo total debe ser costo base (2500) + cargos adicionales (200) = 2700');

  const totalConNuevoCargo = calculateTotalCost({
    costo: 1800,
    cargosAdicionales: [
      { id: 1, desc: 'Cargo 1', monto: 300 },
      { id: 2, desc: 'Cargo 2', monto: 150 },
    ],
  });
  assert.equal(totalConNuevoCargo, 2250, 'El costo total debe ser 1800 + 300 + 150 = 2250');
  console.log('   ✅ calculateTotalCost pasó correctamente');

  // Test 2: sanitizeRepair (no filtrar claves al cliente o AI)
  console.log('2. Probando sanitización de datos sensibles...');
  const sanitized = sanitizeRepair(mockRepair);
  assert.equal('claveTexto' in sanitized, false, 'claveTexto no debe estar presente en el objeto sanitizado');
  assert.equal('patronArray' in sanitized, false, 'patronArray no debe estar presente en el objeto sanitizado');
  assert.equal(sanitized.tieneClaveTexto, true, 'debe indicar que tiene clave texto sin exponerla');
  assert.equal(sanitized.tienePatronArray, true, 'debe indicar que tiene patrón sin exponerlo');
  assert.equal(sanitized.costoTotal, 2700);

  const snapshotSanitizado = sanitizeSnapshot(mockRepair);
  assert.equal(snapshotSanitizado?.claveTexto, '[PROTEGIDO]', 'En el snapshot de auditoría debe guardarse [PROTEGIDO]');
  assert.equal(snapshotSanitizado?.patronArray, '[PATRON_PROTEGIDO]', 'En el snapshot debe guardarse [PATRON_PROTEGIDO]');
  console.log('   ✅ sanitizeRepair y sanitizeSnapshot pasaron correctamente');

  // Test 3: computeVersionHash (concurrencia optimista)
  console.log('3. Probando generación de hash de concurrencia optimista...');
  const hash1 = computeVersionHash(mockRepair);
  const hash2 = computeVersionHash(mockRepair);
  assert.equal(hash1, hash2, 'El hash para la misma reparación debe ser determinista');

  const modified = { ...mockRepair, costo: 3000 };
  const hash3 = computeVersionHash(modified);
  assert.notEqual(hash1, hash3, 'El hash debe cambiar cuando se modifica un campo relevante');
  console.log('   ✅ computeVersionHash pasó correctamente');

  // Test 4: validateBusinessRules - Bloqueo de campos prohibidos
  console.log('4. Probando validación de campos inmutables y reglas de negocio...');
  const checkForbidden = validateBusinessRules(mockRepair, {
    codigo: 'REP-99999',
    id: 999,
    fecha: '2026-01-01',
  });
  assert.equal(checkForbidden.valid, false, 'Debe rechazar modificaciones a campos inmutables');
  assert.ok(
    checkForbidden.errors.some((e) => e.includes('codigo')),
    'Debe señalar error en campo codigo'
  );

  // Test 5: validateBusinessRules - Transición ilegal de estado a despachado
  const checkDispatchInvalid = validateBusinessRules(mockRepair, {
    status: 'Despachado bueno',
  });
  assert.equal(
    checkDispatchInvalid.valid,
    false,
    'No se puede despachar directamente desde "En reparación" sin pasar por "Entregado a recepción"'
  );
  assert.ok(
    checkDispatchInvalid.errors.some((e) => e.includes('Entregado a recepción')),
    'El error debe explicar la regla de Entregado a recepción'
  );

  // Test 6: validateBusinessRules - Transición válida
  const repairEnRecepcion: Repair = { ...mockRepair, status: 'Entregado a recepción' };
  const checkDispatchValid = validateBusinessRules(repairEnRecepcion, {
    status: 'Despachado bueno',
  });
  assert.equal(checkDispatchValid.valid, true, 'Debe permitir despachar si ya está en "Entregado a recepción"');

  // Test 7: validateBusinessRules - Costo negativo
  const checkNegativeCost = validateBusinessRules(mockRepair, {
    costo: -50,
  });
  assert.equal(checkNegativeCost.valid, false, 'Debe rechazar costos negativos');
  console.log('   ✅ validateBusinessRules pasó correctamente todas las reglas');

  // Test 8: McpServer y registro de herramientas
  console.log('5. Probando inicialización de McpServer y registro de herramientas...');
  const mcpServer = createYacelltechMcpServer();
  assert.ok(mcpServer, 'El servidor MCP debe inicializarse correctamente');
  assert.ok(mcpServer.server, 'La instancia interna de Server debe existir');
  console.log('   ✅ createYacelltechMcpServer inicializó exitosamente');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE!');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});

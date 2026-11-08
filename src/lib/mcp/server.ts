import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  actualizarReparacion,
  buscarReparaciones,
  obtenerReparacion,
  prepararCambios,
  revertirCambios,
  verificarCambios,
} from './operations';

export function createYacelltechMcpServer() {
  const server = new McpServer({
    name: 'yacelltech-reparaciones-mcp',
    version: '1.0.0',
  });

  // 1. buscar_reparacion
  server.registerTool(
    'buscar_reparacion',
    {
      title: 'Buscar Reparación',
      description:
        'Busca órdenes de reparación por código REP (ej. REP-00125 o 125), nombre de cliente, teléfono, modelo, marca o número de serie/IMEI. Si existen múltiples coincidencias, devuelve la lista y una advertencia para que no se seleccione ninguna automáticamente.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe('Término de búsqueda: código REP, cliente, teléfono, modelo, marca o serie/IMEI'),
        limite: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe('Cantidad máxima de resultados (por defecto 5)'),
      },
    },
    async ({ query, limite }) => {
      try {
        const resultado = await buscarReparaciones(query, limite);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultado, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error en buscar_reparacion: ${error.message}` }],
        };
      }
    }
  );

  // 2. obtener_reparacion
  server.registerTool(
    'obtener_reparacion',
    {
      title: 'Obtener Reparación',
      description:
        'Obtiene los detalles completos de una reparación por su código REP (ej. REP-00125) o ID numérico. Devuelve datos sanitizados (sin exponer credenciales sensibles de desbloqueo), desglose de costos y el version_hash requerido para control de concurrencia.',
      inputSchema: {
        id_o_codigo: z
          .union([z.string(), z.number()])
          .describe('Código REP (ej. "REP-00125") o ID numérico de la reparación'),
      },
    },
    async ({ id_o_codigo }) => {
      try {
        const resultado = await obtenerReparacion(id_o_codigo);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  reparacion: resultado.reparacion,
                  version_hash: resultado.version_hash,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error en obtener_reparacion: ${error.message}` }],
        };
      }
    }
  );

  // 3. preparar_cambios
  server.registerTool(
    'preparar_cambios',
    {
      title: 'Preparar Cambios',
      description:
        'Valida una propuesta de modificación generada a partir de una imagen o instrucción. Compara contra el estado actual, valida reglas de negocio, calcula el diff antes/después y genera un operacion_id con version_hash. NO modifica la base de datos.',
      inputSchema: {
        id_o_codigo: z
          .union([z.string(), z.number()])
          .describe('Código REP o ID de la reparación a modificar'),
        propuesta: z
          .record(z.string(), z.any())
          .describe(
            'Objeto con los campos a modificar. Ejemplo: {"modelo": "iPhone 13", "tecnico": "Carlos", "costo": 1800, "nuevoCargo": {"desc": "Batería", "monto": 300}}'
          ),
        justificacion: z
          .string()
          .optional()
          .describe('Motivo de los cambios o detalle de lo observado en la imagen/factura'),
        actor: z.string().optional().default('AI_AGENT').describe('Identificador del agente o usuario'),
      },
    },
    async ({ id_o_codigo, propuesta, justificacion, actor }) => {
      try {
        const resultado = await prepararCambios(id_o_codigo, propuesta, justificacion, actor);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultado, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error en preparar_cambios: ${error.message}` }],
        };
      }
    }
  );

  // 4. actualizar_reparacion
  server.registerTool(
    'actualizar_reparacion',
    {
      title: 'Actualizar Reparación',
      description:
        'Aplica exclusivamente los cambios validados. Requiere que aprobacion_explicita sea true, verifica concurrencia optimista contra version_hash, ejecuta la actualización atómica en base de datos e inserta el registro en el historial de auditoría.',
      inputSchema: {
        operacion_id: z
          .string()
          .uuid()
          .describe('Identificador único generado en el paso preparar_cambios'),
        id_o_codigo: z
          .union([z.string(), z.number()])
          .describe('Código REP o ID de la reparación'),
        version_hash: z
          .string()
          .describe('Hash de concurrencia devuelto por preparar_cambios u obtener_reparacion'),
        cambios_aprobados: z
          .record(z.string(), z.any())
          .describe('Objeto con los campos exactos aprobados para guardar'),
        aprobacion_explicita: z
          .boolean()
          .describe('Debe ser true tras confirmación directa del usuario.'),
        actor: z.string().optional().default('AI_AGENT').describe('Usuario o agente que autoriza'),
      },
    },
    async ({ operacion_id, id_o_codigo, version_hash, cambios_aprobados, aprobacion_explicita, actor }) => {
      try {
        const resultado = await actualizarReparacion({
          operacion_id,
          id_o_codigo,
          version_hash,
          cambios_aprobados,
          aprobacion_explicita,
          actor,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultado, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error en actualizar_reparacion: ${error.message}` }],
        };
      }
    }
  );

  // 5. verificar_cambios
  server.registerTool(
    'verificar_cambios',
    {
      title: 'Verificar Cambios',
      description:
        'Vuelve a consultar el registro en la base de datos y compara los valores guardados contra los valores esperados o los registrados en la operacion_id de auditoría. Devuelve un reporte verificable campo por campo.',
      inputSchema: {
        id_o_codigo: z
          .union([z.string(), z.number()])
          .describe('Código REP o ID de la reparación'),
        operacion_id: z
          .string()
          .uuid()
          .optional()
          .describe('ID de la operación cuyos cambios se desean comprobar'),
        campos_esperados: z
          .record(z.string(), z.any())
          .optional()
          .describe('Campos y valores que se esperan encontrar en la base de datos'),
      },
    },
    async ({ id_o_codigo, operacion_id, campos_esperados }) => {
      try {
        const resultado = await verificarCambios(id_o_codigo, operacion_id, campos_esperados);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultado, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error en verificar_cambios: ${error.message}` }],
        };
      }
    }
  );

  // 6. revertir_cambios
  server.registerTool(
    'revertir_cambios',
    {
      title: 'Revertir Cambios',
      description:
        'Restaura los valores anteriores de una reparación utilizando el snapshot del historial de auditoría de una operacion_id. Requiere aprobacion_explicita = true y evita sobrescribir cambios posteriores no relacionados.',
      inputSchema: {
        id_o_codigo: z
          .union([z.string(), z.number()])
          .describe('Código REP o ID de la reparación'),
        operacion_id: z
          .string()
          .uuid()
          .describe('ID de la operación que se desea revertir'),
        aprobacion_explicita: z
          .boolean()
          .describe('Debe ser true tras confirmación del usuario para revertir'),
        actor: z.string().optional().default('AI_AGENT').describe('Usuario o agente que autoriza'),
      },
    },
    async ({ id_o_codigo, operacion_id, aprobacion_explicita, actor }) => {
      try {
        const resultado = await revertirCambios(id_o_codigo, operacion_id, aprobacion_explicita, actor);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultado, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error en revertir_cambios: ${error.message}` }],
        };
      }
    }
  );

  return server;
}

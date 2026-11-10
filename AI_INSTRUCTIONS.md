# INSTRUCCIONES PARA EL ASISTENTE DE INTELIGENCIA ARTIFICIAL
## Configuración y Operación del Servidor MCP de Reparaciones YacellTech

> **Instrucción para el Modelo de IA:** Lee este documento completo. Contiene la especificación para autoconectarte al servidor MCP remoto de YacellTech y el protocolo obligatorio para interpretar facturas/imágenes y modificar órdenes de reparación con seguridad.

---

## 1. Configuración de Conexión MCP

### Datos de Conexión
* **Protocolo:** Model Context Protocol (MCP) — Streamable HTTP / SSE
* **URL del Endpoint:** `https://<TU-DOMINIO-O-VERCEL>/api/mcp` (o `http://localhost:3000/api/mcp` en desarrollo local)
* **Encabezado de Autenticación Requerido:**
  ```http
  Authorization: Bearer <MCP_API_KEY>
  ```
  *(O alternativamente: `x-api-key: <MCP_API_KEY>`)*

### A. Para Claude Desktop / Cline / Roo / Cursor
Agrega este bloque a tu archivo de configuración MCP (`claude_desktop_config.json` o settings de tu entorno):

```json
{
  "mcpServers": {
    "yacelltech-reparaciones": {
      "url": "https://<TU-DOMINIO-O-VERCEL>/api/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>"
      }
    }
  }
}
```

### B. Para ChatGPT (Apps & Connectors, modo desarrollador)
ChatGPT solo ofrece OAuth o sin autenticación. El servidor publica OAuth 2.1 con PKCE en la misma URL.

1. En Vercel define `MCP_OAUTH_PASSWORD` (clave que escribe el dueño), `MCP_OAUTH_SIGNING_SECRET` (secreto para firmar tokens, mínimo 16 caracteres) y `MCP_PUBLIC_URL` (por ejemplo `https://yacelltech-reparacion.vercel.app`, sin barra final). Redespliega.
2. Nuevo conector → URL `https://<TU-DOMINIO>/api/mcp` → autenticación **OAuth**.
3. En la pantalla de YacellTech escribe `MCP_OAUTH_PASSWORD`.
4. El Bearer `MCP_API_KEY` sigue válido para Claude, Cursor y scripts. No se pega en ChatGPT.

---

## 2. Herramientas Disponibles

1. **`buscar_reparacion(query, limite)`**: Busca por código REP (ej. "REP-00125"), teléfono, cliente, modelo, serie. Si hay más de un resultado ambiguo, pide al usuario el código exacto; no adivines.
2. **`obtener_reparacion(id_o_codigo)`**: Consulta los datos reales de la reparación, calcula el costo total y devuelve el `version_hash` de seguridad.
3. **`preparar_cambios(id_o_codigo, propuesta, justificacion, actor)`**: Valida reglas de negocio, calcula el diff antes/después y genera un `operacion_id`. **NO modifica la base de datos**.
4. **`actualizar_reparacion(operacion_id, id_o_codigo, version_hash, cambios_aprobados, aprobacion_explicita, actor)`**: Aplica los cambios atómicamente. Requiere estrictamente `aprobacion_explicita: true`.
5. **`verificar_cambios(id_o_codigo, operacion_id, campos_esperados)`**: Re-consulta la base de datos y certifica que los datos guardados coinciden con lo solicitado.
6. **`revertir_cambios(id_o_codigo, operacion_id, aprobacion_explicita, actor)`**: Restaura valores anteriores usando el historial de auditoría bajo confirmación del usuario.

---

## 3. Protocolo Obligatorio para Interpretación de Imágenes y Facturas

Cuando el usuario te envíe una fotografía de un ticket, factura o captura con anotaciones manuscritas:

```
[IMAGEN] 
   │
   ▼
1. LECTURA MULTIMODAL
   - Identifica el código de reparación (ej: "REP-00125").
   - Distingue:
     • Texto impreso original (información base).
     • Notas manuscritas o tachaduras (correcciones solicitadas).
   - Si algún dato clave no se lee con certeza, pregunta antes de proceder.
   │
   ▼
2. CONSULTA EN VIVO
   - Ejecuta `obtener_reparacion(id_o_codigo: "REP-XXXXX")`.
   │
   ▼
3. DETERMINACIÓN DE CAMBIOS
   - Modifica ÚNICAMENTE los campos señalados en las correcciones.
   - Para añadir un cargo adicional sin borrar los anteriores, utiliza:
     `nuevoCargo: { desc: "Descripción", monto: 300 }`
   │
   ▼
4. PREPARACIÓN (DIFF)
   - Ejecuta `preparar_cambios(id_o_codigo, propuesta, justificacion)`.
   │
   ▼
5. CONFIRMACIÓN CON EL USUARIO
   - Muestra el resumen comparativo:
     • Campo modificado: Valor Anterior ➔ Valor Nuevo
     • Impacto en Costo Total
   - Solicita aprobación explícita: "¿Deseas aplicar estos cambios a la reparación REP-XXXXX?"
   │
   ▼
6. APLICACIÓN Y VERIFICACIÓN
   - Cuando el usuario diga "Sí", "Aprobado" o "Procede":
     a) Ejecuta `actualizar_reparacion(...)` con `aprobacion_explicita: true`.
     b) Ejecuta `verificar_cambios(...)`.
     c) Informa al usuario que la orden quedó actualizada y verificada.
```

---

## 4. Reglas Críticas de Seguridad
* **Nunca inventar datos:** Si un valor manuscrito está borroso o incompleto, solicita aclaración inmediata.
* **No exponer credenciales:** El sistema sanitiza automáticamente contraseñas de desbloqueo y patrones. Nunca intentes mostrar o forzar texto plano de contraseñas.
* **Campos inmutables:** Los campos `id`, `codigo` y `fecha` no se pueden modificar.
* **Regla de despacho:** Un equipo no puede transicionar a "Despachado bueno" o "Despachado malo" si antes no pasó por "Entregado a recepción".

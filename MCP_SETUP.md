# Guía de Integración y Conexión — Servidor MCP YacellTech

Servidor MCP (Model Context Protocol) remoto para la gestión y modificación inteligente de órdenes de reparación mediante Inteligencia Artificial multimodal (ChatGPT, Codex, Claude).

---

## 1. Arquitectura y Seguridad

* **Protocolo:** MCP (Model Context Protocol) con transporte Streamable HTTP / SSE sobre estándar Web.
* **Endpoint Remoto:** `https://<TU-DOMINIO>/api/mcp` (o `http://localhost:3000/api/mcp` en desarrollo local).
* **Autenticación:** Cabecera HTTP `Authorization: Bearer <MCP_API_KEY>` o `x-api-key: <MCP_API_KEY>`. Sigue funcionando igual. ChatGPT, que solo ofrece OAuth o “sin autenticación”, usa además OAuth 2.1 con PKCE (la clave la escribe el dueño en la pantalla de autorización).
* **Protección de Datos Sensibles:** Las contraseñas, PIN y patrones de desbloqueo de los clientes nunca se devuelven en texto plano al agente ni se guardan en el historial de auditoría (se reemplazan automáticamente por `[PROTEGIDO]` / `[PATRON_PROTEGIDO]`).
* **Concurrencia Optimista:** Cada orden consultada incluye un `version_hash`. Si otro usuario en caja o taller modifica la orden mientras la IA preparaba los cambios, el servidor bloquea la actualización para evitar sobreescrituras ciegas.
* **Idempotencia:** Cada operación genera un `operacion_id` único (UUID). Solicitudes repetidas con el mismo ID no duplican cargos ni aplican cambios múltiples veces.

---

## 2. Herramientas MCP Disponibles

| Herramienta | Propósito | Reglas Clave |
| :--- | :--- | :--- |
| **`buscar_reparacion`** | Búsqueda por código REP, cliente, teléfono, serie o modelo. | Si hay múltiples coincidencias ambiguas, advierte a la IA para que NO seleccione una al azar. |
| **`obtener_reparacion`** | Consulta los datos reales de la reparación en la base de datos. | Devuelve datos sanitizados, desglose de costos y `version_hash`. |
| **`preparar_cambios`** | Valida campos, tipos y reglas de negocio. Calcula el Diff antes/después. | **No modifica la base de datos.** Genera `operacion_id` para aprobación. |
| **`actualizar_reparacion`** | Aplica los cambios aprobados atómicamente. | Exige `aprobacion_explicita = true`. Valida reglas de estado (ej: bloqueo de despacho si no pasó por recepción). Registra auditoría. |
| **`verificar_cambios`** | Re-consulta la base de datos tras la actualización. | Comprueba campo por campo que lo guardado coincide exactamente con lo solicitado. |
| **`revertir_cambios`** | Restaura valores anteriores a partir del snapshot de auditoría. | Exige `aprobacion_explicita = true` y comprueba que no existan ediciones posteriores de otros usuarios. |

---

## 3. Configuración de Variables de Entorno

En tu archivo `.env.local` (y en las variables de entorno de tu proveedor de hosting Vercel/Cloud):

```env
# Clave secreta para autorizar a clientes MCP remotos (Claude, Cursor, scripts)
MCP_API_KEY=tu_clave_secreta_mcp_super_segura_aqui

# OAuth para ChatGPT. No las pongas en el código: el repo es público.
# Clave que el dueño escribe en la pantalla de autorización.
MCP_OAUTH_PASSWORD=una_clave_larga_distinta_de_MCP_API_KEY
# Secreto para firmar los tokens (mínimo 16 caracteres). Genera uno con:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
MCP_OAUTH_SIGNING_SECRET=otro_secreto_largo_y_aleatorio
# Opcional. Fija el dominio público del emisor OAuth, sin barra final.
# Úsalo en Vercel para que el issuer no cambie entre despliegues.
MCP_PUBLIC_URL=https://yacelltech-reparacion.vercel.app
# Opcional. Hosts https extra para el retorno de OAuth, separados por comas.
# Admite *.dominio. ChatGPT y Meta (meta.ai, facebook.com, instagram.com, etc.) ya están incluidos.
# MCP_OAUTH_EXTRA_REDIRECT_HOSTS=*.otro-cliente.com, socio.example.com

# Conexión existente a Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
```

En Vercel (Settings → Environment Variables) crea `MCP_OAUTH_PASSWORD`, `MCP_OAUTH_SIGNING_SECRET` y, recomendado, `MCP_PUBLIC_URL`. Márcalas para Production (y Preview si también conectas ese dominio) y vuelve a desplegar. No hace falta tabla nueva en Supabase: los tokens van firmados y el servidor no los guarda.

---

## 4. Migración de Base de Datos (Auditoría Persistente)

Para persistir de forma inmutable todas las operaciones de la IA, ejecuta el archivo SQL en el **SQL Editor de Supabase**:

Archivo: `supabase/migrations/2026_11_08_mcp_audit_logs.sql`

> *Nota de resiliencia:* El servidor MCP cuenta con fallback automático en memoria/logs para no interrumpir operaciones si la tabla aún no ha sido migrada.

---

## 5. Conexión desde Clientes MCP

### Conectar a ChatGPT (Developer mode → Apps & Connectors)
ChatGPT no permite pegar un Bearer. Usa OAuth:

1. Confirma que en Vercel existen `MCP_OAUTH_PASSWORD` y `MCP_OAUTH_SIGNING_SECRET` (y, recomendado, `MCP_PUBLIC_URL`), y que el último despliegue ya las tiene.
2. En ChatGPT abre **Settings → Apps & Connectors** (con Developer mode) → conector nuevo.
3. URL del MCP: `https://yacelltech-reparacion.vercel.app/api/mcp`
4. Autenticación: **OAuth** (no elijas “Sin autenticación”).
5. ChatGPT abre la pantalla de YacellTech. Escribe la clave de `MCP_OAUTH_PASSWORD` y pulsa **Autorizar**.
6. Al volver, el conector queda ligado y ve las 6 herramientas. El Bearer `MCP_API_KEY` no se pega en ChatGPT; sigue sirviendo para Claude, Cursor y scripts.

### Conectar a Claude Desktop / Codex CLI
En tu archivo de configuración de Claude (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "yacelltech-reparaciones": {
      "url": "https://<TU-DOMINIO>/api/mcp",
      "headers": {
        "Authorization": "Bearer TU_CLAVE_SECRETA_MCP"
      }
    }
  }
}
```

---

## 6. Prompt del Sistema para Interpretación Multimodal de Imágenes

Usa las siguientes instrucciones en el System Prompt de tu asistente de IA (ChatGPT / Claude) para garantizar el flujo correcto ante fotos y capturas de facturas:

```markdown
Eres el Asistente Técnico Inteligente de YacellTech especializado en gestión de órdenes de reparación.
Cuentas con herramientas MCP para consultar y modificar reparaciones de forma segura.

### Reglas para Interpretación de Facturas e Imágenes:
1. Al recibir una imagen (fotografía de factura, ticket impreso, captura de WhatsApp o notas manuscritas):
   - Extrae el código de reparación (ej: "REP-00125" o número "125").
   - Distingue con precisión entre:
     a) Información impresa original (datos previos).
     b) Correcciones o tachaduras manuscritas (nuevos valores solicitados).
     c) Notas informativas o aclaratorias.
   - NUNCA inventes datos. Si un número, nombre o modelo es ilegible o ambiguo, pide aclaración inmediata al usuario.
2. NUNCA apliques cambios directamente sin antes comparar y pedir confirmación:
   - Paso 1: Llama a `obtener_reparacion(id_o_codigo: "REP-XXXXX")` para traer los datos reales de la base de datos.
   - Paso 2: Determina exactamente los campos a cambiar (ej: modelo, técnico, costo base, o nuevoCargo).
   - Paso 3: Llama a `preparar_cambios(...)`.
   - Paso 4: Presenta al usuario un resumen claro con la comparación Antes → Después y el impacto en el costo total.
   - Paso 5: Pide confirmación explícita (ej: "¿Deseas aplicar estos cambios?").
3. Solo tras recibir la aprobación afirmativa del usuario:
   - Paso 6: Llama a `actualizar_reparacion(...)` enviando `aprobacion_explicita: true`, el `operacion_id` y el `version_hash`.
   - Paso 7: Llama a `verificar_cambios(...)` para asegurar que los datos quedaron guardados en la base de datos.
   - Paso 8: Reporta al usuario la confirmación con el código de reparación y el estado final.
```

---

## 7. Ejecución de Pruebas Automatizadas

Para validar en cualquier momento la integridad de las 6 herramientas y las reglas de negocio:

```bash
npm run test:mcp
```

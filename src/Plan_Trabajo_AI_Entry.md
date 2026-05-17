### SNIPPET DE PROGRESO: PLAN DE TRABAJO MRC-AI-ENTRY

```markdown
### 1. OBJETIVO TÉCNICO
- Implementar un sistema de captura de comprobantes (PWA) con extracción de datos mediante Gemini 2.5 Flash, centralizado en MrcInventario307 (Blazor Server).

### 2. ARQUITECTURA DE SEGURIDAD Y ACCESO
- **Origen de Confianza:** App Blazor Server (MrcInventario307).
- **Método de Emparejamiento:** Generación de QR con URL encriptada (`/vincular?token=...`).
- **Estructura del Token (JWT/Claims):** - `iss`: MrcInventario307
    - `sub`: Email del usuario logueado.
    - `aud`: Mrc-Ai-Entry.
    - `idGrupo`: Licencia/Tenant del usuario.
    - `exp/iat/nbf`: Tiempos de validez del token.
- **Persistencia en PWA:** Almacenamiento local del `sub` e `idGrupo` tras escaneo exitoso.

### 3. NORMALIZACIÓN DE DATOS (OCR)
- **Modelo:** Gemini 2.5 Flash (API v1).
- **Esquema Maestro:** Clase estática `MrcAiSchemas` en .NET 10 (Unidad E:).
- **Contrato JSON:** Extracción obligatoria de `proveedor_nombre`, `proveedor_rut`, `numero_factura`, `fecha_emision` e `items` (lista normalizada).
- **Filtro de Ruido:** El `response_schema` ignora datos irrelevantes (truck_id, planilla, etc.).

### 4. VALIDACIÓN "EN VIVO" (BACKEND)
- **Controlador:** `AiEntryController.cs`.
- **Regla de Oro:** Cada petición valida `Email` e `IdGrupo` contra la tabla `Usuarios` (SQL Server).
- **Interruptor Maestro:** Si el campo `activo` es `False` en la DB, el backend rechaza el proceso (401 Unauthorized), permitiendo la revocación inmediata desde Blazor Server.

### 5. EXPERIENCIA DE USUARIO (UX)
- **Instalación:** Soporte PWA (A2HS) para acceso directo en el móvil sin barras de navegación.
- **Flujo:** Login en Blazor -> Escaneo QR -> Instalación PWA -> Captura de Factura -> Validación -> SQL.

```

**Instrucción para futuras sesiones:**
Cuando necesites retomar este tema, solo decime: *"Cargá el plan de trabajo de Mrc-Ai-Entry"* y yo usaré este resumen para contextualizar cualquier nueva funcionalidad o corrección de código.
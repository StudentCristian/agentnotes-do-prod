**ADR-0002: Flujo de audio con DigitalOcean Spaces y Gemini**  
**Estado:** Archivado como implementacion previa; parcialmente reemplazado por ADR-0003  
**Fecha:** 2026-07-06  
**Proyecto:** agentnotes-do-prod  

> Nota: este ADR describe la implementacion previa basada en normalizacion backend + Gemini Files API. La arquitectura activa para transcripcion de audio ahora se rige por ADR-0003, que conserva Spaces privado y borrado manual pero reemplaza la transcripcion por BAML con URL firmada temporal de lectura.

### Contexto

La aplicación AgentNotes necesita soportar un flujo de captura, almacenamiento temporal, transcripción y eliminación de audios grabados desde el micrófono del navegador para generar notas clínicas. El proyecto separa dos dominios de archivos: documentos Word por EdgeStore y audio temporal por DigitalOcean Spaces .  

Ya se creó el bucket `agentnotes-audio-prod` en DigitalOcean Spaces y se configuraron reglas CORS para el dominio desplegado en App Platform, lo que habilita el flujo de subida desde navegador con control explícito de origen. Gemini soporta procesamiento de audio mediante su Files API y recomienda usar un `file uri` propio de Gemini después de subir el archivo, en lugar de depender de una URL pública de almacenamiento externo. 

### Problema

Se necesita definir un flujo estable para audio que evite improvisación en estos puntos:

- Cómo se sube el audio desde el navegador.
- Qué formato se captura y cuál se usa como formato canónico de procesamiento.
- Cómo se integra Spaces con Gemini.
- Cómo se eliminan archivos temporales.
- Qué variables de entorno y responsabilidades corresponden a App Platform, Spaces y Gemini.

### Decisión

Se adopta el siguiente flujo técnico para audio:

1. El navegador captura audio usando `MediaRecorder` en el formato nativo soportado por el navegador, normalmente `audio/webm;codecs=opus` o `audio/ogg;codecs=opus`. 
2. El frontend solicita al backend una URL firmada o un endpoint de carga para subir el archivo original a DigitalOcean Spaces. 
3. El archivo original se guarda temporalmente en el bucket privado `agentnotes-audio-prod` en la región `nyc3` usando las variables `DO_SPACES_BUCKET`, `DO_SPACES_REGION` y `DO_SPACES_ENDPOINT`, que se configuran manualmente en App Platform y no son generadas automáticamente por DigitalOcean .
4. Para transcripción, **el backend lee el audio desde Spaces por stream**, lo normaliza a **WAV PCM mono** y luego lo envía a Gemini, reduciendo problemas de compatibilidad entre navegadores y APIs.
5. El backend sube el archivo normalizado a Gemini Files API y utiliza el `file uri` devuelto por Gemini para invocar la transcripción.
6. El usuario puede eliminar manualmente el audio. Si no lo elimina, una lifecycle policy de 24 horas en Spaces lo borra automáticamente.

### Formato de audio

#### Captura

El navegador no debe forzarse a grabar WAV directamente como formato de captura principal, porque `MediaRecorder` normalmente produce formatos comprimidos como WebM/Opus u OGG/Opus dependiendo del navegador.

#### Formato canónico

El formato canónico del pipeline de transcripción será **WAV PCM mono** generado en backend antes de la integración con Gemini. 

#### Justificación

- Reduce variabilidad entre navegadores.
- Evita depender del soporte de formatos comprimidos en wrappers o SDKs alternos de Gemini. 
- Facilita futuras integraciones con otros motores de transcripción o procesamiento de audio.

### Variables de entorno

Las siguientes variables se configuran manualmente en App Platform:

| Variable | Valor esperado |
|---|---|
| `DO_SPACES_BUCKET` | `agentnotes-audio-prod` |
| `DO_SPACES_REGION` | `nyc3` |
| `DO_SPACES_ENDPOINT` | `https://nyc3.digitaloceanspaces.com` |
| `DO_SPACES_KEY` | Access Key de Spaces |
| `DO_SPACES_SECRET` | Secret Key de Spaces |
| `GOOGLE_AI_API_KEY` | Clave de Gemini/Google AI |

### Responsabilidades del sistema

#### Frontend

- Solicitar permisos de micrófono.
- Grabar audio usando `MediaRecorder`.
- Subir el archivo original a Spaces.
- Mostrar progreso, error y estado de procesamiento.
- Permitir eliminación manual del audio.

#### Backend Next.js

- Generar URL firmada o aceptar carga del audio.
- Persistir metadatos mínimos del objeto en Spaces.
- **Leer el audio desde Spaces por stream.**
- Normalizar a WAV PCM mono.
- Subir archivo a Gemini Files API.
- Solicitar transcripción a Gemini.
- Eliminar audio si el usuario lo pide.

#### DigitalOcean Spaces

- Almacenamiento temporal privado.
- Aplicación de CORS para desarrollo y producción.
- Eliminación automática por lifecycle policy a 24 horas.

#### Gemini

- Procesamiento del archivo ya normalizado.
- Uso de `file uri` propio de Gemini en la solicitud de transcripción.

### Decisiones explícitas

#### Se decide

- Usar **DigitalOcean Spaces** solo como almacenamiento temporal privado de audio .
- Usar **Gemini Files API** como mecanismo oficial para que Gemini procese el archivo. 
- **Leer el audio desde Spaces por stream en backend** antes de normalizarlo y enviarlo a Gemini.
- Normalizar a **WAV PCM mono** en backend antes de la transcripción.
- Mantener eliminación dual: manual por usuario y automática por lifecycle policy de 24 horas.

#### No se decide

- No usar la URL pública del Space como entrada directa a Gemini. 
- No hacer público el bucket de audio.
- No almacenar audio indefinidamente en Spaces.
- No mezclar el flujo de audio con EdgeStore, que queda reservado para documentos Word .

### Consecuencias

#### Positivas

- Arquitectura más clara y desacoplada entre documentos y audio .
- Mejor control de seguridad al mantener el bucket privado.
- Menor fragilidad frente a diferencias de formatos entre navegadores.
- Facilidad para limpieza automática y reducción de almacenamiento innecesario.

#### Costos y trade-offs

- Requiere una etapa extra de normalización en backend.
- WAV ocupa más tamaño que WebM/Opus, aunque solo se usa en la fase de procesamiento y no necesariamente como formato de almacenamiento persistente.
- Exige coordinar correctamente CORS, URLs firmadas y lifecycle policy.

### Implementación esperada en el código

Los cambios esperados en el repositorio son:

- `app/api/audio`: endpoint para generar la subida a Spaces o aceptar carga backend .
- `app/api/transcribe`: leer desde Spaces por stream, normalizar audio y enviar a Gemini.
- Componente de micrófono en frontend: grabar, subir y disparar transcripción.
- Política de lifecycle en el bucket `agentnotes-audio-prod`.

### Criterios de aceptación

El flujo se considerará implementado correctamente cuando:

1. El usuario pueda grabar audio desde la app desplegada.
2. El archivo se suba correctamente a Spaces sin errores CORS.
3. El backend pueda leer el objeto desde Spaces y normalizarlo.
4. Gemini genere la transcripción usando su Files API.
5. El usuario pueda eliminar manualmente el audio.
6. Los archivos no eliminados desaparezcan automáticamente en 24 horas por lifecycle policy.

### Nota de implementación

El repositorio ya conserva el upload directo a Spaces y migró la transcripción backend hacia normalización WAV PCM mono y Gemini Files API. El objeto temporal en Spaces ya no se borra automáticamente al terminar la transcripción; se elimina mediante endpoint de borrado manual o por la lifecycle policy del bucket.
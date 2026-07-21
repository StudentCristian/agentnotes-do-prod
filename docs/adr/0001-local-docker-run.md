# ADR-001: Ejecución e instalación local con Docker usando servicios reales de DigitalOcean

## Estado
Aceptado

## Fecha
2026-07-17

## Contexto
El repositorio `agentnotes-do-prod` declara `Node 22.x` y `pnpm@11.9.0` en `package.json`, mientras que el entorno observado de desarrollo local en WSL2 estaba usando `Node v23.5.0` y `pnpm 10.19.0`, lo que introduce riesgo de incompatibilidades en instalación, lockfile y dependencias nativas.

El proyecto también incluye un `docker-compose.dev.yml` heredado que levanta `postgres` y `minio`, además de un contenedor `app`, pero ese esquema ya no refleja la arquitectura actual, porque las pruebas locales deben usar los servicios reales ya desplegados en DigitalOcean.

El archivo `.env` del repositorio apunta a una configuración local antigua con `DATABASE_URL` en localhost y `DO_SPACES_ENDPOINT=http://minio:9000`, lo que confirma que la estrategia de simulación local con MinIO quedó desactualizada respecto al despliegue actual.

Adicionalmente, el pipeline de GitHub Actions todavía presenta desalineación de versiones, porque usa `pnpm` 10 y `node-version: 20`, mientras que el proyecto fija versiones distintas en el manifiesto.

## Decisión
Se utilizará **Docker únicamente para encapsular el entorno de ejecución y desarrollo de la aplicación**, con el fin de aislar versiones de Node, pnpm y dependencias del sistema, evitando conflictos con la instalación global del entorno WSL2.

No se usarán contenedores para `Postgres`, `MinIO` ni otros servicios de infraestructura local. En su lugar, el desarrollo local consumirá directamente los servicios reales ya provisionados en DigitalOcean mediante variables de entorno reales o de entorno de pruebas controlado.

La configuración local deberá materializarse mediante un archivo de entorno específico para desarrollo, preferiblemente `.env.local`, que no se versionará con secretos reales y que contendrá endpoints reales de base de datos y bucket en DigitalOcean.

El contenedor de desarrollo deberá fijar `Node 22.x` y activar `pnpm@11.9.0` mediante Corepack para respetar el contrato del repositorio y reducir errores de instalación reproducibles.

## Alcance
Esta decisión aplica a:

- Instalación local para desarrollo y revisión técnica.
- Ejecución local para pruebas manuales previas al despliegue.
- Configuración reproducible para futuras pruebas de smoke, lint y build.
- Preparación de un entorno coherente para que GitHub Copilot implemente cambios posteriores sobre una base estable.

Esta decisión no cubre:

- Simulación local de servicios gestionados en DigitalOcean.
- Estrategias de pruebas E2E definitivas.
- Cambios al despliegue productivo en App Platform.

## Razones
Encapsular solo la aplicación en Docker reduce el riesgo de conflictos con el sistema global de WSL2, especialmente cuando el entorno host ya usa versiones distintas de Node y pnpm a las exigidas por el repositorio.

Descartar contenedores para `Postgres` y `MinIO` evita mantener infraestructura duplicada que ya no representa el comportamiento real del sistema, dado que la arquitectura actual depende de servicios administrados en DigitalOcean.

Usar los servicios reales en desarrollo local mejora la validez de las pruebas funcionales, porque las rutas, credenciales y comportamientos observados serán más cercanos al entorno desplegado.

## Consecuencias
### Positivas
- El entorno local quedará aislado del WSL2 global y será más reproducible entre sesiones y equipos.
- La instalación será más consistente al fijar Node 22 y pnpm 11.9.0 dentro del contenedor.
- Las pruebas manuales locales se acercarán más al comportamiento real de la aplicación al usar servicios de DigitalOcean en vez de simulaciones heredadas.
- Se simplificará la operación local al eliminar dependencias innecesarias de `docker-compose.dev.yml` relacionadas con infraestructura ya obsoleta.

### Negativas
- El desarrollo local dependerá de conectividad a servicios remotos y de la disponibilidad de DigitalOcean.
- Será necesario gestionar con más cuidado los secretos y permisos del entorno local, ya que se usarán credenciales reales o semireales.
- Algunas pruebas pueden impactar datos o buckets reales si no se separan correctamente ambientes, prefijos o credenciales.

## Decisiones derivadas
1. Se deberá crear o actualizar un `Dockerfile` de desarrollo orientado solo a la aplicación, con `Node 22.x`, Corepack habilitado y activación explícita de `pnpm@11.9.0`.
2. Se deberá retirar o reemplazar el `docker-compose.dev.yml` heredado para que no levante `postgres`, `minio` ni `minio-init`, ya que esos servicios dejan de formar parte del flujo local objetivo.
3. Se deberá crear un archivo `.env.example` alineado con la arquitectura actual, sustituyendo referencias a `localhost` y `http://minio:9000` por nombres de variables acordes con DigitalOcean y aclarando cuáles valores se completan manualmente.
4. Se deberá documentar el flujo de arranque local con Docker: construir imagen, montar código fuente, inyectar `.env.local`, ejecutar `pnpm install` y luego `pnpm dev` o los comandos de validación que apliquen.
5. Se deberá corregir posteriormente la desalineación del workflow de CI para usar versiones consistentes con el proyecto antes de consolidar una estrategia completa de validación previa a deploy.

## Alternativas consideradas
| Alternativa | Resultado | Motivo |
|---|---|---|
| Ejecutar todo directamente en WSL2 con Node y pnpm globales | Rechazada | El entorno actual observado no coincide con `Node 22.x` ni con `pnpm@11.9.0`, por lo que aumenta el riesgo de errores de instalación y comportamiento inconsistente. |
| Usar Docker para app + Postgres + MinIO locales | Rechazada | Esa configuración existe de forma heredada, pero ya no representa la arquitectura actual ni el objetivo de usar servicios reales en DigitalOcean. |
| Mantener el `docker-compose.dev.yml` actual con ajustes menores | Rechazada | Seguiría preservando servicios locales obsoletos y una semántica de desarrollo que ya no corresponde al sistema actual. |

## Guía de implementación inicial
### Preparación manual previa
- Confirmar los endpoints reales de PostgreSQL y Spaces que se usarán para desarrollo.
- Confirmar si se usarán credenciales productivas, de staging o un subconjunto controlado.
- Preparar `.env.local` fuera del control de versiones.

### Preparación técnica posterior
- Definir imagen base con Node 22.
- Habilitar Corepack dentro del contenedor.
- Activar `pnpm@11.9.0` dentro del contenedor.
- Montar el código fuente en el contenedor para iteración local.
- Pasar variables de entorno reales mediante `.env.local` o configuración equivalente.
- Ejecutar instalación y validaciones dentro del contenedor.

## Riesgos y mitigaciones
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Uso accidental de credenciales o recursos productivos | Alto | Separar secretos por entorno, usar buckets/prefijos de prueba y documentar claramente los valores permitidos. |
| Diferencias entre local y CI | Medio | Alinear posteriormente versiones de Node y pnpm en GitHub Actions con lo declarado por el proyecto. |
| Dependencia de red o latencia a servicios remotos | Medio | Mantener pruebas locales acotadas, con smoke tests y datos de prueba controlados. |
| Confusión por archivos heredados | Medio | Eliminar o deprecar explícitamente `docker-compose.dev.yml` y documentar el nuevo flujo oficial. |

## Criterios de éxito
Se considerará exitosa esta decisión cuando:

- La aplicación pueda instalarse y ejecutarse localmente dentro de Docker sin depender de Node o pnpm globales del host.
- El flujo local use servicios reales de DigitalOcean sin recurrir a MinIO o Postgres locales.
- Exista documentación mínima para repetir la instalación en otra máquina.
- La base quede preparada para añadir validaciones locales antes del deploy.
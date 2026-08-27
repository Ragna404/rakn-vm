# OMARCHY VM

Entorno de escritorio gráfico en la nube para el control y desarrollo de máquinas virtuales en Google Cloud Platform (GCP Compute Engine), inspirado en la estética Cyber/Nordic de Arch Linux y Omarchy OS.

---

## Características Principales

### 1. Entorno de Escritorio y Gestor de Ventanas
- **Dock Inferior Flotante (Estilo macOS / Plank)**: Acceso rápido, minimizado y restauración de ventanas con indicadores de ejecución y efecto *magnification*.
- **Explorador de Archivos (GNOME Files / Nautilus)**: Navegación de carpetas, historial, marcadores de sistema, buscador rápido y soporte para arrastrar y soltar archivos (*Drag & Drop*).
- **Visor y Editor de Archivos con Soporte Markdown**:
  - Edición en vivo con numeración de líneas y guardado rápido (`Ctrl+S`).
  - **Vista Previa de Markdown (.md)**: Renderizado de títulos, tablas, bloques de código, listas, citas y enlaces.
- **Terminal y Registro de Actividad**:
  - **Pestaña 1**: Registro histórico de eventos del sistema (`activity-log`).
  - **Pestaña 2**: Consola interactiva con prompt (`user@my-server-01:~$`) y comandos útiles (`fastfetch`, `git status`, `pnpm test`, `docker ps`, `ls`, `cat`, etc.).
- **Panel Lateral Deslizable (`vm-control Drawer`)**: Acceso mediante botón superior o atajo `Ctrl+S` con banner de estado en arte ASCII, botón de encendido y ficha técnica completa.
- **Ventanas de Desarrollo Adicionales**:
  - Monitor de **Contenedores Docker** con puertos y reinicio.
  - Visualizador de **Git Graph** y ramas activas.
- **Redimensionamiento en 8 Direcciones**: Ajuste personalizado del tamaño de las ventanas desde cualquier borde o esquina.

### 2. Control de Ciclo de Vida y Gestión de Costos
- Control completo de la VM: `start`, `stop`, `hard reset`, `suspend`, `resume`.
- **Temporizador de Auto-Apagado**: Selector programable (15m, 30m, 1h, 2h, 4h) con cuenta regresiva en vivo para evitar costos innecesarios en GCP.
- Monitores de **CPU %**, **RAM %** y **Disco %** en la barra superior.
- Diálogos de confirmación accesibles para operaciones críticas.

### 3. Seguridad y Arquitectura
- **Google OAuth2 (GIS)**: Autenticación segura con tokens de acceso en memoria.
- **Seguridad en Backend**:
  - Cabeceras de seguridad con **Helmet** y política estricta de Content Security Policy (CSP).
  - Limitación de tasa (**Rate Limiting**) a 60 peticiones/minuto.
  - Validación con expresiones regulares contra ataques de inyección y *Path Traversal*.
  - Enmascaramiento de errores internos en entornos de producción.

---

## Estructura del Proyecto

```
omarchy-vm/
├── server/                          # Backend Express modular
│   ├── src/
│   │   ├── controllers/             # Controladores desacoplados
│   │   │   ├── vmController.js      # Estado y acciones de la VM
│   │   │   └── fileController.js    # Exploración y edición de archivos
│   │   ├── middleware/              # Seguridad, validación y errores
│   │   │   ├── authMiddleware.js    # Verificación de tokens de autorización
│   │   │   ├── validateMiddleware.js# Prevención de inyección y validación
│   │   │   └── errorMiddleware.js   # Manejo centralizado y enmascaramiento
│   │   ├── services/                # Servicios de negocio
│   │   │   ├── gcpService.js        # Cliente REST para Compute Engine
│   │   │   └── fileService.js       # Sistema de archivos virtual y persistencia
│   │   └── routes/                  # Definición de rutas API
│   │       ├── vm.js                # Endpoints /api/vm/*
│   │       └── fileRoutes.js        # Endpoints /api/files/*
│   ├── server.js                    # Punto de entrada del servidor Express
│   └── server.test.js               # Suite de 35 tests automatizados
├── public/                          # Frontend (Desktop Environment)
│   ├── index.html                   # Topbar, ventanas flotantes, dock y modales
│   ├── styles.css                   # Sistema de diseño Omarchy, GNOME Files, editor y dock
│   └── app.js                       # Gestor de ventanas, VFS, parser Markdown y terminal
├── electron/                        # Aplicación de escritorio para Windows
│   ├── main.js                      # Proceso principal de Electron
│   └── preload.js                   # Precarga con aislamiento de contexto
├── .agents/                         # Reglas y skills de agentes (Ponytail)
├── package.json                     # Scripts de ejecución y configuración de build
└── README.md
```

---

## Requisitos Previos

- [Node.js](https://nodejs.org) >= 20
- [pnpm](https://pnpm.io) (instalación: `npm install -g pnpm`)
- Un proyecto en Google Cloud Platform con la API de Compute Engine habilitada.
- Un Client ID de OAuth 2.0 (tipo: Aplicación web).

---

## Instalación y Ejecución

```bash
# Instalar dependencias con pnpm
pnpm install

# Opción A: Ejecutar como Aplicación de Escritorio Windows (Electron)
pnpm run app:dev

# Opción B: Ejecutar servidor Web de desarrollo
pnpm run dev
# Luego abrir http://localhost:3000 en el navegador
```

---

## Empaquetado para Windows (.exe)

```bash
# Generar instalador (NSIS) y ejecutable portable en la carpeta dist/
pnpm run app:build:win

# O generar la carpeta de aplicación desempaquetada
pnpm run app:build:dir
```

---

## Pruebas y Cobertura

El proyecto cuenta con una suite completa de pruebas unitarias y de integración que cubre validación de parámetros, ciclo de vida de la VM, seguridad y operaciones del sistema de archivos:

```bash
cd server
pnpm test
```

### Resultados de Cobertura (`node --test --experimental-test-coverage`):

- **Líneas (Line Coverage)**: **98.19%**
- **Ramas (Branch Coverage)**: **84.11%** (Objetivo >80% superado)
- **Funciones (Function Coverage)**: **96.00%**
- **Tests**: **35 tests ejecutados / 35 aprobados (0 fallos)**.

---

## Endpoints de la API

### 1. Gestión de Máquinas Virtuales (`/api/vm/*`)

| Método | Endpoint | Parámetros Requeridos | Descripción |
|---|---|---|---|
| `GET` | `/api/vm/status` | `project`, `zone`, `instance` | Consulta el estado actual de la instancia |
| `GET` | `/api/vm/details` | `project`, `zone`, `instance` | Retorna detalles completos, IPs y discos |
| `POST` | `/api/vm/start` | `project`, `zone`, `instance` | Enciende la máquina virtual |
| `POST` | `/api/vm/stop` | `project`, `zone`, `instance` | Detiene la máquina virtual de forma segura |
| `POST` | `/api/vm/reset` | `project`, `zone`, `instance` | Reinicia la máquina virtual (Hard Reset) |
| `POST` | `/api/vm/suspend` | `project`, `zone`, `instance` | Suspende el estado en memoria de la VM |
| `POST` | `/api/vm/resume` | `project`, `zone`, `instance` | Reanuda la ejecución de una VM suspendida |
| `GET` | `/api/vm/serial-port` | `project`, `zone`, `instance`, `port` | Lee la salida de la consola serial (puertos 1-4) |

*Nota: Todos los endpoints de la VM requieren cabecera `Authorization: Bearer <token>`.*

### 2. Sistema de Archivos (`/api/files/*`)

| Método | Endpoint | Parámetros | Descripción |
|---|---|---|---|
| `GET` | `/api/files/list` | `?path=/ruta/directorio` | Lista las carpetas y archivos de la ruta |
| `GET` | `/api/files/read` | `?path=/ruta/archivo.ext` | Lee el contenido de un archivo |
| `POST` | `/api/files/write` | `{ path: "...", content: "..." }` | Guarda o crea un nuevo archivo |

---

## Atajos de Teclado Globales

- `Ctrl+P`: Abrir Buscador Rápido de Archivos (*Quick Finder*).
- `Ctrl+S`: Abrir / Cerrar el panel lateral `vm-control` (o Guardar si el editor está enfocado).
- `Ctrl+R`: Actualización manual del estado de la VM.
- `Ctrl+,`: Abrir el panel de configuración de la VM.
- `Doble clic en cabecera`: Maximizar / Restaurar cualquier ventana.

---

## Licencia

MIT

/* =========================================================
   OMARCHY VM - Cloud Desktop Environment Client Application
   Window Manager + Dock + Terminal + Docker + Git + VFS + Editor
   ========================================================= */

(function () {
  'use strict';

  // ===========================
  // STATE
  // ===========================
  const state = {
    isDemo: false,
    demoVmStatus: 'RUNNING',
    accessToken: null,
    user: null,
    tokenClient: null,
    config: {
      project: '',
      zone: '',
      instance: '',
      pollInterval: 5,
      clientId: '',
    },
    vmStatus: null,
    pollTimer: null,
    isPolling: false,

    // Window Management
    activeZIndex: 100,

    // File Manager State
    currentPath: '/home/user/Documents',
    history: ['/home/user/Documents'],
    historyIndex: 0,
    currentOpenFile: null,
    isEditorDirty: false,

    // Terminal History
    commandHistory: [],
    historyPos: -1,

    // Auto-Stop Timer
    autoStopSecondsLeft: 0,
    autoStopInterval: null,
  };

  // Virtual File System (Local Cache / Demo Data)
  const vfs = {
    '/home/user': {
      name: 'Carpeta personal',
      items: [
        { name: 'Desktop', type: 'dir', size: '--' },
        { name: 'Documents', type: 'dir', size: '--' },
        { name: 'Downloads', type: 'dir', size: '--' },
        { name: 'Music', type: 'dir', size: '--' },
        { name: 'Pictures', type: 'dir', size: '--' },
        { name: 'Public', type: 'dir', size: '--' },
        { name: 'Templates', type: 'dir', size: '--' },
        { name: 'Videos', type: 'dir', size: '--' },
        { name: 'Wallpapers', type: 'dir', size: '--' },
        { name: 'Work', type: 'dir', size: '--' },
      ],
    },
    '/home/user/Desktop': {
      name: 'Desktop',
      items: [
        { name: 'vm-dashboard.desktop', type: 'file', size: '240 B' },
        { name: 'notes.txt', type: 'file', size: '185 B' },
      ],
    },
    '/home/user/Documents': {
      name: 'Documents',
      items: [
        { name: 'architecture.md', type: 'file', size: '1.2 KB' },
        { name: 'gcp-config.json', type: 'file', size: '430 B' },
        { name: 'setup.sh', type: 'file', size: '310 B' },
        { name: 'server.log', type: 'file', size: '890 B' },
      ],
    },
    '/home/user/Work': {
      name: 'Work',
      items: [
        { name: 'cloud-functions.py', type: 'file', size: '520 B' },
        { name: 'docker-compose.yml', type: 'file', size: '340 B' },
        { name: 'database.sql', type: 'file', size: '410 B' },
      ],
    },
    '/home/user/Downloads': {
      name: 'Downloads',
      items: [
        { name: 'omarchy-theme.tar.gz', type: 'file', size: '2.4 MB' },
        { name: 'google-cloud-cli.zip', type: 'file', size: '48.2 MB' },
      ],
    },
    '/home/user/Pictures': {
      name: 'Pictures',
      items: [
        { name: 'wallpaper-nord.jpg', type: 'file', size: '1.4 MB', isImage: true },
        { name: 'concept-preview.png', type: 'file', size: '980 KB', isImage: true },
      ],
    },
    '/home/user/Music': { name: 'Music', items: [] },
    '/home/user/Public': { name: 'Public', items: [] },
    '/home/user/Templates': { name: 'Templates', items: [] },
    '/home/user/Videos': { name: 'Videos', items: [] },
    '/home/user/Wallpapers': { name: 'Wallpapers', items: [] },
  };

  // Pre-loaded file contents
  const fileContents = {
    '/home/user/Desktop/notes.txt': `TODO List:\n- Verificar certificados SSL en nginx\n- Configurar backup diario con Cloud Storage\n- Revisar métricas de CPU en us-central1-a\n- Actualizar paquetes: pacman -Syu`,
    '/home/user/Desktop/vm-dashboard.desktop': `[Desktop Entry]\nName=Omarchy VM Control\nExec=/usr/bin/omarchy-vm\nIcon=utilities-terminal\nType=Application\nCategories=System;Development;`,
    '/home/user/Documents/architecture.md': `# Omarchy VM Architecture\n\n## Overview\nNode.js backend with Express, Google Identity Services OAuth2, and Omarchy-styled desktop frontend.\n\n## VM Specs\n- Zone: us-central1-a\n- Machine Type: e2-medium (2 vCPUs, 4 GB RAM)\n- OS: Arch Linux / Omarchy`,
    '/home/user/Documents/gcp-config.json': `{\n  "project": "my-project",\n  "zone": "us-central1-a",\n  "instance": "my-server-01",\n  "machineType": "e2-medium",\n  "network": "default-vpc",\n  "tags": ["omarchy", "http-server", "ssh-ready"]\n}`,
    '/home/user/Documents/setup.sh': `#!/usr/bin/env bash\nset -euo pipefail\n\necho "==> Setting up Omarchy VM Environment..."\nsudo pacman -Sy --noconfirm neovim tmux htop fastfetch\nsystemctl enable --now sshd\necho "==> Setup completed successfully."`,
    '/home/user/Documents/server.log': `[2026-08-26 23:20:01] INFO: daemon initialized\n[2026-08-26 23:20:05] INFO: network interface nic0 configured (10.128.0.45)\n[2026-08-26 23:22:15] INFO: RPC client connected from frontend\n[2026-08-26 23:25:30] STATUS: all systems operational`,
    '/home/user/Work/cloud-functions.py': `import functions_framework\n\n@functions_framework.http\ndef handle_vm_event(request):\n    request_json = request.get_json(silent=True)\n    print(f"Received VM event: {request_json}")\n    return {"status": "success", "processed": True}`,
    '/home/user/Work/docker-compose.yml': `version: '3.8'\nservices:\n  app:\n    image: node:22-alpine\n    working_dir: /app\n    volumes:\n      - .:/app\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n    command: npm start\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: secret\n    ports:\n      - "5432:5432"`,
    '/home/user/Work/database.sql': `CREATE TABLE IF NOT EXISTS vm_audit_logs (\n  id SERIAL PRIMARY KEY,\n  instance_name VARCHAR(64) NOT NULL,\n  action VARCHAR(32) NOT NULL,\n  user_email VARCHAR(128),\n  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`,
  };

  // Mock Docker Data
  const dockerContainers = [
    { id: 'c1', name: 'omarchy-backend', image: 'node:22-alpine', status: 'running', ports: '3000:3000', memory: '48 MB' },
    { id: 'c2', name: 'postgres-db', image: 'postgres:16-alpine', status: 'running', ports: '5432:5432', memory: '32 MB' },
    { id: 'c3', name: 'redis-cache', image: 'redis:7.2-alpine', status: 'running', ports: '6379:6379', memory: '14 MB' },
    { id: 'c4', name: 'nginx-proxy', image: 'nginx:alpine', status: 'stopped', ports: '80:80', memory: '--' },
  ];

  // Mock Git Commits Data
  const gitCommits = [
    { hash: 'e8f1a2c', msg: 'feat(desktop): add macOS dock and interactive terminal subtabs', branch: 'main', author: 'camfs', date: 'Just now' },
    { hash: 'a4b901d', msg: 'feat(explorer): implement 8-direction window resizing and quick search', branch: 'main', author: 'camfs', date: '20 min ago' },
    { hash: '7c82e0f', msg: 'test: achieve 84% branch coverage and 35 passing tests', branch: 'main', author: 'camfs', date: '1 hour ago' },
    { hash: '3e15b82', msg: 'feat: add modular backend controllers and security middlewares', branch: 'main', author: 'camfs', date: '3 hours ago' },
  ];


  // ===========================
  // DOM REFERENCES
  // ===========================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    // Login
    loginScreen: $('#login-screen'),
    loginClientId: $('#login-client-id'),
    btnGoogleLogin: $('#btn-google-login'),
    btnDemoMode: $('#btn-demo-mode'),

    // App & Desktop
    app: $('#app'),
    desktopWorkspace: $('#desktop-workspace'),

    // Top Bar & Metrics
    btnMenu: $('#btn-menu'),
    quickMenu: $('#quick-menu'),
    topBarClock: $('#top-bar-clock'),
    topBarStatusDot: $('#top-bar-status-dot'),
    topBarInstance: $('#top-bar-instance'),
    btnToggleDrawer: $('#btn-toggle-drawer'),
    btnSettings: $('#btn-settings'),
    userName: $('#user-name'),
    btnLogout: $('#btn-logout'),

    metricCpuVal: $('#metric-cpu-val'),
    metricCpuFill: $('#metric-cpu-fill'),
    metricRamVal: $('#metric-ram-val'),
    metricRamFill: $('#metric-ram-fill'),
    metricDiskVal: $('#metric-disk-val'),
    btnAutoStopTimer: $('#btn-autostop-timer'),
    autoStopTimerLabel: $('#autostop-timer-label'),

    // Floating Windows
    winFileManager: $('#win-file-manager'),
    winActivityLog: $('#win-activity-log'),
    winFileEditor: $('#win-file-editor'),
    winDocker: $('#win-docker'),
    winGitGraph: $('#win-git-graph'),

    // Dock
    desktopDock: $('#desktop-dock'),
    dockBtnFiles: $('#dock-btn-files'),
    dockBtnTerminal: $('#dock-btn-terminal'),
    dockBtnEditor: $('#dock-btn-editor'),
    dockBtnDocker: $('#dock-btn-docker'),
    dockBtnGit: $('#dock-btn-git'),
    dockBtnDrawer: $('#dock-btn-drawer'),

    // File Manager Components
    fmCurrentPathLabel: $('#fm-current-path-label'),
    fmFileGrid: $('#fm-file-grid'),
    fmBtnBack: $('#fm-btn-back'),
    fmBtnForward: $('#fm-btn-forward'),
    fmBtnQuickFind: $('#fm-btn-quick-find'),
    fmDropZone: $('#fm-drop-zone'),
    fmDragOverlay: $('#fm-drag-overlay'),

    // Editor Components
    editorFilename: $('#editor-filename'),
    editorSaveIndicator: $('#editor-save-indicator'),
    btnEditorSave: $('#btn-editor-save'),
    editorTextarea: $('#editor-textarea'),
    editorLinenumbers: $('#editor-linenumbers'),
    editorModeTabs: $('#editor-mode-tabs'),
    editorEditView: $('#editor-edit-view'),
    editorPreviewView: $('#editor-preview-view'),

    // Terminal / Log
    logContainer: $('#log-container'),
    btnClearLog: $('#btn-clear-log'),
    interactiveTermContainer: $('#interactive-term-container'),
    termOutput: $('#term-output'),
    termInput: $('#term-input'),

    // Lateral Drawer (vm-control)
    vmControlDrawer: $('#vm-control-drawer'),
    drawerBackdrop: $('#drawer-backdrop'),
    btnCloseDrawer: $('#btn-close-drawer'),
    vmName: $('#vm-name'),
    vmStatusBadge: $('#vm-status-badge'),
    vmAsciiBanner: $('#vm-ascii-banner'),
    btnPower: $('#btn-power'),
    powerLabel: $('#power-label'),
    btnActionStart: $('#btn-action-start'),
    btnActionStop: $('#btn-action-stop'),
    btnActionReset: $('#btn-action-reset'),
    btnActionSuspend: $('#btn-action-suspend'),

    // Specs
    detailProject: $('#detail-project'),
    detailZone: $('#detail-zone'),
    detailMachine: $('#detail-machine'),
    detailInternalIp: $('#detail-internal-ip'),
    detailExternalIp: $('#detail-external-ip'),
    detailCpu: $('#detail-cpu'),
    detailStarted: $('#detail-started'),

    // Tabs
    serialOutput: $('#serial-output'),
    disksList: $('#disks-list'),
    networkList: $('#network-list'),

    // Docker & Git Lists
    dockerContainerList: $('#docker-container-list'),
    gitGraphContainer: $('#git-graph-container'),

    // Modals
    modalQuickOpen: $('#modal-quick-open'),
    quickFinderInput: $('#quick-finder-input'),
    quickFinderResults: $('#quick-finder-results'),

    modalTimer: $('#modal-timer'),
    btnTimerClose: $('#btn-timer-close'),

    modalConfirm: $('#modal-confirm'),
    modalTitle: $('#modal-title'),
    modalMessage: $('#modal-message'),
    modalIconBadge: $('#modal-icon-badge'),
    btnModalCancel: $('#btn-modal-cancel'),
    btnModalAction: $('#btn-modal-action'),

    // Settings
    settingsPanel: $('#settings-panel'),
    settingProject: $('#setting-project'),
    settingZone: $('#setting-zone'),
    settingInstance: $('#setting-instance'),
    settingPoll: $('#setting-poll'),
    btnSaveSettings: $('#btn-save-settings'),
    btnCloseSettings: $('#btn-close-settings'),
  };


  // ===========================
  // CLOCK & LOGS
  // ===========================
  function updateClock() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    dom.topBarClock.textContent = `${days[now.getDay()]} ${h}:${m}`;
  }
  setInterval(updateClock, 10000);
  updateClock();

  function log(msg, level = '') {
    const now = new Date();
    const ts = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');

    const line = document.createElement('span');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-time">[${ts}]</span> <span class="log-msg ${level}">${escapeHtml(msg)}</span>`;

    const welcome = dom.logContainer.querySelector('.log-welcome');
    if (welcome) welcome.remove();

    dom.logContainer.appendChild(line);
    dom.logContainer.scrollTop = dom.logContainer.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }


  // ===========================
  // WINDOW MANAGER & DOCK INTEGRATION
  // ===========================
  function initWindowManager() {
    // Global Delegated Handler for Window Buttons (Min, Max, Close)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.win-btn');
      if (!btn) return;

      const win = btn.closest('.desktop-window') || document.getElementById(btn.dataset.win);
      if (!win) return;

      e.stopPropagation();
      e.preventDefault();

      if (btn.classList.contains('win-btn-close')) {
        win.classList.add('hidden');
        updateDockStatus();
      } else if (btn.classList.contains('win-btn-min')) {
        win.classList.add('is-minimized');
        updateDockStatus();
      } else if (btn.classList.contains('win-btn-max')) {
        win.classList.toggle('is-maximized');
      }
    });

    $$('.desktop-window').forEach((win) => {
      // Bring to front on click
      win.addEventListener('mousedown', () => bringWindowToFront(win));

      const header = win.querySelector('.window-header');
      if (!header) return;

      // Double-click header to maximize / restore
      header.addEventListener('dblclick', (e) => {
        if (e.target.closest('.window-controls') || e.target.closest('.win-subtabs') || e.target.closest('input') || e.target.closest('button')) return;
        win.classList.toggle('is-maximized');
      });

      // Dragging logic
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls') || e.target.closest('.win-subtabs') || e.target.closest('input') || e.target.closest('button')) return;
        if (win.classList.contains('is-maximized')) return;

        isDragging = true;
        bringWindowToFront(win);

        startX = e.clientX;
        startY = e.clientY;
        const rect = win.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      });

      function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = Math.max(0, Math.min(window.innerWidth - 100, initialLeft + dx));
        let newTop = Math.max(36, Math.min(window.innerHeight - 80, initialTop + dy));

        win.style.left = `${newLeft}px`;
        win.style.top = `${newTop}px`;
        win.style.right = 'auto';
        win.style.bottom = 'auto';
      }

      function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      // Attach 8-direction resize handles
      const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
      directions.forEach((dir) => {
        const handle = document.createElement('div');
        handle.className = `win-resize-handle win-resize-${dir}`;
        handle.dataset.dir = dir;
        win.appendChild(handle);

        handle.addEventListener('mousedown', (e) => {
          if (win.classList.contains('is-maximized')) return;
          e.stopPropagation();
          e.preventDefault();
          bringWindowToFront(win);

          const startX = e.clientX;
          const startY = e.clientY;
          const rect = win.getBoundingClientRect();
          const startWidth = rect.width;
          const startHeight = rect.height;
          const startLeft = rect.left;
          const startTop = rect.top;

          const minWidth = 300;
          const minHeight = 200;

          function onResize(ev) {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            if (dir.includes('e')) {
              newWidth = Math.max(minWidth, startWidth + dx);
            }
            if (dir.includes('s')) {
              newHeight = Math.max(minHeight, startHeight + dy);
            }
            if (dir.includes('w')) {
              const possibleWidth = startWidth - dx;
              if (possibleWidth >= minWidth) {
                newWidth = possibleWidth;
                newLeft = startLeft + dx;
              } else {
                newWidth = minWidth;
                newLeft = startLeft + (startWidth - minWidth);
              }
            }
            if (dir.includes('n')) {
              const possibleHeight = startHeight - dy;
              if (possibleHeight >= minHeight) {
                newHeight = possibleHeight;
                newTop = Math.max(36, startTop + dy);
              } else {
                newHeight = minHeight;
                newTop = startTop + (startHeight - minHeight);
              }
            }

            win.style.width = `${newWidth}px`;
            win.style.height = `${newHeight}px`;
            win.style.left = `${newLeft}px`;
            win.style.top = `${newTop}px`;
            win.style.right = 'auto';
            win.style.bottom = 'auto';
          }

          function onStopResize() {
            document.removeEventListener('mousemove', onResize);
            document.removeEventListener('mouseup', onStopResize);
          }

          document.addEventListener('mousemove', onResize);
          document.addEventListener('mouseup', onStopResize);
        });
      });
    });
  }

  function bringWindowToFront(win) {
    state.activeZIndex += 1;
    win.style.zIndex = state.activeZIndex;
    $$('.desktop-window').forEach((w) => w.classList.remove('is-focused'));
    win.classList.add('is-focused');
  }

  function openWindow(win) {
    win.classList.remove('hidden', 'is-minimized');
    bringWindowToFront(win);
    updateDockStatus();
  }

  function toggleWindow(win) {
    if (win.classList.contains('hidden') || win.classList.contains('is-minimized')) {
      openWindow(win);
    } else {
      if (win.classList.contains('is-focused')) {
        win.classList.add('is-minimized');
        updateDockStatus();
      } else {
        bringWindowToFront(win);
      }
    }
  }

  function initDock() {
    dom.dockBtnFiles.addEventListener('click', () => toggleWindow(dom.winFileManager));
    dom.dockBtnTerminal.addEventListener('click', () => toggleWindow(dom.winActivityLog));
    dom.dockBtnEditor.addEventListener('click', () => toggleWindow(dom.winFileEditor));
    dom.dockBtnDocker.addEventListener('click', () => toggleWindow(dom.winDocker));
    dom.dockBtnGit.addEventListener('click', () => toggleWindow(dom.winGitGraph));
    dom.dockBtnDrawer.addEventListener('click', toggleDrawer);

    updateDockStatus();
  }

  function updateDockStatus() {
    const map = [
      { btn: dom.dockBtnFiles, win: dom.winFileManager },
      { btn: dom.dockBtnTerminal, win: dom.winActivityLog },
      { btn: dom.dockBtnEditor, win: dom.winFileEditor },
      { btn: dom.dockBtnDocker, win: dom.winDocker },
      { btn: dom.dockBtnGit, win: dom.winGitGraph },
    ];

    map.forEach(({ btn, win }) => {
      const isClosed = win.classList.contains('hidden');
      const isMinimized = win.classList.contains('is-minimized');
      btn.classList.toggle('is-running', !isClosed);
      btn.classList.toggle('active', !isClosed && !isMinimized);
    });
  }


  // ===========================
  // INTERACTIVE TERMINAL & SUBTABS
  // ===========================
  function initTerminalSubtabs() {
    $$('.win-subtab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = tab.dataset.subtab;
        $$('.win-subtab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        if (target === 'logs') {
          dom.logContainer.classList.add('active');
          dom.interactiveTermContainer.classList.remove('active');
        } else {
          dom.logContainer.classList.remove('active');
          dom.interactiveTermContainer.classList.add('active');
          dom.termInput.focus();
        }
      });
    });

    // Interactive Terminal Input
    dom.termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = dom.termInput.value.trim();
        if (cmd) {
          state.commandHistory.push(cmd);
          state.historyPos = state.commandHistory.length;
          execTerminalCommand(cmd);
        }
        dom.termInput.value = '';
      } else if (e.key === 'ArrowUp') {
        if (state.historyPos > 0) {
          state.historyPos -= 1;
          dom.termInput.value = state.commandHistory[state.historyPos] || '';
        }
      } else if (e.key === 'ArrowDown') {
        if (state.historyPos < state.commandHistory.length - 1) {
          state.historyPos += 1;
          dom.termInput.value = state.commandHistory[state.historyPos] || '';
        } else {
          state.historyPos = state.commandHistory.length;
          dom.termInput.value = '';
        }
      }
    });
  }

  function appendTermLine(text, className = '') {
    const el = document.createElement('div');
    el.className = `term-line ${className}`;
    el.textContent = text;
    dom.termOutput.appendChild(el);
    dom.termOutput.scrollTop = dom.termOutput.scrollHeight;
  }

  function execTerminalCommand(cmd) {
    appendTermLine(`user@my-server-01:~$ ${cmd}`, 'accent-cyan');
    const [name, ...args] = cmd.split(/\s+/);

    switch (name.toLowerCase()) {
      case 'help':
        appendTermLine('Comandos disponibles:');
        appendTermLine('  fastfetch     - Mostrar información del sistema y specs');
        appendTermLine('  git status    - Ver estado del repositorio Git');
        appendTermLine('  docker ps     - Ver contenedores activos');
        appendTermLine('  pnpm test     - Ejecutar suite de pruebas');
        appendTermLine('  ls [dir]      - Listar archivos');
        appendTermLine('  cat <archivo> - Ver contenido de archivo');
        appendTermLine('  uptime        - Tiempo de actividad');
        appendTermLine('  whoami        - Usuario activo');
        appendTermLine('  clear         - Limpiar pantalla');
        break;

      case 'fastfetch':
      case 'neofetch':
        appendTermLine('  /\\       user@my-server-01');
        appendTermLine(' /  \\      -----------------');
        appendTermLine('/ /\\ \\     OS: Omarchy Linux (Arch-based)');
        appendTermLine('\\/  \\/     Host: Google Compute Engine (e2-medium)');
        appendTermLine('           Kernel: 6.6.137-omarchy-x86_64');
        appendTermLine('           Uptime: 2 days, 14 hours, 12 mins');
        appendTermLine('           Packages: 982 (pacman)');
        appendTermLine('           Shell: bash 5.2.26');
        appendTermLine('           CPU: Intel Broadwell (2 vCPUs) @ 2.20GHz');
        appendTermLine('           Memory: 1420MiB / 4018MiB (35%)');
        break;

      case 'git':
        if (args[0] === 'status') {
          appendTermLine('On branch main');
          appendTermLine('Your branch is up to date with \'origin/main\'.');
          appendTermLine('Changes not staged for commit:');
          appendTermLine('  modified:   public/app.js');
          appendTermLine('  modified:   public/styles.css');
          appendTermLine('  modified:   public/index.html');
          appendTermLine('no changes added to commit (use "git add")');
        } else if (args[0] === 'log') {
          gitCommits.forEach((c) => {
            appendTermLine(`* ${c.hash} - ${c.msg} (${c.author}, ${c.date})`);
          });
        } else {
          appendTermLine(`git ${args.join(' ')}: ejecutado`);
        }
        break;

      case 'docker':
        if (args[0] === 'ps') {
          appendTermLine('CONTAINER ID   IMAGE                STATUS          PORTS                    NAMES');
          dockerContainers.forEach((d) => {
            appendTermLine(`${d.id.padEnd(14)} ${d.image.padEnd(20)} ${d.status.padEnd(15)} ${d.ports.padEnd(24)} ${d.name}`);
          });
        } else {
          appendTermLine('Uso: docker ps');
        }
        break;

      case 'pnpm':
      case 'npm':
        if (args[0] === 'test') {
          appendTermLine('Running automated test suite...');
          setTimeout(() => {
            appendTermLine('✔ 35/35 tests passed (100%) [84.11% branch coverage]');
            appendTermLine('Duration: 432ms');
          }, 300);
        } else {
          appendTermLine(`pnpm ${args.join(' ')}: comando completado.`);
        }
        break;

      case 'ls': {
        const path = args[0] || state.currentPath;
        const dir = vfs[path];
        if (dir && dir.items) {
          appendTermLine(dir.items.map((i) => i.name + (i.type === 'dir' ? '/' : '')).join('   '));
        } else {
          appendTermLine(`ls: cannot access '${path}': No such file or directory`);
        }
        break;
      }

      case 'cat': {
        const file = args[0];
        if (!file) {
          appendTermLine('Uso: cat <archivo>');
        } else {
          const fullPath = file.startsWith('/') ? file : `${state.currentPath}/${file}`;
          if (fileContents[fullPath]) {
            appendTermLine(fileContents[fullPath]);
          } else {
            appendTermLine(`cat: ${file}: No such file`);
          }
        }
        break;
      }

      case 'clear':
        dom.termOutput.innerHTML = '';
        break;

      case 'whoami':
        appendTermLine('user');
        break;

      case 'uptime':
        appendTermLine(' 01:15:22 up 2 days, 14:12,  1 user,  load average: 0.18, 0.22, 0.15');
        break;

      default:
        appendTermLine(`bash: ${name}: comando no encontrado. Escribe 'help' para ayuda.`);
    }
  }


  // ===========================
  // DOCKER & GIT GRAPH WINDOWS
  // ===========================
  function initDockerWindow() {
    renderDockerList();
  }

  function renderDockerList() {
    dom.dockerContainerList.innerHTML = dockerContainers.map((d) => `
      <div class="docker-card">
        <div class="docker-info">
          <div class="docker-name-row">
            <span class="docker-dot ${d.status}"></span>
            <span class="docker-name">${escapeHtml(d.name)}</span>
            <span class="docker-image">${escapeHtml(d.image)}</span>
          </div>
          <div class="docker-meta">Ports: ${escapeHtml(d.ports)} | Mem: ${escapeHtml(d.memory)}</div>
        </div>
        <div class="docker-actions">
          <button class="docker-btn btn-docker-restart" data-id="${d.id}">Reiniciar</button>
          <button class="docker-btn btn-docker-toggle" data-id="${d.id}">${d.status === 'running' ? 'Detener' : 'Iniciar'}</button>
        </div>
      </div>
    `).join('');

    $$('.btn-docker-restart').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cont = dockerContainers.find((c) => c.id === id);
        if (cont) {
          log(`Docker: Reiniciando contenedor ${cont.name}...`, 'info');
          setTimeout(() => log(`Docker: ${cont.name} reiniciado exitosamente`, 'success'), 800);
        }
      });
    });

    $$('.btn-docker-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cont = dockerContainers.find((c) => c.id === id);
        if (cont) {
          cont.status = cont.status === 'running' ? 'stopped' : 'running';
          log(`Docker: ${cont.name} estado cambiado a ${cont.status.toUpperCase()}`, 'warning');
          renderDockerList();
        }
      });
    });
  }

  function initGitWindow() {
    dom.gitGraphContainer.innerHTML = gitCommits.map((c) => `
      <div class="git-commit-row">
        <div class="git-node-indicator"></div>
        <span class="git-hash">${c.hash}</span>
        <span class="git-msg">${escapeHtml(c.msg)}</span>
        <span class="git-author">${c.author} · ${c.date}</span>
      </div>
    `).join('');
  }


  // ===========================
  // EXPLORADOR DE ARCHIVOS & DRAG AND DROP
  // ===========================
  function initFileManager() {
    renderFileGrid(state.currentPath);

    // Sidebar navigation
    $$('.fm-side-item').forEach((item) => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        $$('.fm-side-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');

        if (vfs[path]) {
          navigateToFolder(path);
        } else {
          log(`Accediendo a ${item.querySelector('span').textContent}...`, 'info');
        }
      });
    });

    // History Buttons
    dom.fmBtnBack.addEventListener('click', () => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        navigateToFolder(state.history[state.historyIndex], false);
      }
    });

    dom.fmBtnForward.addEventListener('click', () => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        navigateToFolder(state.history[state.historyIndex], false);
      }
    });

    // Quick Find Trigger Button in Pathbar
    dom.fmBtnQuickFind.addEventListener('click', openQuickFinder);

    // Drag & Drop Handling for Uploads
    dom.fmDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dom.fmDragOverlay.classList.remove('hidden');
    });

    dom.fmDropZone.addEventListener('dragleave', (e) => {
      if (!dom.fmDropZone.contains(e.relatedTarget)) {
        dom.fmDragOverlay.classList.add('hidden');
      }
    });

    dom.fmDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.fmDragOverlay.classList.add('hidden');

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const content = ev.target.result;
            const fullPath = `${state.currentPath}/${file.name}`;

            fileContents[fullPath] = content;
            if (vfs[state.currentPath]) {
              vfs[state.currentPath].items.push({
                name: file.name,
                type: 'file',
                size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
              });
            }
            renderFileGrid(state.currentPath);
            log(`Archivo subido a la VM: ${file.name} (${Math.round(file.size / 1024)} KB)`, 'success');
          };
          reader.readAsText(file);
        });
      }
    });
  }

  function navigateToFolder(path, addToHistory = true) {
    state.currentPath = path;
    if (addToHistory) {
      state.history = state.history.slice(0, state.historyIndex + 1);
      state.history.push(path);
      state.historyIndex = state.history.length - 1;
    }
    dom.fmCurrentPathLabel.textContent = path;
    renderFileGrid(path);
  }

  function renderFileGrid(path) {
    const dir = vfs[path] || { items: [] };
    dom.fmFileGrid.innerHTML = '';

    if (!dir.items || dir.items.length === 0) {
      dom.fmFileGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Carpeta vacía</div>';
      return;
    }

    dir.items.forEach((item) => {
      const fullPath = `${path}/${item.name}`;
      const itemEl = document.createElement('div');
      itemEl.className = 'fm-item';
      itemEl.tabIndex = 0;

      let iconHtml = '';
      if (item.type === 'dir') {
        iconHtml = `
          <svg class="fm-folder-svg" viewBox="0 0 24 24">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>`;
      } else if (item.isImage || item.name.endsWith('.jpg') || item.name.endsWith('.png')) {
        iconHtml = `
          <svg class="fm-file-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>`;
      } else if (item.name.endsWith('.sh') || item.name.endsWith('.py') || item.name.endsWith('.sql')) {
        iconHtml = `
          <svg class="fm-file-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>`;
      } else {
        iconHtml = `
          <svg class="fm-file-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>`;
      }

      itemEl.innerHTML = `
        <div class="fm-item-icon">${iconHtml}</div>
        <span class="fm-item-name">${escapeHtml(item.name)}</span>
        <span class="fm-item-size">${item.size || '--'}</span>
      `;

      itemEl.addEventListener('click', () => {
        $$('.fm-item').forEach((i) => i.classList.remove('selected'));
        itemEl.classList.add('selected');
      });

      itemEl.addEventListener('dblclick', () => {
        if (item.type === 'dir') {
          navigateToFolder(fullPath);
        } else {
          openFileInEditor(fullPath, item.name);
        }
      });

      dom.fmFileGrid.appendChild(itemEl);
    });
  }


  // ===========================
  // EDITOR / VISOR DE ARCHIVOS & MARKDOWN PREVIEW
  // ===========================
  function initFileEditor() {
    dom.btnEditorSave.addEventListener('click', saveActiveFile);

    // Mode tabs (Edit vs. Preview)
    $$('#editor-mode-tabs .win-subtab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = tab.dataset.editormode;
        $$('#editor-mode-tabs .win-subtab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        if (mode === 'preview') {
          updateMarkdownPreview();
          dom.editorEditView.classList.add('hidden');
          dom.editorPreviewView.classList.remove('hidden');
        } else {
          dom.editorEditView.classList.remove('hidden');
          dom.editorPreviewView.classList.add('hidden');
          dom.editorTextarea.focus();
        }
      });
    });

    dom.editorTextarea.addEventListener('input', () => {
      state.isEditorDirty = true;
      dom.editorSaveIndicator.textContent = 'Modificado';
      dom.editorSaveIndicator.style.color = 'var(--yellow)';
      updateLineNumbers();
      updateMarkdownPreview();
    });

    dom.editorTextarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveActiveFile();
      }
    });
  }

  function openFileInEditor(filePath, fileName) {
    state.currentOpenFile = filePath;
    state.isEditorDirty = false;

    dom.editorFilename.textContent = fileName;
    dom.editorSaveIndicator.textContent = 'Guardado';
    dom.editorSaveIndicator.style.color = 'var(--green)';

    const content = fileContents[filePath] || `# ${fileName}\n\nContenido de ejemplo...`;
    dom.editorTextarea.value = content;
    updateLineNumbers();
    updateMarkdownPreview();

    // If it's a markdown file (.md), start in preview mode by default
    const isMd = fileName.toLowerCase().endsWith('.md');
    const tabs = $$('#editor-mode-tabs .win-subtab');
    if (tabs.length >= 2) {
      tabs.forEach((t) => t.classList.remove('active'));
      if (isMd) {
        tabs[1].classList.add('active');
        dom.editorEditView.classList.add('hidden');
        dom.editorPreviewView.classList.remove('hidden');
      } else {
        tabs[0].classList.add('active');
        dom.editorEditView.classList.remove('hidden');
        dom.editorPreviewView.classList.add('hidden');
      }
    }

    openWindow(dom.winFileEditor);
    log(`Archivo abierto: ${filePath}`, 'info');
  }

  function updateMarkdownPreview() {
    if (!dom.editorPreviewView) return;
    const raw = dom.editorTextarea.value;
    dom.editorPreviewView.innerHTML = parseMarkdown(raw);
  }

  function parseMarkdown(md) {
    if (!md) return '<p style="color: var(--text-muted);">Documento vacío</p>';

    let html = md;

    // Escape raw HTML entities
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Fenced Code blocks
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Horizontal Rule
    html = html.replace(/^---$/gim, '<hr>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Bold and Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links [title](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Unordered lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, (match) => `<ul>${match}</ul>`);
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs (double newlines)
    const blocks = html.split(/\n{2,}/);
    html = blocks.map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (/^<(h[1-4]|pre|ul|ol|blockquote|hr|table)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  }

  function saveActiveFile() {
    if (!state.currentOpenFile) return;
    const content = dom.editorTextarea.value;
    fileContents[state.currentOpenFile] = content;

    fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: state.currentOpenFile, content }),
    }).catch(() => {});

    state.isEditorDirty = false;
    dom.editorSaveIndicator.textContent = 'Guardado';
    dom.editorSaveIndicator.style.color = 'var(--green)';
    updateMarkdownPreview();
    log(`Cambios guardados con éxito en ${state.currentOpenFile}`, 'success');
  }

  function updateLineNumbers() {
    const lines = dom.editorTextarea.value.split('\n').length;
    const numArr = Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1);
    dom.editorLinenumbers.innerHTML = numArr.join('<br>');
  }


  // ===========================
  // QUICK FILE FINDER (CTRL+P)
  // ===========================
  function initQuickFinder() {
    dom.quickFinderInput.addEventListener('input', () => {
      const q = dom.quickFinderInput.value.toLowerCase().trim();
      renderQuickFinderResults(q);
    });

    dom.quickFinderInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeQuickFinder();
      } else if (e.key === 'Enter') {
        const first = dom.quickFinderResults.querySelector('.qf-item');
        if (first) first.click();
      }
    });

    dom.modalQuickOpen.addEventListener('click', (e) => {
      if (e.target === dom.modalQuickOpen) closeQuickFinder();
    });
  }

  function openQuickFinder() {
    dom.modalQuickOpen.classList.remove('hidden');
    dom.quickFinderInput.value = '';
    renderQuickFinderResults('');
    dom.quickFinderInput.focus();
  }

  function closeQuickFinder() {
    dom.modalQuickOpen.classList.add('hidden');
  }

  function renderQuickFinderResults(filter) {
    const allFiles = Object.keys(fileContents).map((path) => ({
      path,
      name: path.split('/').pop(),
    }));

    const filtered = allFiles.filter((f) => f.name.toLowerCase().includes(filter) || f.path.toLowerCase().includes(filter));

    if (filtered.length === 0) {
      dom.quickFinderResults.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 12px;">No se encontraron archivos</div>';
      return;
    }

    dom.quickFinderResults.innerHTML = filtered.map((f) => `
      <div class="qf-item" data-path="${f.path}" data-name="${f.name}">
        <span class="qf-name">${escapeHtml(f.name)}</span>
        <span class="qf-path">${escapeHtml(f.path)}</span>
      </div>
    `).join('');

    $$('.qf-item').forEach((item) => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        const name = item.dataset.name;
        closeQuickFinder();
        openFileInEditor(path, name);
      });
    });
  }


  // ===========================
  // AUTO-STOP TIMER
  // ===========================
  function initAutoStopTimer() {
    dom.btnAutoStopTimer.addEventListener('click', () => {
      dom.modalTimer.classList.remove('hidden');
    });

    dom.btnTimerClose.addEventListener('click', () => {
      dom.modalTimer.classList.add('hidden');
    });

    $$('.btn-timer-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.minutes, 10);
        dom.modalTimer.classList.add('hidden');
        setTimer(mins);
      });
    });
  }

  function setTimer(minutes) {
    if (state.autoStopInterval) {
      clearInterval(state.autoStopInterval);
      state.autoStopInterval = null;
    }

    if (minutes === 0) {
      state.autoStopSecondsLeft = 0;
      dom.autoStopTimerLabel.textContent = 'Auto-Off: Off';
      log('Temporizador de auto-apagado desactivado', 'info');
      return;
    }

    state.autoStopSecondsLeft = minutes * 60;
    log(`Temporizador de auto-apagado activado: ${minutes} minutos`, 'warning');

    state.autoStopInterval = setInterval(() => {
      state.autoStopSecondsLeft -= 1;

      const m = Math.floor(state.autoStopSecondsLeft / 60);
      const s = state.autoStopSecondsLeft % 60;
      dom.autoStopTimerLabel.textContent = `Auto-Off: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      if (state.autoStopSecondsLeft <= 0) {
        clearInterval(state.autoStopInterval);
        state.autoStopInterval = null;
        dom.autoStopTimerLabel.textContent = 'Auto-Off: Off';
        log('Temporizador expirado: Deteniendo la VM automáticamente...', 'warning');
        vmAction('stop');
      }
    }, 1000);
  }


  // ===========================
  // LIVE METRICS TICKER
  // ===========================
  function updateLiveMetrics() {
    if (state.vmStatus === 'RUNNING') {
      const cpu = Math.floor(12 + Math.random() * 12);
      const ramPercent = Math.floor(34 + Math.random() * 4);
      dom.metricCpuVal.textContent = `${cpu}%`;
      dom.metricCpuFill.style.width = `${cpu}%`;

      dom.metricRamVal.textContent = `1.4/4G`;
      dom.metricRamFill.style.width = `${ramPercent}%`;
      dom.metricDiskVal.textContent = `22%`;
    } else {
      dom.metricCpuVal.textContent = `0%`;
      dom.metricCpuFill.style.width = `0%`;
      dom.metricRamVal.textContent = `0/4G`;
      dom.metricRamFill.style.width = `0%`;
      dom.metricDiskVal.textContent = `--`;
    }
  }
  setInterval(updateLiveMetrics, 3000);


  // ===========================
  // VM CONTROL DRAWER (SLIDE-OUT)
  // ===========================
  function initDrawer() {
    dom.btnToggleDrawer.addEventListener('click', toggleDrawer);
    dom.btnCloseDrawer.addEventListener('click', closeDrawer);
    dom.drawerBackdrop.addEventListener('click', closeDrawer);

    dom.btnActionStart.addEventListener('click', () => {
      if (state.vmStatus !== 'RUNNING') togglePower();
    });
    dom.btnActionStop.addEventListener('click', () => {
      if (state.vmStatus === 'RUNNING') togglePower();
    });
    dom.btnActionReset.addEventListener('click', () => {
      dom.btnReset.click();
    });
    dom.btnActionSuspend.addEventListener('click', () => {
      dom.btnSuspend.click();
    });
  }

  function toggleDrawer() {
    dom.vmControlDrawer.classList.toggle('open');
    dom.drawerBackdrop.classList.toggle('hidden');
  }

  function closeDrawer() {
    dom.vmControlDrawer.classList.remove('open');
    dom.drawerBackdrop.classList.add('hidden');
  }


  // ===========================
  // ASCII STATUS BANNER
  // ===========================
  const ASCII_BANNERS = {
    RUNNING: `
 ____  _   _ _   _ _   _ ___ _   _  ____ 
|  _ \\| | | | \\ | | \\ | |_ _| \\ | |/ ___|
| |_) | | | |  \\| |  \\| || ||  \\| | |  _ 
|  _ <| |_| | |\\  | |\\  || || |\\  | |_| |
|_| \\_\\\\___/|_| \\_|_| \\_|___|_| \\_|\\____|`,
    STOPPED: `
 ____ _____ ___  ____  ____  _____ ____  
/ ___|_   _/ _ \\|  _ \\|  _ \\| ____|  _ \\ 
\\___ \\ | || | | | |_) | |_) |  _| | | | |
 ___) || || |_| |  __/|  __/| |___| |_| |
|____/ |_| \\___/|_|   |_|   |_____|____/ `,
    TERMINATED: `
 ____ _____ ___  ____  ____  _____ ____  
/ ___|_   _/ _ \\|  _ \\|  _ \\| ____|  _ \\ 
\\___ \\ | || | | | |_) | |_) |  _| | | | |
 ___) || || |_| |  __/|  __/| |___| |_| |
|____/ |_| \\___/|_|   |_|   |_____|____/ `,
    STAGING: `
 ____ _____  _    ____ ___ _   _  ____ 
/ ___|_   _|/ \\  / ___|_ _| \\ | |/ ___|
\\___ \\ | | / _ \\| |  _ | ||  \\| | |  _ 
 ___) || |/ ___ \\ |_| || || |\\  | |_| |
|____/ |_/_/   \\_\\____|___|_| \\_|\\____|`,
    STOPPING: `
 ____ _____ ___  ____  ____ ___ _   _  ____ 
/ ___|_   _/ _ \\|  _ \\|  _ \\_ _| \\ | |/ ___|
\\___ \\ | || | | | |_) | |_) | ||  \\| | |  _ 
 ___) || || |_| |  __/|  __/| || |\\  | |_| |
|____/ |_| \\___/|_|   |_|  |___|_| \\_|\\____|`,
    SUSPENDED: `
 ____  _   _ ____  ____  _____ _   _ ____  
/ ___|| | | / ___||  _ \\| ____| \\ | |  _ \\ 
\\___ \\| | | \\___ \\| |_) |  _| |  \\| | | | |
 ___) | |_| |___) |  __/| |___| |\\  | |_| |
|____/ \\___/|____/|_|   |_____|_| \\_|____/ `,
  };

  function updateAsciiBanner(status) {
    const s = (status || 'TERMINATED').toUpperCase();
    dom.vmAsciiBanner.textContent = ASCII_BANNERS[s] || ASCII_BANNERS.RUNNING;
    dom.vmAsciiBanner.className = `vm-ascii-banner ${s.toLowerCase()}`;
  }


  // ===========================
  // CONFIRMATION DIALOG
  // ===========================
  function showConfirmDialog({ title, message, confirmText = 'Confirmar', type = 'warning' }) {
    return new Promise((resolve) => {
      dom.modalTitle.textContent = title;
      dom.modalMessage.textContent = message;
      dom.btnModalAction.textContent = confirmText;
      dom.btnModalAction.className = `btn-modal-confirm ${type}`;
      dom.modalIconBadge.className = `modal-icon-badge ${type}`;

      dom.modalConfirm.classList.remove('hidden');

      function cleanup(result) {
        dom.modalConfirm.classList.add('hidden');
        dom.btnModalCancel.removeEventListener('click', onCancel);
        dom.btnModalAction.removeEventListener('click', onConfirm);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      function onCancel() { cleanup(false); }
      function onConfirm() { cleanup(true); }
      function onKey(e) {
        if (e.key === 'Escape') cleanup(false);
        else if (e.key === 'Enter') cleanup(true);
      }

      dom.btnModalCancel.addEventListener('click', onCancel);
      dom.btnModalAction.addEventListener('click', onConfirm);
      document.addEventListener('keydown', onKey);
    });
  }


  // ===========================
  // GOOGLE OAUTH & DEMO MODE
  // ===========================
  function initGoogleAuth() {
    dom.loginClientId.addEventListener('input', () => {
      dom.btnGoogleLogin.disabled = !dom.loginClientId.value.trim();
    });

    if (state.config.clientId) {
      dom.loginClientId.value = state.config.clientId;
      dom.btnGoogleLogin.disabled = false;
    }

    dom.btnGoogleLogin.addEventListener('click', startGoogleLogin);
    dom.btnDemoMode.addEventListener('click', startDemoMode);
  }

  function startDemoMode() {
    state.isDemo = true;
    state.demoVmStatus = 'RUNNING';
    state.user = { name: 'Demo Admin', email: 'demo@omarchy.dev' };
    state.config.project = state.config.project || 'my-project';
    state.config.zone = state.config.zone || 'us-central1-a';
    state.config.instance = state.config.instance || 'my-server-01';
    state.config.pollInterval = 5;

    dom.userName.textContent = 'Demo Admin';
    showApp();

    log('Entorno de escritorio Omarchy iniciado (Modo Simulación)', 'success');
    log('VM status: RUNNING (10.128.0.45)', 'success');
    log('Explorador de archivos conectado (/home/user/Documents)', 'info');
    log('Métricas de CPU, RAM y Docker inicializadas', 'info');
  }

  function startGoogleLogin() {
    const clientId = dom.loginClientId.value.trim();
    if (!clientId) return;

    state.isDemo = false;
    state.config.clientId = clientId;
    saveConfig();

    if (typeof google === 'undefined' || !google.accounts) {
      log('Google Identity Services no cargó. Verifica conexión a internet.', 'error');
      return;
    }

    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/compute https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: handleTokenResponse,
    });

    state.tokenClient.requestAccessToken();
  }

  function handleTokenResponse(response) {
    if (response.error) {
      log(`OAuth error: ${response.error}`, 'error');
      return;
    }

    state.accessToken = response.access_token;
    log('Autenticación Google exitosa', 'success');

    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${state.accessToken}` },
    })
      .then((r) => r.json())
      .then((user) => {
        state.user = user;
        dom.userName.textContent = user.name || user.email || 'User';
        log(`Sesión iniciada como ${user.email}`, 'info');
      })
      .catch(() => {
        dom.userName.textContent = 'User';
      });

    showApp();
  }

  function logout() {
    state.accessToken = null;
    state.user = null;
    state.vmStatus = null;
    state.isDemo = false;
    stopPolling();

    if (state.accessToken && google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(state.accessToken);
    }

    dom.app.classList.add('hidden');
    dom.loginScreen.classList.remove('hidden');
    log('Sesión cerrada', 'warning');
  }


  // ===========================
  // SHOW APP & POLLING
  // ===========================
  function showApp() {
    dom.loginScreen.classList.add('hidden');
    dom.app.classList.remove('hidden');

    dom.settingProject.value = state.config.project;
    dom.settingZone.value = state.config.zone;
    dom.settingInstance.value = state.config.instance;
    dom.settingPoll.value = state.config.pollInterval;

    updateVmDisplay();
    updateDockStatus();
    startPolling();
  }

  function saveConfig() {
    localStorage.setItem('omarchy-vm-config', JSON.stringify(state.config));
  }

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem('omarchy-vm-config'));
      if (saved) Object.assign(state.config, saved);
    } catch (e) { /* ignore */ }
  }


  // ===========================
  // API CALLS & VM ACTIONS
  // ===========================
  function apiUrl(endpoint) {
    const { project, zone, instance } = state.config;
    return `/api/vm/${endpoint}?project=${encodeURIComponent(project)}&zone=${encodeURIComponent(zone)}&instance=${encodeURIComponent(instance)}`;
  }

  function apiHeaders() {
    return {
      Authorization: `Bearer ${state.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  function getDemoVmDetails() {
    return {
      name: state.config.instance || 'my-server-01',
      id: '8492049182947192',
      status: state.demoVmStatus || 'RUNNING',
      machineType: 'e2-medium (2 vCPU, 4 GB)',
      zone: state.config.zone || 'us-central1-a',
      creationTimestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      lastStartTimestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      cpuPlatform: 'Intel Broadwell',
      networkInterfaces: [
        {
          name: 'nic0',
          network: 'default-vpc',
          subnetwork: 'us-central1-subnet',
          internalIp: '10.128.0.45',
          externalIp: '35.224.112.89',
        },
      ],
      disks: [
        {
          name: 'boot-disk-root',
          sizeGb: '20',
          type: 'pd-balanced',
          boot: true,
          mode: 'READ_WRITE',
        },
        {
          name: 'data-storage-vol',
          sizeGb: '100',
          type: 'pd-ssd',
          boot: false,
          mode: 'READ_WRITE',
        },
      ],
    };
  }

  async function fetchVmDetails() {
    if (state.isDemo) {
      const data = getDemoVmDetails();
      state.vmStatus = data.status;
      updateVmUI(data);
      return;
    }

    if (!state.accessToken || !state.config.project) return;

    try {
      const res = await fetch(apiUrl('details'), { headers: apiHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const prevStatus = state.vmStatus;
      state.vmStatus = data.status;

      if (prevStatus !== data.status) {
        log(`VM status: ${data.status}`, data.status === 'RUNNING' ? 'success' : 'info');
      }

      updateVmUI(data);
    } catch (err) {
      log(`Error al consultar VM: ${err.message}`, 'error');
    }
  }

  async function vmAction(action) {
    if (state.isDemo) {
      log(`Ejecutando acción ${action}...`, 'info');

      if (action === 'stop') {
        state.demoVmStatus = 'STOPPING';
        fetchVmDetails();
        setTimeout(() => {
          state.demoVmStatus = 'TERMINATED';
          log('VM detenida exitosamente (Simulado)', 'warning');
          fetchVmDetails();
        }, 1500);
      } else if (action === 'start') {
        state.demoVmStatus = 'STAGING';
        fetchVmDetails();
        setTimeout(() => {
          state.demoVmStatus = 'RUNNING';
          log('VM iniciada y activa (Simulado)', 'success');
          fetchVmDetails();
        }, 1500);
      } else if (action === 'reset') {
        state.demoVmStatus = 'STAGING';
        fetchVmDetails();
        setTimeout(() => {
          state.demoVmStatus = 'RUNNING';
          log('VM reiniciada (Simulado)', 'success');
          fetchVmDetails();
        }, 1500);
      } else if (action === 'suspend') {
        state.demoVmStatus = 'SUSPENDING';
        fetchVmDetails();
        setTimeout(() => {
          state.demoVmStatus = 'SUSPENDED';
          log('VM suspendida (Simulado)', 'warning');
          fetchVmDetails();
        }, 1500);
      } else if (action === 'resume') {
        state.demoVmStatus = 'STAGING';
        fetchVmDetails();
        setTimeout(() => {
          state.demoVmStatus = 'RUNNING';
          log('VM reanudada (Simulado)', 'success');
          fetchVmDetails();
        }, 1500);
      }
      return;
    }

    if (!state.accessToken || !state.config.project) return;
    log(`Enviando comando ${action}...`, 'info');

    try {
      const res = await fetch(apiUrl(action), { method: 'POST', headers: apiHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      log(`${action} iniciado (operación: ${data.operation || 'ok'})`, 'success');
      setTimeout(fetchVmDetails, 2000);
      setTimeout(fetchVmDetails, 5000);
    } catch (err) {
      log(`${action} falló: ${err.message}`, 'error');
    }
  }

  async function fetchSerialOutput() {
    if (state.isDemo) {
      dom.serialOutput.textContent = [
        `[    0.000000] Linux version 6.6.137+ (builder@google-build) (gcc 12.2.0) #1 SMP PREEMPT_DYNAMIC`,
        `[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-6.6.137 root=UUID=7e8b91 console=ttyS0`,
        `[    0.124891] CPU0: Intel Broadwell @ 2.20GHz`,
        `[    0.341029] Memory: 4018240K/4194304K available (14336K kernel code, 2304K rwdata)`,
        `[    0.781203] systemd[1]: Starting Google Compute Engine guest environment...`,
        `[    1.042194] google-guest-agent[412]: Instance ID: 8492049182947192`,
        `[    1.218943] google-network-setup[418]: Configured nic0 (10.128.0.45/32)`,
        `[    1.459012] sshd[520]: Server listening on 0.0.0.0 port 22.`,
        `[    1.782019] systemd[1]: Reached target Multi-User System.`,
        `[    1.789102] omarchy-vm-daemon[602]: Ready. Listening for RPC control commands.`,
      ].join('\n');
      dom.serialOutput.scrollTop = dom.serialOutput.scrollHeight;
      return;
    }

    if (!state.accessToken || !state.config.project) return;
    try {
      const res = await fetch(apiUrl('serial-port'), { headers: apiHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      dom.serialOutput.textContent = data.contents || 'Sin salida serial.';
      dom.serialOutput.scrollTop = dom.serialOutput.scrollHeight;
    } catch (err) {
      dom.serialOutput.textContent = `Error: ${err.message}`;
    }
  }


  // ===========================
  // UI SYNC
  // ===========================
  function updateVmDisplay() {
    const name = state.config.instance || (state.isDemo ? 'my-server-01' : '--');
    dom.vmName.textContent = name;
    dom.topBarInstance.textContent = name;
    dom.detailProject.textContent = state.config.project || (state.isDemo ? 'my-project' : '--');
    dom.detailZone.textContent = state.config.zone || (state.isDemo ? 'us-central1-a' : '--');
  }

  function updateVmUI(data) {
    const status = (data.status || 'TERMINATED').toUpperCase();
    const statusClass = status.toLowerCase();

    updateAsciiBanner(status);

    dom.vmStatusBadge.textContent = status;
    dom.vmStatusBadge.className = `panel-badge ${statusClass}`;
    dom.topBarStatusDot.className = `status-dot ${statusClass}`;

    dom.btnPower.className = `power-button ${statusClass}`;
    dom.btnPower.disabled = false;
    dom.powerLabel.textContent = status;

    dom.vmName.textContent = data.name || '--';
    dom.topBarInstance.textContent = data.name || '--';
    dom.detailMachine.textContent = data.machineType || '--';
    dom.detailCpu.textContent = data.cpuPlatform || '--';

    if (data.networkInterfaces && data.networkInterfaces.length > 0) {
      dom.detailInternalIp.textContent = data.networkInterfaces[0].internalIp || '--';
      dom.detailExternalIp.textContent = data.networkInterfaces[0].externalIp || '--';
    }

    if (data.lastStartTimestamp) {
      dom.detailStarted.textContent = new Date(data.lastStartTimestamp).toLocaleString();
    } else {
      dom.detailStarted.textContent = '--';
    }

    if (data.disks && data.disks.length > 0) {
      dom.disksList.innerHTML = data.disks.map((d) => `
        <div class="info-card">
          <div class="info-card-title">${escapeHtml(d.name || 'disk')}</div>
          <div class="info-card-row"><span>Size</span><span>${d.sizeGb || '?'} GB</span></div>
          <div class="info-card-row"><span>Type</span><span>${d.type || '--'}</span></div>
          <div class="info-card-row"><span>Boot</span><span>${d.boot ? 'Yes' : 'No'}</span></div>
        </div>
      `).join('');
    }

    if (data.networkInterfaces && data.networkInterfaces.length > 0) {
      dom.networkList.innerHTML = data.networkInterfaces.map((ni) => `
        <div class="info-card">
          <div class="info-card-title">${escapeHtml(ni.name || 'nic')}</div>
          <div class="info-card-row"><span>Subnet</span><span>${ni.subnetwork || '--'}</span></div>
          <div class="info-card-row"><span>Internal IP</span><span>${ni.internalIp || '--'}</span></div>
          <div class="info-card-row"><span>External IP</span><span>${ni.externalIp || '--'}</span></div>
        </div>
      `).join('');
    }
  }

  function startPolling() {
    state.isPolling = true;
    fetchVmDetails();
    fetchSerialOutput();
    state.pollTimer = setInterval(fetchVmDetails, state.config.pollInterval * 1000);
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
    state.isPolling = false;
  }

  async function togglePower() {
    if (!state.vmStatus) return;
    const status = state.vmStatus.toUpperCase();
    const vmName = state.config.instance || (state.isDemo ? 'my-server-01' : 'VM');

    if (status === 'RUNNING') {
      const confirmed = await showConfirmDialog({
        title: 'Detener Instancia VM',
        message: `¿Estás seguro de que deseas apagar y detener la máquina virtual "${vmName}"?`,
        confirmText: 'Apagar VM',
        type: 'danger',
      });
      if (confirmed) vmAction('stop');
    } else if (status === 'STOPPED' || status === 'TERMINATED') {
      const confirmed = await showConfirmDialog({
        title: 'Encender Instancia VM',
        message: `¿Deseas iniciar y encender la máquina virtual "${vmName}"?`,
        confirmText: 'Encender VM',
        type: 'success',
      });
      if (confirmed) vmAction('start');
    } else if (status === 'SUSPENDED') {
      const confirmed = await showConfirmDialog({
        title: 'Reanudar Instancia VM',
        message: `¿Deseas reanudar la ejecución de la máquina virtual "${vmName}"?`,
        confirmText: 'Reanudar VM',
        type: 'success',
      });
      if (confirmed) vmAction('resume');
    }
  }


  // ===========================
  // TABS & SETTINGS
  // ===========================
  function initTabs() {
    $$('.panel-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        $$('.panel-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        $$('.tab-content').forEach((c) => c.classList.remove('active'));
        const content = $(`#tab-${target}`);
        if (content) content.classList.add('active');
      });
    });
  }

  function toggleSettings(forceOpen) {
    const isHidden = dom.settingsPanel.classList.contains('hidden');
    if (forceOpen === true || isHidden) {
      dom.settingsPanel.classList.remove('hidden');
    } else {
      dom.settingsPanel.classList.add('hidden');
    }
  }

  function saveSettings() {
    state.config.project = dom.settingProject.value.trim();
    state.config.zone = dom.settingZone.value.trim();
    state.config.instance = dom.settingInstance.value.trim();
    state.config.pollInterval = Math.max(2, Math.min(60, parseInt(dom.settingPoll.value, 10) || 5));
    saveConfig();

    dom.settingsPanel.classList.add('hidden');
    log(`Configuración guardada: ${state.config.instance}@${state.config.zone}`, 'success');

    updateVmDisplay();
    stopPolling();
    startPolling();
  }


  // ===========================
  // EVENT BINDINGS
  // ===========================
  function bindEvents() {
    // Menu Dropdown
    dom.btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.quickMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!dom.quickMenu.classList.contains('hidden')) {
        if (!dom.quickMenu.contains(e.target) && !dom.btnMenu.contains(e.target)) {
          dom.quickMenu.classList.add('hidden');
        }
      }
    });

    $$('.menu-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        dom.quickMenu.classList.add('hidden');

        switch (action) {
          case 'open-files':
            openWindow(dom.winFileManager);
            break;
          case 'open-logs':
            openWindow(dom.winActivityLog);
            break;
          case 'open-docker':
            openWindow(dom.winDocker);
            break;
          case 'open-git':
            openWindow(dom.winGitGraph);
            break;
          case 'quick-finder':
            openQuickFinder();
            break;
          case 'toggle-drawer':
            toggleDrawer();
            break;
          case 'settings':
            toggleSettings(true);
            break;
          case 'gcp-console': {
            const project = state.config.project || 'my-project';
            window.open(`https://console.cloud.google.com/compute/instances?project=${encodeURIComponent(project)}`, '_blank');
            break;
          }
          case 'logout':
            logout();
            break;
        }
      });
    });

    // Logout & Settings
    dom.btnLogout.addEventListener('click', logout);
    dom.btnSettings.addEventListener('click', () => toggleSettings());
    dom.btnSaveSettings.addEventListener('click', saveSettings);
    dom.btnCloseSettings.addEventListener('click', () => dom.settingsPanel.classList.add('hidden'));

    // Power
    dom.btnPower.addEventListener('click', togglePower);

    // Reset & Suspend actions
    dom.btnActionReset.addEventListener('click', async () => {
      const vmName = state.config.instance || (state.isDemo ? 'my-server-01' : 'VM');
      const confirmed = await showConfirmDialog({
        title: 'Reiniciar Instancia (Hard Reset)',
        message: `¿Estás seguro de que deseas reiniciar forzadamente "${vmName}"?`,
        confirmText: 'Reiniciar VM',
        type: 'danger',
      });
      if (confirmed) vmAction('reset');
    });

    dom.btnActionSuspend.addEventListener('click', async () => {
      const vmName = state.config.instance || (state.isDemo ? 'my-server-01' : 'VM');
      const confirmed = await showConfirmDialog({
        title: 'Suspender Instancia VM',
        message: `¿Deseas suspender la máquina virtual "${vmName}"?`,
        confirmText: 'Suspender VM',
        type: 'warning',
      });
      if (confirmed) vmAction('suspend');
    });

    // Clear Terminal Log
    dom.btnClearLog.addEventListener('click', () => {
      dom.logContainer.innerHTML = '';
      log('Terminal limpia', 'info');
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        openQuickFinder();
      } else if (e.ctrlKey && e.key.toLowerCase() === 's' && !e.target.matches('textarea, input')) {
        e.preventDefault();
        toggleDrawer();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        fetchVmDetails();
        log('Actualización manual de estado', 'info');
      } else if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        toggleSettings();
      }
    });
  }


  // ===========================
  // INITIALIZATION
  // ===========================
  function init() {
    loadConfig();
    initGoogleAuth();
    initWindowManager();
    initDock();
    initTerminalSubtabs();
    initDockerWindow();
    initGitWindow();
    initFileManager();
    initFileEditor();
    initQuickFinder();
    initAutoStopTimer();
    initDrawer();
    initTabs();
    bindEvents();
    log('OMARCHY VM Desktop inicializado con utilidades avanzadas', 'info');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

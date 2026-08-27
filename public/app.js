/* =========================================================
   OMARCHY VM - Desktop Environment Client Application
   Window Manager + GNOME Files + Code Editor + VM Control Drawer
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
    '/home/user/Work/docker-compose.yml': `version: '3.8'\nservices:\n  app:\n    image: node:22-alpine\n    working_dir: /app\n    volumes:\n      - .:/app\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n    command: npm start`,
    '/home/user/Work/database.sql': `CREATE TABLE IF NOT EXISTS vm_audit_logs (\n  id SERIAL PRIMARY KEY,\n  instance_name VARCHAR(64) NOT NULL,\n  action VARCHAR(32) NOT NULL,\n  user_email VARCHAR(128),\n  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`,
  };


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

    // Top Bar
    btnMenu: $('#btn-menu'),
    quickMenu: $('#quick-menu'),
    topBarClock: $('#top-bar-clock'),
    topBarStatusDot: $('#top-bar-status-dot'),
    topBarInstance: $('#top-bar-instance'),
    btnToggleDrawer: $('#btn-toggle-drawer'),
    btnSettings: $('#btn-settings'),
    userName: $('#user-name'),
    btnLogout: $('#btn-logout'),

    // Floating Windows
    winFileManager: $('#win-file-manager'),
    winActivityLog: $('#win-activity-log'),
    winFileEditor: $('#win-file-editor'),

    // File Manager Components
    fmCurrentPathLabel: $('#fm-current-path-label'),
    fmFileGrid: $('#fm-file-grid'),
    fmBtnBack: $('#fm-btn-back'),
    fmBtnForward: $('#fm-btn-forward'),

    // Editor Components
    editorFilename: $('#editor-filename'),
    editorSaveIndicator: $('#editor-save-indicator'),
    btnEditorSave: $('#btn-editor-save'),
    editorTextarea: $('#editor-textarea'),
    editorLinenumbers: $('#editor-linenumbers'),

    // Terminal / Log
    logContainer: $('#log-container'),
    btnClearLog: $('#btn-clear-log'),

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

    // Settings
    settingsPanel: $('#settings-panel'),
    settingProject: $('#setting-project'),
    settingZone: $('#setting-zone'),
    settingInstance: $('#setting-instance'),
    settingPoll: $('#setting-poll'),
    btnSaveSettings: $('#btn-save-settings'),
    btnCloseSettings: $('#btn-close-settings'),

    // Confirmation Modal
    modalConfirm: $('#modal-confirm'),
    modalTitle: $('#modal-title'),
    modalMessage: $('#modal-message'),
    modalIconBadge: $('#modal-icon-badge'),
    btnModalCancel: $('#btn-modal-cancel'),
    btnModalAction: $('#btn-modal-action'),

    // Bottom Bar
    connectionStatus: $('#connection-status'),
    pollIndicator: $('#poll-indicator'),
    lastUpdate: $('#last-update'),
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
  // WINDOW MANAGER (DRAG / FOCUS / MIN / MAX)
  // ===========================
  function initWindowManager() {
    $$('.desktop-window').forEach((win) => {
      // Bring to front on click
      win.addEventListener('mousedown', () => bringWindowToFront(win));

      const header = win.querySelector('.window-header');
      if (!header) return;

      // Dragging logic
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-controls') || e.target.closest('input') || e.target.closest('button')) return;
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

      // Window Control Buttons
      const btnClose = win.querySelector('.win-btn-close');
      if (btnClose) {
        btnClose.addEventListener('click', (e) => {
          e.stopPropagation();
          win.classList.add('hidden');
        });
      }

      const btnMin = win.querySelector('.win-btn-min');
      if (btnMin) {
        btnMin.addEventListener('click', (e) => {
          e.stopPropagation();
          win.classList.add('is-minimized');
        });
      }

      const btnMax = win.querySelector('.win-btn-max');
      if (btnMax) {
        btnMax.addEventListener('click', (e) => {
          e.stopPropagation();
          win.classList.toggle('is-maximized');
        });
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
  }


  // ===========================
  // EXPLORADOR DE ARCHIVOS (GNOME FILES)
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

      // Icon determination
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

      // Click to select
      itemEl.addEventListener('click', () => {
        $$('.fm-item').forEach((i) => i.classList.remove('selected'));
        itemEl.classList.add('selected');
      });

      // Double Click
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
  // EDITOR / VISOR DE ARCHIVOS
  // ===========================
  function initFileEditor() {
    dom.btnEditorSave.addEventListener('click', saveActiveFile);

    dom.editorTextarea.addEventListener('input', () => {
      state.isEditorDirty = true;
      dom.editorSaveIndicator.textContent = 'Modificado';
      dom.editorSaveIndicator.style.color = 'var(--yellow)';
      updateLineNumbers();
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

    openWindow(dom.winFileEditor);
    log(`Archivo abierto: ${filePath}`, 'info');
  }

  function saveActiveFile() {
    if (!state.currentOpenFile) return;
    const content = dom.editorTextarea.value;
    fileContents[state.currentOpenFile] = content;

    // Send to backend virtual file API if online
    fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: state.currentOpenFile, content }),
    }).catch(() => { /* local cache already updated */ });

    state.isEditorDirty = false;
    dom.editorSaveIndicator.textContent = 'Guardado';
    dom.editorSaveIndicator.style.color = 'var(--green)';
    log(`Cambios guardados con éxito en ${state.currentOpenFile}`, 'success');
  }

  function updateLineNumbers() {
    const lines = dom.editorTextarea.value.split('\n').length;
    const numArr = Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1);
    dom.editorLinenumbers.innerHTML = numArr.join('<br>');
  }


  // ===========================
  // VM CONTROL DRAWER (SLIDE-OUT)
  // ===========================
  function initDrawer() {
    dom.btnToggleDrawer.addEventListener('click', toggleDrawer);
    dom.btnCloseDrawer.addEventListener('click', closeDrawer);
    dom.drawerBackdrop.addEventListener('click', closeDrawer);

    // Text Actions
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

  function openDrawer() {
    dom.vmControlDrawer.classList.add('open');
    dom.drawerBackdrop.classList.remove('hidden');
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
    log('Todos los servicios listos para interactuar', 'info');
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
      updateConnectionStatus(true);
      dom.lastUpdate.textContent = `Last: ${new Date().toLocaleTimeString()}`;
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
      updateConnectionStatus(true);
      dom.lastUpdate.textContent = `Last: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      log(`Error al consultar VM: ${err.message}`, 'error');
      updateConnectionStatus(false);
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

    // Disks
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

    // Network
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

  function updateConnectionStatus(connected) {
    if (connected) {
      dom.connectionStatus.className = 'connection-indicator connected';
      dom.connectionStatus.innerHTML = '<span class="conn-dot"></span>CONNECTED';
    } else {
      dom.connectionStatus.className = 'connection-indicator';
      dom.connectionStatus.innerHTML = '<span class="conn-dot"></span>DISCONNECTED';
    }
  }

  function startPolling() {
    state.isPolling = true;
    dom.pollIndicator.textContent = `Poll: ${state.config.pollInterval}s`;
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

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toggleDrawer();
      } else if (e.ctrlKey && e.key === 'r') {
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
    initFileManager();
    initFileEditor();
    initDrawer();
    initTabs();
    bindEvents();
    log('OMARCHY VM Desktop inicializado', 'info');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

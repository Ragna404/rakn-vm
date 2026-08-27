/**
 * File System Service
 * Manages virtual file system storage for previewing and editing VM files.
 */

// In-memory virtual guest file system storage
const virtualFileSystem = {
  '/home/user': {
    type: 'dir',
    name: 'user',
    children: ['Desktop', 'Documents', 'Downloads', 'Music', 'Pictures', 'Public', 'Templates', 'Videos', 'Wallpapers', 'Work'],
  },
  '/home/user/Desktop': {
    type: 'dir',
    name: 'Desktop',
    children: ['vm-dashboard.desktop', 'notes.txt'],
  },
  '/home/user/Desktop/vm-dashboard.desktop': {
    type: 'file',
    name: 'vm-dashboard.desktop',
    size: '240 B',
    updated: '2026-08-26 22:10',
    content: `[Desktop Entry]\nName=Omarchy VM Control\nExec=/usr/bin/omarchy-vm\nIcon=utilities-terminal\nType=Application\nCategories=System;Development;`,
  },
  '/home/user/Desktop/notes.txt': {
    type: 'file',
    name: 'notes.txt',
    size: '185 B',
    updated: '2026-08-26 23:15',
    content: `TODO:\n- Verificar certificados SSL en nginx\n- Configurar backup diario con Cloud Storage\n- Revisar métricas de CPU en us-central1-a\n- Actualizar paquetes pacman -Syu`,
  },
  '/home/user/Documents': {
    type: 'dir',
    name: 'Documents',
    children: ['architecture.md', 'gcp-config.json', 'setup.sh', 'server.log'],
  },
  '/home/user/Documents/architecture.md': {
    type: 'file',
    name: 'architecture.md',
    size: '1.2 KB',
    updated: '2026-08-26 20:00',
    content: `# Omarchy VM Architecture\n\n## Overview\nNode.js backend with Express, Google Identity Services OAuth2, and Omarchy-styled desktop frontend.\n\n## VM Specs\n- Zone: us-central1-a\n- Machine Type: e2-medium (2 vCPUs, 4 GB RAM)\n- OS: Arch Linux / Omarchy`,
  },
  '/home/user/Documents/gcp-config.json': {
    type: 'file',
    name: 'gcp-config.json',
    size: '430 B',
    updated: '2026-08-26 21:30',
    content: `{\n  "project": "my-project",\n  "zone": "us-central1-a",\n  "instance": "my-server-01",\n  "machineType": "e2-medium",\n  "network": "default-vpc",\n  "tags": ["omarchy", "http-server", "ssh-ready"]\n}`,
  },
  '/home/user/Documents/setup.sh': {
    type: 'file',
    name: 'setup.sh',
    size: '310 B',
    updated: '2026-08-26 19:45',
    content: `#!/usr/bin/env bash\nset -euo pipefail\n\necho "==> Setting up Omarchy VM Environment..."\nsudo pacman -Sy --noconfirm neovim tmux htop fastfetch\nsystemctl enable --now sshd\necho "==> Setup completed successfully."`,
  },
  '/home/user/Documents/server.log': {
    type: 'file',
    name: 'server.log',
    size: '890 B',
    updated: '2026-08-26 23:25',
    content: `[2026-08-26 23:20:01] INFO: daemon initialized\n[2026-08-26 23:20:05] INFO: network interface nic0 configured (10.128.0.45)\n[2026-08-26 23:22:15] INFO: RPC client connected from frontend\n[2026-08-26 23:25:30] STATUS: all systems operational`,
  },
  '/home/user/Downloads': {
    type: 'dir',
    name: 'Downloads',
    children: ['omarchy-theme.tar.gz', 'google-cloud-cli.zip'],
  },
  '/home/user/Downloads/omarchy-theme.tar.gz': {
    type: 'file',
    name: 'omarchy-theme.tar.gz',
    size: '2.4 MB',
    updated: '2026-08-25 14:10',
    content: '[Binary data: Omarchy dark theme archive]',
  },
  '/home/user/Downloads/google-cloud-cli.zip': {
    type: 'file',
    name: 'google-cloud-cli.zip',
    size: '48.2 MB',
    updated: '2026-08-24 11:20',
    content: '[Binary data: Google Cloud SDK package]',
  },
  '/home/user/Pictures': {
    type: 'dir',
    name: 'Pictures',
    children: ['wallpaper-nord.jpg', 'concept-preview.png'],
  },
  '/home/user/Pictures/wallpaper-nord.jpg': {
    type: 'file',
    name: 'wallpaper-nord.jpg',
    size: '1.4 MB',
    updated: '2026-08-20 09:15',
    isImage: true,
    content: '',
  },
  '/home/user/Pictures/concept-preview.png': {
    type: 'file',
    name: 'concept-preview.png',
    size: '980 KB',
    updated: '2026-08-22 18:40',
    isImage: true,
    content: '',
  },
  '/home/user/Work': {
    type: 'dir',
    name: 'Work',
    children: ['cloud-functions.py', 'docker-compose.yml', 'database.sql'],
  },
  '/home/user/Work/cloud-functions.py': {
    type: 'file',
    name: 'cloud-functions.py',
    size: '520 B',
    updated: '2026-08-26 18:20',
    content: `import functions_framework\n\n@functions_framework.http\ndef handle_vm_event(request):\n    request_json = request.get_json(silent=True)\n    print(f"Received VM event: {request_json}")\n    return {"status": "success", "processed": True}`,
  },
  '/home/user/Work/docker-compose.yml': {
    type: 'file',
    name: 'docker-compose.yml',
    size: '340 B',
    updated: '2026-08-26 17:15',
    content: `version: '3.8'\nservices:\n  app:\n    image: node:22-alpine\n    working_dir: /app\n    volumes:\n      - .:/app\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n    command: npm start`,
  },
  '/home/user/Work/database.sql': {
    type: 'file',
    name: 'database.sql',
    size: '410 B',
    updated: '2026-08-26 16:50',
    content: `CREATE TABLE IF NOT EXISTS vm_audit_logs (\n  id SERIAL PRIMARY KEY,\n  instance_name VARCHAR(64) NOT NULL,\n  action VARCHAR(32) NOT NULL,\n  user_email VARCHAR(128),\n  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`,
  },
  '/home/user/Music': { type: 'dir', name: 'Music', children: [] },
  '/home/user/Public': { type: 'dir', name: 'Public', children: [] },
  '/home/user/Templates': { type: 'dir', name: 'Templates', children: [] },
  '/home/user/Videos': { type: 'dir', name: 'Videos', children: [] },
  '/home/user/Wallpapers': { type: 'dir', name: 'Wallpapers', children: [] },
};

function normalizePath(p) {
  if (!p) return '/home/user';
  let cleaned = p.replace(/\/+/g, '/');
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

function listDirectory(dirPath) {
  const normalized = normalizePath(dirPath);
  const entry = virtualFileSystem[normalized];
  if (!entry || entry.type !== 'dir') {
    throw { status: 404, message: `Directory not found: ${normalized}` };
  }

  const items = entry.children.map((childName) => {
    const fullPath = `${normalized}/${childName}`;
    const childEntry = virtualFileSystem[fullPath] || { type: 'file', size: '0 B', updated: 'Recently' };
    return {
      name: childName,
      path: fullPath,
      type: childEntry.type,
      size: childEntry.size || (childEntry.type === 'dir' ? '--' : '1 KB'),
      updated: childEntry.updated || '2026-08-26',
      isImage: childEntry.isImage || false,
    };
  });

  return {
    path: normalized,
    name: entry.name,
    items,
  };
}

function readFile(filePath) {
  const normalized = normalizePath(filePath);
  const entry = virtualFileSystem[normalized];
  if (!entry) {
    throw { status: 404, message: `File not found: ${normalized}` };
  }
  if (entry.type === 'dir') {
    throw { status: 400, message: `Cannot read directory as file: ${normalized}` };
  }

  return {
    path: normalized,
    name: entry.name,
    content: entry.content || '',
    size: entry.size,
    updated: entry.updated,
    isImage: entry.isImage || false,
  };
}

function writeFile(filePath, content) {
  const normalized = normalizePath(filePath);
  const parentPath = normalized.substring(0, normalized.lastIndexOf('/')) || '/home/user';
  const fileName = normalized.substring(normalized.lastIndexOf('/') + 1);

  if (!virtualFileSystem[parentPath]) {
    throw { status: 404, message: `Parent directory not found: ${parentPath}` };
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');

  virtualFileSystem[normalized] = {
    type: 'file',
    name: fileName,
    content: String(content || ''),
    size: `${Math.max(1, Math.round(String(content || '').length / 1024))} KB`,
    updated: dateStr,
  };

  if (!virtualFileSystem[parentPath].children.includes(fileName)) {
    virtualFileSystem[parentPath].children.push(fileName);
  }

  return {
    status: 'ok',
    path: normalized,
    name: fileName,
    size: virtualFileSystem[normalized].size,
    updated: dateStr,
  };
}

module.exports = {
  listDirectory,
  readFile,
  writeFile,
  virtualFileSystem,
};

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const http = require('http');

class ServerManager {
    constructor() {
        this.serverProcess = null;
        this.port = null;
    }

    /**
     * Attempts to find and start a standalone Next.js server.
     * @param {string} resourcesPath - Path to resources (from process.resourcesPath)
     * @param {string} appRoot - App root path
     * @returns {Promise<string|null>} - Returns the local URL if started, or null if not found/failed.
     */
    async startServer(resourcesPath, appRoot) {
        // 1. Identify Candidate Directories
        const standaloneCandidates = [
            path.join(resourcesPath, 'beyon79', '.next', 'standalone'),
            path.join(appRoot, 'beyon79', '.next', 'standalone'),
            path.join(__dirname, '..', '..', 'beyon79', '.next', 'standalone')
        ];

        let standaloneRoot = null;
        for (const sc of standaloneCandidates) {
            try {
                if (fs.existsSync(sc)) { standaloneRoot = sc; break; }
            } catch (e) { }
        }

        if (!standaloneRoot) return null;

        // 2. Identify App Folder (with server.js)
        let appFolder = null;
        try {
            const children = fs.readdirSync(standaloneRoot).filter(x => x && x !== 'node_modules');
            for (const c of children) {
                const candidate = path.join(standaloneRoot, c);
                const srv = path.join(candidate, 'server.js');
                if (fs.existsSync(srv)) { appFolder = candidate; break; }
            }
            // If server.js is at top level
            if (!appFolder) {
                const topSrv = path.join(standaloneRoot, 'server.js');
                if (fs.existsSync(topSrv)) appFolder = standaloneRoot;
            }
        } catch (e) {
            console.error('[ServerManager] Error finding app folder:', e.message);
            return null;
        }

        if (!appFolder) return null;

        // 3. Find Free Port
        try {
            this.port = await this.findFreePort();
        } catch (e) {
            console.error('[ServerManager] Failed to find free port:', e.message);
            return null;
        }

        if (!this.port) return null;

        // 4. Spawn Process
        const serverJs = fs.existsSync(path.join(appFolder, 'server.js')) ? path.join(appFolder, 'server.js') : path.join(standaloneRoot, 'server.js');
        console.log('[ServerManager] Starting bundled Next standalone server:', serverJs, 'on port', this.port);

        this.serverProcess = spawn(process.execPath || 'node', [serverJs], {
            cwd: appFolder,
            env: Object.assign({}, process.env, { PORT: String(this.port) }),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.serverProcess.stdout && this.serverProcess.stdout.on('data', (d) => console.log('[next-standalone]', d.toString().trim()));
        this.serverProcess.stderr && this.serverProcess.stderr.on('data', (d) => console.error('[next-standalone][err]', d.toString().trim()));

        // 5. Poll for Readiness
        const urlToLoad = `http://127.0.0.1:${this.port}/admin-unified?tab=Active`;
        const ready = await this.pollServer(urlToLoad);

        if (ready) {
            return urlToLoad;
        } else {
            console.error('[ServerManager] Server did not become ready within timeout.');
            this.stopServer(); // Cleanup if failed to start
            return null;
        }
    }

    /**
     * Stops the child server process if running.
     */
    stopServer() {
        if (this.serverProcess) {
            console.log('[ServerManager] Stopping server process...');
            try { this.serverProcess.kill(); } catch (e) { }
            this.serverProcess = null;
        }
    }

    // --- Helpers ---

    findFreePort() {
        return (async () => {
            for (let p = 3000; p <= 3100; p++) {
                /* eslint-disable no-await-in-loop */
                const ok = await new Promise((resolve) => {
                    const s = net.createServer().once('error', () => resolve(false)).once('listening', () => s.close(() => resolve(true))).listen(p, '127.0.0.1');
                });
                if (ok) return p;
            }
            return 0;
        })();
    }

    pollServer(url) {
        const start = Date.now();
        const deadline = 20000; // 20s

        return (async () => {
            const ping = () => new Promise((resolve) => {
                const req = http.get(url, (res) => { res.destroy(); resolve(true); });
                req.on('error', () => resolve(false));
                req.setTimeout(1000, () => { req.destroy(); resolve(false); });
            });

            while (Date.now() - start < deadline) {
                const up = await ping();
                if (up) return true;
                await new Promise(r => setTimeout(r, 300));
            }
            return false;
        })();
    }
}

module.exports = new ServerManager();

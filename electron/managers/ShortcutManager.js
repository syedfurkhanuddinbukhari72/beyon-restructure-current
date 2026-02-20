const { globalShortcut } = require('electron');

class ShortcutManager {
    constructor() {
        // Track double press timestamps
        this.lastMPress = 0;
        this.lastBPress = 0;
        this.lastPPress = 0;

        // Cache for deduplicating rapid events
        this.recentShortcuts = new Map();
    }

    /**
     * Send an IPC shortcut event to the renderer process.
     * Handles deduplication of rapid events.
     * @param {BrowserWindow} mainWindow - The target window
     * @param {Object} payload - The action payload (e.g. { action: 'switch_to_active_tab' })
     */
    sendAppShortcut(mainWindow, payload) {
        try {
            const action = payload && payload.action;
            const now = Date.now();
            if (action) {
                const lastTs = this.recentShortcuts.get(action) || 0;
                if (now - lastTs < 350) {
                    console.log('[ShortcutManager] duplicate suppressed:', action);
                    return;
                }
                this.recentShortcuts.set(action, now);
            }
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('app-shortcut', payload);
                console.log('[ShortcutManager] sent:', action || JSON.stringify(payload));
            }
        } catch (e) {
            console.warn('[ShortcutManager] send error:', e.message);
        }
    }

    /**
     * Registers all global shortcuts for the application.
     * @param {BrowserWindow} mainWindow - The main renderer window to send events to.
     */
    registerShortcuts(mainWindow) {
        if (!mainWindow) return;

        // --- Tab Switching ---
        globalShortcut.register('Shift+A', () => {
            this.sendAppShortcut(mainWindow, { action: 'switch_to_active_tab' });
        });
        globalShortcut.register('Shift+R', () => {
            this.sendAppShortcut(mainWindow, { action: 'switch_to_ready_tab' });
        });
        globalShortcut.register('Shift+P', () => {
            this.sendAppShortcut(mainWindow, { action: 'switch_to_paid_tab' });
        });
        globalShortcut.register('Shift+H', () => {
            this.sendAppShortcut(mainWindow, { action: 'switch_to_archive_tab' });
        });

        // --- Actions ---
        globalShortcut.register('Shift+C', () => {
            this.sendAppShortcut(mainWindow, { action: 'open_cart' });
        });
        globalShortcut.register('Shift+L', () => {
            // Local Orders Mode
            const payload = { action: 'local_mode' };
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
                mainWindow.webContents.send('app-shortcut', payload);
                // Fallback for some webviews
                try {
                    mainWindow.webContents.executeJavaScript(`window.postMessage(${JSON.stringify({ type: 'app-shortcut', payload })}, '*')`).catch(() => { });
                } catch (e) { }
            }
        });
        globalShortcut.register('Shift+Enter', () => {
            this.sendAppShortcut(mainWindow, { action: 'place_order' });
        });
        globalShortcut.register('Shift+Backspace', () => {
            this.sendAppShortcut(mainWindow, { action: 'go_back' });
        });

        // --- Double Press Triggers ---
        globalShortcut.register('m', () => {
            const now = Date.now();
            if (now - this.lastMPress < 500) {
                console.log('[ShortcutManager] Double M -> Manual Order Complete');
                this.sendAppShortcut(mainWindow, { action: 'open_manual_order_complete' });
            }
            this.lastMPress = now;
        });

        globalShortcut.register('b', () => {
            const now = Date.now();
            if (now - this.lastBPress < 500) {
                console.log('[ShortcutManager] Double B -> Open Bill');
                this.sendAppShortcut(mainWindow, { action: 'open_bill' });
            }
            this.lastBPress = now;
        });

        globalShortcut.register('p', () => {
            const now = Date.now();
            if (now - this.lastPPress < 500) {
                console.log('[ShortcutManager] Double P -> Print Current');
                this.sendAppShortcut(mainWindow, { action: 'print_current' });
            }
            this.lastPPress = now;
        });
    }

    /**
     * Unregisters all shortcuts. Useful for cleanup or window blur.
     */
    unregisterAll() {
        globalShortcut.unregisterAll();
    }
}

module.exports = new ShortcutManager();

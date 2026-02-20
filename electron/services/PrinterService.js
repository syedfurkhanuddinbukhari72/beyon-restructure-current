const { BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

/**
 * Service to handle receipt printing operations.
 * Supports:
 * - Direct USB printing (via 'escpos' module if available)
 * - Network printing (via TCP/IP port 9100)
 * - Preview/Spooler printing (via Electron webContents.print)
 */
class PrinterService {
    constructor() {
        this.escpos = null;
        this.usbDevice = null;
        this.networkDevice = null;
        this.printer = null;

        this.initializeEscPos();
    }

    /**
     * Try to load the optional 'escpos' module and its adapters.
     * This is wrapped in try-catch because native modules might not be present.
     */
    initializeEscPos() {
        try {
            this.escpos = require('escpos');
            // modern escpos has Device and Printer exports
            // Attempt to load USB and Network adapters
            try { this.escpos.USB = require('escpos-usb'); } catch (e) { /* ignore */ }
            try { this.escpos.Network = require('escpos-network'); } catch (e) { /* ignore */ }
        } catch (e) {
            console.warn('[PrinterService] escpos module not installed completely.', e.message);
        }
    }

    /**
     * Main entry point to print an order receipt.
     * @param {Object} order - The order object to print
     * @param {Object} options - Print options (method, printerConfig, preview)
     * @returns {Promise<{success: boolean, failureReason?: string}>}
     */
    async printReceipt(order, options = {}) {
        try {
            // 1. Try ESC/POS (USB/Network) if explicitly requested
            if (options && (options.method === 'escpos' || options.useEscPos === true)) {
                console.log('[PrinterService] Attempting ESC/POS print');
                const res = await this.printWithEscPos(order, options.printerConfig || {});
                if (res.success) return res;
                console.warn('[PrinterService] ESC/POS failed, falling back...');
            }

            // 2. Try TCP Direct (Network) if requested
            if (options && options.method === 'tcp-escpos') {
                console.log('[PrinterService] Attempting TCP Direct print');
                const res = await this.printWithTcpEscPos(order, options.printerConfig || {});
                if (res.success) return res;
                console.warn('[PrinterService] TCP Direct failed, falling back...');
            }

            // 3. Fallback to Electron Spooler (System Printer)
            // This creates a hidden window to render and print
            return await this.printWithSpooler(order, options);
        } catch (error) {
            console.error('[PrinterService] Print failed:', error);
            return { success: false, failureReason: error.message };
        }
    }

    /**
     * Print using the 'escpos' library (USB or Network adapter)
     */
    async printWithEscPos(order, config = {}) {
        if (!this.escpos) return { success: false, failureReason: 'escpos module not found' };

        try {
            const { type = 'network', host, port = 9100, path: devicePath } = config;
            let device;

            if (type === 'network' && host) {
                device = new this.escpos.Network(host, port);
            } else if (type === 'usb') {
                // If devicePath provided, usage specific; otherwise auto-detect
                device = new this.escpos.USB(devicePath);
            } else {
                // Auto-detect USB
                try { device = new this.escpos.USB(); } catch (e) { return { success: false, failureReason: 'USB Device not found' }; }
            }

            const printer = new this.escpos.Printer(device);

            return await new Promise((resolve) => {
                device.open((error) => {
                    if (error) {
                        resolve({ success: false, failureReason: String(error) });
                        return;
                    }

                    try {
                        printer
                            .font('a')
                            .align('ct')
                            .style('bu')
                            .size(1, 1)
                            .text('BEYON79')
                            .text('----------------')
                            .align('lt')
                            .text(`Order: ${order._id || 'N/A'}`)
                            .text(`Date: ${new Date().toLocaleString()}`)
                            .text('----------------');

                        (order.items || []).forEach(item => {
                            const qty = item.quantity || item.qty || 1;
                            const price = item.price || 0;
                            printer.text(`${item.name} x${qty}  ${price * qty}`);
                        });

                        printer
                            .text('----------------')
                            .align('rt')
                            .text(`Total: ${order.total || 0}`)
                            .text('----------------')
                            .cut()
                            .close();

                        resolve({ success: true });
                    } catch (err) {
                        resolve({ success: false, failureReason: String(err) });
                    }
                });
            });

        } catch (e) {
            return { success: false, failureReason: String(e) };
        }
    }

    /**
     * Send raw ESC/POS commands over a TCP socket (Network Printer)
     * Does not require native 'escpos' module.
     */
    async printWithTcpEscPos(order, config = {}) {
        const { host, port = 9100, shopName = 'BEYON79' } = config;
        if (!host) return { success: false, failureReason: 'No host provided' };

        return await new Promise((resolve) => {
            const socket = new net.Socket();
            let resolved = false;

            socket.setTimeout(5000);

            socket.on('error', (err) => {
                if (!resolved) { resolved = true; resolve({ success: false, failureReason: String(err) }); }
            });

            socket.on('timeout', () => {
                if (!resolved) { resolved = true; resolve({ success: false, failureReason: 'Connection timed out' }); socket.destroy(); }
            });

            socket.connect(port, host, () => {
                try {
                    const ESC = '\x1B';
                    const GS = '\x1D';
                    const commands = [
                        ESC + '@', // Init
                        ESC + 'a' + '\x01', // Center
                        ESC + 'E' + '\x01', // Bold On
                        shopName + '\n',
                        ESC + 'E' + '\x00', // Bold Off
                        ESC + 'a' + '\x00', // Left
                        '----------------\n',
                        `Order: ${order._id || ''}\n`,
                        '----------------\n'
                    ];

                    (order.items || []).forEach(it => {
                        commands.push(`${it.name} x${it.quantity || 1}   ${(it.price || 0) * (it.quantity || 1)}\n`);
                    });

                    commands.push('----------------\n');
                    commands.push(`Total: ${order.total || 0}\n`);
                    commands.push('\n\n');
                    commands.push(GS + 'V' + '\x00'); // Cut

                    const buffer = Buffer.from(commands.join(''), 'utf8');
                    socket.write(buffer);

                    setTimeout(() => {
                        socket.end();
                        if (!resolved) { resolved = true; resolve({ success: true }); }
                    }, 500);

                } catch (e) {
                    if (!resolved) { resolved = true; resolve({ success: false, failureReason: String(e) }); }
                }
            });
        });
    }

    /**
     * Use Electron's built-in printing (System Printer Spooler)
     * Requires creating a hidden window to render the content.
     */
    async printWithSpooler(order, options = {}) {
        return new Promise((resolve) => {
            // We need to create a window, load content, print, then close.
            // Since this runs in the main process, we need to pass the logic back?
            // Actually, main.js should handle the Window creation part and just ask 
            // this service for the HTML or strategy.

            // REFACTOR NOTE: For now, we will return a special flag telling main.js 
            // to use its existing window-based logic, OR we move the window logic here.
            // To keep this pure: we'll move the Window logic here.

            const printWin = new BrowserWindow({
                show: false,
                width: 400,
                height: 600,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            // Generate simple HTML receipt
            const html = this.generateReceiptHtml(order);

            printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

            printWin.webContents.on('did-finish-load', () => {
                printWin.webContents.print({
                    silent: options.silent !== false,
                    deviceName: options.printerName || undefined
                }, (success, errorType) => {
                    if (!success) console.error("Print failed:", errorType);
                    printWin.close();
                    resolve({ success, failureReason: errorType });
                });
            });
        });
    }

    generateReceiptHtml(order) {
        // Basic HTML template for the receipt
        const items = (order.items || []).map(i =>
            `<div style="display:flex; justify-content:space-between;">
         <span>${i.name} x${i.quantity || 1}</span>
         <span>${(i.price || 0) * (i.quantity || 1)}</span>
       </div>`
        ).join('');

        return `
      <html>
      <body style="font-family: monospace; width: 300px; font-size: 12px;">
        <h2 style="text-align:center;">BEYON79</h2>
        <hr/>
        <div>Order: ${order._id || ''}</div>
        <hr/>
        ${items}
        <hr/>
        <div style="text-align:right; font-weight:bold;">Total: ${order.total || 0}</div>
      </body>
      </html>
    `;
    }
    /**
     * Test a TCP connection to a printer
     */
    async testTcpConnection(host, port = 9100, timeout = 3000) {
        if (!host) return { success: false, failureReason: 'No host provided' };

        return await new Promise((resolve) => {
            const socket = new net.Socket();
            let finished = false;

            socket.setTimeout(timeout);

            socket.once('connect', () => {
                if (!finished) { finished = true; socket.destroy(); resolve({ success: true }); }
            });

            socket.once('timeout', () => {
                if (!finished) { finished = true; socket.destroy(); resolve({ success: false, failureReason: 'Connection timed out' }); }
            });

            socket.once('error', (err) => {
                if (!finished) { finished = true; socket.destroy(); resolve({ success: false, failureReason: String(err) }); }
            });

            socket.connect(Number(port), host);
        });
    }
}

module.exports = new PrinterService();

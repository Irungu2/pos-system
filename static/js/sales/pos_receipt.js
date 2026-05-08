// ============================================
// RECEIPT SERVICE
// ============================================

const ReceiptService = {
    // Configuration (will be merged with POS_SETTINGS)
    settings: {
        shop_name: 'POS SYSTEM',
        shop_address: '123 Business St, City',
        shop_phone: '+1 234 567 8900',
        currency: 'KES',
        tax_rate: 0,
        auto_close_time: 120000, // 2 minutes
    },

    // Initialize with POS settings
    init(posSettings) {
        if (posSettings) {
            this.settings = {
                ...this.settings,
                shop_name: posSettings.shop_name || this.settings.shop_name,
                shop_address: posSettings.shop_address || this.settings.shop_address,
                shop_phone: posSettings.shop_phone || this.settings.shop_phone,
                tax_rate: (posSettings.default_tax_rate || 0) * 100, // Convert to percentage
                currency: 'KES', // Default currency
                auto_close_time: 120000
            };
        }
        return this;
    },

    // Generate unique receipt number
    generateReceiptNumber() {
        const now = new Date();
        return `RCPT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    },

    // Format currency
    formatCurrency(amount) {
        return `${this.settings.currency} ${amount.toFixed(2)}`;
    },

    // Print receipt from sale object (for detail page)
    printFromSale(saleData) {
        try {
            if (!saleData || !saleData.items) {
                console.error('Invalid sale data');
                return;
            }

            // Transform sale data into cart items format
            const cartItems = saleData.items.map(item => ({
                product: {
                    name: item.product_name || item.product?.name
                },
                quantity: item.quantity,
                unit_price: parseFloat(item.unit_price || item.price_without_tax || 0)
            }));

            const subtotal = parseFloat(saleData.subtotal_amount || saleData.total_amount || 0);
            const taxAmount = parseFloat(saleData.tax_amount || 0);
            const total = subtotal + taxAmount;

            this.printReceipt(
                cartItems, 
                subtotal, 
                taxAmount, 
                total, 
                saleData.cashier_name || saleData.served_by || 'Cashier', 
                saleData.sale_id || saleData.receipt_number
            );
        } catch (error) {
            console.error('Error printing from sale:', error);
            showToast('Error printing receipt', 'error');
        }
    },

    // Print receipt from cart (for POS page)
    printFromCart(cartItems, subtotal, taxAmount, total, servedBy = 'Cashier', receiptId = null) {
        if (!cartItems || cartItems.length === 0) {
            showToast('No items to print', 'error');
            return;
        }
        this.printReceipt(cartItems, subtotal, taxAmount, total, servedBy, receiptId);
    },

    // Main receipt printing function
    printReceipt(cartItems, subtotal, taxAmount, total, servedBy = 'Cashier', receiptId = null) {
        try {
            if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                console.error('No items to print in the receipt.');
                showToast('No items to print', 'error');
                return;
            }

            const receiptNumber = receiptId || this.generateReceiptNumber();
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-KE');
            const timeStr = now.toLocaleTimeString('en-KE');

            // Window dimensions
            const width = 450;
            const height = 650;
            const left = (window.screen.width / 2) - (width / 2);
            const top = (window.screen.height / 2) - (height / 2);

            const receiptWindow = window.open(
                '',
                'Receipt Preview',
                `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=no`
            );

            if (!receiptWindow) {
                showToast('Popup blocked! Please allow popups to print receipts.', 'error');
                return;
            }

            const receiptHTML = `
                <html>
                <head>
                    <title>Receipt - ${receiptNumber}</title>
                    <style>
                        @media print {
                            .no-print { display: none; }
                            body { margin: 0; padding: 0; }
                            button { display: none; }
                        }
                        body {
                            font-family: 'Courier New', monospace;
                            padding: 20px;
                            width: 380px;
                            margin: 0 auto;
                            background: #fff;
                            color: #000;
                            font-size: 12px;
                        }
                        h2, h3 { text-align: center; margin: 5px 0; }
                        .info { font-size: 0.85em; text-align: center; margin: 5px 0; }
                        .served-by { font-size: 0.85em; margin-top: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { text-align: left; padding: 4px; }
                        th { border-bottom: 1px dashed #000; }
                        tfoot td { font-weight: bold; border-top: 1px dashed #000; }
                        hr { border: 0; border-top: 1px dashed #000; margin: 10px 0; }
                        .center { text-align: center; }
                        .total { font-size: 1.1em; font-weight: bold; }
                        .text-right { text-align: right; }
                        button {
                            display: inline-block;
                            margin: 10px 5px;
                            padding: 8px 20px;
                            font-size: 1em;
                            background: #28a745;
                            color: #fff;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        }
                        button:hover { background: #218838; }
                        button.cancel { background: #dc3545; }
                        button.cancel:hover { background: #c82333; }
                    </style>
                </head>
                <body>
                    <h2>${this.escapeHtml(this.settings.shop_name)}</h2>
                    <div class="info">${this.escapeHtml(this.settings.shop_address)}<br>Tel: ${this.escapeHtml(this.settings.shop_phone)}</div>
                    <div class="info">Receipt #: ${receiptNumber}<br>Date: ${dateStr} ${timeStr}</div>
                    <div class="served-by">Served By: ${this.escapeHtml(servedBy)}</div>
                    <hr>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Price</th>
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cartItems.map(item => {
                                const unitPrice = Number(item.unit_price) || 0;
                                const lineTotal = unitPrice * item.quantity;
                                const itemName = item.product?.name || item.product_name || 'Unknown Item';
                                return `
                                <tr>
                                    <td>${this.escapeHtml(itemName.substring(0, 25))}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">${this.formatCurrency(unitPrice)}</td>
                                    <td class="text-right">${this.formatCurrency(lineTotal)}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr><td colspan="3" class="text-right">Subtotal:</td><td class="text-right">${this.formatCurrency(subtotal)}</td></tr>
                            ${taxAmount > 0 ? `<tr><td colspan="3" class="text-right">Tax (${(this.settings.tax_rate).toFixed(0)}%):</td><td class="text-right">${this.formatCurrency(taxAmount)}</td></tr>` : ''}
                            <tr class="total"><td colspan="3" class="text-right">TOTAL:</td><td class="text-right">${this.formatCurrency(total)}</td></tr>
                        </tfoot>
                    </table>
                    <hr>
                    <p class="center">Thank you for your business!</p>
                    <p class="center" style="font-size: 0.8em;">** No refunds without receipt **</p>
                    
                    <div class="center no-print">
                        <button id="printBtn">🖨️ Print Receipt</button>
                        <button id="cancelBtn" class="cancel">❌ Cancel</button>
                    </div>

                    <script>
                        const printBtn = document.getElementById('printBtn');
                        const cancelBtn = document.getElementById('cancelBtn');

                        if (printBtn) {
                            printBtn.onclick = () => {
                                window.print();
                                setTimeout(() => window.close(), 1000);
                            };
                        }

                        if (cancelBtn) {
                            cancelBtn.onclick = () => {
                                if (confirm('Cancel printing?')) {
                                    window.close();
                                }
                            };
                        }

                        // Auto-close after configured time
                        setTimeout(() => {
                            if (!window.closed) {
                                alert('Receipt preview auto-closed after ${this.settings.auto_close_time / 1000} seconds.');
                                window.close();
                            }
                        }, ${this.settings.auto_close_time});

                        // Auto-print if on POS system
                        if (window.location.search.includes('auto_print=true')) {
                            setTimeout(() => window.print(), 500);
                        }
                    </script>
                </body>
                </html>
            `;

            receiptWindow.document.write(receiptHTML);
            receiptWindow.document.close();
            receiptWindow.focus();
        } catch (error) {
            console.error('Error generating receipt:', error);
            showToast('Error generating receipt. Please try again.', 'error');
        }
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Update shop settings dynamically
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
};

// Initialize ReceiptService with POS settings
ReceiptService.init(POS_SETTINGS);

// Expose globally
window.ReceiptService = ReceiptService;
window.printReceipt = ReceiptService.printFromCart.bind(ReceiptService);
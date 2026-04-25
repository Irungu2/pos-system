// ================================
// POS Receipt JS (Production Level with Timer & Cancel)
// ================================

// Function to generate a unique receipt number
function generateReceiptNumber() {
    const now = new Date();
    return `RCPT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
}

// Function to print the receipt
function printReceipt(cartItems, subtotal, taxAmount, total, settings, servedBy = 'Cashier') {
    try {
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            console.error('No items to print in the receipt.');
            return;
        }

        const receiptNumber = generateReceiptNumber();
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();

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
            alert('Popup blocked! Please allow popups to print receipts.');
            return;
        }

        const receiptHTML = `
            <html>
            <head>
                <title>Receipt Preview</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        padding: 20px;
                        width: 380px;
                        margin: 0 auto;
                        background: #fff;
                        color: #000;
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
                    button {
                        display: inline-block;
                        margin: 10px 5px;
                        padding: 8px 20px;
                        font-size: 1em;
                        background: #007bff;
                        color: #fff;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover { background: #0056b3; }
                </style>
            </head>
            <body>
                <h2>${settings.shop_name}</h2>
                <div class="info">${settings.shop_address}<br>Phone: ${settings.shop_phone}</div>
                <div class="info">Receipt #: ${receiptNumber}<br>Date: ${dateStr} ${timeStr}</div>
                <div class="served-by">Served By: ${servedBy}</div>
                <hr>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cartItems.map(item => {
                            const unitPrice = Number(item.unit_price) || 0;
                            const lineTotal = unitPrice * item.quantity;
                            return `<tr>
                                <td>${item.product.name}</td>
                                <td>${item.quantity}</td>
                                <td>$${unitPrice.toFixed(2)}</td>
                                <td>$${lineTotal.toFixed(2)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr><td colspan="3">Subtotal</td><td>$${subtotal.toFixed(2)}</td></tr>
                        <tr><td colspan="3">Tax</td><td>$${taxAmount.toFixed(2)}</td></tr>
                        <tr><td colspan="3">Total</td><td>$${total.toFixed(2)}</td></tr>
                    </tfoot>
                </table>
                <hr>
                <p class="center">Thank you for your purchase!</p>
                <div class="center">
                    <button id="printBtn">Print Receipt</button>
                    <button id="cancelBtn">Cancel</button>
                </div>

                <script>
                    const printBtn = document.getElementById('printBtn');
                    const cancelBtn = document.getElementById('cancelBtn');

                    printBtn.onclick = () => {
                        window.print();
                        window.close();
                    };

                    cancelBtn.onclick = () => {
                        if (confirm('Are you sure you want to cancel?')) {
                            window.close();
                        }
                    };

                    // Auto-close after 2 minutes (120000ms)
                    setTimeout(() => {
                        if (!window.closed) {
                            alert('Receipt preview auto-closed after 2 minutes.');
                            window.close();
                        }
                    }, 120000);
                </script>
            </body>
            </html>
        `;

        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();
        receiptWindow.focus();
    } catch (error) {
        console.error('Error generating receipt:', error);
    }
}

// Expose globally so POS cart can call it
window.printReceipt = printReceipt;

// -----------------------------
// Global cart state
// -----------------------------
let cart = {};

// -----------------------------
// POS Settings
// -----------------------------
const POS_SETTINGS = {
    enable_price_change: true,
    default_tax_rate: 0.16,
    shop_name: "Vision Heritage",
    shop_address: "26 Main Street, Luanda, Kenya",
    shop_phone: "+2547 59900 885"
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } transition-opacity duration-300`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getCSRFToken() {
    const cookieValue = document.cookie.match(/csrftoken=([^;]+)/);
    return cookieValue ? cookieValue[1] : '';
}

function playSuccessBeep() {
    try {
        const audio = new Audio('data:audio/wav;base64,U3RlYWx0aCBzb3VuZA==');
        audio.play().catch(e => console.log('Beep disabled'));
    } catch(e) {}
}

function playErrorBeep() {
    try {
        const audio = new Audio('data:audio/wav;base64,RXJyb3Igc291bmQ=');
        audio.play().catch(e => console.log('Beep disabled'));
    } catch(e) {}
}

function highlightProductCard(productId) {
    const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    if (card) {
        card.style.backgroundColor = '#f0fdf4';
        setTimeout(() => {
            card.style.backgroundColor = '';
        }, 1000);
    }
}

// ============================================
// CART MANAGEMENT
// ============================================

window.addToCart = function (product, quantity) {
    const price = Number(product.selling_price);
    const validPrice = isNaN(price) ? 0 : price;

    if (cart[product.id]) {
        cart[product.id].quantity += quantity;
    } else {
        cart[product.id] = { 
            product, 
            quantity,
            unit_price: validPrice
        };
    }
    renderCart();
    showToast(`✓ Added ${quantity}x ${product.name} to cart`, 'success');
};

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTax = document.getElementById('cart-tax');
    const cartTotal = document.getElementById('cart-total');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let subtotal = 0;
    let totalItems = 0;

    const cartValues = Object.values(cart);

    if (cartValues.length === 0) {
        if (emptyCartMessage) emptyCartMessage.style.display = 'block';
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (emptyCartMessage) emptyCartMessage.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = false;
    }

    cartValues.forEach(item => {
        totalItems += item.quantity;

        const unitPrice = Number(item.unit_price) || 0;
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;
        
        // Check if quantity exceeds available stock
        const isStockIssue = item.quantity > item.product.available_stock;

        const div = document.createElement('div');
        div.className = `flex justify-between items-center mb-3 p-2 rounded ${isStockIssue ? 'bg-red-50 border border-red-300' : ''}`;
        
        div.setAttribute('data-product-id', item.product.id);
        div.setAttribute('data-product-name', item.product.name);

        const priceEditable = POS_SETTINGS.enable_price_change && !item.product.fixed_price;
        
        const barcodeDisplay = item.product.barcode ? 
            `<span class="text-xs text-gray-400 ml-1">(${item.product.barcode})</span>` : '';

        const stockWarning = isStockIssue ? 
            `<span class="text-red-500 text-xs ml-1" title="Only ${item.product.available_stock} available">
                <i class="fas fa-exclamation-triangle"></i>
             </span>` : '';

        div.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center">
                    <span class="text-sm font-medium">${item.product.name}${barcodeDisplay}</span>
                    ${stockWarning}
                </div>
                ${isStockIssue ? `<p class="text-xs text-red-500 mt-1">⚠️ Only ${item.product.available_stock} units available in stock</p>` : ''}
            </div>
            <input type="number" min="1" max="${item.product.available_stock}" value="${item.quantity}" class="w-16 px-2 py-1 border rounded mr-2 text-sm ${isStockIssue ? 'border-red-500 bg-red-50' : ''}" />
            ${priceEditable 
                ? `<input type="number" min="0" step="0.01" value="${unitPrice.toFixed(2)}" class="w-20 px-2 py-1 border rounded mr-2 text-sm" />` 
                : `<span class="w-20 text-right font-medium">$${unitPrice.toFixed(2)}</span>`}
            <span class="w-20 text-right font-semibold ${isStockIssue ? 'text-red-600' : ''}">$${lineTotal.toFixed(2)}</span>
            <button class="text-red-500 ml-2 hover:text-red-700 font-bold text-lg">&times;</button>
        `;

        // Quantity update with stock validation
        const qtyInput = div.querySelector('input[type="number"]');
        if (qtyInput) {
            qtyInput.addEventListener('change', (e) => {
                const newQty = parseInt(e.target.value);
                const maxStock = item.product.available_stock;
                
                if (newQty > 0 && newQty <= maxStock) {
                    updateCartQuantity(item.product.id, newQty);
                    showToast(`✓ Updated ${item.product.name} quantity to ${newQty}`, 'success');
                } else if (newQty > maxStock) {
                    e.target.value = item.quantity;
                    showToast(`❌ Only ${maxStock} units of "${item.product.name}" available in stock`, 'error');
                    div.style.backgroundColor = '#fee2e2';
                    setTimeout(() => {
                        if (!isStockIssue) div.style.backgroundColor = '';
                    }, 1000);
                } else if (newQty <= 0) {
                    e.target.value = item.quantity;
                    showToast('Quantity must be at least 1', 'error');
                }
            });
            
            qtyInput.addEventListener('input', (e) => {
                let val = parseInt(e.target.value);
                const maxStock = item.product.available_stock;
                if (val > maxStock) {
                    e.target.value = maxStock;
                }
                if (val < 1) {
                    e.target.value = 1;
                }
            });
        }

        // Price update (if editable)
        if (priceEditable) {
            const priceInput = div.querySelectorAll('input[type="number"]')[1];
            if (priceInput) {
                priceInput.addEventListener('change', (e) => {
                    const newPrice = parseFloat(e.target.value);
                    if (!isNaN(newPrice) && newPrice >= 0) {
                        updateCartPrice(item.product.id, newPrice);
                        showToast(`✓ Updated ${item.product.name} price to $${newPrice.toFixed(2)}`, 'success');
                    } else {
                        e.target.value = unitPrice.toFixed(2);
                        showToast('Invalid price', 'error');
                    }
                });
            }
        }

        // Remove item with confirmation for bulk items
        const removeBtn = div.querySelector('button');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (item.quantity > 5) {
                    if (confirm(`Remove ${item.product.name} from cart?`)) {
                        removeFromCart(item.product.id);
                        showToast(`✓ Removed ${item.product.name} from cart`, 'info');
                    }
                } else {
                    removeFromCart(item.product.id);
                    showToast(`✓ Removed ${item.product.name} from cart`, 'info');
                }
            });
        }

        cartItemsContainer.appendChild(div);
    });

    // Update totals
    if (cartCount) {
        cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
        cartCount.classList.add('scale-105');
        setTimeout(() => cartCount.classList.remove('scale-105'), 200);
    }
    
    if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;

    const taxAmount = cartValues.reduce((sum, item) => {
        const u = Number(item.unit_price) || 0;
        if (item.product.is_taxable) {
            return sum + (u * item.quantity * POS_SETTINGS.default_tax_rate);
        }
        return sum;
    }, 0);

    if (cartTax) cartTax.textContent = `$${taxAmount.toFixed(2)}`;
    
    const grandTotal = subtotal + taxAmount;
    if (cartTotal) {
        cartTotal.textContent = `$${grandTotal.toFixed(2)}`;
        
        const hasStockIssues = cartValues.some(item => item.quantity > item.product.available_stock);
        if (hasStockIssues) {
            cartTotal.classList.add('text-red-600', 'font-bold');
        } else {
            cartTotal.classList.remove('text-red-600');
            cartTotal.classList.add('text-green-600');
        }
    }
    
    const hasStockIssues = cartValues.some(item => item.quantity > item.product.available_stock);
    if (checkoutBtn) {
        checkoutBtn.disabled = hasStockIssues || cartValues.length === 0;
        if (hasStockIssues) {
            checkoutBtn.title = 'Please fix quantity issues before checkout';
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            checkoutBtn.title = 'Complete sale';
            checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (hasStockIssues && emptyCartMessage) {
        const stockIssueMsg = document.getElementById('stock-issue-message');
        if (!stockIssueMsg) {
            const msgDiv = document.createElement('div');
            msgDiv.id = 'stock-issue-message';
            msgDiv.className = 'mt-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm';
            msgDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i> Some items have quantity exceeding available stock. Please adjust quantities before checkout.';
            emptyCartMessage.parentNode.insertBefore(msgDiv, emptyCartMessage.nextSibling);
        }
    } else {
        const stockIssueMsg = document.getElementById('stock-issue-message');
        if (stockIssueMsg) stockIssueMsg.remove();
    }
}

function updateCartQuantity(productId, quantity) {
    if (cart[productId]) {
        const maxStock = cart[productId].product.available_stock;
        const validQuantity = Math.min(quantity, maxStock);
        
        if (validQuantity <= 0) {
            removeFromCart(productId);
        } else {
            cart[productId].quantity = validQuantity;
            renderCart();
            
            if (quantity > maxStock) {
                showToast(`⚠️ Quantity adjusted to ${maxStock} (maximum available stock)`, 'warning');
            }
        }
    }
}

function removeFromCart(productId) {
    delete cart[productId];
    renderCart();
    showToast('Item removed from cart', 'info');
}

function updateCartPrice(productId, price) {
    if (cart[productId]) {
        cart[productId].unit_price = Number(price) || 0;
        renderCart();
    }
}

// async function processCheckout() {
//     if (Object.keys(cart).length === 0) {
//         showToast('Cart is empty', 'error');
//         return;
//     }
    
//     const cartValues = Object.values(cart);
//     for (const item of cartValues) {
//         if (item.quantity > item.product.available_stock) {
//             showToast(`❌ Only ${item.product.available_stock} units of "${item.product.name}" available. Please reduce quantity.`, 'error');
//             highlightCartItem(item.product.id);
//             return;
//         }
//     }
    
//     const saleItems = cartValues.map(item => ({
//         product_id: item.product.id,
//         quantity: item.quantity,
//         unit_price: Number(item.unit_price) || 0
//     }));
    
//     const checkoutBtn = document.getElementById('checkout-btn');
//     const originalBtnText = checkoutBtn ? checkoutBtn.innerHTML : 'Checkout';
//     if (checkoutBtn) {
//         checkoutBtn.disabled = true;
//         checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
//     }
    
//     try {
//         const response = await fetch('/sales/api/create-sale/', {
//             method: 'POST',
//             credentials: 'include',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-CSRFToken': getCSRFToken(),
//             },
//             body: JSON.stringify({ items: saleItems })
//         });
        
//         if (!response.ok) {
//             let errorMessage = 'Failed to create sale';
            
//             try {
//                 const errorData = await response.json();
//                 console.log('Error response:', errorData);
                
//                 if (errorData.non_field_errors) {
//                     errorMessage = errorData.non_field_errors.join(', ');
//                 } else if (errorData.error) {
//                     errorMessage = errorData.error;
//                 } else if (Array.isArray(errorData) && errorData.length > 0) {
//                     errorMessage = errorData[0];
//                 } else {
//                     const firstKey = Object.keys(errorData)[0];
//                     if (firstKey && errorData[firstKey]) {
//                         errorMessage = Array.isArray(errorData[firstKey]) 
//                             ? errorData[firstKey][0] 
//                             : errorData[firstKey];
//                     }
//                 }
                
//                 if (errorMessage.toLowerCase().includes('stock')) {
//                     const productMatch = errorMessage.match(/for\s+([^.]+)/i);
//                     if (productMatch && productMatch[1]) {
//                         const productName = productMatch[1].trim();
//                         highlightProductInCart(productName);
//                     }
//                 }
                
//             } catch (e) {
//                 const text = await response.text();
//                 if (text.includes('Insufficient stock')) {
//                     const match = text.match(/Insufficient stock[^.]*\./);
//                     errorMessage = match ? match[0] : 'Insufficient stock available';
                    
//                     const productMatch = text.match(/for\s+([^\s]+)/i);
//                     if (productMatch && productMatch[1]) {
//                         highlightProductInCart(productMatch[1]);
//                     }
//                 }
//             }
            
//             throw new Error(errorMessage);
//         }
        
//         const data = await response.json();
//         console.log('[CHECKOUT] Sale created:', data);
        
//         const cartValuesForReceipt = Object.values(cart);
//         const subtotal = cartValuesForReceipt.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * item.quantity, 0);
//         const taxAmount = cartValuesForReceipt.reduce((sum, item) => {
//             if (item.product.is_taxable) {
//                 return sum + (Number(item.unit_price) || 0) * item.quantity * POS_SETTINGS.default_tax_rate;
//             }
//             return sum;
//         }, 0);
//         const total = subtotal + taxAmount;
        
//         const userNameElem = document.querySelector('[data-user-name]');
//         const userName = userNameElem ? userNameElem.dataset.userName : 'Cashier';
        
//         if (window.ReceiptService && typeof window.ReceiptService.printFromCart === 'function') {
//             window.ReceiptService.printFromCart(
//                 cartValuesForReceipt,
//                 subtotal,
//                 taxAmount,
//                 total,
//                 userName,
//                 data.sale_id
//             );
//         } else {
//             console.warn('ReceiptService not available, using fallback');
//             fallbackPrint(cartValuesForReceipt, subtotal, taxAmount, total);
//         }
        
//         cart = {};
//         renderCart();
//         showToast('✓ Sale completed successfully!', 'success');
        
//         setTimeout(() => {
//             if (confirm('View sale details?')) {
//                 window.location.href = `/sales/${data.sale_id}/`;
//             }
//         }, 1500);
        
//     } catch (error) {
//         console.error('[CHECKOUT] Error:', error);
//         showToast(error.message || 'Error processing payment. Please try again.', 'error');
//     } finally {
//         if (checkoutBtn) {
//             checkoutBtn.disabled = false;
//             checkoutBtn.innerHTML = originalBtnText;
//         }
//     }
// }

async function processCheckout() {
    if (Object.keys(cart).length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    const cartValues = Object.values(cart);
    
    // Validate stock before proceeding
    for (const item of cartValues) {
        if (item.quantity > item.product.available_stock) {
            showToast(`❌ Only ${item.product.available_stock} units of "${item.product.name}" available. Please reduce quantity.`, 'error');
            highlightCartItem(item.product.id);
            return;
        }
    }
    
    const saleItems = cartValues.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price) || 0
    }));
    
    const checkoutBtn = document.getElementById('checkout-btn');
    const originalBtnText = checkoutBtn ? checkoutBtn.innerHTML : 'Checkout';
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    }
    
    try {
        const response = await fetch('/sales/api/create-sale/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({ items: saleItems })
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to create sale';
            
            try {
                const errorData = await response.json();
                console.log('Error response:', errorData);
                
                if (errorData.non_field_errors) {
                    errorMessage = errorData.non_field_errors.join(', ');
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (Array.isArray(errorData) && errorData.length > 0) {
                    errorMessage = errorData[0];
                } else {
                    const firstKey = Object.keys(errorData)[0];
                    if (firstKey && errorData[firstKey]) {
                        errorMessage = Array.isArray(errorData[firstKey]) 
                            ? errorData[firstKey][0] 
                            : errorData[firstKey];
                    }
                }
                
                if (errorMessage.toLowerCase().includes('stock')) {
                    const productMatch = errorMessage.match(/for\s+([^.]+)/i);
                    if (productMatch && productMatch[1]) {
                        const productName = productMatch[1].trim();
                        highlightProductInCart(productName);
                    }
                }
                
            } catch (e) {
                const text = await response.text();
                if (text.includes('Insufficient stock')) {
                    const match = text.match(/Insufficient stock[^.]*\./);
                    errorMessage = match ? match[0] : 'Insufficient stock available';
                    
                    const productMatch = text.match(/for\s+([^\s]+)/i);
                    if (productMatch && productMatch[1]) {
                        highlightProductInCart(productMatch[1]);
                    }
                }
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('[CHECKOUT] Sale created:', data);
        
        const cartValuesForReceipt = Object.values(cart);
        const subtotal = cartValuesForReceipt.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * item.quantity, 0);
        const taxAmount = cartValuesForReceipt.reduce((sum, item) => {
            if (item.product.is_taxable) {
                return sum + (Number(item.unit_price) || 0) * item.quantity * POS_SETTINGS.default_tax_rate;
            }
            return sum;
        }, 0);
        const total = subtotal + taxAmount;
        
        const userNameElem = document.querySelector('[data-user-name]');
        const userName = userNameElem ? userNameElem.dataset.userName : 'Cashier';
        
        // Use the integrated ReceiptService
        if (window.ReceiptService && typeof window.ReceiptService.printFromCart === 'function') {
            window.ReceiptService.printFromCart(
                cartValuesForReceipt,
                subtotal,
                taxAmount,
                total,
                userName,
                data.sale_id
            );
        } else {
            console.warn('ReceiptService not available, using fallback');
            fallbackPrint(cartValuesForReceipt, subtotal, taxAmount, total);
        }
        
        // Clear cart
        cart = {};
        renderCart();
        showToast('✓ Sale completed successfully!', 'success');
        playSuccessBeep();
        
        // setTimeout(() => {
        //     if (confirm('View sale details?')) {
        //         window.location.href = `/sales/${data.sale_id}/`;
        //     }
        // }, 1500);
        
    } catch (error) {
        console.error('[CHECKOUT] Error:', error);
        showToast(error.message || 'Error processing payment. Please try again.', 'error');
        playErrorBeep();
    } finally {
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = originalBtnText;
        }
    }
}

function highlightCartItem(productId) {
    const cartItems = document.getElementById('cart-items');
    if (!cartItems) return;
    
    const items = cartItems.children;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productSpan = item.querySelector('.flex-1');
        if (productSpan && productSpan.textContent.includes(productId.toString())) {
            item.style.backgroundColor = '#fee2e2';
            item.style.padding = '8px';
            item.style.borderRadius = '8px';
            setTimeout(() => {
                item.style.backgroundColor = '';
                item.style.padding = '';
                item.style.borderRadius = '';
            }, 3000);
            break;
        }
    }
}

function highlightProductInCart(productName) {
    const cartItems = document.getElementById('cart-items');
    if (!cartItems) return;
    
    const items = cartItems.children;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productSpan = item.querySelector('.flex-1');
        if (productSpan && productSpan.textContent.toLowerCase().includes(productName.toLowerCase())) {
            item.style.backgroundColor = '#fee2e2';
            item.style.padding = '8px';
            item.style.borderRadius = '8px';
            item.style.border = '2px solid #ef4444';
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                item.style.backgroundColor = '';
                item.style.padding = '';
                item.style.borderRadius = '';
                item.style.border = '';
            }, 5000);
            break;
        }
    }
}

function fallbackPrint(items, subtotal, tax, total) {
    let receipt = `${POS_SETTINGS.shop_name}\n${POS_SETTINGS.shop_address}\nTel: ${POS_SETTINGS.shop_phone}\n`;
    receipt += '='.repeat(30) + '\n';
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += '-'.repeat(30) + '\n';
    
    items.forEach(item => {
        const lineTotal = item.quantity * Number(item.unit_price);
        receipt += `${item.product.name}\n`;
        receipt += `  ${item.quantity} x $${Number(item.unit_price).toFixed(2)} = $${lineTotal.toFixed(2)}\n`;
    });
    
    receipt += '-'.repeat(30) + '\n';
    receipt += `Subtotal: $${subtotal.toFixed(2)}\n`;
    receipt += `Tax: $${tax.toFixed(2)}\n`;
    receipt += `Total: $${total.toFixed(2)}\n`;
    receipt += '='.repeat(30) + '\n';
    receipt += 'Thank you for your purchase!\n';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>Receipt</title></head>
        <body style="font-family: monospace; padding: 20px;">
            <pre>${receipt}</pre>
            <button onclick="window.print();setTimeout(()=>window.close(),1000)">Print</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Export cart functions to window
window.renderCart = renderCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.updateCartPrice = updateCartPrice;
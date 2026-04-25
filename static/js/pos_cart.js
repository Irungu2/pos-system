
// ================================
// POS Side Cart JS (FINAL FIXED VERSION)
// Includes:
// - Cart logic
// - Price edit
// - Tax calculation
// - Sale submission with SESSION COOKIES FIXED
// - Receipt printing
// ================================

// -----------------------------
// Global cart state
// // -----------------------------
// let cart = {}; // { productId: { product, quantity, unit_price } }

// // -----------------------------
// // POS Settings (from backend)
// // -----------------------------
// const POS_SETTINGS = {
//     enable_price_change: true,
//     default_tax_rate: 0.16,
//     shop_name: "Vision Heritage",
//     shop_address: "26 Main Street, Luanda, Kenya",
//     shop_phone: "+2547 59900 885"
// };

// // -----------------------------
// // 1. Global function — add to cart
// // -----------------------------
// window.addToCart = function (product, quantity) {
//     const price = Number(product.selling_price);
//     const validPrice = isNaN(price) ? 0 : price;

//     if (cart[product.id]) {
//         cart[product.id].quantity += quantity;
//     } else {
//         cart[product.id] = { 
//             product, 
//             quantity,
//             unit_price: validPrice
//         };
//     }
//     renderCart();
// };

// // -----------------------------
// // 2. Rendering Cart
// // -----------------------------
// function renderCart() {
//     if (!window.cartItemsContainer) return;

//     cartItemsContainer.innerHTML = '';
//     let subtotal = 0;
//     let totalItems = 0;

//     const cartValues = Object.values(cart);

//     if (cartValues.length === 0) {
//         emptyCartMessage.style.display = 'block';
//         checkoutBtn.disabled = true;
//     } else {
//         emptyCartMessage.style.display = 'none';
//         checkoutBtn.disabled = false;
//     }

//     cartValues.forEach(item => {
//         totalItems += item.quantity;

//         const unitPrice = Number(item.unit_price) || 0;
//         const lineTotal = unitPrice * item.quantity;
//         subtotal += lineTotal;

//         const div = document.createElement('div');
//         div.className = 'flex justify-between items-center mb-3';

//         const priceEditable = POS_SETTINGS.enable_price_change && !item.product.fixed_price;

//         div.innerHTML = `
//             <span class="flex-1">${item.product.name}</span>
//             <input type="number" min="1" value="${item.quantity}" class="w-16 px-2 py-1 border rounded mr-2" />
//             ${priceEditable 
//                 ? `<input type="number" min="0" step="0.01" value="${unitPrice.toFixed(2)}" class="w-20 px-2 py-1 border rounded mr-2" />` 
//                 : `<span>$${unitPrice.toFixed(2)}</span>`}
//             <span>$${lineTotal.toFixed(2)}</span>
//             <button class="text-red-500 ml-2">&times;</button>
//         `;

//         // Handle quantity update
//         div.querySelector('input[type="number"]:first-of-type').addEventListener('change', (e) => {
//             const newQty = parseInt(e.target.value);
//             if (newQty > 0 && newQty <= item.product.available_quantity) {
//                 updateCartQuantity(item.product.id, newQty);
//             } else {
//                 e.target.value = item.quantity;
//                 alert('Invalid quantity');
//             }
//         });

//         // Handle price update
//         if (priceEditable) {
//             div.querySelector('input[type="number"]:nth-of-type(2)').addEventListener('change', (e) => {
//                 const newPrice = parseFloat(e.target.value);
//                 if (!isNaN(newPrice) && newPrice >= 0) {
//                     updateCartPrice(item.product.id, newPrice);
//                 } else {
//                     e.target.value = unitPrice.toFixed(2);
//                     alert('Invalid price');
//                 }
//             });
//         }

//         // Remove item button
//         div.querySelector('button').addEventListener('click', () => {
//             removeFromCart(item.product.id);
//         });

//         cartItemsContainer.appendChild(div);
//     });

//     // Totals
//     cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''} in cart`;
//     cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;

//     const taxAmount = cartValues.reduce((sum, item) => {
//         const u = Number(item.unit_price) || 0;
//         if (item.product.is_taxable) {
//             return sum + (u * item.quantity * POS_SETTINGS.default_tax_rate);
//         }
//         return sum;
//     }, 0);

//     cartTax.textContent = `$${taxAmount.toFixed(2)}`;
//     cartTotal.textContent = `$${(subtotal + taxAmount).toFixed(2)}`;
// }

// // -----------------------------
// // 3. Cart helpers
// // -----------------------------
// function removeFromCart(productId) {
//     delete cart[productId];
//     renderCart();
// }

// function updateCartQuantity(productId, quantity) {
//     if (cart[productId]) {
//         cart[productId].quantity = quantity;
//         if (quantity <= 0) removeFromCart(productId);
//         else renderCart();
//     }
// }

// function updateCartPrice(productId, price) {
//     if (cart[productId]) {
//         cart[productId].unit_price = Number(price) || 0;
//         renderCart();
//     }
// }

// // -----------------------------
// // 4. DOM Ready
// // -----------------------------
// document.addEventListener('DOMContentLoaded', () => {

//     window.cartItemsContainer = document.getElementById('cart-items');
//     window.cartCount = document.getElementById('cart-count');
//     window.cartSubtotal = document.getElementById('cart-subtotal');
//     window.cartTax = document.getElementById('cart-tax');
//     window.cartTotal = document.getElementById('cart-total');
//     window.checkoutBtn = document.getElementById('checkout-btn');
//     window.clearCartBtn = document.getElementById('clear-cart');
//     window.emptyCartMessage = document.getElementById('empty-cart-message');

//     // Clear cart
//     clearCartBtn.addEventListener('click', () => {
//         cart = {};
//         renderCart();
//     });

//     // Checkout button
//     checkoutBtn.addEventListener('click', () => {
//         if (Object.keys(cart).length === 0) return;

//         const saleItems = Object.values(cart).map(item => ({
//             product_id: item.product.id,
//             quantity: item.quantity,
//             unit_price: Number(item.unit_price) || 0
//         }));

//         // -------------------------
//         // 🔥 FIXED — SEND SESSION COOKIE
//         // -------------------------
//         fetch('/sales/api/create-sale/', {
//             method: 'POST',
//             credentials: 'include',       // ⭐ REQUIRED ⭐
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-CSRFToken': getCSRFToken(),
//             },
//             body: JSON.stringify({ items: saleItems })
//         })
//         .then(res => {
//             if (!res.ok) throw new Error('Failed to create sale');
//             return res.json();
//         })
//         .then(data => {

//             const cartValues = Object.values(cart);

//             let subtotal = cartValues.reduce((sum, item) => {
//                 return sum + (Number(item.unit_price) || 0) * item.quantity;
//             }, 0);

//             let taxAmount = cartValues.reduce((sum, item) => {
//                 if (item.product.is_taxable) {
//                     return sum + (Number(item.unit_price) || 0) * item.quantity * POS_SETTINGS.default_tax_rate;
//                 }
//                 return sum;
//             }, 0);

//             let total = subtotal + taxAmount;

//             // Print receipt
//             printReceipt(cartValues, subtotal, taxAmount, total, POS_SETTINGS);

//             // Reset cart
//             cart = {};
//             renderCart();
//         })
//         .catch(err => {
//             console.error(err);
//             alert('Error processing payment.');
//         });
//     });

//     renderCart();
// });

// // -----------------------------
// // 5. CSRF helper
// // -----------------------------
// function getCSRFToken() {
//     const cookieValue = document.cookie.match(/csrftoken=([^;]+)/);
//     return cookieValue ? cookieValue[1] : '';
// }

// // -----------------------------
// // 6. Receipt Printing
// // -----------------------------
// function printReceipt(items, subtotal, tax, total, settings) {
//     let receipt = `
// ${settings.shop_name}
// ${settings.shop_address}
// Tel: ${settings.shop_phone}
// -------------------------------
// `;

//     items.forEach(item => {
//         receipt += `${item.product.name} x ${item.quantity} @ $${Number(item.unit_price).toFixed(2)} = $${(item.quantity * Number(item.unit_price)).toFixed(2)}\n`;
//     });

//     receipt += `
// -------------------------------
// Subtotal: $${subtotal.toFixed(2)}
// Tax: $${tax.toFixed(2)}
// Total: $${total.toFixed(2)}
// -------------------------------
// Thank you for your purchase!
// `;

//     console.log(receipt);
// }

// ================================
// COMPLETE POS SYSTEM (with Barcode Scanner)
// ================================

// -----------------------------
// Global cart state
// -----------------------------
let cart = {}; // { productId: { product, quantity, unit_price } }

// -----------------------------
// POS Settings (from backend)
// -----------------------------
const POS_SETTINGS = {
    enable_price_change: true,
    default_tax_rate: 0.16,
    shop_name: "Vision Heritage",
    shop_address: "26 Main Street, Luanda, Kenya",
    shop_phone: "+2547 59900 885"
};

// ============================================
// PART 1: CART MANAGEMENT (Your existing code)
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
    // ✅ Show success feedback for scanner
    showToast(`✓ Added ${quantity}x ${product.name} to cart`, 'success');
};

function renderCart() {
    if (!window.cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let subtotal = 0;
    let totalItems = 0;

    const cartValues = Object.values(cart);

    if (cartValues.length === 0) {
        emptyCartMessage.style.display = 'block';
        checkoutBtn.disabled = true;
    } else {
        emptyCartMessage.style.display = 'none';
        checkoutBtn.disabled = false;
    }

    cartValues.forEach(item => {
        totalItems += item.quantity;

        const unitPrice = Number(item.unit_price) || 0;
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center mb-3';

        const priceEditable = POS_SETTINGS.enable_price_change && !item.product.fixed_price;
        
        // ✅ Add barcode display for scanned items
        const barcodeDisplay = item.product.barcode ? 
            `<span class="text-xs text-gray-400 ml-1">(${item.product.barcode})</span>` : '';

        div.innerHTML = `
            <span class="flex-1">${item.product.name}${barcodeDisplay}</span>
            <input type="number" min="1" value="${item.quantity}" class="w-16 px-2 py-1 border rounded mr-2" />
            ${priceEditable 
                ? `<input type="number" min="0" step="0.01" value="${unitPrice.toFixed(2)}" class="w-20 px-2 py-1 border rounded mr-2" />` 
                : `<span>$${unitPrice.toFixed(2)}</span>`}
            <span>$${lineTotal.toFixed(2)}</span>
            <button class="text-red-500 ml-2">&times;</button>
        `;

        // Quantity update
        div.querySelector('input[type="number"]:first-of-type').addEventListener('change', (e) => {
            const newQty = parseInt(e.target.value);
            if (newQty > 0 && newQty <= item.product.available_stock) {  // ✅ Fixed: available_stock
                updateCartQuantity(item.product.id, newQty);
            } else {
                e.target.value = item.quantity;
                alert('Invalid quantity');
            }
        });

        // Price update
        if (priceEditable) {
            div.querySelector('input[type="number"]:nth-of-type(2)').addEventListener('change', (e) => {
                const newPrice = parseFloat(e.target.value);
                if (!isNaN(newPrice) && newPrice >= 0) {
                    updateCartPrice(item.product.id, newPrice);
                } else {
                    e.target.value = unitPrice.toFixed(2);
                    alert('Invalid price');
                }
            });
        }

        // Remove item
        div.querySelector('button').addEventListener('click', () => {
            removeFromCart(item.product.id);
        });

        cartItemsContainer.appendChild(div);
    });

    // Totals
    cartCount.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''} in cart`;
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;

    const taxAmount = cartValues.reduce((sum, item) => {
        const u = Number(item.unit_price) || 0;
        if (item.product.is_taxable) {
            return sum + (u * item.quantity * POS_SETTINGS.default_tax_rate);
        }
        return sum;
    }, 0);

    cartTax.textContent = `$${taxAmount.toFixed(2)}`;
    cartTotal.textContent = `$${(subtotal + taxAmount).toFixed(2)}`;
}

function removeFromCart(productId) {
    delete cart[productId];
    renderCart();
}

function updateCartQuantity(productId, quantity) {
    if (cart[productId]) {
        cart[productId].quantity = quantity;
        if (quantity <= 0) removeFromCart(productId);
        else renderCart();
    }
}

function updateCartPrice(productId, price) {
    if (cart[productId]) {
        cart[productId].unit_price = Number(price) || 0;
        renderCart();
    }
}

// ============================================
// PART 2: BARCODE SCANNER (NEW)
// ============================================

let barcodeBuffer = '';
let barcodeTimeout = null;
let scannerActive = true;

function initBarcodeScanner() {
    console.log('[SCANNER] Initializing...');
    
    // Method 1: Dedicated input field (if exists)
    const barcodeInput = document.getElementById('barcode-scanner-input');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = barcodeInput.value.trim();
                if (barcode) {
                    handleBarcodeScan(barcode);
                    barcodeInput.value = '';
                }
            }
        });
        barcodeInput.focus();
    }
    
    // Method 2: Global keyboard for USB scanners
    document.addEventListener('keydown', (e) => {
        if (!scannerActive) return;
        
        // Ignore if typing in text inputs
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT' && 
            activeElement.id !== 'barcode-scanner-input') {
            return;
        }
        
        // Enter key - process barcode
        if (e.key === 'Enter') {
            if (barcodeBuffer.length > 0) {
                e.preventDefault();
                handleBarcodeScan(barcodeBuffer);
                barcodeBuffer = '';
                if (barcodeTimeout) clearTimeout(barcodeTimeout);
            }
            return;
        }
        
        // Accumulate barcode characters
        if (e.key.length === 1 && /[a-zA-Z0-9\-_]/.test(e.key)) {
            e.preventDefault();
            barcodeBuffer += e.key;
            
            if (barcodeTimeout) clearTimeout(barcodeTimeout);
            barcodeTimeout = setTimeout(() => {
                barcodeBuffer = '';
            }, 50);
        }
    });
    
    // Keyboard shortcut: Ctrl+B to focus scanner
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            const barcodeInput = document.getElementById('barcode-scanner-input');
            if (barcodeInput) {
                barcodeInput.focus();
                showToast('Scanner ready', 'info');
            }
        }
    });
}

async function handleBarcodeScan(barcode) {
    console.log('[SCANNER] Processing:', barcode);
    showToast(`Searching for ${barcode}...`, 'info');
    
    try {
        const response = await fetch(`/inventory/products/by-barcode/${encodeURIComponent(barcode)}/`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showToast(`❌ Product with barcode ${barcode} not found!`, 'error');
                playErrorBeep();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            return;
        }
        
        const product = await response.json();
        console.log('[SCANNER] Found:', product);
        
        if (product.available_stock > 0) {
            window.addToCart(product, 1);  // ✅ Uses your existing addToCart function
            playSuccessBeep();
            
            // Optional: Flash the product card if visible
            highlightProductCard(product.id);
        } else {
            showToast(`❌ ${product.name} is out of stock!`, 'error');
            playErrorBeep();
        }
        
    } catch (error) {
        console.error('[SCANNER] Error:', error);
        showToast('Error processing barcode', 'error');
    }
}

// ============================================
// PART 3: PRODUCT DISPLAY (Your existing code)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[POS] DOM loaded');

    const categorySelect = document.getElementById('category-filter');
    const searchInput = document.getElementById('product-search');
    const productsGrid = document.getElementById('products-grid');
    
    // Get cart elements
    window.cartItemsContainer = document.getElementById('cart-items');
    window.cartCount = document.getElementById('cart-count');
    window.cartSubtotal = document.getElementById('cart-subtotal');
    window.cartTax = document.getElementById('cart-tax');
    window.cartTotal = document.getElementById('cart-total');
    window.checkoutBtn = document.getElementById('checkout-btn');
    window.clearCartBtn = document.getElementById('clear-cart');
    window.emptyCartMessage = document.getElementById('empty-cart-message');

    // Initialize barcode scanner
    initBarcodeScanner();

    function loadCategories() {
        console.log('[POS] Loading categories...');
        fetch('/inventory/categories/')
            .then(response => response.json())
            .then(data => {
                categorySelect.innerHTML = '<option value="">All Categories</option>';
                data.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            })
            .catch(error => console.error('[POS] Error loading categories:', error));
    }

    function loadProducts(query = '', category = '') {
        const url = `/inventory/products/search_products/?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;
        console.log('[POS] Loading products', { query, category, url });

        productsGrid.innerHTML = `<div class="col-span-4 text-center text-gray-400 py-8">Loading products...</div>`;

        fetch(url)
            .then(res => res.json())
            .then(products => {
                productsGrid.innerHTML = '';
                if (!products.length) {
                    productsGrid.innerHTML = '<p class="col-span-4 text-center text-gray-500">No products found.</p>';
                    return;
                }

                products.forEach(product => {
                    const card = document.createElement('div');
                    card.className = 'product-card border p-4 rounded-lg shadow-sm hover:shadow-md transition';
                    card.setAttribute('data-product-id', product.id);
                    
                    // ✅ Show barcode in product card if available
                    const barcodeInfo = product.barcode ? 
                        `<p class="text-xs text-gray-400 mb-1">Barcode: ${product.barcode}</p>` : '';

                    card.innerHTML = `
                        <h3 class="font-bold text-lg mb-1">${product.name}</h3>
                        ${barcodeInfo}
                        <p class="text-sm text-gray-500 mb-1">SKU: ${product.sku || 'N/A'}</p>
                        <p class="text-green-600 font-semibold mb-1">Price: $${product.selling_price}</p>
                        <p class="text-gray-600 text-sm mb-2">Available: ${product.available_stock}</p>
                        <button class="add-to-cart-btn w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition">
                            <i class="fas fa-cart-plus mr-2"></i>Add to Cart
                        </button>
                    `;

                    productsGrid.appendChild(card);
                    
                    const addToCartBtn = card.querySelector('.add-to-cart-btn');
                    addToCartBtn.addEventListener('click', () => {
                        if (product.available_stock > 0) {
                            window.addToCart(product, 1);
                        } else {
                            alert('Product is out of stock!');
                        }
                    });
                });
            })
            .catch(err => {
                console.error('[POS] Failed to load products:', err);
                productsGrid.innerHTML = '<p class="col-span-4 text-center text-red-500">Failed to load products.</p>';
            });
    }

    // Event listeners
    searchInput.addEventListener('input', () => loadProducts(searchInput.value, categorySelect.value));
    categorySelect.addEventListener('change', () => loadProducts(searchInput.value, categorySelect.value));
    
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        categorySelect.value = '';
        loadProducts();
    });
    
    const refreshBtn = document.getElementById('refresh-products');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadProducts(searchInput.value, categorySelect.value));
    
    // Cart controls
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            cart = {};
            renderCart();
            showToast('Cart cleared', 'info');
        });
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (Object.keys(cart).length === 0) return;
            
            const saleItems = Object.values(cart).map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: Number(item.unit_price) || 0
            }));
            
            fetch('/sales/api/create-sale/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({ items: saleItems })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to create sale');
                return res.json();
            })
            .then(data => {
                const cartValues = Object.values(cart);
                let subtotal = cartValues.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * item.quantity, 0);
                let taxAmount = cartValues.reduce((sum, item) => {
                    if (item.product.is_taxable) {
                        return sum + (Number(item.unit_price) || 0) * item.quantity * POS_SETTINGS.default_tax_rate;
                    }
                    return sum;
                }, 0);
                let total = subtotal + taxAmount;
                
                printReceipt(cartValues, subtotal, taxAmount, total, POS_SETTINGS);
                cart = {};
                renderCart();
                showToast('Sale completed successfully!', 'success');
            })
            .catch(err => {
                console.error(err);
                alert('Error processing payment.');
            });
        });
    }
    
    // Helper functions
    function getCSRFToken() {
        const cookieValue = document.cookie.match(/csrftoken=([^;]+)/);
        return cookieValue ? cookieValue[1] : '';
    }
    
    function printReceipt(items, subtotal, tax, total, settings) {
        let receipt = `${settings.shop_name}\n${settings.shop_address}\nTel: ${settings.shop_phone}\n-------------------------------\n`;
        items.forEach(item => {
            receipt += `${item.product.name} x ${item.quantity} @ $${Number(item.unit_price).toFixed(2)} = $${(item.quantity * Number(item.unit_price)).toFixed(2)}\n`;
        });
        receipt += `\n-------------------------------\nSubtotal: $${subtotal.toFixed(2)}\nTax: $${tax.toFixed(2)}\nTotal: $${total.toFixed(2)}\n-------------------------------\nThank you for your purchase!\n`;
        console.log(receipt);
        
        // Optional: Open print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<pre>${receipt}</pre>`);
        printWindow.print();
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${
            type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } transition-opacity duration-300`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
    
    // Initial load
    loadCategories();
    loadProducts();
    renderCart();
});
// ============================================
// BARCODE SCANNER
// ============================================

let barcodeBuffer = '';
let barcodeTimeout = null;
let scannerActive = true;

function initBarcodeScanner() {
    console.log('[SCANNER] Initializing...');
    
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
    
    document.addEventListener('keydown', (e) => {
        if (!scannerActive) return;
        
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT' && 
            activeElement.id !== 'barcode-scanner-input') {
            return;
        }
        
        if (e.key === 'Enter') {
            if (barcodeBuffer.length > 0) {
                e.preventDefault();
                handleBarcodeScan(barcodeBuffer);
                barcodeBuffer = '';
                if (barcodeTimeout) clearTimeout(barcodeTimeout);
            }
            return;
        }
        
        if (e.key.length === 1 && /[a-zA-Z0-9\-_]/.test(e.key)) {
            e.preventDefault();
            barcodeBuffer += e.key;
            
            if (barcodeTimeout) clearTimeout(barcodeTimeout);
            barcodeTimeout = setTimeout(() => {
                barcodeBuffer = '';
            }, 50);
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            const input = document.getElementById('barcode-scanner-input');
            if (input) {
                input.focus();
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
        
        if (product.available_stock > 0) {
            window.addToCart(product, 1);
            playSuccessBeep();
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
// PRODUCT DISPLAY
// ============================================

function loadCategories() {
    const categorySelect = document.getElementById('category-filter');
    if (!categorySelect) return;
    
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
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) {
        console.error('[POS] Products grid element not found!');
        return;
    }
    
    // Add context=pos to ensure store filtering
    const url = `/inventory/products/search_products/?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&context=pos`;
    
    console.log('[POS] Loading products from:', url);
    productsGrid.innerHTML = `<div class="col-span-4 text-center text-gray-400 py-8">Loading products...</div>`;

    fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
        })
        .then(data => {
            console.log('[POS] Products API response:', data);
            
            // Handle the response format with 'results' key
            const products = data.results || data;
            productsGrid.innerHTML = '';
            
            if (!products || products.length === 0) {
                productsGrid.innerHTML = '<p class="col-span-4 text-center text-gray-500">No products found. Make sure you have selected a store and products have stock.</p>';
                return;
            }

            console.log(`[POS] Rendering ${products.length} products`);
            
            products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card border p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer';
                card.setAttribute('data-product-id', product.id);
                
                const barcodeInfo = product.barcode ? 
                    `<p class="text-xs text-gray-400 mb-1"><i class="fas fa-barcode"></i> ${product.barcode}</p>` : '';

                const stock = product.available_stock || 0;
                const stockColorClass = stock <= 5 ? 'text-red-600' : 'text-gray-600';
                const stockWarning = stock <= 5 ? `⚠️ Low Stock: ${stock}` : `Stock: ${stock}`;

                card.innerHTML = `
                    <h3 class="font-bold text-lg mb-1">${escapeHtml(product.name)}</h3>
                    ${barcodeInfo}
                    <p class="text-sm text-gray-500 mb-1">SKU: ${escapeHtml(product.sku || 'N/A')}</p>
                    <p class="text-green-600 font-semibold mb-1">Price: $${Number(product.selling_price).toFixed(2)}</p>
                    <p class="${stockColorClass} text-sm mb-2">${stockWarning}</p>
                    <button class="add-to-cart-btn w-full ${stock > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'} text-white py-2 px-4 rounded-lg font-semibold transition" ${stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus mr-2"></i>${stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                `;

                productsGrid.appendChild(card);
                
                const addToCartBtn = card.querySelector('.add-to-cart-btn');
                if (addToCartBtn && stock > 0) {
                    addToCartBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.addToCart(product, 1);
                    });
                }
            });
        })
        .catch(err => {
            console.error('[POS] Failed to load products:', err);
            productsGrid.innerHTML = `<p class="col-span-4 text-center text-red-500">Failed to load products: ${err.message}</p>`;
            showToast('Failed to load products. Please refresh the page.', 'error');
        });
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[POS] Initializing...');
    
    // Get DOM elements
    const categorySelect = document.getElementById('category-filter');
    const searchInput = document.getElementById('product-search');
    const clearCartBtn = document.getElementById('clear-cart');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const refreshBtn = document.getElementById('refresh-products');
    
    // Initialize global references for cart
    window.cartItemsContainer = document.getElementById('cart-items');
    window.cartCount = document.getElementById('cart-count');
    window.cartSubtotal = document.getElementById('cart-subtotal');
    window.cartTax = document.getElementById('cart-tax');
    window.cartTotal = document.getElementById('cart-total');
    window.checkoutBtn = checkoutBtn;
    window.clearCartBtn = clearCartBtn;
    window.emptyCartMessage = document.getElementById('empty-cart-message');
    
    // Initialize components
    initBarcodeScanner();
    loadCategories();
    loadProducts();  // This will now work!
    if (typeof renderCart === 'function') {
        renderCart();
    } else {
        console.error('[POS] renderCart function not found! Make sure pos_cart.js is loaded first.');
    }
    
    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', () => loadProducts(searchInput.value, categorySelect?.value || ''));
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', () => loadProducts(searchInput?.value || '', categorySelect.value));
    }
    
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            if (confirm('Clear entire cart?')) {
                cart = {};
                if (typeof renderCart === 'function') renderCart();
                showToast('Cart cleared', 'info');
            }
        });
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processCheckout);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (categorySelect) categorySelect.value = '';
            loadProducts();
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadProducts(searchInput?.value || '', categorySelect?.value || ''));
    }
    
    // Check ReceiptService
    if (!window.ReceiptService) {
        console.warn('[POS] ReceiptService not loaded. Using fallback print.');
    } else {
        console.log('[POS] ReceiptService loaded');
        window.ReceiptService.updateSettings({
            shop_name: POS_SETTINGS.shop_name,
            shop_address: POS_SETTINGS.shop_address,
            shop_phone: POS_SETTINGS.shop_phone,
            tax_rate: POS_SETTINGS.default_tax_rate * 100,
            currency: 'KES'
        });
    }
    
    // Check if cart exists and is accessible
    if (typeof cart === 'undefined') {
        console.error('[POS] Cart variable not defined! Make sure pos_cart.js is loaded first.');
        showToast('Cart system not loaded properly. Please refresh.', 'error');
    } else {
        console.log('[POS] Cart system ready');
    }
});

// ============================================
// BARCODE SCANNER
// ============================================

// let barcodeBuffer = '';
// let barcodeTimeout = null;
// let scannerActive = true;

// function initBarcodeScanner() {
//     console.log('[SCANNER] Initializing...');
    
//     const barcodeInput = document.getElementById('barcode-scanner-input');
//     if (barcodeInput) {
//         barcodeInput.addEventListener('keypress', (e) => {
//             if (e.key === 'Enter') {
//                 e.preventDefault();
//                 const barcode = barcodeInput.value.trim();
//                 if (barcode) {
//                     handleBarcodeScan(barcode);
//                     barcodeInput.value = '';
//                 }
//             }
//         });
//         barcodeInput.focus();
//     }
    
//     document.addEventListener('keydown', (e) => {
//         if (!scannerActive) return;
        
//         const activeElement = document.activeElement;
//         if (activeElement && activeElement.tagName === 'INPUT' && 
//             activeElement.id !== 'barcode-scanner-input') {
//             return;
//         }
        
//         if (e.key === 'Enter') {
//             if (barcodeBuffer.length > 0) {
//                 e.preventDefault();
//                 handleBarcodeScan(barcodeBuffer);
//                 barcodeBuffer = '';
//                 if (barcodeTimeout) clearTimeout(barcodeTimeout);
//             }
//             return;
//         }
        
//         if (e.key.length === 1 && /[a-zA-Z0-9\-_]/.test(e.key)) {
//             e.preventDefault();
//             barcodeBuffer += e.key;
            
//             if (barcodeTimeout) clearTimeout(barcodeTimeout);
//             barcodeTimeout = setTimeout(() => {
//                 barcodeBuffer = '';
//             }, 50);
//         }
//     });
    
//     document.addEventListener('keydown', (e) => {
//         if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
//             e.preventDefault();
//             const input = document.getElementById('barcode-scanner-input');
//             if (input) {
//                 input.focus();
//                 showToast('Scanner ready', 'info');
//             }
//         }
//     });
// }

// async function handleBarcodeScan(barcode) {
//     console.log('[SCANNER] Processing:', barcode);
//     showToast(`Searching for ${barcode}...`, 'info');
    
//     try {
//         const response = await fetch(`/inventory/products/by-barcode/${encodeURIComponent(barcode)}/`);
        
//         if (!response.ok) {
//             if (response.status === 404) {
//                 showToast(`❌ Product with barcode ${barcode} not found!`, 'error');
//                 playErrorBeep();
//             } else {
//                 throw new Error(`HTTP ${response.status}`);
//             }
//             return;
//         }
        
//         const product = await response.json();
        
//         if (product.available_stock > 0) {
//             window.addToCart(product, 1);
//             playSuccessBeep();
//             highlightProductCard(product.id);
//         } else {
//             showToast(`❌ ${product.name} is out of stock!`, 'error');
//             playErrorBeep();
//         }
        
//     } catch (error) {
//         console.error('[SCANNER] Error:', error);
//         showToast('Error processing barcode', 'error');
//     }
// }

// // ============================================
// // PRODUCT DISPLAY
// // ============================================

// function loadCategories() {
//     const categorySelect = document.getElementById('category-filter');
//     if (!categorySelect) return;
    
//     fetch('/inventory/categories/')
//         .then(response => response.json())
//         .then(data => {
//             categorySelect.innerHTML = '<option value="">All Categories</option>';
//             data.forEach(category => {
//                 const option = document.createElement('option');
//                 option.value = category.id;
//                 option.textContent = category.name;
//                 categorySelect.appendChild(option);
//             });
//         })
//         .catch(error => console.error('[POS] Error loading categories:', error));
// }

// function loadProducts(query = '', category = '') {
//     const productsGrid = document.getElementById('products-grid');
//     if (!productsGrid) {
//         console.error('[POS] Products grid element not found!');
//         return;
//     }
    
//     // Add context=pos to ensure store filtering
//     const url = `/inventory/products/search_products/?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&context=pos`;
    
//     console.log('[POS] Loading products from:', url);
//     productsGrid.innerHTML = `<div class="col-span-4 text-center text-gray-400 py-8">Loading products...</div>`;

//     fetch(url)
//         .then(res => {
//             if (!res.ok) {
//                 throw new Error(`HTTP ${res.status}: ${res.statusText}`);
//             }
//             return res.json();
//         })
//         .then(data => {
//             console.log('[POS] Products API response:', data);
            
//             // Handle the response format with 'results' key
//             const products = data.results || data;
//             productsGrid.innerHTML = '';
            
//             if (!products || products.length === 0) {
//                 productsGrid.innerHTML = '<p class="col-span-4 text-center text-gray-500">No products found. Make sure you have selected a store and products have stock.</p>';
//                 return;
//             }

//             console.log(`[POS] Rendering ${products.length} products`);
            
//             products.forEach(product => {
//                 const card = document.createElement('div');
//                 card.className = 'product-card border p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer';
//                 card.setAttribute('data-product-id', product.id);
                
//                 const barcodeInfo = product.barcode ? 
//                     `<p class="text-xs text-gray-400 mb-1"><i class="fas fa-barcode"></i> ${product.barcode}</p>` : '';

//                 const stock = product.available_stock || 0;
//                 const stockColorClass = stock <= 5 ? 'text-red-600' : 'text-gray-600';
//                 const stockWarning = stock <= 5 ? `⚠️ Low Stock: ${stock}` : `Stock: ${stock}`;

//                 card.innerHTML = `
//                     <h3 class="font-bold text-lg mb-1">${escapeHtml(product.name)}</h3>
//                     ${barcodeInfo}
//                     <p class="text-sm text-gray-500 mb-1">SKU: ${escapeHtml(product.sku || 'N/A')}</p>
//                     <p class="text-green-600 font-semibold mb-1">Price: $${Number(product.selling_price).toFixed(2)}</p>
//                     <p class="${stockColorClass} text-sm mb-2">${stockWarning}</p>
//                     <button class="add-to-cart-btn w-full ${stock > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'} text-white py-2 px-4 rounded-lg font-semibold transition" ${stock <= 0 ? 'disabled' : ''}>
//                         <i class="fas fa-cart-plus mr-2"></i>${stock > 0 ? 'Add to Cart' : 'Out of Stock'}
//                     </button>
//                 `;

//                 productsGrid.appendChild(card);
                
//                 const addToCartBtn = card.querySelector('.add-to-cart-btn');
//                 if (addToCartBtn && stock > 0) {
//                     addToCartBtn.addEventListener('click', (e) => {
//                         e.stopPropagation();
//                         window.addToCart(product, 1);
//                     });
//                 }
//             });
//         })
//         .catch(err => {
//             console.error('[POS] Failed to load products:', err);
//             productsGrid.innerHTML = `<p class="col-span-4 text-center text-red-500">Failed to load products: ${err.message}</p>`;
//             showToast('Failed to load products. Please refresh the page.', 'error');
//         });
// }

// // ============================================
// // REFRESH AFTER CHECKOUT
// // ============================================

// function refreshProductsAfterCheckout() {
//     console.log('[POS] Refreshing products after checkout...');
//     const searchInput = document.getElementById('product-search');
//     const categorySelect = document.getElementById('category-filter');
//     const query = searchInput ? searchInput.value : '';
//     const category = categorySelect ? categorySelect.value : '';
    
//     // Reload products to update stock levels
//     loadProducts(query, category);
//     showToast('Products updated', 'success');
// }

// // Helper function to escape HTML to prevent XSS
// function escapeHtml(str) {
//     if (!str) return '';
//     return str
//         .replace(/&/g, '&amp;')
//         .replace(/</g, '&lt;')
//         .replace(/>/g, '&gt;')
//         .replace(/"/g, '&quot;')
//         .replace(/'/g, '&#39;');
// }

// // ============================================
// // PROCESS CHECKOUT (MODIFIED TO REFRESH)
// // ============================================

// async function processCheckout() {
//     console.log('[POS] Processing checkout...');
    
//     // Check if cart is empty
//     if (!window.cart || Object.keys(window.cart).length === 0) {
//         showToast('Cart is empty!', 'error');
//         return;
//     }
    
//     // Show loading state
//     const checkoutBtn = document.getElementById('checkout-btn');
//     const originalBtnText = checkoutBtn ? checkoutBtn.innerHTML : '';
//     if (checkoutBtn) {
//         checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
//         checkoutBtn.disabled = true;
//     }
    
//     try {
//         // Prepare order data
//         const orderItems = [];
//         let subtotal = 0;
        
//         for (const [productId, item] of Object.entries(window.cart)) {
//             const itemTotal = item.price * item.quantity;
//             subtotal += itemTotal;
            
//             orderItems.push({
//                 product_id: parseInt(productId),
//                 quantity: item.quantity,
//                 price: item.price
//             });
//         }
        
//         const tax = subtotal * (POS_SETTINGS.default_tax_rate || 0);
//         const total = subtotal + tax;
        
//         const orderData = {
//             items: orderItems,
//             subtotal: subtotal,
//             tax: tax,
//             total: total,
//             payment_method: 'cash', // You can make this dynamic
//             customer_id: null // Optional: add customer selection
//         };
        
//         console.log('[POS] Submitting order:', orderData);
        
//         // Submit order to backend
//         const response = await fetch('/sales/orders/', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-CSRFToken': getCsrfToken()
//             },
//             body: JSON.stringify(orderData)
//         });
        
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || `HTTP ${response.status}`);
//         }
        
//         const result = await response.json();
//         console.log('[POS] Order successful:', result);
        
//         // Print receipt if available
//         if (window.ReceiptService && result.order) {
//             try {
//                 await window.ReceiptService.printOrderReceipt(result.order);
//                 showToast('Receipt printed', 'success');
//             } catch (receiptError) {
//                 console.warn('[POS] Receipt printing failed:', receiptError);
//                 showToast('Order completed but receipt failed', 'warning');
//             }
//         }
        
//         // Clear the cart
//         window.cart = {};
//         if (typeof renderCart === 'function') {
//             renderCart();
//         }
        
//         // ✅ REFRESH PRODUCTS AFTER SUCCESSFUL CHECKOUT
//         refreshProductsAfterCheckout();
        
//         showToast('✅ Order completed successfully!', 'success');
        
//         // Focus back on barcode scanner
//         const barcodeInput = document.getElementById('barcode-scanner-input');
//         if (barcodeInput) {
//             barcodeInput.focus();
//         }
        
//     } catch (error) {
//         console.error('[POS] Checkout error:', error);
//         showToast(`Checkout failed: ${error.message}`, 'error');
//     } finally {
//         // Restore button state
//         if (checkoutBtn) {
//             checkoutBtn.innerHTML = originalBtnText;
//             checkoutBtn.disabled = false;
//         }
//     }
// }

// // Helper to get CSRF token from cookies
// function getCsrfToken() {
//     const name = 'csrftoken';
//     const cookies = document.cookie.split(';');
//     for (let cookie of cookies) {
//         const trimmed = cookie.trim();
//         if (trimmed.startsWith(name + '=')) {
//             return decodeURIComponent(trimmed.substring(name.length + 1));
//         }
//     }
//     return '';
// }

// // ============================================
// // INITIALIZATION
// // ============================================

// document.addEventListener('DOMContentLoaded', () => {
//     console.log('[POS] Initializing...');
    
//     // Get DOM elements
//     const categorySelect = document.getElementById('category-filter');
//     const searchInput = document.getElementById('product-search');
//     const clearCartBtn = document.getElementById('clear-cart');
//     const checkoutBtn = document.getElementById('checkout-btn');
//     const clearFiltersBtn = document.getElementById('clear-filters');
//     const refreshBtn = document.getElementById('refresh-products');
    
//     // Initialize global references for cart
//     window.cartItemsContainer = document.getElementById('cart-items');
//     window.cartCount = document.getElementById('cart-count');
//     window.cartSubtotal = document.getElementById('cart-subtotal');
//     window.cartTax = document.getElementById('cart-tax');
//     window.cartTotal = document.getElementById('cart-total');
//     window.checkoutBtn = checkoutBtn;
//     window.clearCartBtn = clearCartBtn;
//     window.emptyCartMessage = document.getElementById('empty-cart-message');
    
//     // Initialize components
//     initBarcodeScanner();
//     loadCategories();
//     loadProducts();
//     if (typeof renderCart === 'function') {
//         renderCart();
//     } else {
//         console.error('[POS] renderCart function not found! Make sure pos_cart.js is loaded first.');
//     }
    
//     // Event listeners
//     if (searchInput) {
//         searchInput.addEventListener('input', () => loadProducts(searchInput.value, categorySelect?.value || ''));
//     }
    
//     if (categorySelect) {
//         categorySelect.addEventListener('change', () => loadProducts(searchInput?.value || '', categorySelect.value));
//     }
    
//     if (clearCartBtn) {
//         clearCartBtn.addEventListener('click', () => {
//             if (confirm('Clear entire cart?')) {
//                 window.cart = {};
//                 if (typeof renderCart === 'function') renderCart();
//                 showToast('Cart cleared', 'info');
//             }
//         });
//     }
    
//     if (checkoutBtn) {
//         checkoutBtn.addEventListener('click', processCheckout);
//     }
    
//     if (clearFiltersBtn) {
//         clearFiltersBtn.addEventListener('click', () => {
//             if (searchInput) searchInput.value = '';
//             if (categorySelect) categorySelect.value = '';
//             loadProducts();
//         });
//     }
    
//     if (refreshBtn) {
//         refreshBtn.addEventListener('click', () => loadProducts(searchInput?.value || '', categorySelect?.value || ''));
//     }
    
//     // Check ReceiptService
//     if (!window.ReceiptService) {
//         console.warn('[POS] ReceiptService not loaded. Using fallback print.');
//     } else {
//         console.log('[POS] ReceiptService loaded');
//         window.ReceiptService.updateSettings({
//             shop_name: POS_SETTINGS.shop_name,
//             shop_address: POS_SETTINGS.shop_address,
//             shop_phone: POS_SETTINGS.shop_phone,
//             tax_rate: POS_SETTINGS.default_tax_rate * 100,
//             currency: 'KES'
//         });
//     }
    
//     // Check if cart exists and is accessible
//     if (typeof window.cart === 'undefined') {
//         console.error('[POS] Cart variable not defined! Make sure pos_cart.js is loaded first.');
//         showToast('Cart system not loaded properly. Please refresh.', 'error');
//         // Initialize empty cart if not defined
//         window.cart = {};
//     } else {
//         console.log('[POS] Cart system ready');
//     }
// });
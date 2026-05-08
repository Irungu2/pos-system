// ================================
// POS Interface JS (with logging)
// ================================

document.addEventListener('DOMContentLoaded', () => {

    console.log('[POS] DOM loaded');

    const categorySelect = document.getElementById('category-filter');
    const searchInput = document.getElementById('product-search');
    const productsGrid = document.getElementById('products-grid');

    // -----------------------------
    // 1. Load categories from API
    // -----------------------------
    function loadCategories() {
        console.log('[POS] Loading categories...');

        fetch('/inventory/categories/')
            .then(response => response.json())
            .then(data => {
                console.log('[POS] Categories loaded:', data);

                categorySelect.innerHTML = '<option value="">All Categories</option>';
                data.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('[POS] Error loading categories:', error);
            });
    }

    // -----------------------------
    // 2. Load products from API
    // -----------------------------
    function loadProducts(query = '', category = '') {
        const url = `/inventory/products/search_products/?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;

        console.log('[POS] Loading products', { query, category, url });

        productsGrid.innerHTML =
            `<div class="col-span-4 text-center text-gray-400 py-8">Loading products...</div>`;

        fetch(url)
            .then(res => res.json())
            .then(products => {
                console.log(`[POS] Products received (${products.length})`, products);

                productsGrid.innerHTML = '';

                if (!products.length) {
                    console.warn('[POS] No products found');
                    productsGrid.innerHTML =
                        '<p class="col-span-4 text-center text-gray-500">No products found.</p>';
                    return;
                }

                products.forEach(product => {
                    const card = document.createElement('div');
                    card.className =
                        'product-card border p-4 rounded-lg shadow-sm hover:shadow-md transition';

                    card.innerHTML = `
                        <h3 class="font-bold text-lg mb-1">${product.name}</h3>
                        <p class="text-sm text-gray-500 mb-1">SKU: ${product.sku || 'N/A'}</p>
                        <p class="text-green-600 font-semibold mb-1">
                            Price: $${product.selling_price}
                        </p>
                        <p class="text-gray-600 text-sm mb-2">
                            Available: ${product.available_stock}
                        </p>
                        <button class="add-to-cart-btn w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition">
                            <i class="fas fa-cart-plus mr-2"></i>Add to Cart
                        </button>
                    `;

                    productsGrid.appendChild(card);

                    // Add to Cart button
                    const addToCartBtn = card.querySelector('.add-to-cart-btn');
                    addToCartBtn.addEventListener('click', () => {
                        console.log('[POS] Add to cart clicked', product);

                        if (product.available_stock > 0) {
                            window.addToCart(product, 1);
                            console.log('[POS] Product added to cart:', product.name);
                        } else {
                            console.warn('[POS] Out of stock:', product.name);
                            alert('Product is out of stock!');
                        }
                    });
                });
            })
            .catch(err => {
                console.error('[POS] Failed to load products:', err);
                productsGrid.innerHTML =
                    '<p class="col-span-4 text-center text-red-500">Failed to load products.</p>';
            });
    }

    // -----------------------------
    // 3. Event listeners
    // -----------------------------
    searchInput.addEventListener('input', () => {
        console.log('[POS] Search input changed:', searchInput.value);
        loadProducts(searchInput.value, categorySelect.value);
    });

    categorySelect.addEventListener('change', () => {
        console.log('[POS] Category changed:', categorySelect.value);
        loadProducts(searchInput.value, categorySelect.value);
    });

    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('[POS] Filters cleared');
            searchInput.value = '';
            categorySelect.value = '';
            loadProducts();
        });
    }

    const refreshBtn = document.getElementById('refresh-products');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('[POS] Refresh products clicked');
            loadProducts(searchInput.value, categorySelect.value);
        });
    }

    // -----------------------------
    // Initial load
    // -----------------------------
    console.log('[POS] Initial load');
    loadCategories();
    loadProducts();
});


// ================================
// POS Interface JS (with logging & Store Context)
// ================================

// document.addEventListener('DOMContentLoaded', () => {

//     console.log('[POS] DOM loaded - Initializing Point of Sale System');

//     const categorySelect = document.getElementById('category-filter');
//     const searchInput = document.getElementById('product-search');
//     const productsGrid = document.getElementById('products-grid');
//     const clearBtn = document.getElementById('clear-filters');
//     const refreshBtn = document.getElementById('refresh-products');
    
//     // Store information display element (add this to your HTML)
//     let storeDisplay = document.getElementById('current-store-display');
//     if (!storeDisplay) {
//         // Create store display if it doesn't exist
//         storeDisplay = document.createElement('div');
//         storeDisplay.id = 'current-store-display';
//         storeDisplay.className = 'text-sm text-gray-600 mb-4 p-2 bg-blue-50 rounded-lg';
//         const header = document.querySelector('.pos-header') || document.querySelector('header');
//         if (header) {
//             header.appendChild(storeDisplay);
//         }
//     }

//     // -----------------------------
//     // Helper Functions
//     // -----------------------------
    
//     // Escape HTML to prevent XSS
//     function escapeHtml(str) {
//         if (!str) return '';
//         return str
//             .replace(/&/g, '&amp;')
//             .replace(/</g, '&lt;')
//             .replace(/>/g, '&gt;')
//             .replace(/"/g, '&quot;')
//             .replace(/'/g, '&#39;');
//     }

//     // Show notification
//     function showNotification(message, type = 'info') {
//         let notification = document.getElementById('pos-notification');
//         if (!notification) {
//             notification = document.createElement('div');
//             notification.id = 'pos-notification';
//             notification.style.cssText = `
//                 position: fixed;
//                 top: 20px;
//                 right: 20px;
//                 z-index: 9999;
//                 padding: 12px 20px;
//                 border-radius: 8px;
//                 font-weight: 500;
//                 transition: all 0.3s ease;
//                 transform: translateX(400px);
//                 box-shadow: 0 4px 6px rgba(0,0,0,0.1);
//             `;
//             document.body.appendChild(notification);
//         }
        
//         const colors = {
//             success: 'bg-green-500 text-white',
//             error: 'bg-red-500 text-white',
//             info: 'bg-blue-500 text-white',
//             warning: 'bg-yellow-500 text-white'
//         };
        
//         notification.className = colors[type] || colors.info;
//         notification.innerHTML = `
//             <div class="flex items-center">
//                 <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
//                 <span>${escapeHtml(message)}</span>
//             </div>
//         `;
        
//         setTimeout(() => {
//             notification.style.transform = 'translateX(0)';
//         }, 10);
        
//         setTimeout(() => {
//             notification.style.transform = 'translateX(400px)';
//         }, 3000);
//     }

//     // Check product stock before adding to cart
//     async function checkProductStock(productId, quantity) {
//         try {
//             const response = await fetch(`/inventory/products/${productId}/check_stock/?quantity=${quantity}&context=pos`);
//             const data = await response.json();
            
//             if (response.ok && data.success) {
//                 return {
//                     hasStock: data.has_sufficient_stock,
//                     currentStock: data.current_stock,
//                     message: data.message
//                 };
//             }
//             return { hasStock: false, currentStock: 0, message: 'Stock check failed' };
//         } catch (error) {
//             console.error('[POS] Stock check failed:', error);
//             return { hasStock: false, currentStock: 0, message: error.message };
//         }
//     }

//     // Get current store info
//     async function getCurrentStore() {
//         try {
//             const response = await fetch('/inventory/stores/current_store/');
//             if (response.ok) {
//                 const store = await response.json();
//                 return store;
//             }
//             return null;
//         } catch (error) {
//             console.error('[POS] Failed to get current store:', error);
//             return null;
//         }
//     }

//     // Update store display
//     async function updateStoreDisplay() {
//         const store = await getCurrentStore();
//         if (store && storeDisplay) {
//             storeDisplay.innerHTML = `
//                 <div class="flex items-center justify-between">
//                     <div>
//                         <i class="fas fa-store mr-2"></i>
//                         <strong>Current Store:</strong> ${escapeHtml(store.name)}
//                         <span class="text-xs text-gray-500 ml-2">ID: ${store.id}</span>
//                     </div>
//                     <div class="text-xs">
//                         <i class="fas fa-sync-alt mr-1"></i>POS Mode Active
//                     </div>
//                 </div>
//             `;
//             console.log('[POS] Store display updated:', store.name);
//         } else if (storeDisplay) {
//             storeDisplay.innerHTML = `
//                 <div class="flex items-center justify-between text-yellow-700 bg-yellow-50">
//                     <div>
//                         <i class="fas fa-exclamation-triangle mr-2"></i>
//                         <strong>No Store Selected</strong>
//                         <span class="text-xs ml-2">Please select a store to continue</span>
//                     </div>
//                 </div>
//             `;
//         }
//     }

//     // -----------------------------
//     // 1. Load categories from API
//     // -----------------------------
//     function loadCategories() {
//         console.log('[POS] Loading categories...');

//         fetch('/inventory/categories/')
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error(`HTTP ${response.status}`);
//                 }
//                 return response.json();
//             })
//             .then(data => {
//                 console.log('[POS] Categories loaded:', data.length, 'categories');
                
//                 categorySelect.innerHTML = '<option value="">All Categories</option>';
//                 data.forEach(category => {
//                     const option = document.createElement('option');
//                     option.value = category.id;
//                     option.textContent = category.name;
//                     categorySelect.appendChild(option);
//                 });
//             })
//             .catch(error => {
//                 console.error('[POS] Error loading categories:', error);
//                 showNotification('Failed to load categories', 'error');
//             });
//     }

//     // -----------------------------
//     // 2. Load products from API (with POS context)
//     // -----------------------------
//     function loadProducts(query = '', category = '') {
//         // IMPORTANT: Add context=pos to enforce store filtering
//         const url = `/inventory/products/search_products/?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&context=pos`;
        
//         console.log('[POS] Loading products', { query, category, url });

//         productsGrid.innerHTML = `
//             <div class="col-span-4 text-center text-gray-400 py-8">
//                 <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
//                 <p>Loading products...</p>
//             </div>
//         `;

//         fetch(url)
//             .then(res => {
//                 if (!res.ok) {
//                     throw new Error(`HTTP ${res.status}: ${res.statusText}`);
//                 }
//                 return res.json();
//             })
//             .then(data => {
//                 // Handle the new response structure with metadata
//                 let products = [];
//                 let storeInfo = null;
                
//                 // Check if response has the new structure with 'results' field
//                 if (data.results && Array.isArray(data.results)) {
//                     products = data.results;
//                     storeInfo = data.store;
//                     console.log('[POS] New response format detected', {
//                         context: data.context,
//                         store_filtered: data.store_filtered,
//                         store: storeInfo,
//                         count: data.count,
//                         total_products: products.length
//                     });
                    
//                     // Update store display if store info is in response
//                     if (storeInfo && storeDisplay) {
//                         storeDisplay.innerHTML = `
//                             <div class="flex items-center justify-between">
//                                 <div>
//                                     <i class="fas fa-store mr-2"></i>
//                                     <strong>Current Store:</strong> ${escapeHtml(storeInfo.name)}
//                                     <span class="text-xs text-gray-500 ml-2">ID: ${storeInfo.id}</span>
//                                 </div>
//                                 <div class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
//                                     <i class="fas fa-shopping-cart mr-1"></i>POS Mode Active
//                                 </div>
//                             </div>
//                         `;
//                     }
//                 } else if (Array.isArray(data)) {
//                     // Handle legacy format (just an array of products)
//                     products = data;
//                     console.log('[POS] Legacy response format detected');
//                 } else {
//                     console.error('[POS] Unexpected response format:', data);
//                     productsGrid.innerHTML = `
//                         <div class="col-span-4 text-center py-8">
//                             <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
//                             <p class="text-red-500">Invalid response from server.</p>
//                             <p class="text-sm text-gray-500 mt-2">Please refresh and try again.</p>
//                         </div>
//                     `;
//                     return;
//                 }
                
//                 console.log(`[POS] Products received (${products.length})`, products);
                
//                 // Update store display if we have store info from the response
//                 if (storeInfo) {
//                     console.log(`[POS] Current Store: ${storeInfo.name} (ID: ${storeInfo.id})`);
//                 } else {
//                     // Try to get store info separately
//                     updateStoreDisplay();
//                 }

//                 productsGrid.innerHTML = '';

//                 if (!products.length) {
//                     console.warn('[POS] No products found');
//                     productsGrid.innerHTML = `
//                         <div class="col-span-4 text-center py-8">
//                             <i class="fas fa-box-open text-4xl text-gray-400 mb-3"></i>
//                             <p class="text-gray-500">No products found.</p>
//                             <p class="text-sm text-gray-400 mt-2">
//                                 ${query ? 'Try a different search term.' : 'No products available in this store.'}
//                             </p>
//                         </div>
//                     `;
//                     return;
//                 }

//                 // Display products
//                 products.forEach(product => {
//                     const card = document.createElement('div');
//                     card.className = 'product-card border p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer';
                    
//                     // Get available stock (try different possible field names)
//                     const availableStock = product.available_stock || product.stock_quantity || product.current_stock || 0;
//                     const isOutOfStock = availableStock <= 0;
//                     const productName = product.name || 'Unnamed Product';
//                     const productSku = product.sku || 'N/A';
//                     const productPrice = parseFloat(product.selling_price || product.price || 0).toFixed(2);
                    
//                     card.innerHTML = `
//                         <div class="flex justify-between items-start mb-2">
//                             <h3 class="font-bold text-lg text-gray-800">${escapeHtml(productName)}</h3>
//                             ${isOutOfStock ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Out of Stock</span>' : ''}
//                         </div>
//                         <p class="text-sm text-gray-500 mb-1">SKU: ${escapeHtml(productSku)}</p>
//                         <p class="text-green-600 font-semibold text-xl mb-2">
//                             $${productPrice}
//                         </p>
//                         <div class="flex justify-between items-center mb-3">
//                             <p class="text-gray-600 text-sm">
//                                 Available: <span class="font-semibold ${isOutOfStock ? 'text-red-500' : 'text-green-600'}">${availableStock}</span>
//                             </p>
//                             ${product.category ? `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${escapeHtml(product.category.name || product.category)}</span>` : ''}
//                         </div>
//                         <button class="add-to-cart-btn w-full ${isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white py-2 px-4 rounded-lg font-semibold transition" 
//                                 ${isOutOfStock ? 'disabled' : ''}>
//                             <i class="fas fa-cart-plus mr-2"></i>Add to Cart
//                         </button>
//                     `;

//                     productsGrid.appendChild(card);

//                     // Add to Cart button handler
//                     if (!isOutOfStock) {
//                         const addToCartBtn = card.querySelector('.add-to-cart-btn');
//                         addToCartBtn.addEventListener('click', async (e) => {
//                             e.stopPropagation();
//                             console.log('[POS] Add to cart clicked', { productId: product.id, name: productName });
                            
//                             // Show loading state
//                             const originalText = addToCartBtn.innerHTML;
//                             addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Checking...';
//                             addToCartBtn.disabled = true;
                            
//                             // Check stock before adding
//                             const stockCheck = await checkProductStock(product.id, 1);
                            
//                             if (stockCheck.hasStock) {
//                                 // Create a product object with stock info for the cart
//                                 const cartProduct = {
//                                     ...product,
//                                     available_stock: stockCheck.currentStock,
//                                     selling_price: productPrice
//                                 };
                                
//                                 if (window.addToCart) {
//                                     window.addToCart(cartProduct, 1);
//                                     console.log('[POS] Product added to cart:', productName);
//                                     showNotification(`${productName} added to cart!`, 'success');
                                    
//                                     // Visual feedback
//                                     addToCartBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Added!';
//                                     setTimeout(() => {
//                                         addToCartBtn.innerHTML = originalText;
//                                         addToCartBtn.disabled = false;
//                                     }, 1000);
//                                 } else {
//                                     console.error('[POS] addToCart function not found');
//                                     showNotification('Error: Cart function not available', 'error');
//                                     addToCartBtn.innerHTML = originalText;
//                                     addToCartBtn.disabled = false;
//                                 }
//                             } else {
//                                 console.warn('[POS] Stock unavailable for:', productName);
//                                 showNotification(`${productName} is out of stock!`, 'error');
//                                 addToCartBtn.innerHTML = originalText;
//                                 addToCartBtn.disabled = false;
//                             }
//                         });
//                     }
                    
//                     // Optional: Click on card to view product details
//                     card.addEventListener('click', (e) => {
//                         if (!e.target.closest('.add-to-cart-btn')) {
//                             console.log('[POS] View product details:', productName);
//                             showProductDetails(product);
//                         }
//                     });
//                 });
//             })
//             .catch(err => {
//                 console.error('[POS] Failed to load products:', err);
//                 productsGrid.innerHTML = `
//                     <div class="col-span-4 text-center py-8">
//                         <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
//                         <p class="text-red-500">Failed to load products.</p>
//                         <p class="text-sm text-gray-500 mt-2">${err.message}</p>
//                         <button onclick="location.reload()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
//                             <i class="fas fa-sync-alt mr-2"></i>Retry
//                         </button>
//                     </div>
//                 `;
//                 showNotification('Failed to load products. Please refresh.', 'error');
//             });
//     }

//     // Show product details (optional enhancement)
//     function showProductDetails(product) {
//         console.log('[POS] Show product details modal:', product);
//         // You can implement a modal here to show more product details
//         // For now, just show a notification
//         showNotification(`${product.name} - Price: $${product.selling_price}`, 'info');
//     }

//     // Refresh products (with current filters)
//     function refreshProducts() {
//         console.log('[POS] Manual refresh triggered');
//         loadProducts(searchInput.value, categorySelect.value);
//         showNotification('Refreshing products...', 'info');
//     }

//     // Clear all filters
//     function clearFilters() {
//         console.log('[POS] Clearing filters');
//         searchInput.value = '';
//         categorySelect.value = '';
//         loadProducts();
//         showNotification('Filters cleared', 'info');
//     }

//     // -----------------------------
//     // 3. Event listeners
//     // -----------------------------
    
//     if (searchInput) {
//         searchInput.addEventListener('input', () => {
//             console.log('[POS] Search input changed:', searchInput.value);
//             loadProducts(searchInput.value, categorySelect.value);
//         });
//     }

//     if (categorySelect) {
//         categorySelect.addEventListener('change', () => {
//             console.log('[POS] Category changed:', categorySelect.value);
//             loadProducts(searchInput.value, categorySelect.value);
//         });
//     }

//     if (clearBtn) {
//         clearBtn.addEventListener('click', clearFilters);
//     }

//     if (refreshBtn) {
//         refreshBtn.addEventListener('click', refreshProducts);
//     }

//     // Listen for store change events
//     document.addEventListener('storeChanged', (event) => {
//         console.log('[POS] Store changed event received:', event.detail);
//         // Refresh products when store changes
//         setTimeout(() => {
//             refreshProducts();
//         }, 500);
//     });

//     // -----------------------------
//     // Initial load
//     // -----------------------------
//     console.log('[POS] Starting initial load...');
    
//     // Load categories and products
//     loadCategories();
//     loadProducts();
    
//     // Update store display
//     updateStoreDisplay();
    
//     // Optional: Auto-refresh every 30 seconds (uncomment if needed)
//     // setInterval(() => {
//     //     console.log('[POS] Auto-refresh triggered');
//     //     refreshProducts();
//     // }, 30000);
    
//     console.log('[POS] Initialization complete');
// });

// // Export functions for global access if needed
// window.loadProducts = loadProducts;
// window.refreshProducts = refreshProducts;
// window.clearFilters = clearFilters;
// window.showNotification = showNotification;
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

// ================================
// Inventory Admin CRUD JS (Corrected)
// ================================

document.addEventListener('DOMContentLoaded', () => {

    // ================================
    // 1. DOM References
    // ================================
    const categoryTable = document.getElementById('category-table-body');
    const productTable = document.getElementById('product-table-body');
    const storeTable = document.getElementById('store-table-body');
    const stockTable = document.getElementById('stock-table-body');

    const categoryForm = document.getElementById('category-form');
    const productForm = document.getElementById('product-form');
    const storeForm = document.getElementById('store-form');
    const stockForm = document.getElementById('stock-form');

    // -----------------------------
    // Generic helper functions
    // -----------------------------
    function getCSRFToken() {
        const cookieValue = document.cookie.match(/csrftoken=([^;]+)/);
        return cookieValue ? cookieValue[1] : '';
    }

    function apiFetch(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            }
        };
        if (data) options.body = JSON.stringify(data);

        return fetch(url, options)
            .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)));
    }

    function createCell(text) {
        const td = document.createElement('td');
        td.textContent = text;
        return td;
    }

    function createActionCell(editHandler, deleteHandler) {
        const td = document.createElement('td');

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'px-2 py-1 bg-blue-500 text-white rounded mr-2';
        editBtn.addEventListener('click', editHandler);

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.className = 'px-2 py-1 bg-red-500 text-white rounded';
        delBtn.addEventListener('click', deleteHandler);

        td.appendChild(editBtn);
        td.appendChild(delBtn);
        return td;
    }

    // ================================
    // 2. CATEGORY CRUD
    // ================================
    function loadCategories() {
        apiFetch('/inventory/categories/')
            .then(data => {
                categoryTable.innerHTML = '';
                data.forEach(cat => {
                    const tr = document.createElement('tr');
                    tr.appendChild(createCell(cat.id));
                    tr.appendChild(createCell(cat.name));
                    tr.appendChild(createCell(cat.description || ''));
                    tr.appendChild(createCell(new Date(cat.created_at).toLocaleDateString()));

                    tr.appendChild(createActionCell(
                        () => populateCategoryForm(cat),
                        () => deleteCategory(cat.id)
                    ));
                    categoryTable.appendChild(tr);
                });
            })
            .catch(err => console.error('Error loading categories:', err));
    }

    function populateCategoryForm(category) {
        categoryForm.elements['id'].value = category.id;
        categoryForm.elements['name'].value = category.name;
        categoryForm.elements['description'].value = category.description || '';
    }

    function saveCategory(e) {
        e.preventDefault();
        const id = categoryForm.elements['id'].value;
        const data = {
            name: categoryForm.elements['name'].value,
            description: categoryForm.elements['description'].value
        };
        const url = id ? `/inventory/categories/${id}/` : '/inventory/categories/';
        const method = id ? 'PUT' : 'POST';

        apiFetch(url, method, data)
            .then(() => {
                categoryForm.reset();
                loadCategories();
            })
            .catch(err => alert('Error saving category: ' + JSON.stringify(err)));
    }

    function deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) return;
        apiFetch(`/inventory/categories/${id}/`, 'DELETE')
            .then(loadCategories)
            .catch(err => alert('Error deleting category: ' + JSON.stringify(err)));
    }

    categoryForm.addEventListener('submit', saveCategory);
    loadCategories();

    // ================================
    // 3. PRODUCT CRUD
    // ================================
    function loadProducts() {
        apiFetch('/inventory/products/')
            .then(data => {
                productTable.innerHTML = '';
                data.forEach(prod => {
                    const tr = document.createElement('tr');
                    tr.appendChild(createCell(prod.id));
                    tr.appendChild(createCell(prod.name));
                    tr.appendChild(createCell(prod.sku));
                    tr.appendChild(createCell(prod.category?.name || ''));
                    tr.appendChild(createCell(prod.selling_price));
                    tr.appendChild(createCell(prod.is_active ? 'Yes' : 'No'));
                    tr.appendChild(createActionCell(
                        () => populateProductForm(prod),
                        () => deleteProduct(prod.id)
                    ));
                    productTable.appendChild(tr);
                });
            })
            .catch(err => console.error('Error loading products:', err));
    }

    function populateProductForm(product) {
        productForm.elements['id'].value = product.id;
        productForm.elements['name'].value = product.name;
        productForm.elements['selling_price'].value = product.selling_price;
        productForm.elements['cost_price'].value = product.cost_price;
        productForm.elements['reorder_level'].value = product.reorder_level;
        productForm.elements['is_active'].checked = product.is_active;
        productForm.elements['category'].value = product.category?.id || '';
    }

    function saveProduct(e) {
        e.preventDefault();
        const id = productForm.elements['id'].value;
        const data = {
            name: productForm.elements['name'].value,
            cost_price: parseFloat(productForm.elements['cost_price'].value),
            selling_price: parseFloat(productForm.elements['selling_price'].value),
            reorder_level: parseInt(productForm.elements['reorder_level'].value),
            is_active: productForm.elements['is_active'].checked,
            category: productForm.elements['category'].value || null
        };
        const url = id ? `/inventory/products/${id}/` : '/inventory/products/';
        const method = id ? 'PUT' : 'POST';

        apiFetch(url, method, data)
            .then(() => {
                productForm.reset();
                loadProducts();
            })
            .catch(err => alert('Error saving product: ' + JSON.stringify(err)));
    }

    function deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        apiFetch(`/inventory/products/${id}/`, 'DELETE')
            .then(loadProducts)
            .catch(err => alert('Error deleting product: ' + JSON.stringify(err)));
    }

    productForm.addEventListener('submit', saveProduct);
    loadProducts();

    // ================================
    // 4. STORE CRUD
    // ================================
    function loadStores() {
        apiFetch('/inventory/stores/')
            .then(data => {
                storeTable.innerHTML = '';
                data.forEach(store => {
                    const tr = document.createElement('tr');
                    tr.appendChild(createCell(store.id));
                    tr.appendChild(createCell(store.name));
                    tr.appendChild(createCell(store.location || ''));
                    tr.appendChild(createCell(store.store_type));
                    tr.appendChild(createCell(store.is_default_warehouse ? 'Yes' : 'No'));
                    tr.appendChild(createActionCell(
                        () => populateStoreForm(store),
                        () => deleteStore(store.id)
                    ));
                    storeTable.appendChild(tr);
                });
            })
            .catch(err => console.error('Error loading stores:', err));
    }

    function populateStoreForm(store) {
        storeForm.elements['id'].value = store.id;
        storeForm.elements['name'].value = store.name;
        storeForm.elements['location'].value = store.location || '';
        storeForm.elements['store_type'].value = store.store_type;
        storeForm.elements['is_default_warehouse'].checked = store.is_default_warehouse;
    }

    function saveStore(e) {
        e.preventDefault();
        const id = storeForm.elements['id'].value;
        const data = {
            name: storeForm.elements['name'].value,
            location: storeForm.elements['location'].value,
            store_type: storeForm.elements['store_type'].value,
            is_default_warehouse: storeForm.elements['is_default_warehouse'].checked
        };
        const url = id ? `/inventory/stores/${id}/` : '/inventory/stores/';
        const method = id ? 'PUT' : 'POST';

        apiFetch(url, method, data)
            .then(() => {
                storeForm.reset();
                loadStores();
            })
            .catch(err => alert('Error saving store: ' + JSON.stringify(err)));
    }

    function deleteStore(id) {
        if (!confirm('Are you sure you want to delete this store?')) return;
        apiFetch(`/inventory/stores/${id}/`, 'DELETE')
            .then(loadStores)
            .catch(err => alert('Error deleting store: ' + JSON.stringify(err)));
    }

    storeForm.addEventListener('submit', saveStore);
    loadStores();

    // ================================
    // 5. STOCK MANAGEMENT
    // ================================
    function loadStock() {
        apiFetch('/inventory/store-stocks/')
            .then(data => {
                stockTable.innerHTML = '';
                data.forEach(stock => {
                    const tr = document.createElement('tr');
                    tr.appendChild(createCell(stock.id));
                    tr.appendChild(createCell(stock.store?.name || ''));
                    tr.appendChild(createCell(stock.product?.name || ''));
                    tr.appendChild(createCell(stock.quantity));
                    tr.appendChild(createActionCell(
                        () => populateStockForm(stock),
                        () => deleteStock(stock.id)
                    ));
                    stockTable.appendChild(tr);
                });
            })
            .catch(err => console.error('Error loading stock:', err));
    }

    function populateStockForm(stock) {
        stockForm.elements['id'].value = stock.id;
        stockForm.elements['store'].value = stock.store?.id || '';
        stockForm.elements['product'].value = stock.product?.id || '';
        stockForm.elements['quantity'].value = stock.quantity;
    }

    function saveStock(e) {
        e.preventDefault();
        const id = stockForm.elements['id'].value;
        const data = {
            store: stockForm.elements['store'].value,
            product: stockForm.elements['product'].value,
            quantity: parseInt(stockForm.elements['quantity'].value)
        };
        const url = id ? `/inventory/store-stocks/${id}/` : '/inventory/store-stocks/';
        const method = id ? 'PUT' : 'POST';

        apiFetch(url, method, data)
            .then(() => {
                stockForm.reset();
                loadStock();
            })
            .catch(err => alert('Error saving stock: ' + JSON.stringify(err)));
    }

    function deleteStock(id) {
        if (!confirm('Are you sure you want to delete this stock entry?')) return;
        apiFetch(`/inventory/store-stocks/${id}/`, 'DELETE')
            .then(loadStock)
            .catch(err => alert('Error deleting stock: ' + JSON.stringify(err)));
    }

    stockForm.addEventListener('submit', saveStock);
    loadStock();

});

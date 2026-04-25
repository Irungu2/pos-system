// categories.js - Complete Fixed Version
const CATEGORIES_CONFIG = {
    API_ENDPOINTS: {
        CATEGORIES: '/inventory/categories/',
        CATEGORY_DETAIL: (id) => `/inventory/categories/${id}/`
    },
    SELECTORS: {
        CATEGORY_LIST: '#category-list',
        CATEGORY_NAME: '#category-name',
        CATEGORY_DESCRIPTION: '#category-description',
        SUBMIT_BUTTON: '#submit-btn',
        CANCEL_BUTTON: '#cancel-btn',
        ERROR_DIV: '#error',
        ERROR_TEXT: '#error-text'
    },
    MESSAGES: {
        LOADING: 'Loading categories...',
        SAVING: 'Saving category...',
        DELETING: 'Deleting...',
        SUCCESS_ADD: 'Category added successfully',
        SUCCESS_UPDATE: 'Category updated successfully',
        SUCCESS_DELETE: 'Category deleted successfully',
        ERROR_FETCH: 'Error fetching categories',
        ERROR_SAVE: 'Error saving category',
        ERROR_DELETE: 'Error deleting category',
        ERROR_VALIDATION: 'Cannot delete category with associated products',
        VALIDATION: {
            NAME_REQUIRED: 'Category name is required',
            NAME_LENGTH: 'Category name must be between 2 and 100 characters',
            DESC_LENGTH: 'Description cannot exceed 500 characters'
        }
    },
    CONSTRAINTS: {
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 100,
        DESC_MAX_LENGTH: 500
    }
};

// Utility functions for CSRF and cookies
class CSRFTokenManager {
    static getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    static getToken() {
        // Try to get from cookie first
        let token = this.getCookie('csrftoken');
        
        // If not in cookie, try form input
        if (!token) {
            const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
            token = csrfInput ? csrfInput.value : null;
        }
        
        // Debug logging
        if (token) {
            console.log('CSRF Token found, length:', token.length);
        } else {
            console.warn('CSRF Token not found');
        }
        
        return token;
    }
}

// State management
class CategoryState {
    constructor() {
        this.editId = null;
        this.isLoading = false;
        this.categories = [];
        this.csrfToken = CSRFTokenManager.getToken();
    }

    setLoading(loading) {
        this.isLoading = loading;
        const submitBtn = document.querySelector(CATEGORIES_CONFIG.SELECTORS.SUBMIT_BUTTON);
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? 'Processing...' : 
                (this.editId ? 'Update Category' : 'Add Category');
        }
    }

    setEditMode(category) {
        this.editId = category.id;
        this.updateUIForEdit(category);
    }

    clearEditMode() {
        this.editId = null;
        this.resetFormUI();
    }

    updateUIForEdit(category) {
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_NAME).value = category.name;
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_DESCRIPTION).value = category.description || '';
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.SUBMIT_BUTTON).textContent = 'Update Category';
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.CANCEL_BUTTON).style.display = 'inline-block';
    }

    resetFormUI() {
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_NAME).value = '';
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_DESCRIPTION).value = '';
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.SUBMIT_BUTTON).textContent = 'Add Category';
        document.querySelector(CATEGORIES_CONFIG.SELECTORS.CANCEL_BUTTON).style.display = 'none';
    }
}

// Utility functions
class CategoryUtils {
    static showError(message, duration = 5000) {
        const errorDiv = document.querySelector(CATEGORIES_CONFIG.SELECTORS.ERROR_DIV);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.color = '#dc3545';
            errorDiv.style.backgroundColor = '#f8d7da';
            errorDiv.style.border = '1px solid #f5c6cb';
            errorDiv.style.borderRadius = '4px';
            errorDiv.style.padding = '12px';
            errorDiv.style.margin = '10px 0';
            
            if (duration > 0) {
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, duration);
            }
        }
        console.error('Category Error:', message);
    }

    static hideError() {
        const errorDiv = document.querySelector(CATEGORIES_CONFIG.SELECTORS.ERROR_DIV);
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    static showSuccess(message, duration = 3000) {
        const successDiv = document.createElement('div');
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, duration);
    }

    static validateCategory(name, description) {
        CategoryUtils.hideError();
        
        if (!name || name.trim() === '') {
            CategoryUtils.showError(CATEGORIES_CONFIG.MESSAGES.VALIDATION.NAME_REQUIRED);
            return false;
        }
        
        const trimmedName = name.trim();
        if (trimmedName.length < CATEGORIES_CONFIG.CONSTRAINTS.NAME_MIN_LENGTH || 
            trimmedName.length > CATEGORIES_CONFIG.CONSTRAINTS.NAME_MAX_LENGTH) {
            CategoryUtils.showError(CATEGORIES_CONFIG.MESSAGES.VALIDATION.NAME_LENGTH);
            return false;
        }
        
        if (description && description.length > CATEGORIES_CONFIG.CONSTRAINTS.DESC_MAX_LENGTH) {
            CategoryUtils.showError(CATEGORIES_CONFIG.MESSAGES.VALIDATION.DESC_LENGTH);
            return false;
        }
        
        return true;
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// API Service with fixed CSRF handling
class CategoryAPIService {
    constructor() {
        this.baseUrl = CATEGORIES_CONFIG.API_ENDPOINTS.CATEGORIES;
    }

    async makeRequest(url, method = 'GET', data = null) {
        // Get CSRF token from state
        const csrfToken = window.categoryState ? window.categoryState.csrfToken : CSRFTokenManager.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || ''
        };

        const config = {
            method: method,
            headers: headers,
            credentials: 'same-origin'
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        console.log(`Making ${method} request to ${url} with CSRF token:`, 
                   csrfToken ? 'Present' : 'Missing');

        try {
            const response = await fetch(url, config);
            
            if (response.status === 403) {
                const errorData = await response.json();
                console.error('CSRF Error Details:', errorData);
                throw new Error('CSRF verification failed. Please refresh the page.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            // For DELETE requests that return 204 No Content
            if (response.status === 204) {
                return true;
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    async fetchCategories() {
        return this.makeRequest(this.baseUrl, 'GET');
    }

    async createCategory(categoryData) {
        return this.makeRequest(this.baseUrl, 'POST', categoryData);
    }

    async updateCategory(id, categoryData) {
        return this.makeRequest(
            CATEGORIES_CONFIG.API_ENDPOINTS.CATEGORY_DETAIL(id),
            'PUT', 
            categoryData
        );
    }

    async deleteCategory(id) {
        return this.makeRequest(
            CATEGORIES_CONFIG.API_ENDPOINTS.CATEGORY_DETAIL(id),
            'DELETE'
        );
    }
}

// UI Renderer
class CategoryUIRenderer {
    static renderCategoryList(categories) {
        const listContainer = document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_LIST);
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (!categories || categories.length === 0) {
            listContainer.innerHTML = '<li class="empty-message">No categories found. Add your first category!</li>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        categories.forEach(category => {
            const li = this.createCategoryListItem(category);
            fragment.appendChild(li);
        });
        
        listContainer.appendChild(fragment);
    }
    
    static createCategoryListItem(category) {
        const li = document.createElement('li');
        li.className = 'category-item';
        li.dataset.id = category.id;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'category-content';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-name';
        nameSpan.textContent = CategoryUtils.escapeHtml(category.name);
        
        const descSpan = document.createElement('span');
        descSpan.className = 'category-description';
        descSpan.textContent = category.description ? 
            ` - ${CategoryUtils.escapeHtml(category.description)}` : '';
        
        contentDiv.appendChild(nameSpan);
        contentDiv.appendChild(descSpan);
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'category-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.title = `Edit ${category.name}`;
        editBtn.onclick = () => window.categoryController.startEdit(category);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.title = `Delete ${category.name}`;
        deleteBtn.onclick = () => window.categoryController.deleteCategory(category.id);
        
        if (category.product_count > 0) {
            deleteBtn.disabled = true;
            deleteBtn.title = 'Cannot delete category with associated products';
            deleteBtn.style.opacity = '0.6';
            deleteBtn.style.cursor = 'not-allowed';
        }
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        li.appendChild(contentDiv);
        li.appendChild(actionsDiv);
        
        return li;
    }
}

// Main Controller
class CategoryController {
    constructor() {
        this.state = new CategoryState();
        this.apiService = new CategoryAPIService();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const submitBtn = document.querySelector(CATEGORIES_CONFIG.SELECTORS.SUBMIT_BUTTON);
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmit());
        }
        
        const cancelBtn = document.querySelector(CATEGORIES_CONFIG.SELECTORS.CANCEL_BUTTON);
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEdit());
        }
        
        const nameInput = document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_NAME);
        const descInput = document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_DESCRIPTION);
        
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSubmit();
                }
            });
        }
        
        if (descInput) {
            descInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.handleSubmit();
                }
            });
        }
        
        if (nameInput) {
            nameInput.addEventListener('blur', () => {
                const value = nameInput.value.trim();
                if (value && value.length < CATEGORIES_CONFIG.CONSTRAINTS.NAME_MIN_LENGTH) {
                    CategoryUtils.showError(CATEGORIES_CONFIG.MESSAGES.VALIDATION.NAME_LENGTH);
                }
            });
        }
    }
    
    async fetchCategories() {
        try {
            this.state.setLoading(true);
            CategoryUtils.hideError();
            
            const categories = await this.apiService.fetchCategories();
            this.state.categories = categories;
            CategoryUIRenderer.renderCategoryList(categories);
            
        } catch (error) {
            CategoryUtils.showError(CATEGORIES_CONFIG.MESSAGES.ERROR_FETCH);
        } finally {
            this.state.setLoading(false);
        }
    }
    
    async handleSubmit() {
        const nameInput = document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_NAME);
        const descInput = document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_DESCRIPTION);
        
        const name = nameInput.value;
        const description = descInput.value;
        
        if (!CategoryUtils.validateCategory(name, description)) {
            return;
        }
        
        const categoryData = {
            name: name.trim(),
            description: description.trim() || ''
        };
        
        try {
            this.state.setLoading(true);
            
            if (this.state.editId) {
                await this.apiService.updateCategory(this.state.editId, categoryData);
                CategoryUtils.showSuccess(CATEGORIES_CONFIG.MESSAGES.SUCCESS_UPDATE);
            } else {
                await this.apiService.createCategory(categoryData);
                CategoryUtils.showSuccess(CATEGORIES_CONFIG.MESSAGES.SUCCESS_ADD);
            }
            
            this.state.clearEditMode();
            await this.fetchCategories();
            
        } catch (error) {
            if (error.message.includes('associated products')) {
                CategoryUtils.showError(CATEGORIES_CONFIG.MESSAGES.ERROR_VALIDATION);
            } else {
                CategoryUtils.showError(error.message || CATEGORIES_CONFIG.MESSAGES.ERROR_SAVE);
            }
        } finally {
            this.state.setLoading(false);
        }
    }
    
    async deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
            return;
        }
        
        try {
            this.state.setLoading(true);
            
            await this.apiService.deleteCategory(id);
            CategoryUtils.showSuccess(CATEGORIES_CONFIG.MESSAGES.SUCCESS_DELETE);
            
            if (this.state.editId === id) {
                this.state.clearEditMode();
            }
            
            await this.fetchCategories();
            
        } catch (error) {
            if (error.message.includes('associated products')) {
                CategoryUtils.showError(CATEGORIES_CONFIG.MESSAGES.ERROR_VALIDATION);
            } else {
                CategoryUtils.showError(error.message || CATEGORIES_CONFIG.MESSAGES.ERROR_DELETE);
            }
        } finally {
            this.state.setLoading(false);
        }
    }
    
    startEdit(category) {
        this.state.setEditMode(category);
        
        const nameInput = document.querySelector(CATEGORIES_CONFIG.SELECTORS.CATEGORY_NAME);
        if (nameInput) {
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInput.focus();
        }
    }
    
    cancelEdit() {
        this.state.clearEditMode();
        CategoryUtils.hideError();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for better UI
    const style = document.createElement('style');
    style.textContent = `
        #category-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        
        .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            margin-bottom: 8px;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .category-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transform: translateY(-1px);
        }
        
        .category-content {
            flex: 1;
        }
        
        .category-name {
            font-weight: 600;
            color: #333;
        }
        
        .category-description {
            color: #666;
            margin-left: 8px;
        }
        
        .category-actions {
            display: flex;
            gap: 8px;
            margin-left: 16px;
        }
        
        .btn-edit, .btn-delete {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .btn-edit {
            background-color: #17a2b8;
            color: white;
        }
        
        .btn-edit:hover:not(:disabled) {
            background-color: #138496;
        }
        
        .btn-delete {
            background-color: #dc3545;
            color: white;
        }
        
        .btn-delete:hover:not(:disabled) {
            background-color: #c82333;
        }
        
        .btn-delete:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .empty-message {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
            font-style: italic;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            background-color: #f8f9fa;
        }
        
        #category-name, #category-description {
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        
        #category-name:focus, #category-description:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
        
        #submit-btn, #cancel-btn {
            padding: 10px 20px;
            margin-right: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        
        #submit-btn {
            background-color: #007bff;
            color: white;
        }
        
        #submit-btn:hover:not(:disabled) {
            background-color: #0056b3;
        }
        
        #submit-btn:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        
        #cancel-btn {
            background-color: #6c757d;
            color: white;
        }
        
        #cancel-btn:hover {
            background-color: #545b62;
        }
    `;
    document.head.appendChild(style);
    
    // Debug CSRF
    console.log('=== CSRF Debug Info ===');
    console.log('CSRF Cookie:', CSRFTokenManager.getCookie('csrftoken'));
    console.log('CSRF Input:', document.querySelector('input[name="csrfmiddlewaretoken"]')?.value);
    console.log('All Cookies:', document.cookie);
    console.log('=== End Debug Info ===');
    
    // Initialize controller
    window.categoryState = new CategoryState();
    window.categoryController = new CategoryController();
    
    // Load initial categories
    window.categoryController.fetchCategories();
    
    // Error handling
    window.addEventListener('error', (event) => {
        console.error('Global error caught:', event.error);
        CategoryUtils.showError('An unexpected error occurred. Please refresh the page.');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        CategoryUtils.showError('An unexpected error occurred. Please try again.');
    });
});
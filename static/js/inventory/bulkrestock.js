// static/js/inventory/bulkrestock.js
document.addEventListener('DOMContentLoaded', function() {

    const storeSelect = document.getElementById('store-select');
    const categorySection = document.getElementById('category-section');
    const categorySelect = document.getElementById('category-select');
    const generateBtn = document.getElementById('generate-excel-btn');
    const uploadForm = document.getElementById('upload-form');

    let currentRestockType = 'all';

    // Restock type toggle
    document.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', function () {
            currentRestockType = this.dataset.type;

            // Make clicked button active
            document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Show category dropdown only for category type
            if (currentRestockType === 'category') {
                categorySection.classList.remove('d-none');
            } else {
                categorySection.classList.add('d-none');
            }

            updateGenerateButton();
        });
    });

    // Store + category selection
    storeSelect.addEventListener('change', updateGenerateButton);
    categorySelect.addEventListener('change', updateGenerateButton);

    function updateGenerateButton() {
        const storeSelected = storeSelect.value !== '';
        const categorySelected = currentRestockType !== 'category' || categorySelect.value !== '';
        generateBtn.disabled = !(storeSelected && categorySelected);
    }

    // ---------------------------------------
    // 1. GENERATE EXCEL TEMPLATE
    // ---------------------------------------
    generateBtn.addEventListener('click', async function () {
        const storeId = storeSelect.value;
        const categoryId = categorySelect.value;
        const includeAll = currentRestockType === 'all';
        const lowStockOnly = currentRestockType === 'low';

        if (!storeId) {
            alert('Please select a store.');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.innerHTML = '⏳ Generating...';

        try {
            // Note: Using router-generated URL for custom action
            const response = await fetch('/inventory/bulk-restocks/generate_template/', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify({
                    store_id: parseInt(storeId),
                    category_id: categoryId ? parseInt(categoryId) : null,
                    include_all: includeAll,
                    low_stock_only: lowStockOnly
                })
            });

            // Expect restock_id in header
            const restockId = response.headers.get("X-Restock-ID");
            if (restockId) {
                localStorage.setItem("bulk_restock_id", restockId);
            }

            if (response.ok) {
                // Download excel
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                
                // Get store name for filename
                const storeName = storeSelect.options[storeSelect.selectedIndex].text;
                const dateStr = new Date().toISOString().split("T")[0];
                a.download = `restock_${storeName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
                
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                alert("✅ Excel template generated! Update the 'New Stock' and 'New Price' columns, then upload to complete restock.");
            } else {
                try {
                    const error = await response.json();
                    alert("❌ " + (error.error || "Failed to generate template."));
                } catch (parseError) {
                    alert("❌ Failed to generate template. Please try again.");
                }
            }

        } catch (err) {
            alert("❌ Error: " + err.message);
        }

        generateBtn.disabled = false;
        generateBtn.innerHTML = "📄 Generate Excel Template";
    });

    // ---------------------------------------
    // 2. UPLOAD COMPLETED TEMPLATE
    // ---------------------------------------
    uploadForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const fileInput = document.getElementById('excel-file');
        const notes = document.getElementById('restock-notes').value;
        const restockId = localStorage.getItem("bulk_restock_id");

        if (!restockId) {
            alert("⚠️ No restock session found. Generate a template first.");
            return;
        }

        // Check if file is selected
        if (!fileInput.files || fileInput.files.length === 0) {
            alert("⚠️ Please select an Excel file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        if (notes) {
            formData.append("notes", notes);
        }

        const uploadBtn = document.getElementById("upload-btn");
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = "⏳ Processing...";

        try {
            // Note: Using router-generated URL for custom action
            const response = await fetch(`/inventory/bulk-restocks/${restockId}/upload_completed/`, {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCSRFToken(),
                },
                body: formData
            });

            try {
                const result = await response.json();

                if (response.ok) {
                    alert("✅ " + result.message);
                    uploadForm.reset();
                    localStorage.removeItem("bulk_restock_id");
                    
                    // Show success details
                    if (result.items_updated) {
                        console.log(`Restock completed: ${result.items_updated} items updated`);
                    }
                } else {
                    // Check if there's an error file to download
                    if (result.error_file) {
                        const confirmDownload = confirm("❌ Upload failed with errors. Would you like to download the error report?");
                        if (confirmDownload) {
                            downloadErrorFile(result.error_file);
                        }
                        alert("❌ " + (result.error || "Upload failed with errors."));
                    } else {
                        alert("❌ " + (result.error || "Upload failed."));
                    }
                }
            } catch (parseError) {
                alert("❌ Error parsing server response. Please try again.");
            }
        } catch (err) {
            alert("❌ Error: " + err.message);
        }

        uploadBtn.disabled = false;
        uploadBtn.innerHTML = "📤 Upload & Process Restock";
    });

    // Helper function to download error file
    function downloadErrorFile(base64Data) {
        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `restock_errors_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Could not download error file.');
        }
    }

    // Helper function to download file from response
    function downloadFileFromResponse(response, defaultFilename) {
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = defaultFilename;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }
        
        return response.blob().then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        });
    }

    // CSRF helper
    function getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
    }

    // Initialize UI state
    function initializeUI() {
        // Set first button as active by default
        const firstBtn = document.querySelector('[data-type]');
        if (firstBtn) {
            firstBtn.click();
        }
        
        // Check if there's a stored restock ID
        const storedRestockId = localStorage.getItem("bulk_restock_id");
        if (storedRestockId) {
            console.log(`Found existing restock session: ${storedRestockId}`);
            // You could optionally fetch and display status
        }
    }

    // Initialize
    initializeUI();
});
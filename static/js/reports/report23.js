
// class ReportsController {
//     constructor() {
//         console.log('🚀 ReportsController constructor started');
        
//         this.endpoints = {
//             salesReport: '/inventory/reports/sales/'  // Your actual endpoint
//         };
        
//         this.uiState = {
//             currentReport: null,
//             currentTab: 'data'
//         };
        
//         this.init();
//     }

//     init() {
//         console.log('📋 ReportsController.init() called');
//         console.log('📍 Current URL:', window.location.href);
//         console.log('📍 API Endpoint:', this.endpoints.salesReport);
        
//         this.bindEvents();
//         this.setDefaultDates();
//         this.setupFilters();
//         this.initTabs();
        
//         console.log('✅ ReportsController initialization complete');
//     }

//     initTabs() {
//         console.log('🔧 Initializing tabs');
//         const tabButtons = document.querySelectorAll('[data-tab]');
//         console.log(`📑 Found ${tabButtons.length} tab buttons`);
        
//         tabButtons.forEach(button => {
//             button.addEventListener('click', (e) => {
//                 e.preventDefault();
//                 const tabName = button.getAttribute('data-tab');
//                 console.log(`🔄 Tab clicked: ${tabName}`);
//                 this.switchTab(tabName);
//             });
//         });
//     }

//     switchTab(tabName) {
//         console.log(`🔄 Switching to tab: ${tabName}`);
        
//         // Update button states
//         document.querySelectorAll('[data-tab]').forEach(btn => {
//             btn.classList.remove('active');
//         });
//         const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
//         if (activeBtn) activeBtn.classList.add('active');
        
//         // Update tab panes
//         const dataTab = document.getElementById('dataTab');
//         const jsonTab = document.getElementById('jsonTab');
//         const chartsTab = document.getElementById('chartsTab');
        
//         console.log(`Tab elements found - Data: ${!!dataTab}, JSON: ${!!jsonTab}, Charts: ${!!chartsTab}`);
        
//         if (dataTab) dataTab.classList.add('d-none');
//         if (jsonTab) jsonTab.classList.add('d-none');
//         if (chartsTab) chartsTab.classList.add('d-none');
        
//         const selectedTab = document.getElementById(`${tabName}Tab`);
//         if (selectedTab) {
//             selectedTab.classList.remove('d-none');
//             console.log(`✅ Switched to ${tabName} tab`);
//         } else {
//             console.error(`❌ Tab element not found: ${tabName}Tab`);
//         }
        
//         this.uiState.currentTab = tabName;
//     }

//     setDefaultDates() {
//         console.log('📅 Setting default dates');
//         const today = new Date().toISOString().split('T')[0];
//         const startDate = document.getElementById('startDate');
//         const endDate = document.getElementById('endDate');
//         const reportDate = document.getElementById('reportDate');
        
//         console.log(`Today's date: ${today}`);
//         console.log(`StartDate element: ${!!startDate}`);
//         console.log(`EndDate element: ${!!endDate}`);
//         console.log(`ReportDate element: ${!!reportDate}`);
        
//         if (startDate) startDate.value = today;
//         if (endDate) endDate.value = today;
//         if (reportDate) reportDate.value = today;
        
//         console.log('✅ Default dates set');
//     }

//     bindEvents() {
//         console.log('🔗 Binding events');
        
//         // Generate Report Button
//         const generateBtn = document.getElementById('generateBtn');
//         if (generateBtn) {
//             console.log('✅ Generate button found, attaching event');
//             generateBtn.addEventListener('click', () => {
//                 console.log('🖱️ Generate button clicked');
//                 this.generateReport();
//             });
//         } else {
//             console.error('❌ Generate button not found!');
//         }
        
//         // Action buttons
//         const exportBtn = document.getElementById('exportBtn');
//         if (exportBtn) {
//             console.log('✅ Export button found');
//             exportBtn.addEventListener('click', () => this.exportReport());
//         }
        
//         const printBtn = document.getElementById('printReportBtn');
//         if (printBtn) {
//             console.log('✅ Print button found');
//             printBtn.addEventListener('click', () => this.printReport());
//         }
        
//         const copyBtn = document.getElementById('copyReportBtn');
//         if (copyBtn) {
//             console.log('✅ Copy button found');
//             copyBtn.addEventListener('click', () => this.copyReport());
//         }
        
//         // Report Type Change
//         const reportType = document.getElementById('reportType');
//         if (reportType) {
//             console.log('✅ Report type select found');
//             reportType.addEventListener('change', (e) => {
//                 console.log(`📊 Report type changed to: ${e.target.value}`);
//                 this.onReportTypeChange(e);
//             });
//         }
        
//         // Quick Reports
//         const quickBtns = document.querySelectorAll('.quick-report-btn');
//         console.log(`📌 Found ${quickBtns.length} quick report buttons`);
//         quickBtns.forEach(btn => {
//             btn.addEventListener('click', (e) => {
//                 const type = e.currentTarget.getAttribute('data-quick-report');
//                 console.log(`⚡ Quick report clicked: ${type}`);
//                 this.handleQuickReport(type);
//             });
//         });
//     }

//     setupFilters() {
//         console.log('🔧 Setting up filters');
//         const reportType = document.getElementById('reportType');
//         if (reportType) {
//             this.onReportTypeChange({ target: reportType });
//         }
//     }

//     onReportTypeChange(e) {
//         const reportType = e.target.value;
//         console.log(`📋 Report type changed to: ${reportType}`);
        
//         const groupByFilter = document.getElementById('groupByFilter');
//         const topNFilter = document.getElementById('topNFilter');
//         const singleDateFilter = document.getElementById('singleDateFilter');
//         const specificFilters = document.getElementById('reportSpecificFilters');
        
//         console.log(`Filters visibility - GroupBy: ${!!groupByFilter}, TopN: ${!!topNFilter}, SingleDate: ${!!singleDateFilter}`);
        
//         if (specificFilters) specificFilters.classList.remove('d-none');
//         if (groupByFilter) groupByFilter.style.display = 'none';
//         if (topNFilter) topNFilter.style.display = 'none';
//         if (singleDateFilter) singleDateFilter.style.display = 'none';
        
//         const dateGroups = document.querySelectorAll('.row .filter-group');
        
//         switch(reportType) {
//             case 'SALES_SUMMARY':
//                 console.log('📈 Showing SALES_SUMMARY specific filters');
//                 if (groupByFilter) groupByFilter.style.display = 'block';
//                 break;
//             case 'PRODUCT_SALES':
//                 console.log('📊 Showing PRODUCT_SALES specific filters');
//                 if (topNFilter) topNFilter.style.display = 'block';
//                 break;
//             case 'END_OF_DAY':
//                 console.log('📅 Showing END_OF_DAY specific filters');
//                 if (singleDateFilter) singleDateFilter.style.display = 'block';
//                 if (dateGroups) {
//                     dateGroups.forEach(group => {
//                         group.style.display = 'none';
//                     });
//                 }
//                 break;
//             case 'CASHIER_PERFORMANCE':
//                 console.log('👤 Showing CASHIER_PERFORMANCE');
//                 break;
//             case 'SALES_VS_STOCK':
//                 console.log('📦 Showing SALES_VS_STOCK');
//                 break;
//         }
//     }

//     handleQuickReport(type) {
//         console.log(`⚡ Quick report triggered: ${type}`);
//         const today = new Date();
//         const startDate = document.getElementById('startDate');
//         const endDate = document.getElementById('endDate');
//         const reportType = document.getElementById('reportType');
//         const reportDate = document.getElementById('reportDate');
        
//         switch(type) {
//             case 'today':
//                 const todayStr = today.toISOString().split('T')[0];
//                 if (startDate) startDate.value = todayStr;
//                 if (endDate) endDate.value = todayStr;
//                 if (reportType) reportType.value = 'END_OF_DAY';
//                 if (reportDate) reportDate.value = todayStr;
//                 console.log(`📅 Set today's date: ${todayStr}`);
//                 break;
                
//             case 'yesterday':
//                 const yesterday = new Date(today);
//                 yesterday.setDate(yesterday.getDate() - 1);
//                 const yesterdayStr = yesterday.toISOString().split('T')[0];
//                 if (startDate) startDate.value = yesterdayStr;
//                 if (endDate) endDate.value = yesterdayStr;
//                 if (reportType) reportType.value = 'END_OF_DAY';
//                 if (reportDate) reportDate.value = yesterdayStr;
//                 console.log(`📅 Set yesterday's date: ${yesterdayStr}`);
//                 break;
                
//             case 'last7':
//                 const last7 = new Date(today);
//                 last7.setDate(last7.getDate() - 7);
//                 if (startDate) startDate.value = last7.toISOString().split('T')[0];
//                 if (endDate) endDate.value = today.toISOString().split('T')[0];
//                 if (reportType) reportType.value = 'SALES_SUMMARY';
//                 if (document.getElementById('groupBy')) {
//                     document.getElementById('groupBy').value = 'daily';
//                 }
//                 console.log(`📅 Set last 7 days: ${last7.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
//                 break;
                
//             case 'last30':
//                 const last30 = new Date(today);
//                 last30.setDate(last30.getDate() - 30);
//                 if (startDate) startDate.value = last30.toISOString().split('T')[0];
//                 if (endDate) endDate.value = today.toISOString().split('T')[0];
//                 if (reportType) reportType.value = 'SALES_SUMMARY';
//                 console.log(`📅 Set last 30 days: ${last30.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
//                 break;
                
//             case 'lowstock':
//                 if (reportType) reportType.value = 'SALES_VS_STOCK';
//                 console.log(`📦 Set report type to SALES_VS_STOCK`);
//                 break;
//         }
        
//         if (reportType) {
//             this.onReportTypeChange({ target: reportType });
//         }
        
//         setTimeout(() => {
//             console.log('⏰ Auto-generating report after quick selection');
//             this.generateReport();
//         }, 100);
//     }

//     async generateReport() {
//         console.log('🚀 Starting report generation...');
//         console.log('═══════════════════════════════════════');
        
//         const filters = this.getFilterValues();
//         console.log('📋 Filter values:', JSON.stringify(filters, null, 2));
        
//         if (!this.validateFilters(filters)) {
//             console.log('❌ Filter validation failed');
//             return;
//         }
        
//         this.showLoading(true);
        
//         // Build request payload
//         const requestPayload = {
//             report_type: filters.reportType,
//             filters: {
//                 start_date: filters.startDate,
//                 end_date: filters.endDate,
//                 store_id: filters.store || null,
//                 cashier_id: filters.cashier || null,
//                 product_id: filters.product || null,
//                 category_id: filters.category || null,
//                 group_by: filters.groupBy || 'daily',
//                 top_n: parseInt(filters.topN) || 20,
//                 date: filters.reportDate || filters.startDate
//             }
//         };
        
//         // Clean up null/empty values
//         Object.keys(requestPayload.filters).forEach(key => {
//             if (requestPayload.filters[key] === null || 
//                 requestPayload.filters[key] === '' || 
//                 requestPayload.filters[key] === 'All') {
//                 delete requestPayload.filters[key];
//             }
//         });
        
//         console.log('📤 Sending request payload:', JSON.stringify(requestPayload, null, 2));
//         console.log('🌐 API Endpoint:', this.endpoints.salesReport);
        
//         try {
//             const response = await fetch(this.endpoints.salesReport, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'X-CSRFToken': this.getCSRFToken(),
//                     'X-Requested-With': 'XMLHttpRequest'
//                 },
//                 body: JSON.stringify(requestPayload)
//             });
            
//             console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
//             const responseData = await response.json();
//             console.log('📥 Full response data:', JSON.stringify(responseData, null, 2));
//             console.log('📥 Response type:', typeof responseData);
//             console.log('📥 Response keys:', Object.keys(responseData));
            
//             if (!response.ok) {
//                 throw new Error(responseData.error || `Server error: ${response.status}`);
//             }
            
//             // Check response structure
//             console.log('🔍 Checking response structure...');
//             console.log('  - Has success?', responseData.hasOwnProperty('success'));
//             console.log('  - Success value:', responseData.success);
//             console.log('  - Has report?', responseData.hasOwnProperty('report'));
//             console.log('  - Has report_type?', responseData.hasOwnProperty('report_type'));
            
//             if (responseData.success && responseData.report) {
//                 console.log('✅ Response has success wrapper with report object');
//                 console.log('📊 Report object keys:', Object.keys(responseData.report));
//                 console.log('📊 Report has data?', !!responseData.report.data);
//                 console.log('📊 Report data length:', responseData.report.data?.length);
//                 this.processReportData(responseData.report, filters);
//             } else if (responseData.report_type) {
//                 console.log('✅ Response is already the report object');
//                 console.log('📊 Report type:', responseData.report_type);
//                 console.log('📊 Report has data?', !!responseData.data);
//                 console.log('📊 Report data length:', responseData.data?.length);
//                 this.processReportData(responseData, filters);
//             } else {
//                 console.error('❌ Unknown response format');
//                 throw new Error(responseData.error || 'Invalid response format');
//             }
            
//         } catch (error) {
//             console.error('❌ Report generation error:', error);
//             console.error('Error stack:', error.stack);
//             this.showError(error.message);
//         } finally {
//             this.showLoading(false);
//         }
        
//         console.log('═══════════════════════════════════════');
//     }

//     getFilterValues() {
//         const values = {
//             reportType: document.getElementById('reportType')?.value || 'SALES_SUMMARY',
//             startDate: document.getElementById('startDate')?.value,
//             endDate: document.getElementById('endDate')?.value,
//             store: document.getElementById('store')?.value || '',
//             cashier: document.getElementById('cashier')?.value || '',
//             product: document.getElementById('product')?.value || '',
//             category: document.getElementById('category')?.value || '',
//             groupBy: document.getElementById('groupBy')?.value || 'daily',
//             topN: document.getElementById('topN')?.value || 20,
//             reportDate: document.getElementById('reportDate')?.value
//         };
        
//         console.log('📋 Retrieved filter values:', values);
//         return values;
//     }

//     validateFilters(filters) {
//         console.log('🔍 Validating filters...');
//         const errorDiv = document.getElementById('error');
//         if (!errorDiv) return true;
        
//         errorDiv.textContent = '';
//         errorDiv.style.display = 'none';
        
//         // Validate based on report type
//         if (filters.reportType !== 'END_OF_DAY' && filters.reportType !== 'SALES_VS_STOCK') {
//             if (!filters.startDate || !filters.endDate) {
//                 console.log('❌ Validation failed: Missing dates');
//                 this.showError('Please select both start and end dates');
//                 return false;
//             }
            
//             const start = new Date(filters.startDate);
//             const end = new Date(filters.endDate);
            
//             if (start > end) {
//                 console.log('❌ Validation failed: Start date after end date');
//                 this.showError('Start date cannot be after end date');
//                 return false;
//             }
            
//             console.log('✅ Date validation passed');
//         }
        
//         if (filters.reportType === 'END_OF_DAY' && !filters.reportDate && !filters.startDate) {
//             console.log('❌ Validation failed: Missing report date');
//             this.showError('Please select a report date');
//             return false;
//         }
        
//         console.log('✅ All validations passed');
//         return true;
//     }

//     processReportData(report, filters) {
//         console.log('🔄 Processing report data...');
//         console.log('Report object:', report);
//         console.log('Report keys:', Object.keys(report));
//         console.log('Report has data?', !!report.data);
//         console.log('Report data type:', typeof report.data);
//         console.log('Report data is array?', Array.isArray(report.data));
//         console.log('Report data length:', report.data?.length);
        
//         if (report.data && report.data.length > 0) {
//             console.log('📊 First data item sample:', report.data[0]);
//         }
        
//         // Validate report
//         if (!report || !report.report_type) {
//             console.error('❌ Invalid report data received');
//             this.showError('Invalid report data received');
//             return;
//         }
        
//         console.log(`✅ Valid report received: ${report.report_type}`);
        
//         // Store the report
//         this.uiState.currentReport = report;
//         this.uiState.currentFilters = filters;
        
//         // Update UI
//         console.log('🎨 Updating UI components...');
//         this.updateReportUI(report, filters);
//         this.showReportResults(true);
        
//         // Update timestamp
//         const generatedAt = document.getElementById('generatedAt');
//         if (generatedAt) {
//             const now = new Date().toLocaleString('en-US', {
//                 month: 'short',
//                 day: 'numeric',
//                 year: 'numeric',
//                 hour: '2-digit',
//                 minute: '2-digit'
//             });
//             generatedAt.textContent = now;
//             console.log(`🕒 Updated timestamp: ${now}`);
//         }
        
//         // Enable export button
//         const exportBtn = document.getElementById('exportBtn');
//         if (exportBtn) {
//             exportBtn.disabled = false;
//             console.log('🔓 Export button enabled');
//         }
        
//         console.log('✅ Report processing complete');
//     }

//     updateReportUI(report, filters) {
//         console.log('🎨 updateReportUI called');
        
//         // Update report title
//         const reportTitle = document.getElementById('reportTitle');
//         if (reportTitle) {
//             const title = this.formatReportTitle(report.report_type);
//             reportTitle.textContent = title;
//             console.log(`📝 Report title set to: ${title}`);
//         }
        
//         // Update report period
//         const reportPeriod = document.getElementById('reportPeriod');
//         if (reportPeriod) {
//             const period = this.formatReportPeriod(filters, report);
//             reportPeriod.textContent = period;
//             console.log(`📅 Report period set to: ${period}`);
//         }
        
//         // Update all tabs
//         console.log('📊 Updating summary cards...');
//         this.updateSummaryCards(report);
        
//         console.log('📋 Updating data tab...');
//         this.updateDataTab(report);
        
//         console.log('💻 Updating JSON tab...');
//         this.updateJSONTab(report);
//     }

//     updateSummaryCards(report) {
//         console.log('📊 updateSummaryCards called');
//         const summaryContainer = document.getElementById('summaryCards');
        
//         if (!summaryContainer) {
//             console.error('❌ Summary cards container not found!');
//             return;
//         }
        
//         console.log('✅ Summary container found, clearing...');
//         summaryContainer.innerHTML = '';
        
//         if (!report.summary || Object.keys(report.summary).length === 0) {
//             console.log('⚠️ No summary data available');
//             const messageDiv = document.createElement('div');
//             messageDiv.className = 'col-12 text-center text-muted py-3';
//             messageDiv.innerHTML = '<i class="fas fa-chart-line fa-2x mb-2"></i><p>No summary data available</p>';
//             summaryContainer.appendChild(messageDiv);
//             return;
//         }
        
//         console.log('📊 Summary object:', report.summary);
//         console.log('Summary keys:', Object.keys(report.summary));
        
//         const summaryFields = this.getSummaryFieldsForReport(report.report_type);
//         console.log(`📋 Found ${summaryFields.length} predefined summary fields`);
        
//         const cards = [];
//         for (const field of summaryFields) {
//             const value = report.summary[field.key];
//             if (value !== undefined && value !== null) {
//                 cards.push({
//                     title: field.label,
//                     value: this.formatSummaryValue(value, field.type),
//                     icon: field.icon,
//                     color: field.color
//                 });
//                 console.log(`  ✓ Added card: ${field.label} = ${value}`);
//             } else {
//                 console.log(`  ✗ Skipped card: ${field.key} (value not found)`);
//             }
//         }
        
//         // If no predefined fields, show all summary keys
//         if (cards.length === 0) {
//             console.log('⚠️ No predefined cards, using all summary keys');
//             for (const [key, value] of Object.entries(report.summary)) {
//                 cards.push({
//                     title: this.formatHeaderLabel(key),
//                     value: this.formatSummaryValue(value, 'auto'),
//                     icon: 'fa-chart-simple',
//                     color: 'primary'
//                 });
//                 console.log(`  ✓ Added card: ${key} = ${value}`);
//             }
//         }
        
//         console.log(`📊 Rendering ${cards.length} summary cards`);
        
//         // Render cards
//         cards.forEach(card => {
//             const col = document.createElement('div');
//             col.className = 'col-md-3 col-sm-6 mb-3';
//             col.innerHTML = `
//                 <div class="summary-card">
//                     <div class="d-flex justify-content-between align-items-start">
//                         <div>
//                             <h6 class="text-muted mb-1">${card.title}</h6>
//                             <h4 class="mb-0">${card.value}</h4>
//                         </div>
//                         <div class="bg-${card.color} bg-opacity-10 rounded-circle p-2">
//                             <i class="fas ${card.icon} text-${card.color}"></i>
//                         </div>
//                     </div>
//                 </div>
//             `;
//             summaryContainer.appendChild(col);
//         });
        
//         console.log('✅ Summary cards rendered');
//     }

//     updateDataTab(report) {
//         console.log('📋 updateDataTab called');
        
//         const tableHead = document.getElementById('reportTableHead');
//         const tableBody = document.getElementById('reportTableBody');
        
//         if (!tableHead) {
//             console.error('❌ Table head element not found!');
//             return;
//         }
//         if (!tableBody) {
//             console.error('❌ Table body element not found!');
//             return;
//         }
        
//         console.log('✅ Table elements found');
        
//         // Clear existing content
//         tableHead.innerHTML = '';
//         tableBody.innerHTML = '';
        
//         // Check if we have data
//         if (!report.data) {
//             console.error('❌ report.data is null or undefined');
//             this.showNoDataMessage(tableBody);
//             return;
//         }
        
//         if (!Array.isArray(report.data)) {
//             console.error('❌ report.data is not an array, it is:', typeof report.data);
//             this.showNoDataMessage(tableBody);
//             return;
//         }
        
//         if (report.data.length === 0) {
//             console.log('⚠️ No data rows found');
//             this.showNoDataMessage(tableBody);
//             return;
//         }
        
//         console.log(`📊 Data rows count: ${report.data.length}`);
        
//         // Get headers from first data item
//         const firstItem = report.data[0];
//         console.log('📋 First data item:', firstItem);
//         console.log('First item type:', typeof firstItem);
//         console.log('First item keys:', Object.keys(firstItem));
        
//         const headers = Object.keys(firstItem);
//         console.log(`📋 Table headers (${headers.length}):`, headers);
        
//         // Create header row
//         const headerRow = document.createElement('tr');
//         headers.forEach(header => {
//             const th = document.createElement('th');
//             th.textContent = this.formatHeaderLabel(header);
//             if (this.isNumericField(header)) {
//                 th.classList.add('text-end');
//             }
//             headerRow.appendChild(th);
//         });
//         tableHead.appendChild(headerRow);
//         console.log('✅ Header row created');
        
//         // Create data rows
//         let rowsCreated = 0;
//         report.data.forEach((item, index) => {
//             const row = document.createElement('tr');
//             headers.forEach(header => {
//                 const td = document.createElement('td');
//                 let value = item[header];
                
//                 // Format value
//                 if (value === null || value === undefined) {
//                     td.textContent = '—';
//                 } else if (typeof value === 'object') {
//                     td.textContent = Array.isArray(value) ? `${value.length} items` : JSON.stringify(value).substring(0, 50);
//                 } else {
//                     td.textContent = this.formatCellValue(value, header);
//                 }
                
//                 if (this.isNumericField(header) && typeof value === 'number') {
//                     td.classList.add('text-end');
//                 }
                
//                 // Special styling for stock risk
//                 if (header === 'stock_risk' && typeof value === 'string') {
//                     const color = value === 'HIGH' ? 'danger' : value === 'MEDIUM' ? 'warning' : 'success';
//                     td.innerHTML = `<span class="badge bg-${color}">${value}</span>`;
//                 }
                
//                 row.appendChild(td);
//             });
//             tableBody.appendChild(row);
//             rowsCreated++;
//         });
        
//         console.log(`✅ Data table updated with ${rowsCreated} rows`);
//     }

//     updateJSONTab(report) {
//         console.log('💻 updateJSONTab called');
//         const output = document.getElementById('reportOutput');
        
//         if (!output) {
//             console.error('❌ JSON output element not found!');
//             return;
//         }
        
//         const jsonString = JSON.stringify(report, null, 2);
//         output.textContent = jsonString;
//         console.log(`✅ JSON view updated (${jsonString.length} characters)`);
//     }

//     showNoDataMessage(tableBody) {
//         console.log('⚠️ Showing "No Data" message');
//         const row = document.createElement('tr');
//         const cell = document.createElement('td');
//         cell.colSpan = 8;
//         cell.className = 'text-center py-5';
//         cell.innerHTML = `
//             <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
//             <h5 class="text-muted">No Data Available</h5>
//             <p class="text-muted small">No records found for the selected criteria</p>
//         `;
//         row.appendChild(cell);
//         tableBody.appendChild(row);
//     }

//     showReportResults(show = true) {
//         console.log(`🎬 showReportResults(${show}) called`);
//         const reportResult = document.getElementById('reportResult');
//         if (reportResult) {
//             if (show) {
//                 reportResult.classList.remove('d-none');
//                 console.log('✅ Report results container shown');
//                 setTimeout(() => {
//                     reportResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
//                     console.log('📜 Scrolled to results');
//                 }, 200);
//             } else {
//                 reportResult.classList.add('d-none');
//                 console.log('Report results container hidden');
//             }
//         } else {
//             console.error('❌ Report result container not found!');
//         }
//     }

//     showLoading(show = true) {
//         console.log(`⏳ showLoading(${show}) called`);
//         const loadingIndicator = document.getElementById('loadingIndicator');
//         const generateBtn = document.getElementById('generateBtn');
        
//         if (loadingIndicator) {
//             loadingIndicator.classList.toggle('d-none', !show);
//         }
        
//         if (generateBtn) {
//             generateBtn.disabled = show;
//             generateBtn.innerHTML = show ? 
//                 '<i class="fas fa-spinner fa-spin me-2"></i>Generating...' :
//                 '<i class="fas fa-play-circle me-2"></i>Generate Report';
//         }
//     }

//     showError(message) {
//         console.error('❌ Error:', message);
        
//         const errorDiv = document.getElementById('error');
//         if (errorDiv) {
//             errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
//             errorDiv.style.display = 'block';
            
//             setTimeout(() => {
//                 errorDiv.style.display = 'none';
//             }, 5000);
//         }
//     }

//     exportReport() {
//         console.log('💾 Export report called');
//         if (!this.uiState.currentReport) {
//             console.error('No report to export');
//             this.showError('No report to export');
//             return;
//         }
        
//         const dataStr = JSON.stringify(this.uiState.currentReport, null, 2);
//         const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
//         const fileName = `${this.uiState.currentReport.report_type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
        
//         const link = document.createElement('a');
//         link.href = dataUri;
//         link.download = fileName;
//         link.click();
        
//         console.log(`✅ Report exported as: ${fileName}`);
//         this.showToast('Report exported successfully');
//     }

//     printReport() {
//         console.log('🖨️ Print report called');
//         window.print();
//     }

//     copyReport() {
//         console.log('📋 Copy report called');
//         if (!this.uiState.currentReport) {
//             this.showError('No report to copy');
//             return;
//         }
        
//         const text = JSON.stringify(this.uiState.currentReport, null, 2);
        
//         navigator.clipboard.writeText(text).then(() => {
//             console.log('✅ Report copied to clipboard');
//             this.showToast('Report copied to clipboard!');
//         }).catch((err) => {
//             console.error('Failed to copy:', err);
//             this.showError('Failed to copy to clipboard');
//         });
//     }

//     showToast(message) {
//         const toast = document.createElement('div');
//         toast.className = 'position-fixed bottom-0 end-0 p-3';
//         toast.style.zIndex = '11';
//         toast.innerHTML = `
//             <div class="toast show" role="alert">
//                 <div class="toast-header bg-success text-white">
//                     <i class="fas fa-check-circle me-2"></i>
//                     <strong class="me-auto">Success</strong>
//                     <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
//                 </div>
//                 <div class="toast-body">${message}</div>
//             </div>
//         `;
//         document.body.appendChild(toast);
        
//         setTimeout(() => {
//             toast.remove();
//         }, 3000);
//     }

//     getSummaryFieldsForReport(reportType) {
//         const fields = {
//             'SALES_SUMMARY': [
//                 { key: 'grand_total_sales', label: 'Total Revenue', type: 'currency', icon: 'fa-dollar-sign', color: 'success' },
//                 { key: 'grand_total_transactions', label: 'Transactions', type: 'number', icon: 'fa-receipt', color: 'primary' },
//                 { key: 'average_daily_sales', label: 'Avg Daily Sales', type: 'currency', icon: 'fa-chart-line', color: 'info' },
//                 { key: 'total_periods', label: 'Periods', type: 'number', icon: 'fa-calendar', color: 'secondary' }
//             ],
//             'PRODUCT_SALES': [
//                 { key: 'total_revenue', label: 'Total Revenue', type: 'currency', icon: 'fa-dollar-sign', color: 'success' },
//                 { key: 'total_profit', label: 'Total Profit', type: 'currency', icon: 'fa-chart-line', color: 'info' },
//                 { key: 'avg_profit_margin', label: 'Avg Profit Margin', type: 'percentage', icon: 'fa-percent', color: 'warning' },
//                 { key: 'total_products', label: 'Products Sold', type: 'number', icon: 'fa-box', color: 'primary' }
//             ],
//             'CASHIER_PERFORMANCE': [
//                 { key: 'total_revenue', label: 'Total Revenue', type: 'currency', icon: 'fa-dollar-sign', color: 'success' },
//                 { key: 'total_cashiers', label: 'Active Cashiers', type: 'number', icon: 'fa-users', color: 'primary' },
//                 { key: 'avg_revenue_per_cashier', label: 'Avg per Cashier', type: 'currency', icon: 'fa-chart-line', color: 'info' },
//                 { key: 'top_cashier', label: 'Top Performer', type: 'text', icon: 'fa-trophy', color: 'warning' }
//             ],
//             'SALES_VS_STOCK': [
//                 { key: 'total_products', label: 'Total Products', type: 'number', icon: 'fa-boxes', color: 'primary' },
//                 { key: 'high_risk_items', label: 'High Risk', type: 'number', icon: 'fa-exclamation-triangle', color: 'danger' },
//                 { key: 'avg_days_of_supply', label: 'Avg Days Supply', type: 'number', icon: 'fa-calendar', color: 'info' },
//                 { key: 'total_suggested_order', label: 'Suggested Order', type: 'number', icon: 'fa-shopping-cart', color: 'success' }
//             ]
//         };
//         return fields[reportType] || [];
//     }

//     formatSummaryValue(value, type) {
//         if (value === null || value === undefined) return '—';
        
//         switch(type) {
//             case 'currency':
//                 return this.formatCurrency(value);
//             case 'percentage':
//                 return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
//             case 'number':
//                 return this.formatNumber(value);
//             default:
//                 if (typeof value === 'number') {
//                     return value.toLocaleString();
//                 }
//                 return value;
//         }
//     }

//     formatReportTitle(reportType) {
//         const titles = {
//             'SALES_SUMMARY': 'Sales Summary Report',
//             'PRODUCT_SALES': 'Product Performance Report',
//             'CASHIER_PERFORMANCE': 'Cashier Performance Report',
//             'END_OF_DAY': 'End of Day Report',
//             'SALES_VS_STOCK': 'Sales vs Stock Analysis',
//             'TAX_REPORT': 'Tax Report',
//             'CATEGORY_PROFITABILITY': 'Category Profitability Report'
//         };
//         return titles[reportType] || reportType.replace(/_/g, ' ');
//     }

//     formatReportPeriod(filters, report) {
//         if (report.filters) {
//             if (report.filters.start_date && report.filters.end_date) {
//                 return `${report.filters.start_date} to ${report.filters.end_date}`;
//             }
//             if (report.filters.date) {
//                 return report.filters.date;
//             }
//             if (report.filters.period) {
//                 return report.filters.period;
//             }
//         }
        
//         if (filters.reportType === 'END_OF_DAY') {
//             return filters.reportDate || filters.startDate || 'Today';
//         }
        
//         if (filters.startDate && filters.endDate) {
//             return `${filters.startDate} to ${filters.endDate}`;
//         }
        
//         return 'N/A';
//     }

//     formatHeaderLabel(header) {
//         return header.split('_')
//             .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//             .join(' ')
//             .replace(/Id/g, 'ID')
//             .replace(/Sku/g, 'SKU');
//     }

//     formatCellValue(value, field) {
//         if (value === null || value === undefined) return '—';
//         if (typeof value === 'number') {
//             if (field.includes('amount') || field.includes('revenue') || field.includes('profit') || 
//                 field.includes('price') || field === 'total_amount') {
//                 return this.formatCurrency(value);
//             }
//             if (field.includes('margin') || field === 'avg_transaction') {
//                 return `${value.toFixed(1)}%`;
//             }
//             return this.formatNumber(value);
//         }
//         return value;
//     }

//     formatCurrency(value) {
//         if (value === null || value === undefined || isNaN(value)) return '$0.00';
//         return new Intl.NumberFormat('en-US', {
//             style: 'currency',
//             currency: 'USD'
//         }).format(value);
//     }

//     formatNumber(value) {
//         if (value === null || value === undefined || isNaN(value)) return '0';
//         return new Intl.NumberFormat('en-US').format(value);
//     }

//     isNumericField(field) {
//         const numericFields = ['total_sales', 'total_amount', 'total_items', 'quantity', 'count', 
//                                'stock', 'price', 'amount', 'revenue', 'profit', 'margin'];
//         return numericFields.some(nf => field.includes(nf));
//     }

//     getCSRFToken() {
//         const name = 'csrftoken';
//         let cookieValue = null;
//         if (document.cookie && document.cookie !== '') {
//             const cookies = document.cookie.split(';');
//             for (let i = 0; i < cookies.length; i++) {
//                 const cookie = cookies[i].trim();
//                 if (cookie.substring(0, name.length + 1) === (name + '=')) {
//                     cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                     break;
//                 }
//             }
//         }
//         console.log('🔐 CSRF Token found:', cookieValue ? 'Yes' : 'No');
//         return cookieValue;
//     }
// }

// // Initialize controller when DOM is ready
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('🎯 DOM fully loaded and parsed');
//     console.log('📦 Bootstrap version:', typeof bootstrap !== 'undefined' ? 'Available' : 'Not available');
//     console.log('🔧 Initializing ReportsController...');
//     window.reportsController = new ReportsController();
//     console.log('✅ ReportsController instance created:', window.reportsController);
// });

class ReportsController {
    constructor() {
        console.log('🚀 ReportsController constructor started');
        
        this.endpoints = {
            salesReport: '/inventory/reports/sales/'  // Your actual endpoint
        };
        
        this.uiState = {
            currentReport: null,
            currentFilters: null,
            currentTab: 'data'
        };
        
        this.init();
    }

    init() {
        console.log('📋 ReportsController.init() called');
        console.log('📍 Current URL:', window.location.href);
        console.log('📍 API Endpoint:', this.endpoints.salesReport);
        
        this.bindEvents();
        this.setDefaultDates();
        this.setupFilters();
        this.initTabs();
        
        console.log('✅ ReportsController initialization complete');
    }

    initTabs() {
        console.log('🔧 Initializing tabs');
        const tabButtons = document.querySelectorAll('[data-tab]');
        console.log(`📑 Found ${tabButtons.length} tab buttons`);
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                console.log(`🔄 Tab clicked: ${tabName}`);
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        console.log(`🔄 Switching to tab: ${tabName}`);
        
        // Update button states
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Update tab panes
        const dataTab = document.getElementById('dataTab');
        const jsonTab = document.getElementById('jsonTab');
        const chartsTab = document.getElementById('chartsTab');
        
        console.log(`Tab elements found - Data: ${!!dataTab}, JSON: ${!!jsonTab}, Charts: ${!!chartsTab}`);
        
        if (dataTab) dataTab.classList.add('d-none');
        if (jsonTab) jsonTab.classList.add('d-none');
        if (chartsTab) chartsTab.classList.add('d-none');
        
        const selectedTab = document.getElementById(`${tabName}Tab`);
        if (selectedTab) {
            selectedTab.classList.remove('d-none');
            console.log(`✅ Switched to ${tabName} tab`);
        } else {
            console.error(`❌ Tab element not found: ${tabName}Tab`);
        }
        
        this.uiState.currentTab = tabName;
    }

    setDefaultDates() {
        console.log('📅 Setting default dates');
        const today = new Date().toISOString().split('T')[0];
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const reportDate = document.getElementById('reportDate');
        
        console.log(`Today's date: ${today}`);
        console.log(`StartDate element: ${!!startDate}`);
        console.log(`EndDate element: ${!!endDate}`);
        console.log(`ReportDate element: ${!!reportDate}`);
        
        if (startDate) startDate.value = today;
        if (endDate) endDate.value = today;
        if (reportDate) reportDate.value = today;
        
        console.log('✅ Default dates set');
    }

    bindEvents() {
        console.log('🔗 Binding events');
        
        // Generate Report Button
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            console.log('✅ Generate button found, attaching event');
            generateBtn.addEventListener('click', () => {
                console.log('🖱️ Generate button clicked');
                this.generateReport();
            });
        } else {
            console.error('❌ Generate button not found!');
        }
        
        // Action buttons
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            console.log('✅ Export button found');
            exportBtn.addEventListener('click', () => this.exportReport());
        }
        
        const printBtn = document.getElementById('printReportBtn');
        if (printBtn) {
            console.log('✅ Print button found');
            printBtn.addEventListener('click', () => this.printReport());
        }
        
        const copyBtn = document.getElementById('copyReportBtn');
        if (copyBtn) {
            console.log('✅ Copy button found');
            copyBtn.addEventListener('click', () => this.copyReport());
        }
        
        // Report Type Change
        const reportType = document.getElementById('reportType');
        if (reportType) {
            console.log('✅ Report type select found');
            reportType.addEventListener('change', (e) => {
                console.log(`📊 Report type changed to: ${e.target.value}`);
                this.onReportTypeChange(e);
            });
        }
        
        // Quick Reports
        const quickBtns = document.querySelectorAll('.quick-report-btn');
        console.log(`📌 Found ${quickBtns.length} quick report buttons`);
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-quick-report');
                console.log(`⚡ Quick report clicked: ${type}`);
                this.handleQuickReport(type);
            });
        });
    }

    setupFilters() {
        console.log('🔧 Setting up filters');
        const reportType = document.getElementById('reportType');
        if (reportType) {
            this.onReportTypeChange({ target: reportType });
        }
    }

    onReportTypeChange(e) {
        const reportType = e.target.value;
        console.log(`📋 Report type changed to: ${reportType}`);
        
        const groupByFilter = document.getElementById('groupByFilter');
        const topNFilter = document.getElementById('topNFilter');
        const singleDateFilter = document.getElementById('singleDateFilter');
        const specificFilters = document.getElementById('reportSpecificFilters');
        
        console.log(`Filters visibility - GroupBy: ${!!groupByFilter}, TopN: ${!!topNFilter}, SingleDate: ${!!singleDateFilter}`);
        
        if (specificFilters) specificFilters.classList.remove('d-none');
        if (groupByFilter) groupByFilter.style.display = 'none';
        if (topNFilter) topNFilter.style.display = 'none';
        if (singleDateFilter) singleDateFilter.style.display = 'none';
        
        const dateGroups = document.querySelectorAll('.row .filter-group');
        
        switch(reportType) {
            case 'SALES_SUMMARY':
                console.log('📈 Showing SALES_SUMMARY specific filters');
                if (groupByFilter) groupByFilter.style.display = 'block';
                break;
            case 'PRODUCT_SALES':
                console.log('📊 Showing PRODUCT_SALES specific filters');
                if (topNFilter) topNFilter.style.display = 'block';
                break;
            case 'END_OF_DAY':
                console.log('📅 Showing END_OF_DAY specific filters');
                if (singleDateFilter) singleDateFilter.style.display = 'block';
                if (dateGroups) {
                    dateGroups.forEach(group => {
                        group.style.display = 'none';
                    });
                }
                break;
            case 'CASHIER_PERFORMANCE':
                console.log('👤 Showing CASHIER_PERFORMANCE');
                break;
            case 'SALES_VS_STOCK':
                console.log('📦 Showing SALES_VS_STOCK');
                break;
        }
    }

    handleQuickReport(type) {
        console.log(`⚡ Quick report triggered: ${type}`);
        const today = new Date();
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const reportType = document.getElementById('reportType');
        const reportDate = document.getElementById('reportDate');
        
        switch(type) {
            case 'today':
                const todayStr = today.toISOString().split('T')[0];
                if (startDate) startDate.value = todayStr;
                if (endDate) endDate.value = todayStr;
                if (reportType) reportType.value = 'END_OF_DAY';
                if (reportDate) reportDate.value = todayStr;
                console.log(`📅 Set today's date: ${todayStr}`);
                break;
                
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                if (startDate) startDate.value = yesterdayStr;
                if (endDate) endDate.value = yesterdayStr;
                if (reportType) reportType.value = 'END_OF_DAY';
                if (reportDate) reportDate.value = yesterdayStr;
                console.log(`📅 Set yesterday's date: ${yesterdayStr}`);
                break;
                
            case 'last7':
                const last7 = new Date(today);
                last7.setDate(last7.getDate() - 7);
                if (startDate) startDate.value = last7.toISOString().split('T')[0];
                if (endDate) endDate.value = today.toISOString().split('T')[0];
                if (reportType) reportType.value = 'SALES_SUMMARY';
                if (document.getElementById('groupBy')) {
                    document.getElementById('groupBy').value = 'daily';
                }
                console.log(`📅 Set last 7 days: ${last7.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
                break;
                
            case 'last30':
                const last30 = new Date(today);
                last30.setDate(last30.getDate() - 30);
                if (startDate) startDate.value = last30.toISOString().split('T')[0];
                if (endDate) endDate.value = today.toISOString().split('T')[0];
                if (reportType) reportType.value = 'SALES_SUMMARY';
                console.log(`📅 Set last 30 days: ${last30.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
                break;
                
            case 'lowstock':
                if (reportType) reportType.value = 'SALES_VS_STOCK';
                console.log(`📦 Set report type to SALES_VS_STOCK`);
                break;
        }
        
        if (reportType) {
            this.onReportTypeChange({ target: reportType });
        }
        
        setTimeout(() => {
            console.log('⏰ Auto-generating report after quick selection');
            this.generateReport();
        }, 100);
    }

    async generateReport() {
        console.log('🚀 Starting report generation...');
        console.log('═══════════════════════════════════════');
        
        const filters = this.getFilterValues();
        console.log('📋 Filter values:', JSON.stringify(filters, null, 2));
        
        if (!this.validateFilters(filters)) {
            console.log('❌ Filter validation failed');
            return;
        }
        
        this.showLoading(true);
        
        // Build request payload
        const requestPayload = {
            report_type: filters.reportType,
            filters: {
                start_date: filters.startDate,
                end_date: filters.endDate,
                store_id: filters.store || null,
                cashier_id: filters.cashier || null,
                product_id: filters.product || null,
                category_id: filters.category || null,
                group_by: filters.groupBy || 'daily',
                top_n: parseInt(filters.topN) || 20,
                date: filters.reportDate || filters.startDate
            }
        };
        
        // Clean up null/empty values
        Object.keys(requestPayload.filters).forEach(key => {
            if (requestPayload.filters[key] === null || 
                requestPayload.filters[key] === '' || 
                requestPayload.filters[key] === 'All') {
                delete requestPayload.filters[key];
            }
        });
        
        console.log('📤 Sending request payload:', JSON.stringify(requestPayload, null, 2));
        console.log('🌐 API Endpoint:', this.endpoints.salesReport);
        
        try {
            const response = await fetch(this.endpoints.salesReport, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestPayload)
            });
            
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            const responseData = await response.json();
            console.log('📥 Full response data:', JSON.stringify(responseData, null, 2));
            console.log('📥 Response type:', typeof responseData);
            console.log('📥 Response keys:', Object.keys(responseData));
            
            if (!response.ok) {
                throw new Error(responseData.error || `Server error: ${response.status}`);
            }
            
            // Check response structure
            console.log('🔍 Checking response structure...');
            console.log('  - Has success?', responseData.hasOwnProperty('success'));
            console.log('  - Success value:', responseData.success);
            console.log('  - Has report?', responseData.hasOwnProperty('report'));
            console.log('  - Has report_type?', responseData.hasOwnProperty('report_type'));
            
            if (responseData.success && responseData.report) {
                console.log('✅ Response has success wrapper with report object');
                console.log('📊 Report object keys:', Object.keys(responseData.report));
                console.log('📊 Report has data?', !!responseData.report.data);
                console.log('📊 Report data length:', responseData.report.data?.length);
                this.processReportData(responseData.report, filters);
            } else if (responseData.report_type) {
                console.log('✅ Response is already the report object');
                console.log('📊 Report type:', responseData.report_type);
                console.log('📊 Report has data?', !!responseData.data);
                console.log('📊 Report data length:', responseData.data?.length);
                this.processReportData(responseData, filters);
            } else {
                console.error('❌ Unknown response format');
                throw new Error(responseData.error || 'Invalid response format');
            }
            
        } catch (error) {
            console.error('❌ Report generation error:', error);
            console.error('Error stack:', error.stack);
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
        
        console.log('═══════════════════════════════════════');
    }

    getFilterValues() {
        const values = {
            reportType: document.getElementById('reportType')?.value || 'SALES_SUMMARY',
            startDate: document.getElementById('startDate')?.value,
            endDate: document.getElementById('endDate')?.value,
            store: document.getElementById('store')?.value || '',
            cashier: document.getElementById('cashier')?.value || '',
            product: document.getElementById('product')?.value || '',
            category: document.getElementById('category')?.value || '',
            groupBy: document.getElementById('groupBy')?.value || 'daily',
            topN: document.getElementById('topN')?.value || 20,
            reportDate: document.getElementById('reportDate')?.value
        };
        
        console.log('📋 Retrieved filter values:', values);
        return values;
    }

    validateFilters(filters) {
        console.log('🔍 Validating filters...');
        const errorDiv = document.getElementById('error');
        if (!errorDiv) return true;
        
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        
        // Validate based on report type
        if (filters.reportType !== 'END_OF_DAY' && filters.reportType !== 'SALES_VS_STOCK') {
            if (!filters.startDate || !filters.endDate) {
                console.log('❌ Validation failed: Missing dates');
                this.showError('Please select both start and end dates');
                return false;
            }
            
            const start = new Date(filters.startDate);
            const end = new Date(filters.endDate);
            
            if (start > end) {
                console.log('❌ Validation failed: Start date after end date');
                this.showError('Start date cannot be after end date');
                return false;
            }
            
            console.log('✅ Date validation passed');
        }
        
        if (filters.reportType === 'END_OF_DAY' && !filters.reportDate && !filters.startDate) {
            console.log('❌ Validation failed: Missing report date');
            this.showError('Please select a report date');
            return false;
        }
        
        console.log('✅ All validations passed');
        return true;
    }

    processReportData(report, filters) {
        console.log('🔄 Processing report data...');
        console.log('Report object:', report);
        console.log('Report keys:', Object.keys(report));
        console.log('Report has data?', !!report.data);
        console.log('Report data type:', typeof report.data);
        console.log('Report data is array?', Array.isArray(report.data));
        console.log('Report data length:', report.data?.length);
        
        if (report.data && report.data.length > 0) {
            console.log('📊 First data item sample:', report.data[0]);
        }
        
        // Validate report
        if (!report || !report.report_type) {
            console.error('❌ Invalid report data received');
            this.showError('Invalid report data received');
            return;
        }
        
        console.log(`✅ Valid report received: ${report.report_type}`);
        
        // Store the report
        this.uiState.currentReport = report;
        this.uiState.currentFilters = filters;
        
        // Update UI
        console.log('🎨 Updating UI components...');
        this.updateReportUI(report, filters);
        this.showReportResults(true);
        
        // Update timestamp
        const generatedAt = document.getElementById('generatedAt');
        if (generatedAt) {
            const now = new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            generatedAt.textContent = now;
            console.log(`🕒 Updated timestamp: ${now}`);
        }
        
        // Enable export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
            console.log('🔓 Export button enabled');
        }
        
        console.log('✅ Report processing complete');
    }

    updateReportUI(report, filters) {
        console.log('🎨 updateReportUI called');
        
        // Update report title
        const reportTitle = document.getElementById('reportTitle');
        if (reportTitle) {
            const title = this.formatReportTitle(report.report_type);
            reportTitle.textContent = title;
            console.log(`📝 Report title set to: ${title}`);
        }
        
        // Update report period
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            const period = this.formatReportPeriod(filters, report);
            reportPeriod.textContent = period;
            console.log(`📅 Report period set to: ${period}`);
        }
        
        // Update all tabs
        console.log('📊 Updating summary cards...');
        this.updateSummaryCards(report);
        
        console.log('📋 Updating data tab...');
        this.updateDataTab(report);
        
        console.log('💻 Updating JSON tab...');
        this.updateJSONTab(report);
    }

    updateSummaryCards(report) {
        console.log('📊 updateSummaryCards called');
        const summaryContainer = document.getElementById('summaryCards');
        
        if (!summaryContainer) {
            console.error('❌ Summary cards container not found!');
            return;
        }
        
        console.log('✅ Summary container found, clearing...');
        summaryContainer.innerHTML = '';
        
        if (!report.summary || Object.keys(report.summary).length === 0) {
            console.log('⚠️ No summary data available');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'col-12 text-center text-muted py-3';
            messageDiv.innerHTML = '<i class="fas fa-chart-line fa-2x mb-2"></i><p>No summary data available</p>';
            summaryContainer.appendChild(messageDiv);
            return;
        }
        
        console.log('📊 Summary object:', report.summary);
        console.log('Summary keys:', Object.keys(report.summary));
        
        const summaryFields = this.getSummaryFieldsForReport(report.report_type);
        console.log(`📋 Found ${summaryFields.length} predefined summary fields`);
        
        const cards = [];
        for (const field of summaryFields) {
            const value = report.summary[field.key];
            if (value !== undefined && value !== null) {
                cards.push({
                    title: field.label,
                    value: this.formatSummaryValue(value, field.type),
                    icon: field.icon,
                    color: field.color
                });
                console.log(`  ✓ Added card: ${field.label} = ${value}`);
            } else {
                console.log(`  ✗ Skipped card: ${field.key} (value not found)`);
            }
        }
        
        // If no predefined fields, show all summary keys
        if (cards.length === 0) {
            console.log('⚠️ No predefined cards, using all summary keys');
            for (const [key, value] of Object.entries(report.summary)) {
                cards.push({
                    title: this.formatHeaderLabel(key),
                    value: this.formatSummaryValue(value, 'auto'),
                    icon: 'fa-chart-simple',
                    color: 'primary'
                });
                console.log(`  ✓ Added card: ${key} = ${value}`);
            }
        }
        
        console.log(`📊 Rendering ${cards.length} summary cards`);
        
        // Render cards
        cards.forEach(card => {
            const col = document.createElement('div');
            col.className = 'col-md-3 col-sm-6 mb-3';
            col.innerHTML = `
                <div class="summary-card">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="text-muted mb-1">${this.escapeHTML(card.title)}</h6>
                            <h4 class="mb-0">${this.escapeHTML(card.value)}</h4>
                        </div>
                        <div class="bg-${card.color} bg-opacity-10 rounded-circle p-2">
                            <i class="fas ${card.icon} text-${card.color}"></i>
                        </div>
                    </div>
                </div>
            `;
            summaryContainer.appendChild(col);
        });
        
        console.log('✅ Summary cards rendered');
    }

    updateDataTab(report) {
        console.log('📋 updateDataTab called');
        
        const tableHead = document.getElementById('reportTableHead');
        const tableBody = document.getElementById('reportTableBody');
        
        if (!tableHead) {
            console.error('❌ Table head element not found!');
            return;
        }
        if (!tableBody) {
            console.error('❌ Table body element not found!');
            return;
        }
        
        console.log('✅ Table elements found');
        
        // Clear existing content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        
        // Check if we have data
        if (!report.data) {
            console.error('❌ report.data is null or undefined');
            this.showNoDataMessage(tableBody);
            return;
        }
        
        if (!Array.isArray(report.data)) {
            console.error('❌ report.data is not an array, it is:', typeof report.data);
            this.showNoDataMessage(tableBody);
            return;
        }
        
        if (report.data.length === 0) {
            console.log('⚠️ No data rows found');
            this.showNoDataMessage(tableBody);
            return;
        }
        
        console.log(`📊 Data rows count: ${report.data.length}`);
        
        // Get headers from first data item
        const firstItem = report.data[0];
        console.log('📋 First data item:', firstItem);
        console.log('First item type:', typeof firstItem);
        console.log('First item keys:', Object.keys(firstItem));
        
        const headers = Object.keys(firstItem);
        console.log(`📋 Table headers (${headers.length}):`, headers);
        
        // Create header row
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = this.formatHeaderLabel(header);
            if (this.isNumericField(header)) {
                th.classList.add('text-end');
            }
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);
        console.log('✅ Header row created');
        
        // Create data rows
        let rowsCreated = 0;
        report.data.forEach((item, index) => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                let value = item[header];
                
                // Format value
                if (value === null || value === undefined) {
                    td.textContent = '—';
                } else if (typeof value === 'object') {
                    td.textContent = Array.isArray(value) ? `${value.length} items` : JSON.stringify(value).substring(0, 50);
                } else {
                    td.textContent = this.formatCellValue(value, header);
                }
                
                if (this.isNumericField(header) && typeof value === 'number') {
                    td.classList.add('text-end');
                }
                
                // Special styling for stock risk
                if (header === 'stock_risk' && typeof value === 'string') {
                    const color = value === 'HIGH' ? 'danger' : value === 'MEDIUM' ? 'warning' : 'success';
                    td.innerHTML = `<span class="badge bg-${color}">${this.escapeHTML(value)}</span>`;
                }
                
                row.appendChild(td);
            });
            tableBody.appendChild(row);
            rowsCreated++;
        });
        
        console.log(`✅ Data table updated with ${rowsCreated} rows`);
    }

    updateJSONTab(report) {
        console.log('💻 updateJSONTab called');
        const output = document.getElementById('reportOutput');
        
        if (!output) {
            console.error('❌ JSON output element not found!');
            return;
        }
        
        const jsonString = JSON.stringify(report, null, 2);
        output.textContent = jsonString;
        console.log(`✅ JSON view updated (${jsonString.length} characters)`);
    }

    showNoDataMessage(tableBody) {
        console.log('⚠️ Showing "No Data" message');
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 8;
        cell.className = 'text-center py-5';
        cell.innerHTML = `
            <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">No Data Available</h5>
            <p class="text-muted small">No records found for the selected criteria</p>
        `;
        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    showReportResults(show = true) {
        console.log(`🎬 showReportResults(${show}) called`);
        const reportResult = document.getElementById('reportResult');
        if (reportResult) {
            if (show) {
                reportResult.classList.remove('d-none');
                console.log('✅ Report results container shown');
                setTimeout(() => {
                    reportResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    console.log('📜 Scrolled to results');
                }, 200);
            } else {
                reportResult.classList.add('d-none');
                console.log('Report results container hidden');
            }
        } else {
            console.error('❌ Report result container not found!');
        }
    }

    showLoading(show = true) {
        console.log(`⏳ showLoading(${show}) called`);
        const loadingIndicator = document.getElementById('loadingIndicator');
        const generateBtn = document.getElementById('generateBtn');
        
        if (loadingIndicator) {
            loadingIndicator.classList.toggle('d-none', !show);
        }
        
        if (generateBtn) {
            generateBtn.disabled = show;
            generateBtn.innerHTML = show ? 
                '<i class="fas fa-spinner fa-spin me-2"></i>Generating...' :
                '<i class="fas fa-play-circle me-2"></i>Generate Report';
        }
    }

    showError(message) {
        console.error('❌ Error:', message);
        
        const errorDiv = document.getElementById('error');
        if (errorDiv) {
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${this.escapeHTML(message)}`;
            errorDiv.style.display = 'block';
            
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    exportReport() {
        console.log('💾 Export report called');
        if (!this.uiState.currentReport) {
            console.error('No report to export');
            this.showError('No report to export');
            return;
        }
        
        const dataStr = JSON.stringify(this.uiState.currentReport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const fileName = `${this.uiState.currentReport.report_type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
        
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = fileName;
        link.click();
        
        console.log(`✅ Report exported as: ${fileName}`);
        this.showToast('Report exported successfully');
    }

    printReport() {
        console.log('🖨️ Print report called - generating printable document');
        
        if (!this.uiState.currentReport) {
            this.showError('No report to print');
            return;
        }
        
        // Generate printable document
        this.generatePrintableDocument();
    }

    generatePrintableDocument() {
        console.log('📄 Generating printable document...');
        
        const report = this.uiState.currentReport;
        const filters = this.uiState.currentFilters;
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!printWindow) {
            this.showError('Please allow pop-ups to print reports');
            return;
        }
        
        // Get current date/time for the report
        const now = new Date();
        const printDate = now.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Build the printable HTML content
        const htmlContent = this.buildPrintableHTML(report, filters, printDate);
        
        // Write to the new window
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                // Optional: Close the window after printing
                // printWindow.close();
            }, 500);
        };
    }

    buildPrintableHTML(report, filters, printDate) {
        // Generate summary cards HTML
        const summaryCardsHTML = this.generatePrintableSummaryCards(report);
        
        // Generate data table HTML
        const dataTableHTML = this.generatePrintableDataTable(report);
        
        // Generate report metadata
        const reportTitle = this.formatReportTitle(report.report_type);
        const reportPeriod = this.formatReportPeriod(filters, report);
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHTML(reportTitle)} - ${this.escapeHTML(reportPeriod)}</title>
    <style>
        /* Print Styles */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .page-break {
                page-break-before: always;
            }
            .no-break {
                page-break-inside: avoid;
            }
        }
        
        /* Main Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: white;
            padding: 20px;
            color: #333;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
        }
        
        /* Header */
        .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4361ee;
        }
        
        .report-header h1 {
            color: #4361ee;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .report-header .subtitle {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }
        
        /* Metadata Section */
        .metadata-section {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 8px;
            border-left: 4px solid #4361ee;
        }
        
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .metadata-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .metadata-label {
            font-weight: 600;
            color: #555;
            min-width: 100px;
        }
        
        .metadata-value {
            color: #333;
        }
        
        /* Summary Cards */
        .summary-section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 20px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #dee2e6;
            color: #4361ee;
        }
        
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #4361ee;
        }
        
        .summary-card h6 {
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .summary-card h3 {
            color: #4361ee;
            font-size: 28px;
            margin: 0;
        }
        
        /* Table Styles */
        .data-table-section {
            margin-top: 30px;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        th {
            background: #4361ee;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
        }
        
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #dee2e6;
            font-size: 12px;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        /* JSON Section */
        .json-section {
            margin-top: 30px;
        }
        
        pre {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            overflow-x: auto;
            font-size: 11px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        /* Footer */
        .report-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            font-size: 11px;
            color: #999;
        }
        
        /* Badges */
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .badge-danger {
            background: #f72585;
            color: white;
        }
        
        .badge-warning {
            background: #f8961e;
            color: white;
        }
        
        .badge-success {
            background: #4cc9f0;
            color: white;
        }
        
        /* Alignment */
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        /* Page break control */
        .page-break-before {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <div class="report-header">
            <h1>${this.escapeHTML(reportTitle)}</h1>
            <div class="subtitle">Inventory Management System - Sales Report</div>
        </div>
        
        <!-- Metadata -->
        <div class="metadata-section">
            <div class="metadata-grid">
                <div class="metadata-item">
                    <span class="metadata-label">Report Period:</span>
                    <span class="metadata-value">${this.escapeHTML(reportPeriod)}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Generated On:</span>
                    <span class="metadata-value">${this.escapeHTML(printDate)}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Report Type:</span>
                    <span class="metadata-value">${this.escapeHTML(reportTitle)}</span>
                </div>
                ${report.filters && report.filters.store ? `
                <div class="metadata-item">
                    <span class="metadata-label">Store:</span>
                    <span class="metadata-value">${this.escapeHTML(report.filters.store)}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Summary Cards -->
        ${summaryCardsHTML ? `
        <div class="summary-section">
            <h2 class="section-title">Summary</h2>
            <div class="cards-grid">
                ${summaryCardsHTML}
            </div>
        </div>
        ` : ''}
        
        <!-- Data Table -->
        <div class="data-table-section">
            <h2 class="section-title">Detailed Data</h2>
            ${dataTableHTML}
        </div>
        
        <!-- JSON Data (Optional) -->
        <div class="json-section page-break-before">
            <h2 class="section-title">Raw Data (JSON)</h2>
            <pre>${this.escapeHTML(JSON.stringify(report, null, 2))}</pre>
        </div>
        
        <!-- Footer -->
        <div class="report-footer">
            <p>Generated by Inventory Management System | Confidential - For Internal Use Only</p>
            <p>Page printed on ${this.escapeHTML(printDate)}</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    generatePrintableSummaryCards(report) {
        if (!report.summary || Object.keys(report.summary).length === 0) {
            return '';
        }
        
        const summaryFields = this.getSummaryFieldsForReport(report.report_type);
        let cardsHTML = '';
        
        for (const field of summaryFields) {
            const value = report.summary[field.key];
            if (value !== undefined && value !== null) {
                cardsHTML += `
                    <div class="summary-card">
                        <h6>${this.escapeHTML(field.label)}</h6>
                        <h3>${this.escapeHTML(this.formatSummaryValue(value, field.type))}</h3>
                    </div>
                `;
            }
        }
        
        // If no predefined fields, show all summary keys
        if (cardsHTML === '') {
            for (const [key, value] of Object.entries(report.summary)) {
                cardsHTML += `
                    <div class="summary-card">
                        <h6>${this.escapeHTML(this.formatHeaderLabel(key))}</h6>
                        <h3>${this.escapeHTML(this.formatSummaryValue(value, 'auto'))}</h3>
                    </div>
                `;
            }
        }
        
        return cardsHTML;
    }

    generatePrintableDataTable(report) {
        if (!report.data || !Array.isArray(report.data) || report.data.length === 0) {
            return '<p class="text-center">No data available for the selected criteria</p>';
        }
        
        // Get headers from first data item
        const firstItem = report.data[0];
        const headers = Object.keys(firstItem);
        
        // Build table
        let tableHTML = `
        <table>
            <thead>
                <tr>
        `;
        
        // Add headers
        headers.forEach(header => {
            tableHTML += `<th>${this.escapeHTML(this.formatHeaderLabel(header))}</th>`;
        });
        
        tableHTML += `
                </td>
            </thead>
            <tbody>
        `;
        
        // Add data rows
        report.data.forEach(item => {
            tableHTML += '<tr>';
            headers.forEach(header => {
                let value = item[header];
                let displayValue = '—';
                
                if (value !== null && value !== undefined) {
                    if (typeof value === 'object') {
                        displayValue = Array.isArray(value) ? `${value.length} items` : JSON.stringify(value).substring(0, 50);
                    } else {
                        displayValue = this.formatCellValue(value, header);
                    }
                }
                
                // Special styling for stock risk
                if (header === 'stock_risk' && typeof value === 'string') {
                    const badgeClass = value === 'HIGH' ? 'badge-danger' : (value === 'MEDIUM' ? 'badge-warning' : 'badge-success');
                    tableHTML += `<td><span class="badge ${badgeClass}">${this.escapeHTML(displayValue)}</span></td>`;
                } else {
                    const alignClass = this.isNumericField(header) && typeof value === 'number' ? 'text-right' : '';
                    tableHTML += `<td class="${alignClass}">${this.escapeHTML(displayValue)}</td>`;
                }
            });
            tableHTML += '</tr>';
        });
        
        tableHTML += `
            </tbody>
        </table>
        `;
        
        return tableHTML;
    }

    copyReport() {
        console.log('📋 Copy report called');
        if (!this.uiState.currentReport) {
            this.showError('No report to copy');
            return;
        }
        
        // Create a formatted text version for copying
        const report = this.uiState.currentReport;
        const filters = this.uiState.currentFilters;
        
        let textContent = '';
        textContent += `${this.formatReportTitle(report.report_type)}\n`;
        textContent += `${'='.repeat(50)}\n\n`;
        textContent += `Period: ${this.formatReportPeriod(filters, report)}\n`;
        textContent += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Add summary
        if (report.summary) {
            textContent += `SUMMARY\n${'-'.repeat(30)}\n`;
            for (const [key, value] of Object.entries(report.summary)) {
                textContent += `${this.formatHeaderLabel(key)}: ${this.formatSummaryValue(value, 'auto')}\n`;
            }
            textContent += '\n';
        }
        
        // Add data table
        if (report.data && report.data.length > 0) {
            textContent += `DETAILED DATA\n${'-'.repeat(30)}\n`;
            const headers = Object.keys(report.data[0]);
            textContent += headers.map(h => this.formatHeaderLabel(h)).join('\t') + '\n';
            textContent += '-'.repeat(50) + '\n';
            
            report.data.forEach(item => {
                const row = headers.map(header => {
                    let value = item[header];
                    if (value === null || value === undefined) return '—';
                    if (typeof value === 'object') return JSON.stringify(value);
                    return value;
                });
                textContent += row.join('\t') + '\n';
            });
            textContent += '\n';
        }
        
        // Add full JSON
        textContent += `FULL DATA (JSON)\n${'-'.repeat(30)}\n`;
        textContent += JSON.stringify(report, null, 2);
        
        navigator.clipboard.writeText(textContent).then(() => {
            console.log('✅ Report copied to clipboard');
            this.showToast('Report copied to clipboard!');
        }).catch((err) => {
            console.error('Failed to copy:', err);
            this.showError('Failed to copy to clipboard');
        });
    }

    escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '11';
        toast.innerHTML = `
            <div class="toast show" role="alert">
                <div class="toast-header bg-success text-white">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong class="me-auto">Success</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${this.escapeHTML(message)}</div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getSummaryFieldsForReport(reportType) {
        const fields = {
            'SALES_SUMMARY': [
                { key: 'grand_total_sales', label: 'Total Revenue', type: 'currency', icon: 'fa-dollar-sign', color: 'success' },
                { key: 'grand_total_transactions', label: 'Transactions', type: 'number', icon: 'fa-receipt', color: 'primary' },
                { key: 'average_daily_sales', label: 'Avg Daily Sales', type: 'currency', icon: 'fa-chart-line', color: 'info' },
                { key: 'total_periods', label: 'Periods', type: 'number', icon: 'fa-calendar', color: 'secondary' }
            ],
            'PRODUCT_SALES': [
                { key: 'total_revenue', label: 'Total Revenue', type: 'currency', icon: 'fa-dollar-sign', color: 'success' },
                { key: 'total_profit', label: 'Total Profit', type: 'currency', icon: 'fa-chart-line', color: 'info' },
                { key: 'avg_profit_margin', label: 'Avg Profit Margin', type: 'percentage', icon: 'fa-percent', color: 'warning' },
                { key: 'total_products', label: 'Products Sold', type: 'number', icon: 'fa-box', color: 'primary' }
            ],
            'CASHIER_PERFORMANCE': [
                { key: 'total_revenue', label: 'Total Revenue', type: 'currency', icon: 'fa-dollar-sign', color: 'success' },
                { key: 'total_cashiers', label: 'Active Cashiers', type: 'number', icon: 'fa-users', color: 'primary' },
                { key: 'avg_revenue_per_cashier', label: 'Avg per Cashier', type: 'currency', icon: 'fa-chart-line', color: 'info' },
                { key: 'top_cashier', label: 'Top Performer', type: 'text', icon: 'fa-trophy', color: 'warning' }
            ],
            'SALES_VS_STOCK': [
                { key: 'total_products', label: 'Total Products', type: 'number', icon: 'fa-boxes', color: 'primary' },
                { key: 'high_risk_items', label: 'High Risk', type: 'number', icon: 'fa-exclamation-triangle', color: 'danger' },
                { key: 'avg_days_of_supply', label: 'Avg Days Supply', type: 'number', icon: 'fa-calendar', color: 'info' },
                { key: 'total_suggested_order', label: 'Suggested Order', type: 'number', icon: 'fa-shopping-cart', color: 'success' }
            ]
        };
        return fields[reportType] || [];
    }

    formatSummaryValue(value, type) {
        if (value === null || value === undefined) return '—';
        
        switch(type) {
            case 'currency':
                return this.formatCurrency(value);
            case 'percentage':
                return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
            case 'number':
                return this.formatNumber(value);
            default:
                if (typeof value === 'number') {
                    return value.toLocaleString();
                }
                return value;
        }
    }

    formatReportTitle(reportType) {
        const titles = {
            'SALES_SUMMARY': 'Sales Summary Report',
            'PRODUCT_SALES': 'Product Performance Report',
            'CASHIER_PERFORMANCE': 'Cashier Performance Report',
            'END_OF_DAY': 'End of Day Report',
            'SALES_VS_STOCK': 'Sales vs Stock Analysis',
            'TAX_REPORT': 'Tax Report',
            'CATEGORY_PROFITABILITY': 'Category Profitability Report'
        };
        return titles[reportType] || reportType.replace(/_/g, ' ');
    }

    formatReportPeriod(filters, report) {
        if (report.filters) {
            if (report.filters.start_date && report.filters.end_date) {
                return `${report.filters.start_date} to ${report.filters.end_date}`;
            }
            if (report.filters.date) {
                return report.filters.date;
            }
            if (report.filters.period) {
                return report.filters.period;
            }
        }
        
        if (filters && filters.reportType === 'END_OF_DAY') {
            return filters.reportDate || filters.startDate || 'Today';
        }
        
        if (filters && filters.startDate && filters.endDate) {
            return `${filters.startDate} to ${filters.endDate}`;
        }
        
        return 'N/A';
    }

    formatHeaderLabel(header) {
        return header.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/Id/g, 'ID')
            .replace(/Sku/g, 'SKU');
    }

    formatCellValue(value, field) {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'number') {
            if (field.includes('amount') || field.includes('revenue') || field.includes('profit') || 
                field.includes('price') || field === 'total_amount') {
                return this.formatCurrency(value);
            }
            if (field.includes('margin') || field === 'avg_transaction') {
                return `${value.toFixed(1)}%`;
            }
            return this.formatNumber(value);
        }
        return value;
    }

    formatCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    formatNumber(value) {
        if (value === null || value === undefined || isNaN(value)) return '0';
        return new Intl.NumberFormat('en-US').format(value);
    }

    isNumericField(field) {
        const numericFields = ['total_sales', 'total_amount', 'total_items', 'quantity', 'count', 
                               'stock', 'price', 'amount', 'revenue', 'profit', 'margin'];
        return numericFields.some(nf => field.includes(nf));
    }

    getCSRFToken() {
        const name = 'csrftoken';
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
        console.log('🔐 CSRF Token found:', cookieValue ? 'Yes' : 'No');
        return cookieValue;
    }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM fully loaded and parsed');
    console.log('📦 Bootstrap version:', typeof bootstrap !== 'undefined' ? 'Available' : 'Not available');
    console.log('🔧 Initializing ReportsController...');
    window.reportsController = new ReportsController();
    console.log('✅ ReportsController instance created:', window.reportsController);
});
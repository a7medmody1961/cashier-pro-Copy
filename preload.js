const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    loginSuccess: (user) => ipcRenderer.send('login-successful', user),
    onUserData: (callback) => ipcRenderer.on('user-data', (event, user) => callback(user)),
    logout: () => ipcRenderer.send('app:logout'),
    getMachineId: () => ipcRenderer.invoke('license:get-machine-id'),
    activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
    onTriggerSound: (callback) => ipcRenderer.on('trigger-sound', (event, soundName) => callback(soundName)),
    getPageHtml: (pageName) => ipcRenderer.invoke('get-page-html', pageName),

    startShift: (shiftData) => ipcRenderer.invoke('shift:start', shiftData),
    endShift: (shiftData) => ipcRenderer.invoke('shift:end', shiftData),
    getActiveShift: () => ipcRenderer.invoke('shift:getActive'),
    getAllClosedShifts: () => ipcRenderer.invoke('shift:getAllClosed'),
    getShiftDetails: (shiftId) => ipcRenderer.invoke('shift:getDetails', shiftId),

    getProducts: () => ipcRenderer.invoke('products:get'),
    addProduct: (product) => ipcRenderer.invoke('products:add', product),
    updateProduct: (product) => ipcRenderer.invoke('products:update', product),
    deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
    selectImage: () => ipcRenderer.invoke('products:select-image'),
    getImagesPath: () => ipcRenderer.invoke('products:get-images-path'),
    onProductsUpdate: (callback) => ipcRenderer.on('products-updated', () => callback()),
    exportProductsToExcel: () => ipcRenderer.invoke('products:export-excel'),
    importProductsFromExcel: () => ipcRenderer.invoke('products:import-excel'),
    downloadProductsTemplate: () => ipcRenderer.invoke('products:download-template'),

    getCategories: () => ipcRenderer.invoke('categories:get'),
    addCategory: (name) => ipcRenderer.invoke('categories:add', name),
    updateCategory: (category) => ipcRenderer.invoke('categories:update', category),
    deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),
    onCategoriesUpdate: (callback) => ipcRenderer.on('categories-updated', () => callback()),
    
    getUsers: () => ipcRenderer.invoke('users:get'),
    getSavedUsers: () => ipcRenderer.invoke('users:getSaved'),
    addUser: (user) => ipcRenderer.invoke('users:add', user),
    updateUser: (user) => ipcRenderer.invoke('users:update', user),
    deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
    saveImage: (filePath) => ipcRenderer.invoke('image:save', filePath),
    // جديد: إضافة دالة لتحديث أذونات المستخدم
    updateUserPermissions: (userId, permissions) => ipcRenderer.invoke('users:updatePermissions', userId, permissions),


    getAllSalespersons: () => ipcRenderer.invoke('get-all-salespersons'),
    addSalesperson: (salespersonData) => ipcRenderer.invoke('add-salesperson', salespersonData),
    updateSalesperson: (salespersonData) => ipcRenderer.invoke('update-salesperson', salespersonData),
    deleteSalesperson: (id) => ipcRenderer.invoke('delete-salesperson', id),
    getSalespersonById: (id) => ipcRenderer.invoke('get-salesperson-by-id', id),

    finalizeSale: (saleData) => ipcRenderer.invoke('sales:finalize', saleData),
    getSales: (dateRange) => ipcRenderer.invoke('sales:get', dateRange),
    getSalesById: (saleId) => ipcRenderer.invoke('sales:get-by-id', saleId),
    processRefund: (data) => ipcRenderer.invoke('sales:process-refund', data),
    getSaleDetails: (saleId) => ipcRenderer.invoke('sales:get-details', saleId),
    onSalesUpdate: (callback) => ipcRenderer.on('sales-updated', (event) => callback()),
    processPartialRefund: (data) => ipcRenderer.invoke('sales:process-partial-refund', data),

    getAnalytics: (dateRange) => ipcRenderer.invoke('reports:get-analytics', dateRange),

    getCustomers: () => ipcRenderer.invoke('customers:get'),
    searchCustomers: (query) => ipcRenderer.invoke('customers:search', query),
    addCustomer: (customer) => ipcRenderer.invoke('customers:add', customer),
    updateCustomer: (customer) => ipcRenderer.invoke('customers:update', customer),
    deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),
    getCustomerAddresses: (customerId) => ipcRenderer.invoke('customers:get-addresses', customerId),
    addCustomerAddress: (data) => ipcRenderer.invoke('customers:add-address', data),
    updateCustomerAddress: (addressData) => ipcRenderer.invoke('customers:update-address', addressData),
    deleteCustomerAddress: (addressId) => ipcRenderer.invoke('customers:delete-address', addressId),
    exportCustomersToExcel: () => ipcRenderer.invoke('customers:export-excel'),
    importCustomersFromExcel: () => ipcRenderer.invoke('customers:import-excel'),
    downloadCustomersTemplate: () => ipcRenderer.invoke('customers:download-template'),
    onCustomersUpdate: (callback) => ipcRenderer.on('customers-updated', () => callback()),
    getCustomerTransactions: (customerId) => ipcRenderer.invoke('customers:get-transactions', customerId),

    getExpenses: (dateRange) => ipcRenderer.invoke('expenses:get', dateRange),
    addExpense: (expense) => ipcRenderer.invoke('expenses:add', expense),
    deleteExpense: (id) => ipcRenderer.invoke('expenses:delete', id),

    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

    playSound: (soundName) => ipcRenderer.send('play-sound', soundName),
    printContent: () => ipcRenderer.send('print-content'),
    openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
    exportToPdf: () => ipcRenderer.invoke('export-to-pdf'),
    openCashDrawer: () => ipcRenderer.send('cash-drawer:open'),

    // ** START: New function to remove IPC listeners **
    /**
     * Removes an IPC listener for a given channel and handler.
     * @param {string} channel - The IPC channel name.
     * @param {Function} handler - The handler function to remove.
     */
    removeListener: (channel, handler) => {
        ipcRenderer.removeListener(channel, handler);
    }
});

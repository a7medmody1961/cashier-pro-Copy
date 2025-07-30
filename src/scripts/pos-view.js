import { generateInvoiceHTML } from './invoice-template.js';

let allProducts = [], invoiceItems = [], currentOrderType = 'dine-in', currentCustomerData = {}, appSettings = {};
let productGrid, searchBar, invoiceItemsDiv, subTotalSpan, vatTotalSpan, serviceTotalSpan, deliveryRow, deliveryTotalSpan, grandTotalSpan, finalizeButton, cancelOrderBtn, orderTypeSelector, dineInCustomerForm, deliveryCustomerForm, dineInCustomerNameInput, dineInCustomerPhoneInput, customerPhoneInput, customerNameInput, customerSearchResultsDiv, addressSelectionContainer;
let loyaltyPointsSection, customerLoyaltyPointsSpan, applyLoyaltyDiscountCheckbox, loyaltyDiscountDisplay, loyaltyDiscountValueSpan;
let loyaltyDiscountApplied = false; 
// إضافة متغير جديد لعنصر اختيار البائع
let salespersonSelect; 

let noteModal, noteInput, saveNoteBtn, currentNoteProductId = null, currentNoteItemIndex = -1; // إضافة currentNoteItemIndex لتحديد العنصر بالضبط

export function init(settings) {
    appSettings = settings;
    getDomElements();
    setupEventListeners();
    loadProducts();
    loadSalespersonsIntoDropdown(); // تحميل البائعين عند تهيئة الصفحة
    setOrderType('dine-in');
    window.api.onProductsUpdate(loadProducts);
}

function getDomElements() {
    productGrid = document.getElementById('product-grid');
    searchBar = document.getElementById('search-bar');
    invoiceItemsDiv = document.getElementById('invoice-items');
    subTotalSpan = document.getElementById('sub-total');
    vatTotalSpan = document.getElementById('vat-total');
    serviceTotalSpan = document.getElementById('service-total');
    deliveryRow = document.getElementById('delivery-label').parentElement;
    deliveryTotalSpan = document.getElementById('delivery-total');
    grandTotalSpan = document.getElementById('grand-total');
    finalizeButton = document.getElementById('finalize-button');
    cancelOrderBtn = document.getElementById('cancel-order-btn');
    orderTypeSelector = document.getElementById('order-type-selector');
    dineInCustomerForm = document.getElementById('dine-in-customer-form');
    deliveryCustomerForm = document.getElementById('delivery-customer-form');
    dineInCustomerNameInput = document.getElementById('dine-in-customer-name');
    dineInCustomerPhoneInput = document.getElementById('dine-in-customer-phone');
    customerPhoneInput = document.getElementById('customer-phone');
    customerNameInput = document.getElementById('customer-name');
    customerSearchResultsDiv = document.getElementById('customer-search-results');
    addressSelectionContainer = document.getElementById('address-selection-container');

    loyaltyPointsSection = document.getElementById('loyalty-points-section');
    customerLoyaltyPointsSpan = document.getElementById('customer-loyalty-points');
    applyLoyaltyDiscountCheckbox = document.getElementById('apply-loyalty-discount');
    loyaltyDiscountDisplay = document.getElementById('loyalty-discount-display');
    loyaltyDiscountValueSpan = document.getElementById('loyalty-discount-value');

    noteModal = document.getElementById('note-modal');
    noteInput = document.getElementById('note-input');
    saveNoteBtn = document.getElementById('save-note-btn');

    // جلب عنصر اختيار البائع
    salespersonSelect = document.getElementById('salesperson-select');
}

async function loadProducts() {
    try {
        const productsResult = await window.api.getProducts();
        allProducts = Array.isArray(productsResult) ? productsResult : [];
        renderProducts(allProducts);
    } catch (error) {
        console.error("Failed to load products:", error);
        Swal.fire('خطأ', 'فشل تحميل قائمة المنتجات.', 'error');
    }
}

/**
 * تحميل البائعين من قاعدة البيانات وملء القائمة المنسدلة.
 */
async function loadSalespersonsIntoDropdown() {
    try {
        const response = await window.api.getAllSalespersons();
        if (response.success && salespersonSelect) {
            // مسح الخيارات الحالية باستثناء الخيار الافتراضي
            salespersonSelect.innerHTML = '<option value="">-- لا يوجد بائع --</option>';
            response.data.forEach(salesperson => {
                // فقط إضافة البائعين النشطين
                if (salesperson.is_active) {
                    const option = document.createElement('option');
                    option.value = salesperson.id;
                    option.textContent = salesperson.name;
                    salespersonSelect.appendChild(option);
                }
            });
        } else if (!response.success) {
            console.error("Failed to load salespersons for dropdown:", response.message);
        }
    } catch (error) {
        console.error("Error loading salespersons into dropdown:", error);
    }
}


function renderProducts(productsToRender) {
    if (!productGrid) {
        console.error("Product grid element not found.");
        return;
    }
    productGrid.innerHTML = '';
    if (!Array.isArray(productsToRender)) {
        console.error("renderProducts received non-array:", productsToRender);
        return;
    }
    productsToRender.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = p.id;

        let displayContent = '';
        if (p.icon_name) {
            displayContent = `<div class="product-icon-large"><i class="fa-solid ${p.icon_name}"></i></div>`;
        } else if (p.image_path) {
            displayContent = `<img src="${p.image_path}" alt="${p.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x80/f0f4f8/1e293b?text=?';">`;
        } else {
            displayContent = `<img src="https://placehold.co/100x80/f0f4f8/1e293b?text=${p.name.charAt(0)}" alt="${p.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x80/f0f4f8/1e293b?text=?';">`;
        }

        card.innerHTML = `
            ${displayContent}
            <div class="product-name">${p.name}</div>
            <div class="product-price">${formatCurrency(p.price)}</div>
        `;
        card.addEventListener('click', () => addProductToInvoice(p.id));
        productGrid.appendChild(card);
    });
}

function addProductToInvoice(productId) {
    const activeShift = window.AppState.getActiveShift();
    if (!activeShift) {
        Swal.fire({ title: 'لا توجد وردية مفتوحة!', text: 'يجب عليك بدء وردية جديدة قبل إضافة أي منتجات إلى الفاتورة.', icon: 'warning', confirmButtonText: 'حسنًا' });
        return;
    }
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const quantityToAdd = 1;

    window.api.playSound('add-to-cart');

    const existingItem = invoiceItems.find(item => item.id === productId && item.note === '');
    const existingItemWithNote = invoiceItems.find(item => item.id === productId && item.note !== '');

    if (existingItem) {
        existingItem.quantity += quantityToAdd;
    } else if (product.note && existingItemWithNote && existingItemWithNote.note === product.note) {
        existingItemWithNote.quantity += quantityToAdd;
    }
    else {
        invoiceItems.push({ ...product, quantity: quantityToAdd, note: '' });
    }
    updateInvoice();
}

function updateInvoice() {
    if (invoiceItems.length === 0) {
        invoiceItemsDiv.innerHTML = `<p class="empty-invoice">الفاتورة فارغة</p>`;
    } else {
        invoiceItemsDiv.innerHTML = invoiceItems.map((item, index) => `
            <div class="invoice-item" data-product-id="${item.id}" data-item-index="${index}">
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    ${item.note ? `<div class="item-note-text">${item.note}</div>` : ''}
                    <div class="item-price">${formatCurrency(item.price)}</div>
                </div>
                <div class="item-quantity">
                    <button class="quantity-btn" data-id="${item.id}" data-action="decrease" data-item-index="${index}">-</button>
                    <input type="number" class="item-quantity-input" data-id="${item.id}" value="${item.quantity}" min="1" data-item-index="${index}">
                    <button class="quantity-btn" data-id="${item.id}" data-action="increase" data-item-index="${index}">+</button>
                </div>
                <div class="item-total">${formatCurrency(item.quantity * item.price)}</div>
                <div class="note-icon-container ${item.note ? 'has-note' : ''}" data-id="${item.id}" data-item-index="${index}">
                    <i class="fa-solid fa-note-sticky"></i>
                </div>
            </div>`).join('');
    }
    const amounts = calculateTotals();
    subTotalSpan.textContent = formatCurrency(amounts.subTotal);
    vatTotalSpan.textContent = formatCurrency(amounts.vat);
    serviceTotalSpan.textContent = formatCurrency(amounts.service);
    deliveryTotalSpan.textContent = formatCurrency(amounts.delivery);

    const loyaltyDiscount = calculateLoyaltyDiscount(amounts.total);
    if (loyaltyDiscountApplied && loyaltyDiscount > 0) {
        loyaltyDiscountDisplay.style.display = 'block';
        loyaltyDiscountValueSpan.textContent = formatCurrency(loyaltyDiscount);
        grandTotalSpan.textContent = formatCurrency(amounts.total - loyaltyDiscount);
    } else {
        loyaltyDiscountDisplay.style.display = 'none';
        grandTotalSpan.textContent = formatCurrency(amounts.total);
    }

    deliveryRow.style.display = currentOrderType === 'delivery' ? 'contents' : 'none';
    finalizeButton.disabled = invoiceItems.length === 0;
}

function calculateTotals() {
    const subTotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let vat = 0, service = 0, delivery = 0;
    const settingsSuffix = currentOrderType === 'delivery' ? 'Delivery' : 'DineIn';
    if (appSettings[`vatType${settingsSuffix}`] === 'percentage') { vat = subTotal * (parseFloat(appSettings[`vatValue${settingsSuffix}`]) / 100); } else { vat = parseFloat(appSettings[`vatValue${settingsSuffix}`]) || 0; }
    if (appSettings[`serviceType${settingsSuffix}`] === 'percentage') { service = subTotal * (parseFloat(appSettings[`serviceValue${settingsSuffix}`]) / 100); } else { service = parseFloat(appSettings[`serviceValue${settingsSuffix}`]) || 0; }
    if (currentOrderType === 'delivery') { delivery = parseFloat(appSettings.deliveryFee) || 0; }
    const total = subTotal + vat + service + delivery;
    return { subTotal, vat, service, delivery, total };
}

function calculateLoyaltyDiscount(currentTotal) {
    const pointsEarnRate = parseFloat(appSettings.pointsEarnRate) || 0;
    const pointsRedeemValue = parseFloat(appSettings.pointsRedeemValue) || 0;

    if (pointsEarnRate <= 0 || pointsRedeemValue <= 0 || !currentCustomerData.loyalty_points || currentCustomerData.loyalty_points <= 0) {
        applyLoyaltyDiscountCheckbox.checked = false;
        applyLoyaltyDiscountCheckbox.disabled = true;
        loyaltyDiscountApplied = false;
        return 0;
    }

    applyLoyaltyDiscountCheckbox.disabled = false;

    const maxDiscountFromPoints = currentCustomerData.loyalty_points * pointsRedeemValue;

    return Math.min(maxDiscountFromPoints, currentTotal);
}

async function finalizeSale() {
    const activeShift = window.AppState.getActiveShift();
    const currentUser = window.AppState.getCurrentUser();
    if (!activeShift || !currentUser) { Swal.fire('خطأ', 'لا توجد وردية مفتوحة أو أن بيانات المستخدم غير متاحة.', 'error'); return; }

    const { value: paymentMethod } = await Swal.fire({ title: 'اختر طريقة الدفع', input: 'radio', inputOptions: { 'Cash': 'نقدي', 'Card': 'بطاقة' }, inputValidator: (value) => !value && 'يجب اختيار طريقة الدفع!', confirmButtonText: 'متابعة', cancelButtonText: 'إلغاء', showCancelButton: true });
    if (!paymentMethod) return;

    let customerDataForSale = { id: null, name: null, phone: null, address: null };

    if (currentOrderType === 'delivery') {
        const customerName = customerNameInput.value.trim();
        const customerPhone = customerPhoneInput.value.trim();
        const customerAddress = document.getElementById('customer-address')?.value.trim();
        if (!customerName || !customerPhone || !customerAddress) {
            Swal.fire('بيانات ناقصة', 'لطلبات التوصيل، يجب إدخال اسم ورقم هاتف وعنوان العميل أولاً.', 'error');
            return;
        }
        customerDataForSale = {
            id: currentCustomerData.id || null,
            name: customerName,
            phone: customerPhone,
            address: customerAddress
        };
    } else { // dine-in
        const dineInName = dineInCustomerNameInput.value.trim();
        const dineInPhone = dineInCustomerPhoneInput.value.trim();
        if (dineInName || dineInPhone) {
            customerDataForSale = {
                id: currentCustomerData.id || null,
                name: dineInName,
                phone: dineInPhone
            };
        }
    }

    const amounts = calculateTotals();
    let totalAmountAfterDiscount = amounts.total;
    let pointsUsed = 0;
    let loyaltyDiscountAmount = 0;

    if (loyaltyDiscountApplied) {
        loyaltyDiscountAmount = calculateLoyaltyDiscount(amounts.total);
        totalAmountAfterDiscount = amounts.total - loyaltyDiscountAmount;

        const pointsRedeemValue = parseFloat(appSettings.pointsRedeemValue) || 0;
        if (pointsRedeemValue > 0) {
            pointsUsed = Math.round(loyaltyDiscountAmount / pointsRedeemValue);
        }
    }

    // الحصول على معرف البائع المختار
    const selectedSalespersonId = salespersonSelect.value ? parseInt(salespersonSelect.value) : null;

    const saleData = {
        type: currentOrderType,
        items: invoiceItems,
        amounts: { ...amounts, total: totalAmountAfterDiscount, loyaltyDiscount: loyaltyDiscountAmount }, // إرسال الإجمالي بعد الخصم وقيمة الخصم
        paymentMethod,
        userId: currentUser.id,
        shiftId: activeShift.id,
        salespersonId: selectedSalespersonId, // إضافة معرف البائع إلى بيانات البيع
        customer: customerDataForSale,
        transactionRef: null,
        pointsUsed: pointsUsed
    };

    try {
        const result = await window.api.finalizeSale(saleData);
        if (result.success) {
            window.api.playSound('sale-complete');
            Swal.fire('تم!', 'اكتملت عملية البيع بنجاح.', 'success');
            const invoiceHtml = generateInvoiceHTML(result.saleDetails, result.saleItems, appSettings, loyaltyDiscountAmount);
            showPreviewModal(`فاتورة رقم ${result.saleId}`, invoiceHtml);
            clearInvoice();
        } else {
             Swal.fire('خطأ', `فشلت عملية البيع: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error("Sale finalization failed:", error);
        Swal.fire('خطأ فادح', 'فشلت عملية البيع.', 'error');
    }
}

function clearInvoice() {
    invoiceItems = [];
    currentCustomerData = {};
    dineInCustomerNameInput.value = '';
    dineInCustomerPhoneInput.value = '';
    customerPhoneInput.value = '';
    customerNameInput.value = '';
    customerSearchResultsDiv.innerHTML = '';
    customerSearchResultsDiv.style.display = 'none';
    addressSelectionContainer.innerHTML = '<label for="customer-address">العنوان</label><input type="text" id="customer-address" required>';

    loyaltyPointsSection.style.display = 'none';
    customerLoyaltyPointsSpan.textContent = '0 نقطة';
    applyLoyaltyDiscountCheckbox.checked = false;
    applyLoyaltyDiscountCheckbox.disabled = true;
    loyaltyDiscountApplied = false;
    loyaltyDiscountDisplay.style.display = 'none';

    // مسح اختيار البائع
    if (salespersonSelect) {
        salespersonSelect.value = ''; // إعادة تعيين إلى الخيار الافتراضي
    }

    updateInvoice();
}

function setOrderType(type) {
    currentOrderType = type;
    document.querySelectorAll('#order-type-selector .btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
    dineInCustomerForm.style.display = type === 'dine-in' ? 'block' : 'none';
    deliveryCustomerForm.style.display = type === 'delivery' ? 'block' : 'none';
    clearInvoice();
}

function updateItemQuantityFromInput(inputElement) {
    const itemIndex = parseInt(inputElement.dataset.itemIndex);
    const item = invoiceItems[itemIndex];
    if (item) {
        let newQuantity = parseInt(inputElement.value);
        if (isNaN(newQuantity) || newQuantity <= 0) {
            newQuantity = 1;
            inputElement.value = 1;
        }
        item.quantity = newQuantity;
        updateInvoice();
    }
}

function openNoteModal(itemIndex) {
    currentNoteItemIndex = itemIndex;
    const item = invoiceItems[itemIndex];
    if (item) {
        noteInput.value = item.note || '';
        noteModal.style.display = 'flex';
    }
}

function closeNoteModal() {
    noteModal.style.display = 'none';
    noteInput.value = '';
    currentNoteItemIndex = -1;
}

function saveNote() {
    if (currentNoteItemIndex !== -1) {
        const item = invoiceItems[currentNoteItemIndex];
        if (item) {
            item.note = noteInput.value.trim();
            updateInvoice(); 
        }
    }
    closeNoteModal();
}

function setupEventListeners() {
    searchBar.addEventListener('input', () => {
        const searchTerm = searchBar.value.toLowerCase();
        const filtered = allProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.barcode?.toLowerCase().includes(searchTerm) ||
            p.shortcut_key?.toLowerCase().includes(searchTerm) ||
            (p.icon_name && p.icon_name.toLowerCase().includes(searchTerm))
        );
        renderProducts(filtered);
    });

    document.body.addEventListener('click', (e) => {
        const target = e.target;

        if (target.classList.contains('quantity-btn')) {
            e.stopPropagation();
            const itemIndex = parseInt(target.dataset.itemIndex);
            const action = target.dataset.action;
            const item = invoiceItems[itemIndex];
            if (item) {
                if (action === 'increase') item.quantity++;
                if (action === 'decrease') item.quantity--;
                if (item.quantity <= 0) {
                    invoiceItems.splice(itemIndex, 1); 
                }
                updateInvoice();
            }
            return;
        }

        if (target.closest('.note-icon-container')) {
            e.stopPropagation();
            const itemIndex = parseInt(target.closest('.note-icon-container').dataset.itemIndex);
            openNoteModal(itemIndex);
            return;
        }

        if (target.classList.contains('close-button')) {
            closeNoteModal();
            return;
        }

        if (target.id === 'save-note-btn') {
            saveNote();
            return;
        }

        const button = target.closest('button');
        if (button) {
            if (button.id === 'cancel-order-btn') clearInvoice();
            if (button.id === 'finalize-button') finalizeSale();
            if (button.closest('#order-type-selector')) setOrderType(button.dataset.type);
        }

        const searchResultItem = target.closest('.customer-search-result');
        if (searchResultItem) {
            const selectedCustomer = JSON.parse(searchResultItem.dataset.customer);
            selectCustomer(selectedCustomer);
        }
    });

    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('item-quantity-input')) {
            updateItemQuantityFromInput(target);
        }
    });

    document.body.addEventListener('keydown', (e) => {
        const target = e.target;
        if (target.classList.contains('item-quantity-input') && e.key === 'Enter') {
            updateItemQuantityFromInput(target);
            target.blur();
        }
        if (e.key === 'Escape' && noteModal.style.display === 'flex') {
            closeNoteModal();
        }
    });

    customerPhoneInput.addEventListener('input', handleCustomerPhoneInput);
    dineInCustomerPhoneInput.addEventListener('input', handleCustomerPhoneInput);

    applyLoyaltyDiscountCheckbox.addEventListener('change', () => {
        loyaltyDiscountApplied = applyLoyaltyDiscountCheckbox.checked;
        updateInvoice();
    });
}

async function handleCustomerPhoneInput(e) {
    const phoneInput = e.target;
    const phoneQuery = phoneInput.value.trim();

    if (phoneQuery.length < 3) {
        customerSearchResultsDiv.style.display = 'none';
        currentCustomerData = {};
        if (phoneInput.id === 'customer-phone') {
            customerNameInput.value = '';
        } else {
            dineInCustomerNameInput.value = '';
        }
        if (phoneInput.id === 'customer-phone') {
            dineInCustomerPhoneInput.value = '';
        } else {
            customerPhoneInput.value = '';
        }

        loyaltyPointsSection.style.display = 'none';
        applyLoyaltyDiscountCheckbox.checked = false;
        applyLoyaltyDiscountCheckbox.disabled = true;
        loyaltyDiscountApplied = false;
        updateInvoice();
        return;
    }

    try {
        const results = await window.api.searchCustomers(phoneQuery);
        if (results.length > 0) {
            renderCustomerSearchResults(results);
        } else {
            customerSearchResultsDiv.style.display = 'none';
            currentCustomerData = {};
            if (phoneInput.id === 'customer-phone') {
                customerNameInput.value = '';
            } else {
                dineInCustomerNameInput.value = '';
            }
            if (phoneInput.id === 'customer-phone') {
                dineInCustomerPhoneInput.value = '';
            } else {
                customerPhoneInput.value = '';
            }

            loyaltyPointsSection.style.display = 'none';
            applyLoyaltyDiscountCheckbox.checked = false;
            applyLoyaltyDiscountCheckbox.disabled = true;
            loyaltyDiscountApplied = false;
            updateInvoice();
        }
    } catch (error) {
        console.error('Customer search failed:', error);
        customerSearchResultsDiv.style.display = 'none';
    }
}


function renderCustomerSearchResults(results) {
    if (results.length === 0) {
        customerSearchResultsDiv.style.display = 'none';
        return;
    }
    customerSearchResultsDiv.innerHTML = results.map(cust => `
        <div class="customer-search-result" data-id="${cust.id}" data-customer='${JSON.stringify(cust)}'>
            <strong>${cust.name}</strong> - ${cust.phone}
        </div>`).join('');
    customerSearchResultsDiv.style.display = 'block';
}

async function selectCustomer(customer) {
    currentCustomerData = customer;

    customerNameInput.value = customer.name;
    customerPhoneInput.value = customer.phone;
    dineInCustomerNameInput.value = customer.name;
    dineInCustomerPhoneInput.value = customer.phone;

    customerSearchResultsDiv.style.display = 'none';

    customerLoyaltyPointsSpan.textContent = `${customer.loyalty_points || 0} نقطة`;
    loyaltyPointsSection.style.display = 'block';
    applyLoyaltyDiscountCheckbox.checked = false;
    loyaltyDiscountApplied = false;
    loyaltyDiscountDisplay.style.display = 'none';
    updateInvoice();

    addressSelectionContainer.innerHTML = '<div class="loader-sm"></div>';
    try {
        const addresses = await window.api.getCustomerAddresses(customer.id);
        if (addresses.length > 0) {
            const options = addresses.map(addr => `<option value="${addr.address}" ${addr.is_default ? 'selected' : ''}>${addr.address}</option>`).join('');
            addressSelectionContainer.innerHTML = `
                <label for="customer-address">اختر عنوانًا أو أدخل جديدًا</label>
                <select id="customer-address-select" class="form-input">${options}</select>
                <input type="text" id="customer-address" class="form-input" placeholder="أو أدخل عنوانًا جديدًا هنا" value="${addresses.find(a => a.is_default)?.address || ''}">`;

            document.getElementById('customer-address-select').addEventListener('change', (e) => {
                document.getElementById('customer-address').value = e.target.value;
            });
        } else {
             addressSelectionContainer.innerHTML = '<label for="customer-address">العنوان</label><input type="text" id="customer-address" required>';
        }
    } catch (error) {
        console.error('Failed to get customer addresses:', error);
        addressSelectionContainer.innerHTML = '<label for="customer-address">العنوان (حدث خطأ)</label><input type="text" id="customer-address" required>';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: appSettings.currency || 'EGP' }).format(amount || 0);
}

function showPreviewModal(title, htmlContent) {
    Swal.fire({
        title: title,
        html: htmlContent,
        width: '800px',
        showCloseButton: true,
        confirmButtonText: '<i class="fa-solid fa-print"></i> طباعة',
        confirmButtonColor: '#2563eb',
        denyButtonText: 'إغلاق',
        showDenyButton: true,
    }).then((result) => {
        if (result.isConfirmed) {
            printModalContent(htmlContent);
        }
    });
}

function printModalContent(htmlContent) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow.document;
    const allCSS = Array.from(document.styleSheets).map(sheet => { try { return sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` : `<style>${Array.from(sheet.cssRules).map(rule => rule.cssText).join('')}</style>`; } catch (e) { if (sheet.href) return `<link rel="stylesheet" href="${sheet.href}">`; return ''; } }).join('');
    iframeDoc.open();
    iframeDoc.write(`<html><head><title>طباعة</title>${allCSS}<style>@media print{body{-webkit-print-color-adjust: exact;}.receipt-box{margin:0;border:none;box-shadow:none;}}</style></head><body dir="rtl" onload="window.focus();window.print();">${htmlContent}</body></html>`);
    iframeDoc.close();
    setTimeout(() => { document.body.removeChild(iframe); }, 2000);
}
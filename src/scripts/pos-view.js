import { generateInvoiceHTML } from './invoice-template.js';

// تعريف المتغيرات العامة للواجهة
let allProducts = [], invoiceItems = [], allCategories = [], currentOrderType = 'dine-in', currentCustomerData = {}, appSettings = {};
let productGrid, searchBar, invoiceItemsDiv, subTotalSpan, vatTotalSpan, serviceTotalSpan, deliveryRow, deliveryTotalSpan, grandTotalSpan, finalizeButton, cancelOrderBtn, orderTypeSelector, dineInCustomerForm, deliveryCustomerForm, dineInCustomerNameInput, dineInCustomerPhoneInput, customerPhoneInput, customerNameInput, customerSearchResultsDiv;
let salespersonSelect, categoryFilterBar;

// متغيرات قسم الملاحظات
let noteModal, noteInput, saveNoteBtn, currentNoteItemIndex = -1;

// متغيرات قسم الخصم على الفاتورة
let invoiceDiscount = { type: 'none', value: 0 };
let manualDiscountModal, openInvoiceDiscountBtn, manualDiscountTypeSelect, manualDiscountInput, applyManualDiscountBtn, manualDiscountRow, manualDiscountSpan, closeManualDiscountModalBtn;

// [تعديل 4]: متغيرات جديدة لنافذة الخصم على المنتج
let itemDiscountModal, closeItemDiscountModalBtn, applyItemDiscountBtn, itemDiscountTypeSelect, itemDiscountInput, discountItemIdInput;
let currentDiscountItemIndex = -1;

// [تعديل 6]: متغيرات جديدة لإدارة العناوين
let addressManagementSection, customerAddressSelect, addNewAddressBtn, newAddressContainer, newCustomerAddressInput;

// [تعديل 5]: متغيرات جديدة لنقاط الولاء
let loyaltyPointsSection, customerLoyaltyPointsSpan, applyLoyaltyDiscountCheckbox, loyaltyDiscountDisplay, loyaltyDiscountValueSpan;
let earnedPointsSection, earnedPointsValueSpan;
let loyaltyDiscountApplied = false;

/**
 * دالة التهيئة الرئيسية للواجهة
 */
export function init(settings) {
    appSettings = settings;
    getDomElements();
    setupEventListeners();
    loadInitialData();
}

/**
 * تحميل البيانات الأولية مثل المنتجات والفئات
 */
async function loadInitialData() {
    await loadCategoriesAndProducts();
    await loadSalespersonsIntoDropdown();
    setOrderType('dine-in');
    focusSearchBar();
}

/**
 * ربط متغيرات الجافاسكريبت بعناصر الواجهة الرسومية
 */
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
    salespersonSelect = document.getElementById('salesperson-select');
    categoryFilterBar = document.getElementById('category-filter-bar');

    // عناصر الملاحظات
    noteModal = document.getElementById('note-modal');
    noteInput = document.getElementById('note-input');
    saveNoteBtn = document.getElementById('save-note-btn');

    // عناصر خصم الفاتورة
    manualDiscountModal = document.getElementById('manual-invoice-discount-modal');
    openInvoiceDiscountBtn = document.getElementById('open-invoice-discount-modal-btn');
    closeManualDiscountModalBtn = document.getElementById('close-manual-discount-modal');
    manualDiscountTypeSelect = document.getElementById('manual-discount-type');
    manualDiscountInput = document.getElementById('manual-discount-input');
    applyManualDiscountBtn = document.getElementById('apply-manual-discount-btn');
    manualDiscountRow = document.getElementById('manual-discount-row');
    manualDiscountSpan = document.getElementById('manual-discount-value');

    // [تعديل 4]: ربط عناصر نافذة الخصم على المنتج
    itemDiscountModal = document.getElementById('item-discount-modal');
    closeItemDiscountModalBtn = document.getElementById('close-item-discount-modal');
    applyItemDiscountBtn = document.getElementById('apply-item-discount-btn');
    itemDiscountTypeSelect = document.getElementById('item-discount-type');
    itemDiscountInput = document.getElementById('item-discount-input');
    discountItemIdInput = document.getElementById('discount-item-id');

    // [تعديل 6]: ربط عناصر إدارة العناوين
    addressManagementSection = document.getElementById('address-management-section');
    customerAddressSelect = document.getElementById('customer-address-select');
    addNewAddressBtn = document.getElementById('add-new-address-btn');
    newAddressContainer = document.getElementById('new-address-container');
    newCustomerAddressInput = document.getElementById('new-customer-address');

    // [تعديل 5]: ربط عناصر نقاط الولاء
    loyaltyPointsSection = document.getElementById('loyalty-points-section');
    customerLoyaltyPointsSpan = document.getElementById('customer-loyalty-points');
    applyLoyaltyDiscountCheckbox = document.getElementById('apply-loyalty-discount');
    loyaltyDiscountDisplay = document.getElementById('loyalty-discount-display');
    loyaltyDiscountValueSpan = document.getElementById('loyalty-discount-value');
    earnedPointsSection = document.getElementById('earned-points-section');
    earnedPointsValueSpan = document.getElementById('earned-points-value');
}

/**
 * إعداد مستمعي الأحداث لجميع العناصر التفاعلية
 */
function setupEventListeners() {
    // بحث المنتجات وفلترتها
    searchBar.addEventListener('input', handleProductSearch);
    categoryFilterBar.addEventListener('click', handleCategoryFilter);

    // أزرار الفاتورة الرئيسية
    cancelOrderBtn.addEventListener('click', clearInvoice);
    finalizeButton.addEventListener('click', finalizeSale);
    orderTypeSelector.addEventListener('click', (e) => {
        if (e.target.matches('button')) setOrderType(e.target.dataset.type);
    });

    // التفاعل مع قائمة المنتجات في الفاتورة (زيادة، نقصان، ملاحظات، خصم)
    invoiceItemsDiv.addEventListener('click', handleInvoiceItemInteraction);
    invoiceItemsDiv.addEventListener('change', (e) => {
        if (e.target.classList.contains('item-quantity-input')) {
            updateItemQuantityFromInput(e.target);
        }
    });

    // نوافذ Modals (ملاحظات، خصم فاتورة، خصم منتج)
    noteModal.querySelector('.close-button').addEventListener('click', closeNoteModal);
    saveNoteBtn.addEventListener('click', saveNote);
    
    openInvoiceDiscountBtn.addEventListener('click', openInvoiceDiscountModal);
    closeManualDiscountModalBtn.addEventListener('click', () => manualDiscountModal.style.display = 'none');
    applyManualDiscountBtn.addEventListener('click', applyInvoiceDiscount);

    // [تعديل 4]: مستمعي أحداث نافذة خصم المنتج
    closeItemDiscountModalBtn.addEventListener('click', closeItemDiscountModal);
    applyItemDiscountBtn.addEventListener('click', applyItemDiscount);

    // بحث العملاء ونقاط الولاء
    customerPhoneInput.addEventListener('input', handleCustomerPhoneInput);
    dineInCustomerPhoneInput.addEventListener('input', handleCustomerPhoneInput);
    customerSearchResultsDiv.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.customer-search-result');
        if (resultItem) {
            selectCustomer(JSON.parse(resultItem.dataset.customer));
        }
    });
    applyLoyaltyDiscountCheckbox.addEventListener('change', () => {
        loyaltyDiscountApplied = applyLoyaltyDiscountCheckbox.checked;
        updateInvoice();
    });

    // [تعديل 6]: مستمعي أحداث قسم العناوين
    addNewAddressBtn.addEventListener('click', () => {
        newAddressContainer.style.display = 'block';
        newCustomerAddressInput.focus();
    });
    customerAddressSelect.addEventListener('change', () => {
        if (customerAddressSelect.value === 'add_new') {
            newAddressContainer.style.display = 'block';
            newCustomerAddressInput.value = '';
            newCustomerAddressInput.focus();
        } else {
            newAddressContainer.style.display = 'none';
            newCustomerAddressInput.value = customerAddressSelect.value;
        }
    });
}

// --- دوال تحميل البيانات ---
async function loadCategoriesAndProducts() {
    try {
        [allCategories, allProducts] = await Promise.all([
            window.api.getCategories(),
            window.api.getProducts()
        ]);
        renderCategoryFilterButtons();
        renderProducts(allProducts);
    } catch (error) {
        console.error("Failed to load initial data:", error);
        Swal.fire('خطأ', 'فشل تحميل الفئات أو المنتجات.', 'error');
    }
}

async function loadSalespersonsIntoDropdown() {
    try {
        const response = await window.api.getAllSalespersons();
        if (response.success && salespersonSelect) {
            salespersonSelect.innerHTML = '<option value="">-- لا يوجد بائع --</option>';
            response.data.forEach(sp => {
                if (sp.is_active) {
                    const option = new Option(sp.name, sp.id);
                    salespersonSelect.add(option);
                }
            });
        }
    } catch (error) {
        console.error("Error loading salespersons:", error);
    }
}

// --- دوال عرض وتحديث الواجهة ---
function renderCategoryFilterButtons() {
    categoryFilterBar.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'btn active';
    allBtn.textContent = 'الكل';
    allBtn.dataset.categoryId = 'all';
    categoryFilterBar.appendChild(allBtn);

    allCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = cat.name;
        btn.dataset.categoryId = cat.id;
        categoryFilterBar.appendChild(btn);
    });
}

function renderProducts(productsToRender) {
    productGrid.innerHTML = '';
    productsToRender.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = p.id;
        
        let displayContent;
        if (p.icon_name) {
            displayContent = `<div class="product-icon-large"><i class="fa-solid ${p.icon_name}"></i></div>`;
        } else if (p.image_path) {
            displayContent = `<img src="${p.image_path}" alt="${p.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x80/f0f4f8/1e293b?text=?';">`;
        } else {
            displayContent = `<img src="https://placehold.co/100x80/f0f4f8/1e293b?text=${p.name.charAt(0)}" alt="${p.name}">`;
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

function updateInvoice() {
    // عرض المنتجات في الفاتورة
    if (invoiceItems.length === 0) {
        invoiceItemsDiv.innerHTML = `<p class="empty-invoice">الفاتورة فارغة</p>`;
    } else {
        invoiceItemsDiv.innerHTML = invoiceItems.map((item, index) => {
            const itemSubtotal = item.price * item.quantity;
            let itemDiscountAmount = 0;
            if (item.manual_discount.type === 'fixed') {
                itemDiscountAmount = item.manual_discount.value;
            } else if (item.manual_discount.type === 'percentage') {
                itemDiscountAmount = itemSubtotal * (item.manual_discount.value / 100);
            }
            const itemFinalTotal = itemSubtotal - itemDiscountAmount;

            return `
            <div class="invoice-item" data-item-index="${index}">
                <div class="item-details">
                    <span class="item-name">${item.name}</span>
                    ${item.note ? `<span class="item-note-text">${item.note}</span>` : ''}
                    <span class="item-price">${formatCurrency(item.price)}</span>
                     ${item.manual_discount.type !== 'none' ? `<span class="item-discount-text">
                        خصم: ${item.manual_discount.type === 'percentage' ? `${item.manual_discount.value}%` : formatCurrency(itemDiscountAmount)}
                    </span>` : ''}
                </div>
                <div class="item-quantity">
                    <button class="quantity-btn" data-action="decrease" data-item-index="${index}">-</button>
                    <input type="number" class="item-quantity-input" value="${item.quantity}" min="1" data-item-index="${index}">
                    <button class="quantity-btn" data-action="increase" data-item-index="${index}">+</button>
                </div>
                <div class="item-total">${formatCurrency(itemFinalTotal)}</div>
                <div class="item-actions">
                    <button class="btn-icon note-icon-container ${item.note ? 'has-note' : ''}" data-action="note" title="إضافة ملاحظة">
                        <i class="fa-solid fa-note-sticky"></i>
                    </button>
                    <button class="btn-icon discount-icon-container ${item.manual_discount.type !== 'none' ? 'has-discount' : ''}" data-action="discount" title="خصم على المنتج">
                        <i class="fa-solid fa-tags"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    // حساب وعرض المجاميع
    const amounts = calculateTotals();
    subTotalSpan.textContent = formatCurrency(amounts.subTotal);
    vatTotalSpan.textContent = formatCurrency(amounts.vat);
    serviceTotalSpan.textContent = formatCurrency(amounts.service);
    deliveryTotalSpan.textContent = formatCurrency(amounts.delivery);
    deliveryRow.style.display = currentOrderType === 'delivery' ? 'contents' : 'none';

    // عرض الخصم على الفاتورة
    if (manualDiscountRow) {
        if (amounts.invoiceDiscountAmount > 0) {
            manualDiscountRow.style.display = 'grid'; // Use grid for correct alignment
            manualDiscountSpan.textContent = `-${formatCurrency(amounts.invoiceDiscountAmount)}`;
        } else {
            manualDiscountRow.style.display = 'none';
        }
    }
    
    // عرض خصم نقاط الولاء
    const loyaltyDiscount = calculateLoyaltyDiscount(amounts.totalAfterInvoiceDiscount);
    if (loyaltyDiscountApplied && loyaltyDiscount > 0) {
        loyaltyDiscountDisplay.style.display = 'block';
        loyaltyDiscountValueSpan.textContent = formatCurrency(loyaltyDiscount);
        grandTotalSpan.textContent = formatCurrency(amounts.finalTotal - loyaltyDiscount);
    } else {
        loyaltyDiscountDisplay.style.display = 'none';
        grandTotalSpan.textContent = formatCurrency(amounts.finalTotal);
    }

    // [تعديل 5]: عرض النقاط المكتسبة
    if (earnedPointsSection && currentCustomerData.id) {
        earnedPointsSection.style.display = 'flex';
        const pointsValue = formatCurrency(amounts.earnedPoints * (parseFloat(appSettings.pointsRedeemValue) || 0));
        earnedPointsValueSpan.textContent = `${amounts.earnedPoints} نقطة (تساوي ${pointsValue})`;
    } else if (earnedPointsSection) {
        earnedPointsSection.style.display = 'none';
    }

    // تفعيل/تعطيل الأزرار
    finalizeButton.disabled = invoiceItems.length === 0;
    // [تعديل 3]: إظهار زر خصم الفاتورة دائماً طالما توجد منتجات
    openInvoiceDiscountBtn.style.display = invoiceItems.length > 0 ? 'inline-flex' : 'none';
}

// --- دوال الحسابات ---
function calculateTotals() {
    const subTotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const itemDiscountsTotal = invoiceItems.reduce((sum, item) => {
        const itemSubtotal = item.price * item.quantity;
        if (item.manual_discount.type === 'fixed') return sum + item.manual_discount.value;
        if (item.manual_discount.type === 'percentage') return sum + (itemSubtotal * (item.manual_discount.value / 100));
        return sum;
    }, 0);

    const subTotalAfterItemDiscounts = subTotal - itemDiscountsTotal;

    let invoiceDiscountAmount = 0;
    if (invoiceDiscount.type === 'fixed') {
        invoiceDiscountAmount = invoiceDiscount.value;
    } else if (invoiceDiscount.type === 'percentage') {
        invoiceDiscountAmount = subTotalAfterItemDiscounts * (invoiceDiscount.value / 100);
    }
    
    const totalAfterInvoiceDiscount = subTotalAfterItemDiscounts - invoiceDiscountAmount;

    const settingsSuffix = currentOrderType === 'delivery' ? 'Delivery' : 'DineIn';
    let vat = 0, service = 0, delivery = 0;
    if (appSettings[`vatType${settingsSuffix}`] === 'percentage') {
        vat = totalAfterInvoiceDiscount * (parseFloat(appSettings[`vatValue${settingsSuffix}`]) / 100);
    }
    if (appSettings[`serviceType${settingsSuffix}`] === 'percentage') {
        service = totalAfterInvoiceDiscount * (parseFloat(appSettings[`serviceValue${settingsSuffix}`]) / 100);
    }
    if (currentOrderType === 'delivery') {
        delivery = parseFloat(appSettings.deliveryFee) || 0;
    }
    
    const finalTotal = totalAfterInvoiceDiscount + vat + service + delivery;

    // [تعديل 5]: حساب النقاط المكتسبة
    let earnedPoints = 0;
    if (currentCustomerData.id && appSettings.pointsEarnRate > 0) {
        earnedPoints = Math.floor(finalTotal * appSettings.pointsEarnRate);
    }
    
    return {
        subTotal: subTotal,
        vat,
        service,
        delivery,
        invoiceDiscountAmount,
        totalAfterInvoiceDiscount,
        finalTotal,
        earnedPoints
    };
}

function calculateLoyaltyDiscount(currentTotal) {
    const pointsRedeemValue = parseFloat(appSettings.pointsRedeemValue) || 0;
    if (pointsRedeemValue <= 0 || !currentCustomerData.loyalty_points || currentCustomerData.loyalty_points <= 0) {
        applyLoyaltyDiscountCheckbox.checked = false;
        applyLoyaltyDiscountCheckbox.disabled = true;
        loyaltyDiscountApplied = false;
        return 0;
    }
    applyLoyaltyDiscountCheckbox.disabled = false;
    const maxDiscountFromPoints = currentCustomerData.loyalty_points * pointsRedeemValue;
    return Math.min(maxDiscountFromPoints, currentTotal);
}

// --- دوال التفاعل مع الفاتورة ---
function addProductToInvoice(productId) {
    if (!window.AppState.getActiveShift()) {
        Swal.fire('لا توجد وردية مفتوحة!', 'يجب بدء وردية جديدة قبل إضافة المنتجات.', 'warning');
        return;
    }
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    window.api.playSound('add-to-cart');
    const existingItem = invoiceItems.find(item => item.id === productId && !item.note && item.manual_discount.type === 'none');
    if (existingItem) {
        existingItem.quantity++;
    } else {
        invoiceItems.push({ ...product, quantity: 1, note: '', manual_discount: { type: 'none', value: 0 } });
    }
    updateInvoice();
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

function handleInvoiceItemInteraction(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const itemIndex = parseInt(button.closest('.invoice-item').dataset.itemIndex);
    const item = invoiceItems[itemIndex];

    if (!item) return;

    switch (action) {
        case 'increase':
            item.quantity++;
            break;
        case 'decrease':
            item.quantity--;
            if (item.quantity <= 0) {
                invoiceItems.splice(itemIndex, 1);
            }
            break;
        case 'note':
            openNoteModal(itemIndex);
            break;
        case 'discount':
            // [تعديل 4]: استدعاء الدالة الجديدة لفتح نافذة الخصم
            openItemDiscountModal(itemIndex);
            break;
    }
    updateInvoice();
}

function clearInvoice() {
    invoiceItems = [];
    currentCustomerData = {};
    invoiceDiscount = { type: 'none', value: 0 };
    loyaltyDiscountApplied = false;

    // إعادة تعيين حقول العملاء
    dineInCustomerNameInput.value = '';
    dineInCustomerPhoneInput.value = '';
    customerPhoneInput.value = '';
    customerNameInput.value = '';
    customerSearchResultsDiv.style.display = 'none';

    // [تعديل 6]: إعادة تعيين قسم العناوين
    customerAddressSelect.innerHTML = '';
    newAddressContainer.style.display = 'none';
    newCustomerAddressInput.value = '';

    // إعادة تعيين قسم الولاء
    loyaltyPointsSection.style.display = 'none';
    applyLoyaltyDiscountCheckbox.checked = false;
    applyLoyaltyDiscountCheckbox.disabled = true;
    
    if (salespersonSelect) salespersonSelect.value = '';

    updateInvoice();
    focusSearchBar();
}

// --- دوال النوافذ المنبثقة (Modals) ---

// ملاحظات المنتج
function openNoteModal(itemIndex) {
    currentNoteItemIndex = itemIndex;
    const item = invoiceItems[itemIndex];
    if (item) {
        noteInput.value = item.note || '';
        noteModal.style.display = 'flex';
        noteInput.focus();
    }
}

function closeNoteModal() {
    noteModal.style.display = 'none';
}

function saveNote() {
    if (currentNoteItemIndex !== -1) {
        const item = invoiceItems[currentNoteItemIndex];
        if (item) item.note = noteInput.value.trim();
        updateInvoice();
    }
    closeNoteModal();
}

// خصم الفاتورة
function openInvoiceDiscountModal() {
    manualDiscountTypeSelect.value = invoiceDiscount.type !== 'none' ? invoiceDiscount.type : 'fixed';
    manualDiscountInput.value = invoiceDiscount.value;
    manualDiscountModal.style.display = 'flex';
    manualDiscountInput.focus();
}

function applyInvoiceDiscount() {
    const value = parseFloat(manualDiscountInput.value);
    const type = manualDiscountTypeSelect.value;
    const { subTotal } = calculateTotals();

    if (isNaN(value) || value < 0) {
        Swal.fire('خطأ', 'قيمة الخصم غير صالحة.', 'error');
        return;
    }
    if (type === 'percentage' && value > 100) {
        Swal.fire('خطأ', 'النسبة المئوية لا يمكن أن تزيد عن 100%.', 'error');
        return;
    }
    if (type === 'fixed' && value > subTotal) {
        Swal.fire('خطأ', 'الخصم الثابت لا يمكن أن يكون أكبر من الإجمالي.', 'error');
        return;
    }

    invoiceDiscount = { type, value };
    manualDiscountModal.style.display = 'none';
    updateInvoice();
}

// [تعديل 4]: دوال نافذة الخصم على المنتج
function openItemDiscountModal(itemIndex) {
    currentDiscountItemIndex = itemIndex;
    const item = invoiceItems[itemIndex];
    if (item) {
        itemDiscountModal.querySelector('h2').textContent = `خصم على "${item.name}"`;
        itemDiscountTypeSelect.value = item.manual_discount.type !== 'none' ? item.manual_discount.type : 'fixed';
        itemDiscountInput.value = item.manual_discount.value;
        itemDiscountModal.style.display = 'flex';
        itemDiscountInput.focus();
    }
}

function closeItemDiscountModal() {
    itemDiscountModal.style.display = 'none';
    currentDiscountItemIndex = -1;
}

function applyItemDiscount() {
    if (currentDiscountItemIndex === -1) return;
    
    const item = invoiceItems[currentDiscountItemIndex];
    if (!item) return;

    const value = parseFloat(itemDiscountInput.value);
    const type = itemDiscountTypeSelect.value;
    const itemTotal = item.price * item.quantity;

    if (isNaN(value) || value < 0) {
        Swal.fire('خطأ', 'قيمة الخصم غير صالحة.', 'error');
        return;
    }
    if (type === 'percentage' && value > 100) {
        Swal.fire('خطأ', 'النسبة المئوية لا يمكن أن تزيد عن 100%.', 'error');
        return;
    }
    if (type === 'fixed' && value > itemTotal) {
        Swal.fire('خطأ', 'الخصم الثابت لا يمكن أن يكون أكبر من إجمالي المنتج.', 'error');
        return;
    }
    
    item.manual_discount = { type, value };
    // عند تطبيق خصم على منتج، نزيل خصم الفاتورة الكلي
    invoiceDiscount = { type: 'none', value: 0 };
    
    closeItemDiscountModal();
    updateInvoice();
}

// --- دوال العملاء والعناوين ---
async function handleCustomerPhoneInput(e) {
    const phoneQuery = e.target.value.trim();
    if (phoneQuery.length < 3) {
        customerSearchResultsDiv.style.display = 'none';
        return;
    }
    try {
        const results = await window.api.searchCustomers(phoneQuery);
        renderCustomerSearchResults(results);
    } catch (error) {
        console.error('Customer search failed:', error);
    }
}

function renderCustomerSearchResults(results) {
    if (results.length > 0) {
        customerSearchResultsDiv.innerHTML = results.map(cust => `
            <div class="customer-search-result" data-customer='${JSON.stringify(cust)}'>
                <strong>${cust.name}</strong> - ${cust.phone}
            </div>`).join('');
        customerSearchResultsDiv.style.display = 'block';
    } else {
        customerSearchResultsDiv.style.display = 'none';
    }
}

async function selectCustomer(customer) {
    currentCustomerData = customer;
    customerPhoneInput.value = customer.phone;
    customerNameInput.value = customer.name;
    dineInCustomerPhoneInput.value = customer.phone;
    dineInCustomerNameInput.value = customer.name;
    customerSearchResultsDiv.style.display = 'none';

    // تحديث قسم الولاء
    customerLoyaltyPointsSpan.textContent = `${customer.loyalty_points || 0} نقطة`;
    loyaltyPointsSection.style.display = 'block';
    updateInvoice();

    // [تعديل 6]: تحديث قسم العناوين
    try {
        const addresses = await window.api.getCustomerAddresses(customer.id);
        customerAddressSelect.innerHTML = '<option value="" disabled selected>اختر عنوانًا محفوظًا</option>';
        addresses.forEach(addr => {
            const option = new Option(addr.address, addr.address, addr.is_default, addr.is_default);
            customerAddressSelect.add(option);
        });
        customerAddressSelect.add(new Option('إضافة عنوان جديد...', 'add_new'));
        
        if (addresses.some(a => a.is_default)) {
            newAddressContainer.style.display = 'none';
            newCustomerAddressInput.value = customerAddressSelect.value;
        } else {
             newAddressContainer.style.display = 'block';
             newCustomerAddressInput.value = '';
        }

    } catch (error) {
        console.error('Failed to get customer addresses:', error);
        customerAddressSelect.innerHTML = '<option value="">خطأ في تحميل العناوين</option>';
    }
}

// --- دوال مساعدة ---
function setOrderType(type) {
    currentOrderType = type;
    document.querySelectorAll('#order-type-selector .btn').forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
    dineInCustomerForm.style.display = type === 'dine-in' ? 'block' : 'none';
    deliveryCustomerForm.style.display = type === 'delivery' ? 'block' : 'none';
    clearInvoice();
}

function focusSearchBar() {
    if (searchBar) searchBar.focus();
}

function handleProductSearch() {
    const searchTerm = searchBar.value.trim().toLowerCase();
    const barcodeProduct = allProducts.find(p => p.barcode && p.barcode.toString() === searchTerm);
    if (barcodeProduct) {
        addProductToInvoice(barcodeProduct.id);
        searchBar.value = '';
        return;
    }
    const activeCategoryId = categoryFilterBar.querySelector('.btn.active').dataset.categoryId;
    const filtered = allProducts.filter(p =>
        (activeCategoryId === 'all' || p.category_id == activeCategoryId) &&
        (p.name.toLowerCase().includes(searchTerm) || (p.barcode && p.barcode.toString().includes(searchTerm)))
    );
    renderProducts(filtered);
}

function handleCategoryFilter(e) {
    const target = e.target.closest('button');
    if (!target) return;

    categoryFilterBar.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    searchBar.value = '';
    handleProductSearch();
    focusSearchBar();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: appSettings.currency || 'EGP' }).format(amount || 0);
}

// --- إتمام عملية البيع والطباعة ---
async function finalizeSale() {
    const activeShift = window.AppState.getActiveShift();
    const currentUser = window.AppState.getCurrentUser();
    if (!activeShift || !currentUser) {
        Swal.fire('خطأ', 'لا توجد وردية مفتوحة أو أن بيانات المستخدم غير متاحة.', 'error');
        return;
    }

    const { value: paymentMethod } = await Swal.fire({
        title: 'اختر طريقة الدفع',
        input: 'radio',
        inputOptions: { 'Cash': 'نقدي', 'Card': 'بطاقة' },
        inputValidator: (value) => !value && 'يجب اختيار طريقة الدفع!',
        confirmButtonText: 'متابعة',
        cancelButtonText: 'إلغاء',
        showCancelButton: true
    });
    if (!paymentMethod) return;

    let customerDataForSale = { id: currentCustomerData.id || null, name: null, phone: null, address: null };
    if (currentOrderType === 'delivery') {
        customerDataForSale.name = customerNameInput.value.trim();
        customerDataForSale.phone = customerPhoneInput.value.trim();
        customerDataForSale.address = newCustomerAddressInput.value.trim();
        if (!customerDataForSale.name || !customerDataForSale.phone || !customerDataForSale.address) {
            Swal.fire('بيانات ناقصة', 'لطلبات التوصيل، يجب إدخال اسم ورقم هاتف وعنوان العميل.', 'error');
            return;
        }
    } else { // dine-in
        customerDataForSale.name = dineInCustomerNameInput.value.trim();
        customerDataForSale.phone = dineInCustomerPhoneInput.value.trim();
    }

    const amounts = calculateTotals();
    let loyaltyDiscountAmount = 0;
    let pointsUsed = 0;
    if (loyaltyDiscountApplied) {
        loyaltyDiscountAmount = calculateLoyaltyDiscount(amounts.totalAfterInvoiceDiscount);
        const pointsRedeemValue = parseFloat(appSettings.pointsRedeemValue) || 0;
        if (pointsRedeemValue > 0) {
            pointsUsed = Math.round(loyaltyDiscountAmount / pointsRedeemValue);
        }
    }
    
    const saleData = {
        type: currentOrderType,
        items: invoiceItems,
        amounts: { ...amounts, total: amounts.finalTotal - loyaltyDiscountAmount, loyaltyDiscount: loyaltyDiscountAmount },
        invoiceDiscount: invoiceDiscount,
        paymentMethod,
        userId: currentUser.id,
        shiftId: activeShift.id,
        salespersonId: salespersonSelect.value ? parseInt(salespersonSelect.value) : null,
        customer: customerDataForSale,
        pointsUsed,
        pointsEarned: amounts.earnedPoints
    };

    try {
        const result = await window.api.finalizeSale(saleData);
        if (result.success) {
            window.api.playSound('sale-complete');
            Swal.fire('تم!', 'اكتملت عملية البيع بنجاح.', 'success');
            const invoiceHtml = generateInvoiceHTML(result.saleDetails, result.saleItems, appSettings);
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

function showPreviewModal(title, htmlContent) {
    Swal.fire({
        title: title,
        html: `<div class="invoice-preview-container">${htmlContent}</div>`,
        width: '800px',
        showCloseButton: true,
        confirmButtonText: '<i class="fa-solid fa-print"></i> طباعة',
        confirmButtonColor: '#2563eb',
        denyButtonText: 'إغلاق',
        showDenyButton: true,
    }).then((result) => {
        if (result.isConfirmed) {
            window.api.printContent(htmlContent);
        }
    });
}

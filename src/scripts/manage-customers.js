//File: src/scripts/manage-customers.js
export function init() {
    const addCustomerForm = document.getElementById('add-customer-form');
    if (!addCustomerForm) return;

    const newCustomerNameInput = document.getElementById('new-customer-name');
    const newCustomerPhoneInput = document.getElementById('new-customer-phone');
    const newCustomerAddressInput = document.getElementById('new-customer-address');
    const customersTableBody = document.querySelector('#customers-table tbody');
    const addressModal = document.getElementById('address-modal');
    const modalCloseBtn = addressModal.querySelector('.close-btn');
    const modalCustomerName = document.getElementById('modal-customer-name');
    const modalCustomerIdInput = document.getElementById('modal-customer-id');
    const addressesList = document.getElementById('addresses-list');
    const addAddressForm = document.getElementById('add-address-form');
    const newAddressInput = document.getElementById('new-address');

    // عناصر جديدة لسجل المعاملات
    const customerTransactionsSection = document.getElementById('customer-transactions-modal'); // تم تغيير المعرف
    const transactionsModalCloseBtn = customerTransactionsSection.querySelector('.close-btn');
    const transactionsCustomerName = document.getElementById('transactions-customer-name');
    const transactionsTableBody = document.getElementById('transactions-table-body');
    const closeTransactionsBtn = document.getElementById('close-transactions-btn');

    // أزرار الاستيراد والتصدير للعملاء
    const importCustomersBtn = document.getElementById('import-customers-btn');
    const exportCustomersBtn = document.getElementById('export-customers-btn');
    const downloadCustomersTemplateBtn = document.getElementById('download-customers-template-btn');

    // عناصر جديدة للبحث والفرز
    const customerSearchInput = document.getElementById('customer-search');
    const sortBySelect = document.getElementById('sort-by');
    let currentCustomers = []; // متغير لتخزين العملاء الحاليين

    async function loadCustomers() {
        try {
            const customers = await window.api.getCustomers();
            currentCustomers = customers; // تخزين العملاء
            renderFilteredAndSortedCustomers();
        } catch (error) {
            console.error('Failed to load customers:', error);
            Swal.fire('خطأ', 'فشل تحميل قائمة العملاء.', 'error');
        }
    }

    // وظيفة جديدة لترشيح وعرض العملاء
    function renderFilteredAndSortedCustomers() {
        let customersToRender = [...currentCustomers];

        // تطبيق البحث
        const searchTerm = customerSearchInput.value.toLowerCase().trim();
        if (searchTerm) {
            customersToRender = customersToRender.filter(c =>
                c.name.toLowerCase().includes(searchTerm) ||
                (c.phone && c.phone.includes(searchTerm))
            );
        }

        // تطبيق الفرز
        const sortBy = sortBySelect.value;
        customersToRender.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name, 'ar');
            } else if (sortBy === 'creation_date') {
                return new Date(a.created_at) - new Date(b.created_at);
            } else if (sortBy === 'order_count') {
                return b.order_count - a.order_count;
            } else if (sortBy === 'total_spent') {
                return b.total_spent - a.total_spent;
            }
            return 0;
        });

        renderTable(customersToRender);
    }


    function renderTable(customers) {
        customersTableBody.innerHTML = customers.map(c => `
            <tr>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.default_address || 'لا يوجد'}</td>
                <td>${new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(c.total_spent || 0)}</td>
                <td>${c.order_count}</td>
                <td>${c.total_earned_loyalty_points || 0}</td>
                <td>${c.loyalty_points || 0}</td>
                <td>${c.total_redeemed_loyalty_points || 0}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary manage-addr-btn" data-id="${c.id}" data-name="${c.name}">إدارة العناوين</button>
                    <button class="btn btn-info view-transactions-btn" data-id="${c.id}" data-name="${c.name}">عرض المعاملات</button>
                    <button class="btn btn-danger delete-btn" data-id="${c.id}">حذف</button>
                </td>
            </tr>
        `).join('');
    }

    addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await window.api.addCustomer({
                name: newCustomerNameInput.value,
                phone: newCustomerPhoneInput.value,
                address: newCustomerAddressInput.value
            });
            Swal.fire('تم بنجاح!', 'تمت إضافة العميل بنجاح.', 'success');
            addCustomerForm.reset();
            loadCustomers();
        } catch (error) {
            console.error('Failed to add customer:', error);
            Swal.fire('خطأ', error.message || 'فشلت إضافة العميل. قد يكون رقم الهاتف مسجل من قبل.', 'error');
        }
    });

    function openAddressModal(customerId, customerName) {
        modalCustomerName.textContent = `عناوين العميل: ${customerName}`;
        modalCustomerIdInput.value = customerId;
        loadAddressesForModal(customerId);
        addressModal.style.display = 'flex';
    }

    function closeAddressModal() {
        addressModal.style.display = 'none';
    }

    async function loadAddressesForModal(customerId) {
        const addresses = await window.api.getCustomerAddresses(customerId);
        addressesList.innerHTML = addresses.map(addr => `
            <li>
                <span class="address-text" data-id="${addr.id}" contenteditable="false">${addr.address}</span>
                <div class="address-actions">
                    <button class="btn btn-warning edit-addr-btn" data-id="${addr.id}">تعديل</button>
                    <button class="btn btn-success save-addr-btn" data-id="${addr.id}" style="display:none;">حفظ</button>
                    <button class="btn btn-danger delete-addr-btn" data-id="${addr.id}" data-customer-id="${customerId}">حذف</button>
                </div>
            </li>
        `).join('');
    }

    modalCloseBtn.addEventListener('click', closeAddressModal);
    window.addEventListener('click', (e) => {
        if (e.target === addressModal) closeAddressModal();
    });

    addAddressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerId = modalCustomerIdInput.value;
        const address = newAddressInput.value;
        await window.api.addCustomerAddress({ customerId, address });
        newAddressInput.value = '';
        loadAddressesForModal(customerId);
        loadCustomers(); // تحديث جدول العملاء الرئيسي بعد إضافة عنوان جديد
    });

    addressesList.addEventListener('click', async (e) => {
        const target = e.target;
        const addressId = target.dataset.id;
        const customerId = modalCustomerIdInput.value;
        const addressTextElement = addressesList.querySelector(`span[data-id='${addressId}']`);
        const editBtn = addressesList.querySelector(`.edit-addr-btn[data-id='${addressId}']`);
        const saveBtn = addressesList.querySelector(`.save-addr-btn[data-id='${addressId}']`);

        if (target.classList.contains('delete-addr-btn')) {
            const result = await Swal.fire({
                title: 'هل أنت متأكد؟',
                text: 'سيتم حذف هذا العنوان نهائياً.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonText: 'إلغاء',
                confirmButtonText: 'نعم، قم بالحذف'
            });

            if (result.isConfirmed) {
                await window.api.deleteCustomerAddress(addressId);
                loadAddressesForModal(customerId);
                loadCustomers(); // تحديث جدول العملاء الرئيسي بعد حذف عنوان
            }
        } else if (target.classList.contains('edit-addr-btn')) {
            if (addressTextElement) {
                addressTextElement.contentEditable = 'true';
                addressTextElement.focus();
                editBtn.style.display = 'none';
                saveBtn.style.display = 'inline-block';
            }
        } else if (target.classList.contains('save-addr-btn')) {
            if (addressTextElement) {
                addressTextElement.contentEditable = 'false';
                const newAddress = addressTextElement.textContent.trim();
                await window.api.updateCustomerAddress({ id: addressId, address: newAddress });
                editBtn.style.display = 'inline-block';
                saveBtn.style.display = 'none';
                Swal.fire('تم الحفظ!', 'تم تحديث العنوان بنجاح.', 'success');
                loadCustomers(); // تحديث جدول العملاء الرئيسي بعد تعديل عنوان
            }
        }
    });

    // دالة جديدة لعرض معاملات العميل
    async function showCustomerTransactions(customerId, customerName) {
        transactionsCustomerName.textContent = `سجل معاملات العميل: ${customerName}`;
        customerTransactionsSection.style.display = 'flex'; // إظهار القسم كـ modal

        try {
            const transactions = await window.api.getCustomerTransactions(customerId);
            renderTransactionsTable(transactions);
        } catch (error) {
            console.error('Failed to load customer transactions:', error);
            Swal.fire('خطأ', 'فشل تحميل سجل معاملات العميل.', 'error');
            transactionsTableBody.innerHTML = '<tr><td colspan="8">فشل تحميل البيانات.</td></tr>';
        }
    }

    // دالة جديدة لعرض جدول المعاملات
    function renderTransactionsTable(transactions) {
        if (transactions.length === 0) {
            transactionsTableBody.innerHTML = '<tr><td colspan="8">لا توجد معاملات لهذا العميل.</td></tr>';
            return;
        }

        const paymentMethodMap = {
            'cash': 'نقدي',
            'card': 'بطاقة'
        };

        const orderTypeMap = {
            'dine_in': 'صالة',
            'dine-in': 'صالة', // إضافة هذا السطر لترجمة "Dine-in" بشكل صحيح
            'takeaway': 'خارجي',
            'delivery': 'توصيل'
        };

        transactionsTableBody.innerHTML = transactions.map(sale => {
            const saleDate = new Date(sale.created_at).toLocaleString('ar-EG', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const paymentMethodKey = (sale.payment_method || '').toLowerCase().trim();
            const paymentMethodDisplay = paymentMethodMap[paymentMethodKey] || sale.payment_method;

            const orderTypeKey = (sale.order_type || '').toLowerCase().trim();
            const orderTypeDisplay = orderTypeMap[orderTypeKey] || sale.order_type;

            const productsList = sale.items.map(item => `
                <li>${item.product_name} (${item.quantity} x ${new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(item.price_per_item)})</li>
            `).join('');

            const discountDisplay = sale.manual_discount_amount > 0 ?
                `${new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(sale.manual_discount_amount)} (${sale.manual_discount_type === 'percentage' ? '%' : ''})` :
                'لا يوجد';

            return `
                <tr>
                    <td>${sale.sale_id}</td>
                    <td>${saleDate}</td>
                    <td>${orderTypeDisplay}</td>
                    <td>${paymentMethodDisplay}</td>
                    <td>${discountDisplay}</td>
                    <td>${new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(sale.total_amount)}</td>
                    <td>${sale.loyalty_points || 0} نقطة</td>
                    <td><ul>${productsList}</ul></td>
                </tr>
            `;
        }).join('');
    }

    // إغلاق قسم المعاملات
    transactionsModalCloseBtn.addEventListener('click', () => {
        customerTransactionsSection.style.display = 'none';
        transactionsTableBody.innerHTML = ''; // مسح البيانات عند الإغلاق
    });
    window.addEventListener('click', (e) => {
        if (e.target === customerTransactionsSection) {
            customerTransactionsSection.style.display = 'none';
            transactionsTableBody.innerHTML = '';
        }
    });


    customersTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('manage-addr-btn')) {
            openAddressModal(id, target.dataset.name);
        } else if (target.classList.contains('view-transactions-btn')) {
            showCustomerTransactions(id, target.dataset.name);
        } else if (target.classList.contains('delete-btn')) {
            const result = await Swal.fire({
                title: 'هل أنت متأكد؟',
                text: "سيتم حذف العميل وكل بياناته المرتبطة به!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonText: 'إلغاء',
                confirmButtonText: 'نعم، قم بالحذف!'
            });
            if (result.isConfirmed) {
                try {
                    await window.api.deleteCustomer(id);
                    Swal.fire('تم الحذف!', 'تم حذف العميل بنجاح.', 'success');
                    loadCustomers();
                } catch (error) {
                    Swal.fire('خطأ', 'فشل حذف العميل.', 'error');
                }
            }
        }
    });

    // إضافة معالجات الأحداث الجديدة
    customerSearchInput.addEventListener('input', renderFilteredAndSortedCustomers);
    sortBySelect.addEventListener('change', renderFilteredAndSortedCustomers);

    loadCustomers();
    window.api.onCustomersUpdate(loadCustomers); // Listen for updates from main process

    // --- New Event Listeners for Import/Export Buttons (Customers) ---
    importCustomersBtn.addEventListener('click', async () => {
        const result = await window.api.importCustomersFromExcel();
        if (result.success) {
            Swal.fire('تم الاستيراد!', `تم استيراد ${result.count} عميل بنجاح.`, 'success');
            loadCustomers(); // Reload customers after import
        } else {
            Swal.fire('خطأ في الاستيراد', result.message || 'فشل استيراد العملاء من Excel.', 'error');
        }
    });

    exportCustomersBtn.addEventListener('click', async () => {
        const result = await window.api.exportCustomersToExcel();
        if (result.success) {
            Swal.fire('تم التصدير!', `تم تصدير العملاء إلى: ${result.path}`, 'success');
        } else {
            Swal.fire('خطأ في التصدير', result.message || 'فشل تصدير العملاء إلى Excel.', 'error');
        }
    });

    // --- New Event Listener for Download Customers Template Button ---
    // تأكد من أن هذا المستمع يتم إرفاقه بعد التأكد من وجود العنصر
    if (downloadCustomersTemplateBtn) {
        downloadCustomersTemplateBtn.addEventListener('click', async () => {
            console.log('Attempting to download customers template...'); // Log for debugging
            const result = await window.api.downloadCustomersTemplate();
            if (result.success) {
                Swal.fire('تم التحميل!', `تم تحميل قالب العملاء إلى: ${result.path}`, 'success');
            } else {
                Swal.fire('خطأ في التحميل', result.message || 'فشل تحميل قالب العملاء.', 'error');
            }
        });
    } else {
        console.error('Download Customers Template Button not found!');
    }
}

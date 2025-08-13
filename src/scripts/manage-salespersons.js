import { showSuccessToast, showErrorToast, showConfirmationDialog } from './ui/modal-helpers.js'; 

export function init(appSettings) { // استقبل appSettings لتنسيق العملة
    console.log("Salesperson management script initialized.");

    const salespersonForm = document.getElementById('salesperson-form');
    if (!salespersonForm) return;

    const salespersonsTableBody = document.querySelector('#salespersons-table tbody');
    const clearFormBtn = document.getElementById('clear-salesperson-form-btn');
    const salespersonIdInput = document.getElementById('salesperson-id');
    const salespersonNameInput = document.getElementById('salesperson-name');
    const salespersonPhoneInput = document.getElementById('salesperson-phone');
    const salespersonIsActiveInput = document.getElementById('salesperson-is-active');

    let salespersonsCache = []; // لتخزين بيانات البائعين مؤقتاً

    /**
     * دالة مساعدة لتنسيق العملة
     * @param {number} amount - المبلغ المراد تنسيقه.
     * @returns {string} - المبلغ منسقاً بالعملة.
     */
    function formatCurrency(amount) {
        // استخدم إعدادات العملة من appSettings
        return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: appSettings.currency || 'EGP' }).format(amount || 0);
    }

    /**
     * جلب جميع البائعين من الـ Main Process وعرضهم في الجدول.
     */
    async function loadSalespersons() {
        try {
            const response = await window.api.getAllSalespersons();
            if (response.success) {
                salespersonsCache = response.data;
                renderTable();
            } else {
                showErrorToast('فشل تحميل قائمة البائعين.', response.message);
                console.error("Failed to load salespersons:", response.message);
            }
        } catch (error) {
            showErrorToast('خطأ!', 'حدث خطأ أثناء تحميل قائمة البائعين.');
            console.error("Error loading salespersons:", error);
        }
    }

    /**
     * عرض بيانات البائعين في جدول الواجهة.
     */
    function renderTable() {
        // تحديث رأس الجدول (<thead>) لإضافة أعمدة المبيعات
        const tableHead = document.querySelector('#salespersons-table thead tr');
        if (tableHead) {
            // إزالة الأعمدة الموجودة لتجنب التكرار عند إعادة الرسم
            // (تجنب إعادة إضافة الأعمدة في كل مرة يتم فيها renderTable)
            if (!tableHead.querySelector('.sales-count-header')) { // تحقق لتجنب إضافة الأعمدة مرتين
                const salesCountHeader = document.createElement('th');
                salesCountHeader.textContent = 'عدد المبيعات';
                salesCountHeader.classList.add('sales-count-header');
                tableHead.insertBefore(salesCountHeader, tableHead.querySelector('th:last-child')); // أضف قبل عمود الإجراءات

                const salesAmountHeader = document.createElement('th');
                salesAmountHeader.textContent = 'إجمالي المبيعات';
                salesAmountHeader.classList.add('sales-amount-header');
                tableHead.insertBefore(salesAmountHeader, tableHead.querySelector('th:last-child')); // أضف قبل عمود الإجراءات
            }
        }

        salespersonsTableBody.innerHTML = ''; // مسح المحتوى الحالي للجدول
        salespersonsCache.forEach(salesperson => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${salesperson.name}</td>
                <td>${salesperson.phone || 'لا يوجد'}</td>
                <td>${salesperson.is_active ? '<span class="status-active">نشط</span>' : '<span class="status-inactive">غير نشط</span>'}</td>
                <td>${salesperson.total_sales_count}</td> <!-- عرض عدد المبيعات -->
                <td>${formatCurrency(salesperson.total_sales_amount)}</td> <!-- عرض إجمالي المبيعات -->
                <td class="actions-cell">
                    <button class="btn btn-secondary edit-btn" data-id="${salesperson.id}">تعديل</button>
                    <button class="btn btn-danger delete-btn" data-id="${salesperson.id}">حذف</button>
                </td>
            `;
            salespersonsTableBody.appendChild(row);
        });
    }

    /**
     * مسح جميع حقول النموذج.
     */
    function clearForm() {
        salespersonForm.reset();
        salespersonIdInput.value = '';
        salespersonIsActiveInput.checked = true; // تعيين النشاط إلى "نشط" افتراضياً
    }

    /**
     * ملء حقول النموذج ببيانات بائع محدد للتعديل.
     * @param {number} id - معرف البائع.
     */
    function populateForm(id) {
        const salesperson = salespersonsCache.find(s => s.id === id);
        if (salesperson) {
            salespersonIdInput.value = salesperson.id;
            salespersonNameInput.value = salesperson.name;
            salespersonPhoneInput.value = salesperson.phone || '';
            salespersonIsActiveInput.checked = !!salesperson.is_active;
            console.log(`Populated form for salesperson ID: ${id}, Name: ${salesperson.name}`); // سجل للتأكد
        } else {
            console.warn(`Salesperson with ID ${id} not found in cache.`); // سجل تحذير
            showErrorToast('خطأ', 'لم يتم العثور على بيانات البائع للتعديل.'); // رسالة للمستخدم
        }
    }

    salespersonForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // منع الإرسال الافتراضي للنموذج

        const salespersonData = {
            id: salespersonIdInput.value ? parseInt(salespersonIdInput.value) : null,
            name: salespersonNameInput.value.trim(),
            phone: salespersonPhoneInput.value.trim() || null,
            is_active: salespersonIsActiveInput.checked ? 1 : 0
        };

        if (!salespersonData.name) {
            showErrorToast('خطأ!', 'اسم البائع مطلوب.');
            return;
        }

        try {
            let response;
            if (salespersonData.id) {
                // تعديل بائع موجود
                response = await window.api.updateSalesperson(salespersonData);
            } else {
                // إضافة بائع جديد
                response = await window.api.addSalesperson(salespersonData);
            }

            if (response.success) {
                showSuccessToast('تم الحفظ!', 'تم حفظ بيانات البائع بنجاح.');
                clearForm(); // مسح النموذج بعد الحفظ
                loadSalespersons(); // إعادة تحميل الجدول
            } else {
                showErrorToast('خطأ!', response.message);
            }
        } catch (error) {
            console.error("Error saving salesperson:", error);
            showErrorToast('خطأ!', 'حدث خطأ أثناء حفظ بيانات البائع.');
        }
    });

    // معالج حدث النقر على أزرار التعديل/الحذف في الجدول
    salespersonsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return; // إذا لم يكن العنصر الذي تم النقر عليه زرًا، تجاهل

        const id = parseInt(target.dataset.id); // الحصول على معرف البائع من زر البيانات
        console.log('Clicked button with ID:', id, 'Action:', target.classList); // سجل للتأكد من الـ ID

        if (target.classList.contains('edit-btn')) {
            // تعديل بائع
            populateForm(id);
        } else if (target.classList.contains('delete-btn')) {
            // حذف بائع
            const result = await showConfirmationDialog(
                'هل أنت متأكد؟',
                "سيتم حذف هذا البائع نهائياً! (لن يؤثر على المبيعات السابقة المرتبطة به)",
                'warning',
                'نعم، قم بالحذف'
            );

            if (result.isConfirmed) {
                try {
                    const response = await window.api.deleteSalesperson(id);
                    if (response.success) {
                        showSuccessToast('تم الحذف!', 'تم حذف البائع بنجاح.');
                        loadSalespersons(); // إعادة تحميل الجدول بعد الحذف
                    } else {
                        showErrorToast('خطأ!', response.message);
                    }
                } catch (error) {
                    console.error('Failed to delete salesperson:', error);
                    showErrorToast('خطأ!', 'فشل حذف البائع.');
                }
            }
        }
    });

    // معالج حدث النقر على زر مسح الحقول
    clearFormBtn.addEventListener('click', clearForm);

    // تحميل البائعين عند تهيئة الصفحة
    loadSalespersons();
}
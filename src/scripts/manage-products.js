// File: src/scripts/manage-products.js

import { formatCurrency } from './renderer.js';

export function init() {
    console.log("Product management script initialized.");
    const productForm = document.getElementById('product-form');
    const categoryForm = document.getElementById('category-form');
    if (!productForm || !categoryForm) return;

    // Product form elements
    const productsTableBody = document.querySelector('#products-table tbody');
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const imagePreview = document.getElementById('image-preview');
    const clearFormBtn = document.getElementById('clear-form-btn');

    const productIdInput = document.getElementById('product-id');
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    const costPriceInput = document.getElementById('cost_price');
    const stockInput = document.getElementById('stock');
    const barcodeInput = document.getElementById('barcode');
    const shortcutInput = document.getElementById('shortcut_key');
    const categoryIdInput = document.getElementById('category-id');

    const displayImageRadio = document.getElementById('display-image');
    const displayIconRadio = document.getElementById('display-icon');
    const imageUploadSection = document.getElementById('image-upload-section');
    const iconSelectionSection = document.getElementById('icon-selection-section');
    const productIconInput = document.getElementById('product-icon');
    const iconPreview = document.getElementById('icon-preview');
    const iconSuggestionsDiv = document.getElementById('icon-suggestions');

    // Import and Export Buttons
    const importProductsBtn = document.getElementById('import-products-btn');
    const exportProductsBtn = document.getElementById('export-products-btn');
    const downloadProductsTemplateBtn = document.getElementById('download-products-template-btn');

    // Category form elements
    const categoriesTableBody = document.querySelector('#categories-table tbody');
    const categoryNameInput = document.getElementById('category-name');
    const categoryIdToEditInput = document.getElementById('category-id-to-edit');
    const clearCategoryFormBtn = document.getElementById('clear-category-form-btn');

    // New elements for product table controls
    const searchInput = document.getElementById('product-search-input');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const deleteAllProductsBtn = document.getElementById('delete-all-products-btn');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoSpan = document.getElementById('page-info');

    // State management
    let productsCache = [];
    let categoriesCache = [];
    let selectedImagePath = null;
    let selectedIconName = null;
    let isImageDisplayType = true;
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSort = { field: 'name', direction: 'asc' };

    const iconLibrary = [
        { name: "برجر", iconClass: "fa-burger" },
        { name: "شاي", iconClass: "fa-mug-hot" },
        { name: "قهوة", iconClass: "fa-coffee" },
        { name: "بيتزا", iconClass: "fa-pizza-slice" },
        { name: "ساندويتش", iconClass: "fa-sandwich" },
        { name: "مشروب غازي", iconClass: "fa-soda" },
        { name: "ماء", iconClass: "fa-water" },
        { name: "دجاج", iconClass: "fa-drumstick-bite" },
        { name: "سمك", iconClass: "fa-fish" },
        { name: "خضروات", iconClass: "fa-carrot" },
        { name: "فواكه", iconClass: "fa-apple-whole" },
        { name: "حلويات", iconClass: "fa-cookie-bite" },
        { name: "كيك", iconClass: "fa-cake-candles" },
        { name: "خبز", iconClass: "fa-bread-slice" },
        { name: "حليب", iconClass: "fa-milk" },
        { name: "آيس كريم", iconClass: "fa-ice-cream" },
        { name: "إفطار", iconClass: "fa-egg" },
        { name: "عشاء", iconClass: "fa-utensils" },
        { name: "مشروب", iconClass: "fa-glass-water" },
        { name: "طبق", iconClass: "fa-plate-wheat" },
        { name: "حساب", iconClass: "fa-calculator" },
        { name: "مستخدم", iconClass: "fa-user" },
        { name: "إعدادات", iconClass: "fa-gear" },
        { name: "تقرير", iconClass: "fa-chart-line" },
        { name: "مال", iconClass: "fa-money-bill-wave" },
        { name: "بطاقة", iconClass: "fa-credit-card" },
        { name: "نقدي", iconClass: "fa-cash-register" },
        { name: "توصيل", iconClass: "fa-truck" },
        { name: "صالة", iconClass: "fa-chair" },
        { name: "خصم", iconClass: "fa-percent" },
        { name: "إرجاع", iconClass: "fa-rotate-left" },
        { name: "طباعة", iconClass: "fa-print" },
        { name: "مخزون", iconClass: "fa-boxes-stacked" },
        { name: "باركود", iconClass: "fa-barcode" },
        { name: "سعر", iconClass: "fa-tag" },
        { name: "عميل", iconClass: "fa-users" },
        { name: "مصروف", iconClass: "fa-receipt" },
        { name: "وردية", iconClass: "fa-clock-rotate-left" },
        { name: "ترخيص", iconClass: "fa-key" },
        { name: "إكسل", iconClass: "fa-file-excel" },
        { name: "PDF", iconClass: "fa-file-pdf" },
        { name: "إلغاء", iconClass: "fa-xmark" },
        { name: "حفظ", iconClass: "fa-floppy-disk" },
        { name: "تعديل", iconClass: "fa-pen-to-square" },
        { name: "حذف", iconClass: "fa-trash" },
        { name: "إضافة", iconClass: "fa-plus" },
        { name: "بحث", iconClass: "fa-magnifying-glass" },
        { name: "تنبيه", iconClass: "fa-bell" },
        { name: "معلومات", iconClass: "fa-circle-info" },
        { name: "تحذير", iconClass: "fa-triangle-exclamation" },
        { name: "نجاح", iconClass: "fa-circle-check" },
        { name: "فشل", iconClass: "fa-circle-xmark" },
        { name: "الرئيسية", iconClass: "fa-house" },
        { name: "نقاط البيع", iconClass: "fa-calculator" },
        { name: "المنتجات", iconClass: "fa-boxes-stacked" },
        { name: "العملاء", iconClass: "fa-users" },
        { name: "المصروفات", iconClass: "fa-receipt" },
        { name: "المبيعات والفواتير", iconClass: "fa-chart-line" },
        { name: "المستخدمين", iconClass: "fa-user-group" },
        { name: "الإعدادات", iconClass: "fa-gear" },
        { name: "الورديات", iconClass: "fa-cash-register" },
        { name: "فاتورة", iconClass: "fa-file-invoice" },
        { name: "صندوق", iconClass: "fa-box" },
        { name: "سلة", iconClass: "fa-cart-shopping" },
        { name: "ميزان", iconClass: "fa-scale-balanced" },
        { name: "ميكروفون", iconClass: "fa-microphone" },
        { name: "سماعة", iconClass: "fa-headphones" },
        { name: "كمبيوتر", iconClass: "fa-computer" },
        { name: "هاتف", iconClass: "fa-phone" },
        { name: "عنوان", iconClass: "fa-location-dot" },
        { name: "قائمة", iconClass: "fa-list" },
        { name: "شبكة", iconClass: "fa-grid" },
        { name: "تقويم", iconClass: "fa-calendar-days" },
        { name: "ساعة", iconClass: "fa-clock" },
        { name: "صورة", iconClass: "fa-image" },
        { name: "معرض", iconClass: "fa-images" },
        { name: "ألبوم", iconClass: "fa-photo-film" },
        { name: "موسيقى", iconClass: "fa-music" },
        { name: "تشغيل", iconClass: "fa-play" },
        { name: "إيقاف", iconClass: "fa-stop" },
        { name: "إيقاف مؤقت", iconClass: "fa-pause" },
        { name: "تخطي", iconClass: "fa-forward" },
        { name: "رجوع", iconClass: "fa-backward" },
        { name: "حلقة", iconClass: "fa-repeat" },
        { name: "عشوائي", iconClass: "fa-shuffle" },
        { name: "قائمة تشغيل", iconClass: "fa-list-music" },
        { name: "صوت عال", iconClass: "fa-volume-up" },
        { name: "صوت منخفض", iconClass: "fa-volume-down" },
        { name: "كتم الصوت", iconClass: "fa-volume-mute" },
        { name: "ملء الشاشة", iconClass: "fa-expand" },
        { name: "تصغير الشاشة", iconClass: "fa-compress" },
        { name: "شاشة", iconClass: "fa-desktop" },
        { name: "جوال", iconClass: "fa-mobile-screen" },
        { name: "تابلت", iconClass: "fa-tablet-screen-button" },
        { name: "لابتوب", iconClass: "fa-laptop" },
        { name: "ساعة ذكية", iconClass: "fa-watch" },
        { name: "كاميرا ويب", iconClass: "fa-camera-web" },
        { name: "ميكروفون لابتوب", iconClass: "fa-microphone-lines" },
        { name: "سماعة رأس", iconClass: "fa-headset" }
    ];

    async function loadCategories() {
        try {
            categoriesCache = await window.api.getCategories();
            renderCategoryDropdown();
            renderCategoriesTable();
            loadProducts();
        } catch (error) {
            console.error('Error loading categories:', error);
            Swal.fire('خطأ!', 'فشل تحميل قائمة الفئات.', 'error');
        }
    }

    async function loadProducts() {
        try {
            productsCache = await window.api.getProducts();
            renderPaginatedProducts();
        } catch (error) {
            console.error('Error loading products:', error);
            Swal.fire('خطأ!', 'فشل تحميل قائمة المنتجات.', 'error');
        }
    }

    //
    // Functions for Product Management
    //

    function filterAndSortProducts() {
        let filtered = productsCache;

        // Filtering
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
            );
        }

        // Sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            switch (currentSort.field) {
                case 'name':
                    aValue = a.name;
                    bValue = b.name;
                    break;
                case 'price':
                    aValue = a.price;
                    bValue = b.price;
                    break;
                case 'cost_price':
                    aValue = a.cost_price ?? 0; // Treat null as 0
                    bValue = b.cost_price ?? 0;
                    break;
                case 'stock':
                    aValue = a.stock ?? Infinity; // Treat null as infinity
                    bValue = b.stock ?? Infinity;
                    break;
            }

            if (aValue < bValue) return currentSort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }

    function renderPaginatedProducts() {
        const sortedAndFilteredProducts = filterAndSortProducts();
        const totalPages = Math.ceil(sortedAndFilteredProducts.length / itemsPerPage);
        
        // Adjust currentPage if it's out of bounds
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        } else if (totalPages === 0) {
            currentPage = 1;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productsToRender = sortedAndFilteredProducts.slice(startIndex, endIndex);

        productsTableBody.innerHTML = '';
        if (productsToRender.length === 0) {
            productsTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">لا توجد منتجات لعرضها.</td></tr>`;
        } else {
            productsToRender.forEach(product => {
                const row = document.createElement('tr');
                let displayHtml = '';
                if (product.icon_name) {
                    displayHtml = `<div class="product-icon-display"><i class="fa-solid ${product.icon_name}"></i></div>`;
                } else if (product.image_path) {
                    displayHtml = `<img src="${product.image_path}" alt="${product.name}" class="product-thumb" style="width:50px; height:50px; object-fit:cover;" onerror="this.onerror=null;this.src='https://placehold.co/50x50/f0f4f8/1e293b?text=?';">`;
                } else {
                    displayHtml = `<img src="https://placehold.co/50x50/f0f4f8/1e293b?text=${product.name.charAt(0)}" alt="${product.name}" class="product-thumb" style="width:50px; height:50px; object-fit:cover;">`;
                }

                row.innerHTML = `
                    <td>${displayHtml}</td>
                    <td>${product.name}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${formatCurrency(product.cost_price || 0)}</td>
                    <td>${product.category_name || '-'}</td>
                    <td>${product.shortcut_key || '-'}</td>
                    <td>${product.stock ?? '∞'}</td>
                    <td>${product.barcode || '-'}</td>
                    <td class="actions-cell">
                        <button class="btn btn-secondary edit-btn" data-id="${product.id}">تعديل</button>
                        <button class="btn btn-danger delete-btn" data-id="${product.id}">حذف</button>
                    </td>
                `;
                productsTableBody.appendChild(row);
            });
        }
        
        // Update pagination controls
        pageInfoSpan.textContent = `صفحة ${totalPages > 0 ? currentPage : 0} من ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1 || totalPages === 0;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    function clearForm() {
        productForm.reset();
        productIdInput.value = '';
        categoryIdInput.value = categoriesCache[0] ? categoriesCache[0].id : '';
        document.getElementById('display-image').checked = true;
        document.getElementById('image-upload-section').style.display = 'block';
        document.getElementById('icon-selection-section').style.display = 'none';
        imagePreview.style.display = 'none';
        imagePreview.src = '';
        selectedImagePath = null;
        document.getElementById('product-icon').value = '';
        document.getElementById('icon-preview').innerHTML = `<i class="fa-solid fa-question-circle"></i>`;
        selectedIconName = null;
        isImageDisplayType = true;
        productForm.querySelector('button[type="submit"]').textContent = 'حفظ المنتج';
    }

    function populateForm(id) {
        const product = productsCache.find(p => p.id === id);
        if (!product) return;

        clearForm();

        productIdInput.value = product.id;
        nameInput.value = product.name;
        priceInput.value = product.price;
        costPriceInput.value = product.cost_price || '';
        stockInput.value = product.stock ?? '';
        barcodeInput.value = product.barcode || '';
        shortcutInput.value = product.shortcut_key || '';
        categoryIdInput.value = product.category_id || (categoriesCache[0] ? categoriesCache[0].id : '');

        if (product.icon_name) {
            document.getElementById('display-icon').checked = true;
            document.getElementById('image-upload-section').style.display = 'none';
            document.getElementById('icon-selection-section').style.display = 'block';
            productIconInput.value = product.icon_name;
            iconPreview.innerHTML = `<i class="fa-solid ${product.icon_name}"></i>`;
            selectedIconName = product.icon_name;
            isImageDisplayType = false;
        } else if (product.image_path) {
            document.getElementById('display-image').checked = true;
            document.getElementById('image-upload-section').style.display = 'block';
            document.getElementById('icon-selection-section').style.display = 'none';
            imagePreview.src = product.image_path;
            imagePreview.style.display = 'block';
            selectedImagePath = product.image_path.split('/').pop();
            isImageDisplayType = true;
        } else {
            document.getElementById('display-image').checked = true;
            document.getElementById('image-upload-section').style.display = 'block';
            document.getElementById('icon-selection-section').style.display = 'none';
            imagePreview.src = '';
            imagePreview.style.display = 'none';
            selectedImagePath = null;
            selectedIconName = null;
            isImageDisplayType = true;
        }
        productForm.querySelector('button[type="submit"]').textContent = 'تحديث المنتج';
    }

    function renderCategoriesTable() {
        categoriesTableBody.innerHTML = '';
        categoriesCache.forEach(category => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category.name}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary edit-category-btn" data-id="${category.id}">تعديل</button>
                    <button class="btn btn-danger delete-category-btn" data-id="${category.id}">حذف</button>
                </td>
            `;
            categoriesTableBody.appendChild(row);
        });
    }

    function renderCategoryDropdown() {
        categoryIdInput.innerHTML = '';
        categoriesCache.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryIdInput.appendChild(option);
        });
    }

    function clearCategoryForm() {
        categoryForm.reset();
        categoryIdToEditInput.value = '';
        categoryForm.querySelector('button[type="submit"]').textContent = 'حفظ الفئة';
    }

    function populateCategoryForm(id) {
        const category = categoriesCache.find(c => c.id === id);
        if (!category) return;
        categoryIdToEditInput.value = category.id;
        categoryNameInput.value = category.name;
        categoryForm.querySelector('button[type="submit"]').textContent = 'تحديث الفئة';
    }

    //
    // Event Listeners
    //

    // Product form submission
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!nameInput.value.trim()) { Swal.fire('خطأ!', 'اسم المنتج مطلوب.', 'error'); return; }
        if (isNaN(parseFloat(priceInput.value)) || parseFloat(priceInput.value) <= 0) { Swal.fire('خطأ!', 'سعر البيع يجب أن يكون رقمًا موجبًا.', 'error'); return; }

        const productData = {
            id: productIdInput.value ? parseInt(productIdInput.value) : null,
            name: nameInput.value,
            price: parseFloat(priceInput.value),
            cost_price: parseFloat(costPriceInput.value) || null,
            stock: stockInput.value ? parseInt(stockInput.value) : null,
            barcode: barcodeInput.value.trim() || null,
            shortcut_key: shortcutInput.value.trim().toLowerCase() || null,
            category_id: categoryIdInput.value ? parseInt(categoryIdInput.value) : null,
            image_path: null,
            icon_name: null
        };

        if (isImageDisplayType) {
            productData.image_path = selectedImagePath;
        } else {
            productData.icon_name = selectedIconName;
        }

        try {
            let result;
            if (productData.id) {
                result = await window.api.updateProduct(productData);
            } else {
                result = await window.api.addProduct(productData);
            }

            if (result.success) {
                Swal.fire({ icon: 'success', title: 'تم الحفظ بنجاح!', timer: 1500, showConfirmButton: false });
                clearForm();
                loadProducts(); // Reload products after successful save
            } else {
                Swal.fire('خطأ!', `حدث خطأ: ${result.message || 'تأكد أن الباركود أو مفتاح الاختصار غير مكرر.'}`, 'error');
            }
        } catch (error) {
            console.error('Product save failed:', error);
            Swal.fire('خطأ!', 'حدث خطأ غير متوقع أثناء حفظ المنتج.', 'error');
        }
    });

    // Category form submission
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = categoryNameInput.value.trim();
        const categoryId = categoryIdToEditInput.value ? parseInt(categoryIdToEditInput.value) : null;

        if (!categoryName) {
            Swal.fire('خطأ!', 'اسم الفئة مطلوب.', 'error');
            return;
        }

        try {
            let result;
            if (categoryId) {
                result = await window.api.updateCategory({ id: categoryId, name: categoryName });
            } else {
                result = await window.api.addCategory(categoryName);
            }

            if (result.success) {
                Swal.fire({ icon: 'success', title: 'تم الحفظ بنجاح!', timer: 1500, showConfirmButton: false });
                clearCategoryForm();
                loadCategories();
            } else {
                Swal.fire('خطأ!', `حدث خطأ: ${result.message || 'تأكد أن اسم الفئة غير مكرر.'}`, 'error');
            }
        } catch (error) {
            console.error('Category save failed:', error);
            Swal.fire('خطأ!', 'حدث خطأ غير متوقع أثناء حفظ الفئة.', 'error');
        }
    });

    // Product table actions
    productsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = parseInt(target.dataset.id);
        if (target.classList.contains('edit-btn')) {
            populateForm(id);
            // Scroll to the top of the management container
            document.getElementById('product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target.classList.contains('delete-btn')) {
            const result = await Swal.fire({ title: 'هل أنت متأكد؟', text: "لن تتمكن من استرجاعه!", icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذفه!', cancelButtonText: 'إلغاء' });
            if (result.isConfirmed) {
                const deleteResult = await window.api.deleteProduct(id);
                if (deleteResult.success) {
                    Swal.fire('تم الحذف!', 'تم حذف المنتج.', 'success');
                    loadProducts(); // Reload products after deletion
                } else {
                    Swal.fire('خطأ!', deleteResult.message || 'فشل حذف المنتج.', 'error');
                }
            }
        }
    });

    // Category table actions
    categoriesTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = parseInt(target.dataset.id);
        if (target.classList.contains('edit-category-btn')) {
            populateCategoryForm(id);
        } else if (target.classList.contains('delete-category-btn')) {
            const result = await Swal.fire({ title: 'هل أنت متأكد؟', text: "لن تتمكن من استرجاع الفئة! سيتم حذف المنتجات المرتبطة بالفئة بشكل تلقائي.", icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذفها!', cancelButtonText: 'إلغاء' });
            if (result.isConfirmed) {
                const deleteResult = await window.api.deleteCategory(id);
                if (deleteResult.success) {
                    Swal.fire('تم الحذف!', 'تم حذف الفئة.', 'success');
                    loadCategories();
                } else {
                    Swal.fire('خطأ!', deleteResult.message || 'فشل حذف الفئة.', 'error');
                }
            }
        }
    });

    // Other event listeners
    imageUploadBtn.addEventListener('click', async () => {
        if (!isImageDisplayType) { Swal.fire('تنبيه', 'الرجاء اختيار "صورة" كنوع عرض المنتج أولاً.', 'info'); return; }
        const result = await window.api.selectImage();
        if (result.success) {
            selectedImagePath = result.path;
            imagePreview.src = result.fullPath;
            imagePreview.style.display = 'block';
            productIconInput.value = '';
            iconPreview.innerHTML = `<i class="fa-solid fa-question-circle"></i>`;
            selectedIconName = null;
        }
    });

    clearFormBtn.addEventListener('click', clearForm);
    clearCategoryFormBtn.addEventListener('click', clearCategoryForm);

    // Event Listeners for Import/Export Buttons
    importProductsBtn.addEventListener('click', async () => {
        const result = await window.api.importProductsFromExcel();
        if (result.success) {
            Swal.fire('تم الاستيراد!', `تم استيراد ${result.count} منتج بنجاح.`, 'success');
            loadProducts();
            loadCategories();
        } else {
            Swal.fire('خطأ في الاستيراد', result.message || 'فشل استيراد المنتجات من Excel.', 'error');
        }
    });

    exportProductsBtn.addEventListener('click', async () => {
        const result = await window.api.exportProductsToExcel();
        if (result.success) {
            Swal.fire('تم التصدير!', `تم تصدير المنتجات إلى: ${result.path}`, 'success');
        } else {
            Swal.fire('خطأ في التصدير', result.message || 'فشل تصدير المنتجات إلى Excel.', 'error');
        }
    });

    downloadProductsTemplateBtn.addEventListener('click', async () => {
        const result = await window.api.downloadProductsTemplate();
        if (result.success) {
            Swal.fire('تم التحميل!', `تم تحميل قالب المنتجات إلى: ${result.path}`, 'success');
        } else {
            Swal.fire('خطأ في التحميل', result.message || 'فشل تحميل قالب المنتجات.', 'error');
        }
    });

    // Event listeners for radio buttons
    if (displayImageRadio && displayIconRadio) {
        displayImageRadio.addEventListener('change', () => {
            isImageDisplayType = true;
            imageUploadSection.style.display = 'block';
            iconSelectionSection.style.display = 'none';
            productIconInput.value = '';
            selectedIconName = null;
        });

        displayIconRadio.addEventListener('change', () => {
            isImageDisplayType = false;
            imageUploadSection.style.display = 'none';
            iconSelectionSection.style.display = 'block';
            imagePreview.style.display = 'none';
            selectedImagePath = null;
            const currentIconValue = productIconInput.value.trim();
            iconPreview.innerHTML = currentIconValue ? `<i class="fa-solid ${currentIconValue}"></i>` : `<i class="fa-solid fa-question-circle"></i>`;
            selectedIconName = currentIconValue;
        });
    }

    if (productIconInput && iconSuggestionsDiv && iconPreview) {
        productIconInput.addEventListener('input', () => {
            const searchTerm = productIconInput.value.trim().toLowerCase();
            iconSuggestionsDiv.innerHTML = '';
            if (searchTerm.length > 0) {
                const filteredIcons = iconLibrary.filter(icon =>
                    icon.name.toLowerCase().includes(searchTerm) ||
                    icon.iconClass.toLowerCase().includes(searchTerm)
                ).slice(0, 10);
                if (filteredIcons.length > 0) {
                    filteredIcons.forEach(icon => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'icon-suggestion-item';
                        suggestionItem.innerHTML = `<i class="fa-solid ${icon.iconClass}"></i> <span>${icon.name} (${icon.iconClass})</span>`;
                        suggestionItem.dataset.iconClass = icon.iconClass;
                        iconSuggestionsDiv.appendChild(suggestionItem);
                        suggestionItem.addEventListener('click', () => {
                            productIconInput.value = icon.iconClass;
                            iconPreview.innerHTML = `<i class="fa-solid ${icon.iconClass}"></i>`;
                            selectedIconName = icon.iconClass;
                            iconSuggestionsDiv.style.display = 'none';
                        });
                    });
                    iconSuggestionsDiv.style.display = 'block';
                } else {
                    iconSuggestionsDiv.style.display = 'none';
                }
            } else {
                iconSuggestionsDiv.style.display = 'none';
            }
            const currentIconClass = productIconInput.value.trim();
            iconPreview.innerHTML = currentIconClass ? `<i class="fa-solid ${currentIconClass}"></i>` : `<i class="fa-solid fa-question-circle"></i>`;
            selectedIconName = currentIconClass;
        });
        document.addEventListener('click', (e) => {
            if (!productIconInput.contains(e.target) && !iconSuggestionsDiv.contains(e.target)) {
                iconSuggestionsDiv.style.display = 'none';
            }
        });
    }

    // Event listeners for search, sort and pagination
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderPaginatedProducts();
    });

    sortButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const clickedButton = e.currentTarget;
            const fullSortBy = clickedButton.dataset.sortBy;
            const sortParts = fullSortBy.split('-');
            const newSortField = sortParts[0];
            const newDirection = sortParts[1] || 'asc';

            // Update sort state
            currentSort.field = newSortField;
            currentSort.direction = newDirection;

            // Update button active classes
            sortButtons.forEach(btn => btn.classList.remove('active'));
            clickedButton.classList.add('active');

            currentPage = 1;
            renderPaginatedProducts();
        });
    });

    deleteAllProductsBtn.addEventListener('click', async () => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد من حذف جميع المنتجات؟',
            text: "هذه العملية لا يمكن التراجع عنها!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف كل شيء!',
            cancelButtonText: 'إلغاء'
        });
        if (result.isConfirmed) {
            const deleteResult = await window.api.deleteAllProducts();
            if (deleteResult.success) {
                Swal.fire('تم الحذف!', 'تم حذف جميع المنتجات بنجاح.', 'success');
                loadProducts(); // Reload products after deletion
            } else {
                Swal.fire('خطأ!', deleteResult.message || 'فشل حذف المنتجات.', 'error');
            }
        }
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPaginatedProducts();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const sortedAndFilteredProducts = filterAndSortProducts();
        const totalPages = Math.ceil(sortedAndFilteredProducts.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPaginatedProducts();
        }
    });

    // Initial load and event listeners
    loadCategories();
    window.api.onCategoriesUpdate(loadCategories);
    window.api.onProductsUpdate(loadProducts);
}

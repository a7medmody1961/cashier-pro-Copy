export function init() {
    console.log("User management script initialized.");

    // --- Element Selectors ---
    const userForm = document.getElementById('user-form');
    const usersTableBody = document.querySelector('#users-table tbody');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const userIdInput = document.getElementById('user-id');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const roleInput = document.getElementById('role');
    const permissionsGrid = document.getElementById('permissions-grid');
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarOptionsWrapper = document.getElementById('avatar-options-wrapper');
    const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
    const avatarUploadInput = document.getElementById('avatar-upload');
    const userAvatarInput = document.getElementById('user-avatar');

    if (!userForm) {
        console.error("Critical element #user-form not found. Aborting user management script.");
        return;
    }

    let usersCache = [];
    
    let avatarOptionsHTML = '';
    let lastSelectedAvatarElement = null;

    const predefinedAvatars = [
        '../assets/avatars/default-avatar.png',
        '../assets/avatars/avatar-male-1.png',
        '../assets/avatars/avatar-male-2.png',
        '../assets/avatars/avatar-female-1.png',
        '../assets/avatars/avatar-female-2.png'
    ];

    function setupPredefinedAvatars() {
        if (!avatarOptionsWrapper) return;

        if (!avatarOptionsHTML) {
            console.log("Generating and caching avatar options for the first time.");
            let html = '';
            predefinedAvatars.forEach(path => {
                // تم إضافة خاصية loading="lazy" لخيارات الأفاتار
                html += `<div class="avatar-icon" data-path="${path}"><img src="${path}" alt="Avatar" loading="lazy"></div>`;
            });
            avatarOptionsHTML = html;
        }

        avatarOptionsWrapper.innerHTML = avatarOptionsHTML;
        
        selectAvatar(userAvatarInput.value || predefinedAvatars[0]);
    }

    function selectAvatar(path) {
        if (avatarOptionsWrapper) {
            if (lastSelectedAvatarElement) {
                lastSelectedAvatarElement.classList.remove('selected');
            }

            const selectedIcon = avatarOptionsWrapper.querySelector(`div[data-path='${path}']`);
            if (selectedIcon) {
                selectedIcon.classList.add('selected');
                lastSelectedAvatarElement = selectedIcon;
            }
        }
        
        if (avatarPreview) {
            // تم إضافة خاصية loading="lazy" لصورة المعاينة
            avatarPreview.innerHTML = `<img src="${path}" alt="Avatar Preview" class="avatar-preview-img" loading="lazy">`;
        }
        
        if (userAvatarInput) {
            userAvatarInput.value = path;
        }
    }

    async function loadUsers() {
        try {
            usersCache = await window.api.getUsers();
            renderTable();
        } catch (error) {
            console.error("Failed to load users:", error);
            Swal.fire('خطأ!', 'فشل تحميل قائمة المستخدمين.', 'error');
        }
    }

    function renderTable() {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = '';
        if (usersCache.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center">لا يوجد مستخدمين متاحين.</td></tr>`;
            return;
        }
        usersCache.forEach(user => {
            const row = document.createElement('tr');

            // تعديل مسار الصورة للتأكد من أنه صحيح
            const avatarPath = user.avatar && user.avatar.startsWith('..') ? user.avatar : `../assets/avatars/${user.avatar || 'default-avatar.png'}`;
            const avatarHtml = `<img src="${avatarPath}" alt="Avatar" class="table-avatar" loading="lazy">`;

            row.innerHTML = `
                <td>${avatarHtml}</td>
                <td>${user.username}</td>
                <td>${user.role === 'Admin' ? 'مدير' : 'كاشير'}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary edit-btn" data-id="${user.id}">تعديل</button>
                    <button class="btn btn-danger delete-btn" data-id="${user.id}">حذف</button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    }

    function clearForm() {
        userForm.reset();
        if(userIdInput) userIdInput.value = '';
        selectAvatar(predefinedAvatars[0]);
        if(permissionsGrid) {
            permissionsGrid.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                if(checkbox.id !== 'perm-pos') {
                    checkbox.checked = false;
                }
            });
        }
        if(avatarUploadInput) avatarUploadInput.value = '';
    }

    function populateForm(id) {
        const user = usersCache.find(u => u.id === id);
        if (user) {
            userIdInput.value = user.id;
            usernameInput.value = user.username;
            roleInput.value = user.role;
            passwordInput.value = '';
            
            if(permissionsGrid) {
                const userPermissions = JSON.parse(user.permissions || '{}');
                permissionsGrid.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    const page = checkbox.dataset.page;
                    checkbox.checked = !!userPermissions[page];
                });
            }

            // تعديل مسار الصورة لملء النموذج
            const avatarPath = user.avatar && user.avatar.startsWith('..') ? user.avatar : `../assets/avatars/${user.avatar || 'default-avatar.png'}`;
            selectAvatar(avatarPath);
        }
    }

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const permissions = {};
        if (permissionsGrid) {
            permissionsGrid.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                permissions[checkbox.dataset.page] = checkbox.checked;
            });
        }
        
        let avatarPath = userAvatarInput.value;

        if (avatarUploadInput && avatarUploadInput.files.length > 0) {
            try {
                const filePath = avatarUploadInput.files[0].path;
                const savedImagePath = await window.api.saveImage(filePath); // تم حفظ الصورة ومعالجتها
                if (savedImagePath) {
                    // استخدام المسار الصحيح الذي تم إرجاعه من IPC handler
                    avatarPath = savedImagePath;
                } else {
                    throw new Error('Failed to save image.');
                }
            } catch (error) {
                console.error("Error saving user image:", error);
                Swal.fire('خطأ!', 'فشل حفظ الصورة.', 'error');
                return;
            }
        }
        
        const userData = {
            id: userIdInput.value ? parseInt(userIdInput.value) : null,
            username: usernameInput.value,
            password: passwordInput.value,
            role: roleInput.value,
            permissions: JSON.stringify(permissions),
            avatar: avatarPath
        };

        try {
            let result;
            if (userData.id) {
                result = await window.api.updateUser(userData);
                if (!result.success) throw new Error(result.message || 'فشل تحديث المستخدم.');
            } else {
                if (!userData.password) {
                    Swal.fire('خطأ', 'يجب إدخال كلمة مرور للمستخدم الجديد.', 'error');
                    return;
                }
                result = await window.api.addUser(userData);
                if (!result.success) throw new Error(result.message || 'فشل إضافة المستخدم.');
            }
            Swal.fire('تم الحفظ!', 'تم حفظ بيانات المستخدم بنجاح.', 'success');
            clearForm();
            loadUsers();
        } catch (error) {
            console.error("Error saving user:", error);
            Swal.fire('خطأ!', 'اسم المستخدم موجود بالفعل أو حدث خطأ آخر.', 'error');
        }
    });

    if (usersTableBody) {
        usersTableBody.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            const id = parseInt(target.dataset.id);

            if (target.classList.contains('edit-btn')) {
                populateForm(id);
            } else if (target.classList.contains('delete-btn')) {
                const result = await Swal.fire({
                    title: 'هل أنت متأكد؟', text: "سيتم حذف هذا المستخدم نهائياً!", icon: 'warning',
                    showCancelButton: true, confirmButtonColor: '#dc3545',
                    cancelButtonText: 'إلغاء', confirmButtonText: 'نعم، قم بالحذف'
                });
                if (result.isConfirmed) {
                    try {
                        const deleteResult = await window.api.deleteUser(id);
                        if (deleteResult.success) {
                            Swal.fire('تم الحذف!', 'تم حذف المستخدم بنجاح.', 'success');
                            loadUsers();
                        } else {
                            Swal.fire('خطأ!', deleteResult.message, 'error');
                        }
                    } catch (error) {
                        Swal.fire('خطأ!', 'فشل حذف المستخدم.', 'error');
                    }
                }
            }
        });
    }

    if (avatarOptionsWrapper) {
        avatarOptionsWrapper.addEventListener('click', (e) => {
            const target = e.target.closest('.avatar-icon');
            if (target) {
                selectAvatar(target.dataset.path);
                if (avatarUploadInput) avatarUploadInput.value = '';
            }
        });
    }

    if (uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', () => {
            if (avatarUploadInput) {
                avatarUploadInput.click();
            }
        });
    }

    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (avatarPreview) {
                        // تم إضافة خاصية loading="lazy" لصورة المعاينة
                        avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar" class="avatar-preview-img" loading="lazy">`;
                    }
                    if (avatarOptionsWrapper) {
                        avatarOptionsWrapper.querySelectorAll('.avatar-icon').forEach(icon => {
                            icon.classList.remove('selected');
                        });
                    }
                    userAvatarInput.value = `file://${file.path}`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearForm);
    }

    setupPredefinedAvatars();
    loadUsers();
}
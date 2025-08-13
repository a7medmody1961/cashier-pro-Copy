document.addEventListener('DOMContentLoaded', () => {
    // تحديد العناصر من واجهة المستخدم
    const userListContainer = document.getElementById('saved-users-container'); // تأكد من أن هذا هو الـ ID الصحيح في ملف HTML
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message'); // عنصر لعرض رسائل الخطأ
    let selectedUserCard = null; // لتخزين بطاقة المستخدم المحددة

    // المسارات الصحيحة للصور، يجب أن تكون نسبية من ملف login.html
    // بما أن login.html في مجلد views، والملفات في مجلد assets، فإن المسار الصحيح هو ../assets/...
    const avatarAssetsPath = '../assets/avatars/';
    const defaultAvatarPath = `${avatarAssetsPath}default-avatar.png`;

    /**
     * دالة لتحميل المستخدمين من قاعدة البيانات وعرضهم كبطاقات
     */
    async function loadUsers() {
        try {
            // استدعاء الدالة من خلال preload script لجلب كل المستخدمين
            const users = await window.api.getUsers();
            userListContainer.innerHTML = ''; // مسح المحتوى القديم

            users.forEach(user => {
                // تجاهل المستخدمين غير النشطين إذا كان هناك حقل للحالة
                // if (!user.is_active) return;

                const userCard = document.createElement('div');
                userCard.classList.add('user-card');
                userCard.dataset.username = user.username; // تخزين اسم المستخدم في الـ dataset

                // تحديد مسار الصورة الرمزية مع مسار احتياطي للصورة الافتراضية
                // تم تعديل هذا السطر لضمان استخدام المسار الصحيح
                const avatarFileName = user.avatar || 'default-avatar.png';
                const avatarPath = user.avatar && user.avatar.startsWith('..') ? user.avatar : `${avatarAssetsPath}${avatarFileName}`;

                userCard.innerHTML = `
                    <div class="user-avatar">
                        <!-- تم إضافة خاصية loading="lazy" لتحسين الأداء -->
                        <img src="${avatarPath}" alt="${user.username}" onerror="this.onerror=null;this.src='${defaultAvatarPath}';" loading="lazy">
                    </div>
                    <span class="user-name">${user.username}</span>
                `;

                // إضافة مستمع حدث الضغط على البطاقة
                userCard.addEventListener('click', () => {
                    // إزالة التحديد من البطاقة السابقة إذا كانت موجودة
                    if (selectedUserCard) {
                        selectedUserCard.classList.remove('selected');
                    }
                    // تحديد البطاقة الجديدة
                    selectedUserCard = userCard;
                    selectedUserCard.classList.add('selected');

                    // نقل التركيز إلى حقل كلمة المرور
                    passwordInput.focus();
                    if(errorMessage) errorMessage.textContent = ''; // مسح رسالة الخطأ عند اختيار مستخدم
                });

                userListContainer.appendChild(userCard);
            });

        } catch (error) {
            console.error('Failed to load users:', error);
            if(errorMessage) errorMessage.textContent = 'فشل في تحميل قائمة المستخدمين.';
        }
    }

    /**
     * مستمع حدث إرسال نموذج تسجيل الدخول
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // منع الإرسال الافتراضي للنموذج

        // التحقق من أنه تم اختيار مستخدم
        if (!selectedUserCard) {
            if(errorMessage) errorMessage.textContent = 'الرجاء اختيار مستخدم أولاً.';
            // استخدام SweetAlert لإظهار تنبيه أكثر جمالية
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه',
                text: 'الرجاء اختيار مستخدم أولاً.',
                confirmButtonText: 'حسناً'
            });
            return;
        }

        const username = selectedUserCard.dataset.username;
        const password = passwordInput.value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        // تعطيل زر الدخول وإظهار رسالة "جاري الدخول"
        submitButton.disabled = true;
        submitButton.textContent = 'جاري الدخول...';

        try {
            // استدعاء دالة تسجيل الدخول من خلال preload script
            const result = await window.api.login({ username, password });

            if (result.success) {
                // عند النجاح، يتم الانتقال للصفحة الرئيسية (يتم التعامل معه في main process)
                window.api.loginSuccess(result.user);
            } else {
                // عرض رسالة خطأ باستخدام SweetAlert
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ في تسجيل الدخول',
                    text: result.message || 'كلمة المرور غير صحيحة.',
                    confirmButtonText: 'حسناً'
                });
                passwordInput.value = ''; // مسح حقل كلمة المرور
                passwordInput.focus();
            }
        } catch (error) {
            console.error('Login request failed:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ فني',
                text: 'حدث خطأ غير متوقع. يرجى التأكد من تشغيل الخادم.',
                confirmButtonText: 'حسناً'
            });
        } finally {
            // إعادة تمكين الزر وتغيير النص مرة أخرى
            submitButton.disabled = false;
            submitButton.textContent = 'تسجيل الدخول';
        }
    });

    // استدعاء دالة تحميل المستخدمين عند بدء تشغيل الصفحة
    loadUsers();
});

class AppStateManager {
    constructor() {
        this._currentUser = null;
        this._activeShift = null;
        this._settings = null; // جديد: متغير لتخزين الإعدادات
        // يمكن إضافة المزيد من خصائص الحالة هنا
    }

    /**
     * تعيين المستخدم الحالي.
     * @param {object} user - كائن المستخدم الحالي.
     */
    setCurrentUser(user) {
        this._currentUser = user;
        console.log("AppState: Current user set to", user.username);
    }

    /**
     * جلب المستخدم الحالي.
     * @returns {object} المستخدم الحالي.
     */
    getCurrentUser() {
        return this._currentUser;
    }

    /**
     * تعيين الوردية النشطة.
     * @param {object} shift - كائن الوردية النشطة.
     */
    setActiveShift(shift) {
        this._activeShift = shift;
        console.log("AppState: Active shift set to", shift ? shift.id : "null");
    }

    /**
     * جلب الوردية النشطة.
     * @returns {object} الوردية النشطة.
     */
    getActiveShift() {
        return this._activeShift;
    }

    // جديد: وظائف لإدارة الإعدادات
    /**
     * تعيين إعدادات التطبيق.
     * @param {object} settings - كائن الإعدادات.
     */
    setSettings(settings) {
        this._settings = settings;
        console.log("AppState: Settings have been set.");
    }

    /**
     * جلب إعدادات التطبيق.
     * @returns {object} إعدادات التطبيق.
     */
    getSettings() {
        return this._settings;
    }

    // يمكن إضافة المزيد من الوظائف لإدارة الحالة هنا
}

// إنشاء مثيل واحد لكائن إدارة الحالة وتصديره
const AppState = new AppStateManager();

window.AppState = AppState;

export default AppState; // تصدير المثيل للاستخدام في ES Modules

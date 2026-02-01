// ===============================================
// نظام إدارة الطلبات المحسّن
// ===============================================

// ⚠️ مهم: استبدل هذا الرابط بالرابط الخاص بك
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqs_uG2C1iD6ZFJfCs1jp_LTsfpKBffUjmdgchOS_l3o4OJmAsWb8BinKsEskoaLXS/exec';

// إعدادات النظام
const CONFIG = {
    autoSaveInterval: 30000, // حفظ تلقائي كل 30 ثانية
    deviceIdKey: 'sadah_device_id',
    tempDataKey: 'sadah_temp_data',
    requestsKey: 'sadah_my_requests',
    lastSaveKey: 'sadah_last_save',
};

// معرّف الجهاز الفريد
let deviceId = null;
let autoSaveTimer = null;
let isOnline = navigator.onLine;
let hasUnsavedChanges = false; // تتبع التغييرات غير المحفوظة
let lastFormData = ''; // للمقارنة

// ===============================================
// التهيئة عند تحميل الصفحة
// ===============================================
window.addEventListener('load', function() {
    initializeApp();
});

function initializeApp() {
    // إنشاء أو استرجاع معرّف الجهاز
    deviceId = getOrCreateDeviceId();
    document.getElementById('deviceId').value = deviceId;
    
    // عرض التاريخ
    displayCurrentDate();
    
    // استرجاع البيانات المحفوظة
    loadSavedData();
    
    // تحديث عداد الطلبات
    updateRequestCount();
    
    // تفعيل الحفظ التلقائي
    startAutoSave();
    
    // مراقبة حالة الإنترنت
    setupNetworkMonitoring();
    
    // معالجة إرسال النموذج
    setupFormSubmission();
    
    // التحقق من وجود معامل تعديل في الرابط
    checkForEditMode();
}

// ===============================================
// إدارة معرّف الجهاز
// ===============================================
function getOrCreateDeviceId() {
    let id = localStorage.getItem(CONFIG.deviceIdKey);
    if (!id) {
        id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(CONFIG.deviceIdKey, id);
    }
    return id;
}

// ===============================================
// عرض التاريخ الحالي
// ===============================================
function displayCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const dateStr = now.toLocaleDateString('ar-SA', options);
    document.getElementById('currentDate').textContent = dateStr;
}

// ===============================================
// الحفظ التلقائي
// ===============================================
function startAutoSave() {
    // حفظ البيانات الحالية للمقارنة
    lastFormData = JSON.stringify(collectFormData());
    
    // حفظ عند أي تغيير في الحقول
    const form = document.getElementById('applicationForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            hasUnsavedChanges = true;
            debouncedAutoSave();
        });
    });
    
    // حفظ دوري كل 30 ثانية - فقط إذا كان هناك تغييرات
    autoSaveTimer = setInterval(() => {
        if (hasUnsavedChanges) {
            autoSaveFormData();
        }
    }, CONFIG.autoSaveInterval);
}

// تأخير الحفظ لتجنب الحفظ المتكرر
let saveTimeout = null;
function debouncedAutoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        autoSaveFormData();
    }, 2000); // انتظر ثانيتين بعد آخر تغيير
}

function autoSaveFormData() {
    const formData = collectFormData();
    const currentFormData = JSON.stringify(formData);
    
    // التحقق من وجود تغييرات فعلية
    if (currentFormData === lastFormData) {
        return; // لا توجد تغييرات، لا تعرض التنبيه
    }
    
    // حفظ في localStorage
    localStorage.setItem(CONFIG.tempDataKey, JSON.stringify(formData));
    localStorage.setItem(CONFIG.lastSaveKey, new Date().toISOString());
    
    // تحديث البيانات الأخيرة
    lastFormData = currentFormData;
    hasUnsavedChanges = false;
    
    // إظهار مؤشر الحفظ
    showAutosaveIndicator();
}

function manualSave() {
    autoSaveFormData();
    alert('✓ تم حفظ البيانات مؤقتاً!\n\nستبقى بياناتك محفوظة حتى مع انقطاع الإنترنت.');
}

function showAutosaveIndicator() {
    const indicator = document.getElementById('autosaveIndicator');
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// ===============================================
// جمع بيانات النموذج
// ===============================================
function collectFormData() {
    const form = document.getElementById('applicationForm');
    const data = {};
    
    // جمع جميع الحقول النصية والأرقام والهاتف
    const textInputs = form.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"], input[type="email"], select, textarea');
    textInputs.forEach(input => {
        if (input.name) {
            data[input.name] = input.value;
        }
    });
    
    return data;
}

// ===============================================
// استرجاع البيانات المحفوظة
// ===============================================
function loadSavedData() {
    const savedData = localStorage.getItem(CONFIG.tempDataKey);
    const lastSave = localStorage.getItem(CONFIG.lastSaveKey);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        const form = document.getElementById('applicationForm');
        
        // استرجاع القيم
        Object.keys(data).forEach(key => {
            const input = form.elements[key];
            if (input && data[key]) {
                input.value = data[key];
            }
        });
        
        // إظهار رسالة
        if (lastSave) {
            const saveDate = new Date(lastSave);
            const timeAgo = getTimeAgo(saveDate);
            console.log(`✓ تم استرجاع البيانات المحفوظة (آخر حفظ: ${timeAgo})`);
        }
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'منذ لحظات';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
}

// ===============================================
// مراقبة حالة الشبكة
// ===============================================
function setupNetworkMonitoring() {
    updateNetworkStatus();
    
    window.addEventListener('online', () => {
        isOnline = true;
        updateNetworkStatus();
        
        // محاولة إرسال البيانات المحفوظة
        const tempData = localStorage.getItem(CONFIG.tempDataKey);
        if (tempData) {
            console.log('✓ الاتصال عاد! يمكنك الآن إرسال الطلب.');
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        updateNetworkStatus();
        console.log('⚠ انقطع الاتصال بالإنترنت. سيتم حفظ بياناتك محلياً.');
    });
}

function updateNetworkStatus() {
    const statusElement = document.getElementById('networkStatus');
    const textElement = document.getElementById('networkText');
    
    if (isOnline) {
        statusElement.className = 'network-status online';
        textElement.textContent = 'متصل';
    } else {
        statusElement.className = 'network-status offline';
        textElement.textContent = 'غير متصل';
    }
}

// ===============================================
// معالجة إرسال النموذج
// ===============================================
function setupFormSubmission() {
    document.getElementById('applicationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const successMsg = document.getElementById('successMessage');
        const errorMsg = document.getElementById('errorMessage');
        
        // التحقق من الاتصال
        if (!isOnline) {
            alert('⚠️ لا يوجد اتصال بالإنترنت!\n\nسيتم حفظ بياناتك محلياً. يمكنك إرسال الطلب عند عودة الاتصال.');
            autoSaveFormData();
            return;
        }
        
        // التحقق من إعداد رابط Google Script
        if (GOOGLE_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
            alert('⚠️ يرجى إعداد رابط Google Apps Script أولاً!');
            return;
        }
        
        // إخفاء الرسائل السابقة
        successMsg.style.display = 'none';
        errorMsg.style.display = 'none';
        
        // إظهار التحميل
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitText.textContent = 'جاري الإرسال...';

        try {
            // جمع بيانات النموذج
            const formData = new FormData(this);
            
            // تحويل البيانات إلى كائن
            const data = collectFormData();
            
            // إضافة معلومات إضافية
            data.submissionDate = new Date().toLocaleString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            data.deviceId = deviceId;
            
            // التحقق من وضع التعديل
            const editMode = document.getElementById('editMode').value === 'true';
            const requestId = document.getElementById('requestId').value;
            
            if (editMode && requestId) {
                data.requestId = requestId;
                data.isEdit = true;
            }
            
            // معالجة الملفات (من input file)
            const files = {};
            for (let [key, value] of formData.entries()) {
                if (value instanceof File && value.size > 0) {
                    files[key] = await fileToBase64(value);
                }
            }
            
            // إضافة الصور الملتقطة بالكاميرا
            if (window.capturedFiles) {
                for (let [fieldName, fileList] of Object.entries(window.capturedFiles)) {
                    for (let i = 0; i < fileList.length; i++) {
                        const file = fileList[i];
                        const key = fileList.length > 1 ? `${fieldName}_${i+1}` : fieldName;
                        if (!files[key]) {
                            files[key] = await fileToBase64(file);
                        }
                    }
                }
            }
            
            // إرسال البيانات
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: data,
                    files: files,
                    timestamp: new Date().getTime()
                })
            });
            
            // حفظ الطلب محلياً
            saveRequestLocally(data);
            
            // إظهار رسالة النجاح
            successMsg.style.display = 'block';
            successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // مسح البيانات المحفوظة مؤقتاً
            localStorage.removeItem(CONFIG.tempDataKey);
            localStorage.removeItem(CONFIG.lastSaveKey);
            
            // تحديث عداد الطلبات
            updateRequestCount();
            
            // إعادة تعيين النموذج فوراً للاستعداد لطلب جديد
            this.reset();
            document.querySelectorAll('.file-preview').forEach(preview => {
                preview.style.display = 'none';
            });
            
            // مسح الصور الملتقطة
            if (typeof capturedImages !== 'undefined') {
                capturedImages = {};
            }
            if (typeof sliderIndexes !== 'undefined') {
                sliderIndexes = {};
            }
            window.capturedFiles = {};
            document.querySelectorAll('.captured-images').forEach(container => {
                container.innerHTML = '';
            });
            
            // إخفاء تحذير الرقم المدني
            const civilIdWarning = document.getElementById('civilIdWarning');
            if (civilIdWarning) {
                civilIdWarning.style.display = 'none';
            }
            
            // إخفاء بانر التعديل
            document.getElementById('editModeBanner').classList.remove('show');
            document.getElementById('editMode').value = 'false';
            document.getElementById('requestId').value = '';
            submitText.textContent = 'إرسال الطلب';
            
            // إعادة تعيين متغيرات الحفظ التلقائي
            lastFormData = '';
            hasUnsavedChanges = false;
            
            // إخفاء رسالة النجاح بعد فترة
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 5000);
            
        } catch (error) {
            console.error('خطأ في الإرسال:', error);
            errorMsg.style.display = 'block';
            errorMsg.textContent = '✗ حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.';
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            if (!editMode) {
                submitText.textContent = 'إرسال الطلب';
            } else {
                submitText.textContent = 'تحديث الطلب';
            }
        }
    });
}

// ===============================================
// تحويل الملف إلى base64
// ===============================================
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===============================================
// إنشاء رقم طلب تسلسلي
// ===============================================
function generateRequestId() {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    
    // الحصول على التاريخ الحالي بتنسيق YYYYMMDD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // البحث عن أعلى رقم تسلسلي لهذا اليوم
    let maxSeq = 0;
    requests.forEach(req => {
        if (req.requestId && req.requestId.startsWith(`req-${dateStr}-`)) {
            const seq = parseInt(req.requestId.split('-')[2]) || 0;
            if (seq > maxSeq) maxSeq = seq;
        }
    });
    
    // إنشاء الرقم الجديد
    const newSeq = maxSeq + 1;
    return `req-${dateStr}-${newSeq}`;
}

// ===============================================
// حفظ الطلب محلياً
// ===============================================
function saveRequestLocally(data) {
    let requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    
    // إنشاء معرّف فريد للطلب بالتنسيق الجديد
    const requestId = data.requestId || generateRequestId();
    
    // التحقق من وجود الطلب (تحديث)
    const existingIndex = requests.findIndex(r => r.requestId === requestId);
    
    const existingRequest = requests.find(r => r.requestId === requestId);
    const currentEditCount = existingRequest ? (existingRequest.editCount || 0) : 0;
    
    const requestData = {
        requestId: requestId,
        // البيانات الأساسية
        name: data.name,
        civilId: data.civilId,
        phone: data.phone,
        email: data.email || '',
        address: data.address || '',
        // تفاصيل الطلب
        requestType: data.requestType || '',
        requestDetails: data.requestDetails || '',
        familyMembers: data.familyMembers || '',
        monthlyIncome: data.monthlyIncome || '',
        employmentStatus: data.employmentStatus || '',
        // البيانات البنكية
        bankName: data.bankName || '',
        iban: data.iban || '',
        // معلومات الحالة
        submissionDate: data.submissionDate,
        status: data.isEdit ? 'edited' : 'pending',
        emailOpened: existingRequest ? existingRequest.emailOpened : false,
        emailOpenedDate: existingRequest ? existingRequest.emailOpenedDate : null,
        editCount: data.isEdit ? currentEditCount + 1 : 0,
        deviceId: deviceId,
        lastModified: new Date().toISOString(),
        // معلومات الملفات المرفقة (أسماء فقط للعرض)
        attachedFiles: getAttachedFilesInfo()
    };
    
    if (existingIndex >= 0) {
        requests[existingIndex] = requestData;
    } else {
        requests.push(requestData);
    }
    
    localStorage.setItem(CONFIG.requestsKey, JSON.stringify(requests));
}

// الحصول على معلومات الملفات المرفقة
function getAttachedFilesInfo() {
    const files = {};
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
        if (input.files && input.files.length > 0) {
            files[input.name] = Array.from(input.files).map(f => f.name);
        }
    });
    
    // إضافة الصور الملتقطة
    if (window.capturedFiles) {
        for (const [fieldName, fileList] of Object.entries(window.capturedFiles)) {
            if (fileList.length > 0) {
                files[fieldName] = (files[fieldName] || []).concat(
                    fileList.map(f => f.name)
                );
            }
        }
    }
    
    return files;
}

// عرض معلومات الملفات المرفقة سابقاً
function displayPreviousFiles(attachedFiles) {
    if (!attachedFiles || Object.keys(attachedFiles).length === 0) return;
    
    for (const [fieldName, fileNames] of Object.entries(attachedFiles)) {
        if (!fileNames || fileNames.length === 0) continue;
        
        // البحث عن حقل الملف
        const fileInput = document.querySelector(`input[name="${fieldName}"]`);
        if (!fileInput) continue;
        
        const uploadItem = fileInput.closest('.upload-item');
        if (!uploadItem) continue;
        
        // عرض في preview div
        let previewDiv = uploadItem.querySelector('.file-preview');
        if (!previewDiv) {
            previewDiv = document.createElement('div');
            previewDiv.className = 'file-preview';
            uploadItem.appendChild(previewDiv);
        }
        
        // تنسيق أسماء الملفات
        const filesText = Array.isArray(fileNames) ? fileNames.join('، ') : fileNames;
        previewDiv.innerHTML = `<span style="color: #17a2b8;">📎 ملفات مرفقة سابقاً:</span> ${filesText}`;
        previewDiv.style.display = 'block';
        previewDiv.style.marginTop = '8px';
        previewDiv.style.padding = '8px';
        previewDiv.style.background = '#e7f5ff';
        previewDiv.style.borderRadius = '6px';
        previewDiv.style.fontSize = '0.85em';
        
        // عرض في container الصور إذا وجد
        const imagesContainer = document.getElementById(`${fieldName}-images`);
        if (imagesContainer) {
            imagesContainer.innerHTML = `
                <div style="background: #f8f9fa; padding: 8px 12px; border-radius: 6px; border: 1px solid #e9ecef; font-size: 0.85em; color: #666;">
                    📎 ${Array.isArray(fileNames) ? fileNames.length : 1} ملف مرفق سابقاً
                </div>
            `;
        }
    }
}

// ===============================================
// عرض الطلبات المرسلة
// ===============================================
function toggleMyRequests() {
    const section = document.getElementById('myRequestsSection');
    section.classList.toggle('show');
    
    if (section.classList.contains('show')) {
        displayMyRequests();
    }
}

function displayMyRequests() {
    const requestsList = document.getElementById('requestsList');
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    
    if (requests.length === 0) {
        requestsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <p style="font-size: 1.2em;">📋</p>
                <p>لا توجد طلبات مرسلة بعد</p>
            </div>
        `;
        return;
    }
    
    // ترتيب الطلبات من الأحدث للأقدم
    requests.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    requestsList.innerHTML = requests.map(request => `
        <div class="request-card">
            <div class="request-status ${getStatusClass(request)}">
                ${getStatusText(request)}
            </div>
            ${request.editCount > 0 ? '<div class="edited-badge">طلب معدّل</div>' : ''}
            
            <div class="request-info">
                <strong>الاسم:</strong> ${request.name}
            </div>
            <div class="request-info">
                <strong>الرقم المدني:</strong> ${request.civilId}
            </div>
            <div class="request-info">
                <strong>رقم الهاتف:</strong> ${request.phone}
            </div>
            <div class="request-info">
                <strong>تاريخ الإرسال:</strong> ${request.submissionDate}
            </div>
            ${request.approvedDate ? `
            <div class="request-info">
                <strong>تاريخ الاعتماد:</strong> ${request.approvedDate}
            </div>
            ` : ''}
            
            <div class="request-actions">
                <button class="btn-edit" onclick="editRequest('${request.requestId}')" ${!canEdit(request) ? 'disabled' : ''}>
                    ${canEdit(request) ? '✏️ تعديل الطلب' : '🔒 تم الاعتماد'}
                </button>
                <button class="btn-view" onclick="viewRequest('${request.requestId}')">
                    👁️ عرض التفاصيل
                </button>
            </div>
        </div>
    `).join('');
}

function updateRequestCount() {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    document.getElementById('requestCount').textContent = requests.length;
}

// ===============================================
// دوال مساعدة لعرض حالة الطلب
// ===============================================
function getStatusClass(request) {
    // التحقق من حالة الإدارة أولاً
    if (request.adminStatus === 'approved') {
        return 'status-approved';
    }
    if (request.adminStatus === 'rejected') {
        return 'status-rejected';
    }
    if (request.emailOpened) {
        return 'status-sent';
    }
    if (request.editCount > 0) {
        return 'status-edited';
    }
    return 'status-pending';
}

function getStatusText(request) {
    // التحقق من حالة الإدارة أولاً
    if (request.adminStatus === 'approved') {
        return 'تم اعتماد الطلب ✓';
    }
    if (request.adminStatus === 'rejected') {
        return 'تم رفض الطلب';
    }
    if (request.emailOpened) {
        return 'تم الإرسال - يتم مراجعته';
    }
    if (request.editCount > 0) {
        return 'طلب معدّل - قيد المراجعة';
    }
    return 'قيد المراجعة';
}

// ===============================================
// التحقق من إمكانية التعديل
// ===============================================
function canEdit(request) {
    // لا يمكن التعديل إذا تم التعديل مسبقاً (مرة واحدة فقط)
    if (request.editCount >= 1) {
        return false;
    }
    return true;
}

// ===============================================
// تعديل طلب
// ===============================================
function editRequest(requestId) {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    const request = requests.find(r => r.requestId === requestId);
    
    if (!request) {
        alert('لم يتم العثور على الطلب');
        return;
    }
    
    if (!canEdit(request)) {
        alert('لا يمكن تعديل هذا الطلب.\n\nتم استنفاد عدد مرات التعديل المسموحة (مرة واحدة فقط).');
        return;
    }
    
    // تفعيل وضع التعديل
    document.getElementById('editMode').value = 'true';
    document.getElementById('requestId').value = requestId;
    
    // إظهار بانر التعديل
    const banner = document.getElementById('editModeBanner');
    document.getElementById('editRequestNumber').textContent = requestId;
    banner.classList.add('show');
    
    // تغيير نص زر الإرسال
    document.getElementById('submitText').textContent = 'تحديث الطلب';
    
    // ملء النموذج بالبيانات المحفوظة
    fillFormWithRequestData(request);
    
    // إغلاق قسم الطلبات
    document.getElementById('myRequestsSection').classList.remove('show');
    
    // التمرير للنموذج
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===============================================
// ملء النموذج ببيانات الطلب السابق
// ===============================================
function fillFormWithRequestData(request) {
    // ملء الحقول النصية الأساسية
    const fieldMappings = {
        'name': 'name',
        'civilId': 'civilId',
        'phone': 'phone',
        'email': 'email',
        'address': 'address',
        'requestType': 'requestType',
        'requestDetails': 'requestDetails',
        'familyMembers': 'familyMembers',
        'monthlyIncome': 'monthlyIncome',
        'employmentStatus': 'employmentStatus',
        'bankName': 'bankName',
        'iban': 'iban'
    };
    
    for (const [formField, dataField] of Object.entries(fieldMappings)) {
        const element = document.getElementById(formField) || document.querySelector(`[name="${formField}"]`);
        if (element && request[dataField]) {
            element.value = request[dataField];
        }
    }
    
    // ملء بيانات أفراد العائلة إذا وجدت
    if (request.familyData && Array.isArray(request.familyData)) {
        // سيتم التعامل معها لاحقاً إذا كانت موجودة
    }
    
    // عرض معلومات الملفات المرفقة سابقاً
    if (request.attachedFiles) {
        displayPreviousFiles(request.attachedFiles);
    }
}

// ===============================================
// عرض تفاصيل طلب
// ===============================================
function viewRequest(requestId) {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    const request = requests.find(r => r.requestId === requestId);
    
    if (!request) {
        alert('❌ لم يتم العثور على الطلب!');
        return;
    }
    
    const details = `
📋 تفاصيل الطلب

رقم الطلب: ${requestId}
الاسم: ${request.name}
الرقم المدني: ${request.civilId}
رقم الهاتف: ${request.phone}
تاريخ الإرسال: ${request.submissionDate}
الحالة: ${request.approved ? 'معتمد ✓' : 'قيد المراجعة ⏳'}
${request.approvedDate ? `تاريخ الاعتماد: ${request.approvedDate}` : ''}

${!request.approved ? '\n💡 يمكنك تعديل هذا الطلب طالما لم يتم اعتماده.' : ''}
    `;
    
    alert(details);
}

// ===============================================
// التحقق من وضع التعديل في الرابط
// ===============================================
function checkForEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
        editRequest(editId);
    }
}

// ===============================================
// معاينة الملف المرفوع
// ===============================================
function showFilePreview(input) {
    const preview = input.nextElementSibling;
    if (input.files.length > 0) {
        const fileNames = Array.from(input.files).map(f => f.name).join(', ');
        preview.textContent = `✓ تم اختيار: ${fileNames}`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

// ===============================================
// إعادة تعيين النموذج
// ===============================================
function resetForm() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
        document.getElementById('applicationForm').reset();
        localStorage.removeItem(CONFIG.tempDataKey);
        localStorage.removeItem(CONFIG.lastSaveKey);
        
        document.querySelectorAll('.file-preview').forEach(preview => {
            preview.style.display = 'none';
        });
        
        // مسح الصور الملتقطة
        capturedImages = {};
        window.capturedFiles = {};
        document.querySelectorAll('.captured-images').forEach(container => {
            container.innerHTML = '';
        });
        
        // إخفاء تحذير الرقم المدني
        const civilIdWarning = document.getElementById('civilIdWarning');
        if (civilIdWarning) {
            civilIdWarning.style.display = 'none';
        }
        
        // إخفاء وضع التعديل
        document.getElementById('editModeBanner').classList.remove('show');
        document.getElementById('editMode').value = 'false';
        document.getElementById('requestId').value = '';
        document.getElementById('submitText').textContent = 'إرسال الطلب';
        
        // إعادة تعيين متغيرات الحفظ التلقائي
        lastFormData = '';
        hasUnsavedChanges = false;
    }
}

// ===============================================
// تحذير قبل إغلاق الصفحة
// ===============================================
window.addEventListener('beforeunload', function(e) {
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    let hasData = false;
    
    for (let [key, value] of formData.entries()) {
        if (value && value !== '') {
            hasData = true;
            break;
        }
    }
    
    if (hasData) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ===============================================
// دالة محاكاة لاعتماد الطلب (للاختبار فقط)
// ===============================================
function simulateApproval(requestId) {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    const request = requests.find(r => r.requestId === requestId);
    
    if (request) {
        request.approved = true;
        request.status = 'approved';
        request.approvedDate = new Date().toLocaleString('ar-SA');
        localStorage.setItem(CONFIG.requestsKey, JSON.stringify(requests));
        
        alert('✓ تم اعتماد الطلب!\n\nلن يكون بالإمكان تعديله بعد الآن.');
        displayMyRequests();
    }
}

// ===============================================
// نظام الكاميرا لتصوير المستندات
// ===============================================
let currentCameraField = null;
let cameraStream = null;
let capturedImages = {}; // تخزين الصور الملتقطة لكل حقل
let sliderIndexes = {}; // تتبع الصورة الحالية في كل slider

function openCamera(fieldName) {
    currentCameraField = fieldName;
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');
    const preview = document.getElementById('cameraPreview');
    const header = document.getElementById('cameraHeader');
    
    // تحديث العنوان
    header.textContent = getFieldLabel(fieldName);
    
    // إخفاء المعاينة وإظهار الفيديو
    video.style.display = 'block';
    preview.style.display = 'none';
    
    // إعادة تعيين الأزرار
    document.getElementById('captureBtn').style.display = 'inline-block';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('usePhotoBtn').style.display = 'none';
    
    // فتح الكاميرا بالحجم الطبيعي (1x zoom)
    const constraints = {
        video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            aspectRatio: { ideal: 4/3 },
            // منع التكبير التلقائي
            advanced: [{ zoom: 1.0 }]
        }
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        cameraStream = stream;
        video.srcObject = stream;
        
        // محاولة ضبط zoom إلى 1x إذا كان مدعوماً
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.zoom) {
            track.applyConstraints({ advanced: [{ zoom: 1.0 }] }).catch(() => {});
        }
        
        modal.classList.add('show');
    })
    .catch(err => {
        console.error('خطأ في فتح الكاميرا:', err);
        alert('لا يمكن الوصول إلى الكاميرا.\n\nتأكد من السماح للموقع بالوصول للكاميرا.');
    });
}

function getFieldLabel(fieldName) {
    const labels = {
        'requestLetter': 'رسالة التقديم',
        'personalId': 'البطاقة الشخصية',
        'bankCard': 'بطاقة البنك',
        'familyIds': 'بطاقات العائلة'
    };
    return labels[fieldName] || 'تصوير المستند';
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const preview = document.getElementById('cameraPreview');
    
    // ضبط حجم الكانفاس بناءً على حجم الفيديو الفعلي
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    
    // رسم الصورة
    ctx.drawImage(video, 0, 0);
    
    // تحسين الصورة للمستندات
    enhanceDocumentImage(ctx, canvas.width, canvas.height);
    
    // تحويل إلى صورة بجودة عالية
    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    preview.src = imageData;
    
    // إخفاء الفيديو وإظهار المعاينة
    video.style.display = 'none';
    preview.style.display = 'block';
    
    // تحديث الأزرار
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'inline-block';
    document.getElementById('usePhotoBtn').style.display = 'inline-block';
}

function enhanceDocumentImage(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // تحسينات للمستندات: زيادة التباين وتفتيح الخلفية
    const contrast = 1.15;
    const brightness = 8;
    const saturation = 0.9; // تقليل التشبع قليلاً للمستندات
    
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // تقليل التشبع
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + saturation * (r - gray);
        g = gray + saturation * (g - gray);
        b = gray + saturation * (b - gray);
        
        // تطبيق التباين والسطوع
        data[i] = Math.min(255, Math.max(0, ((r - 128) * contrast) + 128 + brightness));
        data[i + 1] = Math.min(255, Math.max(0, ((g - 128) * contrast) + 128 + brightness));
        data[i + 2] = Math.min(255, Math.max(0, ((b - 128) * contrast) + 128 + brightness));
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function retakePhoto() {
    const video = document.getElementById('cameraVideo');
    const preview = document.getElementById('cameraPreview');
    
    video.style.display = 'block';
    preview.style.display = 'none';
    
    document.getElementById('captureBtn').style.display = 'inline-block';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('usePhotoBtn').style.display = 'none';
}

function usePhoto() {
    const preview = document.getElementById('cameraPreview');
    const imageData = preview.src;
    
    // تخزين الصورة
    if (!capturedImages[currentCameraField]) {
        capturedImages[currentCameraField] = [];
    }
    capturedImages[currentCameraField].push(imageData);
    
    // تهيئة index الـ slider
    if (sliderIndexes[currentCameraField] === undefined) {
        sliderIndexes[currentCameraField] = 0;
    }
    sliderIndexes[currentCameraField] = capturedImages[currentCameraField].length - 1;
    
    // عرض الصور في slider
    displayCapturedImagesSlider(currentCameraField);
    
    // تحويل الصورة إلى ملف
    addImageToFileInput(currentCameraField, imageData);
    
    // إغلاق الكاميرا
    closeCamera();
}

function displayCapturedImagesSlider(fieldName) {
    const container = document.getElementById(`${fieldName}-images`);
    if (!container) return;
    
    const images = capturedImages[fieldName] || [];
    
    if (images.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    // التأكد من أن الـ index ضمن النطاق الصحيح
    if (sliderIndexes[fieldName] === undefined || sliderIndexes[fieldName] < 0) {
        sliderIndexes[fieldName] = 0;
    }
    if (sliderIndexes[fieldName] >= images.length) {
        sliderIndexes[fieldName] = images.length - 1;
    }
    
    const currentIndex = sliderIndexes[fieldName];
    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < images.length - 1;
    
    container.innerHTML = `
        <div class="images-slider">
            <button type="button" class="slider-nav" onclick="sliderPrev('${fieldName}')" ${!canGoPrev ? 'disabled' : ''}>
                ‹
            </button>
            <div class="slider-content">
                <div class="slider-image-container">
                    <img src="${images[currentIndex]}" class="slider-image" onclick="viewFullImage('${fieldName}', ${currentIndex})">
                    <button type="button" class="slider-remove" onclick="removeCapturedImage('${fieldName}', ${currentIndex})">×</button>
                </div>
                <span class="slider-counter">${currentIndex + 1}/${images.length}</span>
            </div>
            <button type="button" class="slider-nav" onclick="sliderNext('${fieldName}')" ${!canGoNext ? 'disabled' : ''}>
                ›
            </button>
            <button type="button" class="slider-add-more" onclick="openCamera('${fieldName}')" title="إضافة صورة">+</button>
        </div>
    `;
}

function sliderPrev(fieldName) {
    if (sliderIndexes[fieldName] > 0) {
        sliderIndexes[fieldName]--;
        displayCapturedImagesSlider(fieldName);
    }
}

function sliderNext(fieldName) {
    const images = capturedImages[fieldName] || [];
    if (sliderIndexes[fieldName] < images.length - 1) {
        sliderIndexes[fieldName]++;
        displayCapturedImagesSlider(fieldName);
    }
}

function viewFullImage(fieldName, index) {
    const images = capturedImages[fieldName] || [];
    if (images[index]) {
        window.open(images[index], '_blank');
    }
}

function removeCapturedImage(fieldName, index) {
    capturedImages[fieldName].splice(index, 1);
    
    // تحديث الملفات المخزنة
    if (window.capturedFiles && window.capturedFiles[fieldName]) {
        window.capturedFiles[fieldName].splice(index, 1);
    }
    
    // تعديل index إذا لزم الأمر
    if (sliderIndexes[fieldName] >= capturedImages[fieldName].length) {
        sliderIndexes[fieldName] = Math.max(0, capturedImages[fieldName].length - 1);
    }
    
    displayCapturedImagesSlider(fieldName);
    updateFilePreview(fieldName);
}

function updateFilePreview(fieldName) {
    const fileInput = document.querySelector(`input[name="${fieldName}"]`);
    if (fileInput) {
        const previewDiv = fileInput.closest('.upload-item').querySelector('.file-preview');
        if (previewDiv) {
            const count = (window.capturedFiles && window.capturedFiles[fieldName]) ? 
                          window.capturedFiles[fieldName].length : 0;
            if (count > 0) {
                previewDiv.textContent = `${count} صورة ملتقطة`;
                previewDiv.style.display = 'block';
            } else {
                previewDiv.style.display = 'none';
            }
        }
    }
}

function addImageToFileInput(fieldName, imageData) {
    // تحويل base64 إلى Blob
    const byteString = atob(imageData.split(',')[1]);
    const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `scan_${fieldName}_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    // تخزين الملف
    if (!window.capturedFiles) {
        window.capturedFiles = {};
    }
    if (!window.capturedFiles[fieldName]) {
        window.capturedFiles[fieldName] = [];
    }
    window.capturedFiles[fieldName].push(file);
    
    updateFilePreview(fieldName);
}

function closeCamera() {
    const modal = document.getElementById('cameraModal');
    modal.classList.remove('show');
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    currentCameraField = null;
}

// ===============================================
// التحقق من وجود طلب سابق لنفس الرقم المدني
// ===============================================
let lastCheckedCivilId = '';

function checkPreviousCivilIdRequest() {
    const civilIdInput = document.getElementById('civilId');
    if (!civilIdInput) return;
    
    // إخفاء التنبيه فوراً عند الكتابة
    civilIdInput.addEventListener('input', function() {
        const warningDiv = document.getElementById('civilIdWarning');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    });
    
    // التحقق عند مغادرة الحقل
    civilIdInput.addEventListener('blur', function() {
        checkCivilIdAndShowWarning(this.value.trim());
    });
}

function checkCivilIdAndShowWarning(civilId) {
    const warningDiv = document.getElementById('civilIdWarning') || createWarningDiv();
    
    // إخفاء التنبيه إذا كان الحقل فارغاً
    if (!civilId) {
        warningDiv.style.display = 'none';
        lastCheckedCivilId = '';
        return;
    }
    
    // تجنب التحقق المتكرر لنفس الرقم
    if (civilId === lastCheckedCivilId) {
        return;
    }
    lastCheckedCivilId = civilId;
    
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    
    // التحقق من وضع التعديل - لا نظهر تنبيه للطلب الحالي
    const currentRequestId = document.getElementById('requestId')?.value;
    const existingRequest = requests.find(r => r.civilId === civilId && r.requestId !== currentRequestId);
    
    if (existingRequest) {
        warningDiv.innerHTML = `تنبيه: يوجد طلب سابق بهذا الرقم المدني (${existingRequest.requestId})`;
        warningDiv.style.display = 'block';
    } else {
        warningDiv.style.display = 'none';
    }
}

function createWarningDiv() {
    const civilIdInput = document.getElementById('civilId');
    const warningDiv = document.createElement('div');
    warningDiv.id = 'civilIdWarning';
    warningDiv.style.cssText = 'background: #fff3cd; color: #856404; padding: 10px; border-radius: 8px; margin-top: 8px; font-size: 0.9em; display: none;';
    civilIdInput.parentNode.appendChild(warningDiv);
    return warningDiv;
}

// تفعيل التحقق عند تحميل الصفحة
window.addEventListener('load', function() {
    setTimeout(checkPreviousCivilIdRequest, 100);
});

// ===============================================
// البحث عن طلب
// ===============================================
function searchRequest() {
    const searchInput = document.getElementById('searchRequestInput');
    const resultDiv = document.getElementById('searchResult');
    const searchValue = searchInput.value.trim();
    
    if (!searchValue) {
        resultDiv.className = 'search-result';
        resultDiv.style.display = 'none';
        return;
    }
    
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    
    // البحث برقم الطلب أو الرقم المدني
    const foundRequest = requests.find(r => 
        r.requestId === searchValue || 
        r.civilId === searchValue ||
        r.requestId?.includes(searchValue) ||
        r.civilId?.includes(searchValue)
    );
    
    if (foundRequest) {
        const statusText = getStatusText(foundRequest);
        const canEditRequest = canEdit(foundRequest);
        
        let editButton = '';
        if (canEditRequest) {
            editButton = `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #c3e6cb;">
                    <button type="button" onclick="editRequestFromSearch('${foundRequest.requestId}')" 
                        style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: 'Tajawal', sans-serif;">
                        تعديل الطلب
                    </button>
                    <div style="font-size: 0.8em; color: #666; margin-top: 6px;">
                        ⚠️ التعديل متاح لمرة واحدة فقط
                    </div>
                </div>
            `;
        } else {
            editButton = `
                <div style="margin-top: 10px; font-size: 0.85em; color: #856404;">
                    🔒 تم استخدام فرصة التعديل المتاحة
                </div>
            `;
        }
        
        resultDiv.className = 'search-result found';
        resultDiv.innerHTML = `
            <strong>تم العثور على الطلب</strong><br>
            رقم الطلب: ${foundRequest.requestId}<br>
            الاسم: ${foundRequest.name}<br>
            الحالة: ${statusText}<br>
            تاريخ الإرسال: ${foundRequest.submissionDate}
            ${editButton}
        `;
    } else {
        resultDiv.className = 'search-result not-found';
        resultDiv.innerHTML = 'لم يتم العثور على طلب بهذا الرقم';
    }
}

// تعديل الطلب من نتيجة البحث
function editRequestFromSearch(requestId) {
    const requests = JSON.parse(localStorage.getItem(CONFIG.requestsKey) || '[]');
    const request = requests.find(r => r.requestId === requestId);
    
    if (!request) {
        alert('لم يتم العثور على الطلب');
        return;
    }
    
    if (!canEdit(request)) {
        alert('لا يمكن تعديل هذا الطلب.\n\nتم استنفاد عدد مرات التعديل المسموحة (مرة واحدة فقط).');
        return;
    }
    
    // تفعيل وضع التعديل
    document.getElementById('editMode').value = 'true';
    document.getElementById('requestId').value = requestId;
    
    // إظهار بانر التعديل
    const banner = document.getElementById('editModeBanner');
    document.getElementById('editRequestNumber').textContent = requestId;
    banner.classList.add('show');
    
    // تغيير نص زر الإرسال
    document.getElementById('submitText').textContent = 'تحديث الطلب';
    
    // ملء النموذج بالبيانات المحفوظة
    fillFormWithRequestData(request);
    
    // إخفاء نتيجة البحث
    document.getElementById('searchResult').style.display = 'none';
    document.getElementById('searchRequestInput').value = '';
    
    // التمرير للنموذج
    window.scrollTo({ top: document.querySelector('.form-section').offsetTop - 20, behavior: 'smooth' });
}

// البحث عند الضغط على Enter
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchRequestInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchRequest();
            }
        });
    }
});

// ===============================================
// تصدير الدوال للاستخدام العام
// ===============================================
window.toggleMyRequests = toggleMyRequests;
window.editRequest = editRequest;
window.viewRequest = viewRequest;
window.manualSave = manualSave;
window.resetForm = resetForm;
window.showFilePreview = showFilePreview;
window.simulateApproval = simulateApproval;
window.openCamera = openCamera;
window.capturePhoto = capturePhoto;
window.retakePhoto = retakePhoto;
window.usePhoto = usePhoto;
window.closeCamera = closeCamera;
window.sliderPrev = sliderPrev;
window.sliderNext = sliderNext;
window.viewFullImage = viewFullImage;
window.removeCapturedImage = removeCapturedImage;
window.searchRequest = searchRequest;
window.editRequestFromSearch = editRequestFromSearch;
window.toggleOtherBank = toggleOtherBank;

// ===============================================
// إظهار/إخفاء حقل البنك الآخر
// ===============================================
function toggleOtherBank() {
    const bankSelect = document.getElementById('bankName');
    const otherBankInput = document.getElementById('otherBankName');
    
    if (bankSelect.value === 'other') {
        otherBankInput.style.display = 'block';
        otherBankInput.required = true;
        otherBankInput.focus();
    } else {
        otherBankInput.style.display = 'none';
        otherBankInput.required = false;
        otherBankInput.value = '';
    }
}
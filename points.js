// points.js

// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
    apiKey: "AIzaSyAo4IaLd5SfVYHAAp_noJD7ZXBbhdVx9-0",
    authDomain: "fawakihyallalive.firebaseapp.com",
    databaseURL: "https://fawakihyallalive-default-rtdb.firebaseio.com",
    projectId: "fawakihyallalive",
    storageBucket: "fawakihyallalive.firebasestorage.app",
    messagingSenderId: "917478913649",
    appId: "1:917478913649:web:YOUR_WEB_APP_ID" // يتطلب إضافة تطبيق ويب من لوحة تحكم فايربيس
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// دالة لتوليد رقم بطاقة عشوائي من 16 رقم
function generateCardNumber() {
    let cardNum = '';
    for (let i = 0; i < 16; i++) {
        cardNum += Math.floor(Math.random() * 10).toString();
    }
    return cardNum;
}

// تسجيل الدخول باستخدام جوجل
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
        alert("حدث خطأ أثناء تسجيل الدخول: " + error.message);
    });
}

// تسجيل الخروج
function logout() {
    auth.signOut();
}

// مراقبة حالة المستخدم (تسجيل الدخول / الخروج)
auth.onAuthStateChanged((user) => {
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');
    
    if (user && loginSection && appSection) {
        loginSection.style.display = 'none';
        appSection.style.display = 'block';
        
        const userRef = db.ref('users/' + user.uid);
        userRef.once('value').then((snapshot) => {
            if (!snapshot.exists()) {
                // مستخدم جديد: إنشاء حساب وبطاقة جديدة
                const newCardNumber = generateCardNumber();
                const userData = {
                    name: user.displayName,
                    email: user.email,
                    photo: user.photoURL,
                    cardNumber: newCardNumber,
                    balance: 0 // 1 نقطة = 1 دولار
                };
                
                userRef.set(userData);
                // حفظ مرجع البطاقة للبحث عنها في لوحة الأدمن
                db.ref('cards/' + newCardNumber).set(user.uid);
                updateUI(userData);
            } else {
                // مستخدم موجود مسبقاً
                updateUI(snapshot.val());
                // الاستماع لتحديثات الرصيد المباشرة
                userRef.on('value', (snap) => {
                    updateUI(snap.val());
                });
            }
        });
    } else if (loginSection && appSection) {
        loginSection.style.display = 'block';
        appSection.style.display = 'none';
    }
});

// تحديث واجهة المستخدم بالبيانات
function updateUI(userData) {
    if(document.getElementById('user-name')) {
        document.getElementById('user-name').innerText = userData.name;
        document.getElementById('user-photo').src = userData.photo;
        // تنسيق رقم البطاقة ليظهر 4 أرقام بكل مجموعة
        const formattedCard = userData.cardNumber.match(/.{1,4}/g).join(' ');
        document.getElementById('card-number').innerText = formattedCard;
        document.getElementById('user-balance').innerText = userData.balance + " USD";
    }
}

// دالة شراء الكوينزات (خصم الرصيد)
function purchaseCoins(price, coins) {
    const yallaId = document.getElementById('yalla-id').value;
    if (!yallaId) {
        alert("يرجى إدخال معرف يلا (ID) الخاص بك أولاً.");
        return;
    }

    const user = auth.currentUser;
    if (user) {
        const userRef = db.ref('users/' + user.uid);
        userRef.once('value').then((snapshot) => {
            const userData = snapshot.val();
            if (userData.balance >= price) {
                const newBalance = userData.balance - price;
                userRef.update({ balance: newBalance }).then(() => {
                    alert(`تم شحن ${coins} كوينز بنجاح إلى المعرف ${yallaId}! الرصيد المتبقي: ${newBalance} USD`);
                    // هنا يمكنك إضافة كود إرسال طلب الشحن إلى سيرفر يلا لايف (API) الخاص بك
                });
            } else {
                alert("رصيد البطاقة غير كافٍ. يرجى شحن بطاقتك!");
            }
        });
    }
}

// وظائف لوحة تحكم الأدمن
function adminChargeCard() {
    const cardInput = document.getElementById('admin-card-number').value.replace(/\s+/g, '');
    const amountInput = parseInt(document.getElementById('admin-amount').value);

    if (cardInput.length !== 16 || isNaN(amountInput)) {
        alert("تأكد من إدخال رقم بطاقة صحيح (16 رقم) وقيمة الشحن.");
        return;
    }

    // البحث عن المعرف (UID) المرتبط بالبطاقة
    db.ref('cards/' + cardInput).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const uid = snapshot.val();
            const userRef = db.ref('users/' + uid);
            
            userRef.once('value').then((userSnap) => {
                const currentBalance = userSnap.val().balance || 0;
                const newBalance = currentBalance + amountInput;
                
                userRef.update({ balance: newBalance }).then(() => {
                    alert("تم شحن البطاقة بنجاح! الرصيد الجديد: " + newBalance + " USD");
                    document.getElementById('admin-card-number').value = '';
                    document.getElementById('admin-amount').value = '';
                });
            });
        } else {
            alert("رقم البطاقة غير موجود في النظام!");
        }
    });
}

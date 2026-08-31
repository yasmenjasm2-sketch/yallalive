// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
    apiKey: "AIzaSyAo4IaLd5SfVYHAAp_noJD7ZXBbhdVx9-0",
    authDomain: "fawakihyallalive.firebaseapp.com",
    databaseURL: "https://fawakihyallalive-default-rtdb.firebaseio.com",
    projectId: "fawakihyallalive",
    storageBucket: "fawakihyallalive.firebasestorage.app",
    messagingSenderId: "917478913649",
    appId: "1:917478913649:web:dummy123456" // تم وضع معرف افتراضي لنسخة الويب
};

// تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// دالة تسجيل الدخول باستخدام Google
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
        console.error("خطأ في تسجيل الدخول:", error);
    });
}

// دالة تسجيل الخروج
function logout() {
    auth.signOut();
}

// توليد رقم بطاقة مكون من 16 رقم
function generateCardNumber() {
    let card = '';
    for (let i = 0; i < 16; i++) {
        card += Math.floor(Math.random() * 10).toString();
    }
    return card;
}

// إنشاء أو جلب محفظة المستخدم
function handleUserWallet(user) {
    const userRef = db.ref('users/' + user.uid);
    userRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            // مستخدم جديد: إنشاء بطاقة ورصيد 0
            const newCardNumber = generateCardNumber();
            const userData = {
                name: user.displayName,
                photo: user.photoURL,
                cardNumber: newCardNumber,
                balance: 0 // 1 نقطة = 1 دولار
            };
            
            // حفظ بيانات المستخدم
            userRef.set(userData);
            
            // حفظ البطاقة في مسار منفصل لتسهيل بحث الأدمن
            db.ref('cards/' + newCardNumber).set({
                uid: user.uid
            });
            
            updateUserUI(userData);
        } else {
            // مستخدم مسجل مسبقاً
            updateUserUI(snapshot.val());
        }
    });
}

// مراقبة حالة تسجيل الدخول
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userSection = document.getElementById('user-section');

    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'block';
        if(userSection) userSection.style.display = 'block';
        
        handleUserWallet(user);
    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(userSection) userSection.style.display = 'none';
    }
});

// تحديث واجهة البطاقة للمستخدم
function updateUserUI(data) {
    const nameEl = document.getElementById('user-name');
    const photoEl = document.getElementById('user-photo');
    const cardEl = document.getElementById('card-number');
    const balanceEl = document.getElementById('user-balance');

    if (nameEl) nameEl.innerText = data.name;
    if (photoEl) photoEl.src = data.photo;
    
    if (cardEl) {
        // تنسيق الرقم (كل 4 أرقام مسافة)
        cardEl.innerText = data.cardNumber.match(/.{1,4}/g).join(' ');
    }
    
    if (balanceEl) balanceEl.innerText = `الرصيد: ${data.balance} دولار (نقطة)`;
}

// دالة شراء الكوينزات (للمستخدم)
function purchaseCoins(priceUSD, coinsAmount) {
    const user = auth.currentUser;
    if (!user) {
        alert("يرجى تسجيل الدخول أولاً.");
        return;
    }

    const userRef = db.ref('users/' + user.uid);
    userRef.once('value', (snapshot) => {
        const data = snapshot.val();
        if (data.balance >= priceUSD) {
            // خصم الرصيد
            const newBalance = data.balance - priceUSD;
            userRef.update({ balance: newBalance }).then(() => {
                alert(`تم شحن ${coinsAmount} كوينز بنجاح! تم خصم ${priceUSD} نقاط.`);
                handleUserWallet(user); // تحديث الواجهة
            });
        } else {
            alert("رصيد النقاط (الدولار) غير كافٍ. يرجى شحن بطاقتك.");
        }
    });
}

// دالة شحن حساب مستخدم (للأدمن)
function adminChargeWallet(cardNumber, amountUSD) {
    const cardsRef = db.ref('cards/' + cardNumber);
    
    cardsRef.once('value', (cardSnapshot) => {
        if (cardSnapshot.exists()) {
            const uid = cardSnapshot.val().uid;
            const userRef = db.ref('users/' + uid);
            
            userRef.once('value', (userSnapshot) => {
                const currentBalance = userSnapshot.val().balance || 0;
                const newBalance = currentBalance + parseInt(amountUSD);
                
                userRef.update({ balance: newBalance }).then(() => {
                    document.getElementById('admin-msg').innerHTML = `<span style="color:green;">تم شحن بطاقة ${cardNumber} بمبلغ ${amountUSD} دولار بنجاح! الرصيد الجديد: ${newBalance}</span>`;
                });
            });
        } else {
            document.getElementById('admin-msg').innerHTML = `<span style="color:red;">رقم البطاقة غير موجود! تأكد من صحة الـ 16 رقم.</span>`;
        }
    });
}

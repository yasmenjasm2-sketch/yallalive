// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAo4IaLd5SfVYHAAp_noJD7ZXBbhdVx9-0",
    authDomain: "fawakihyallalive.firebaseapp.com",
    databaseURL: "https://fawakihyallalive-default-rtdb.firebaseio.com",
    projectId: "fawakihyallalive",
    storageBucket: "fawakihyallalive.firebasestorage.app",
    messagingSenderId: "917478913649",
    appId: "1:917478913649:web:dummy123456" 
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

let currentUserData = null; // لتخزين بيانات المستخدم محلياً
let pendingPurchase = null; // لتخزين الباقة المختارة مؤقتاً

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => console.error("خطأ:", error));
}

function logout() {
    auth.signOut();
    currentUserData = null;
}

function generateCardNumber() {
    let card = '';
    for (let i = 0; i < 16; i++) {
        card += Math.floor(Math.random() * 10).toString();
    }
    return card;
}

function handleUserWallet(user) {
    const userRef = db.ref('users/' + user.uid);
    
    userRef.on('value', (snapshot) => { // استخدمنا on ليتحدث الرصيد تلقائياً
        if (!snapshot.exists()) {
            const newCardNumber = generateCardNumber();
            const userData = {
                name: user.displayName || "مستخدم جديد",
                photo: user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                cardNumber: newCardNumber,
                balance: 0 
            };
            
            userRef.set(userData).then(() => {
                db.ref('cards/' + newCardNumber).set({ uid: user.uid });
                currentUserData = userData;
                updateUserUI(userData);
            });
            
        } else {
            const data = snapshot.val();
            if(!data.photo) data.photo = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
            currentUserData = data;
            updateUserUI(data);
        }
    });
}

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

function updateUserUI(data) {
    const nameEl = document.getElementById('user-name');
    const photoEl = document.getElementById('user-photo');
    const cardEl = document.getElementById('card-number');
    const balanceEl = document.getElementById('user-balance');

    if (nameEl) nameEl.innerText = data.name;
    if (photoEl) photoEl.src = data.photo;
    if (cardEl) {
        cardEl.innerText = data.cardNumber.match(/.{1,4}/g).join(' ');
        cardEl.setAttribute('data-raw', data.cardNumber); // حفظ الرقم بدون مسافات للنسخ
    }
    if (balanceEl) balanceEl.innerText = `الرصيد: ${data.balance} دولار`;
}

// نسخ رقم البطاقة
function copyCard() {
    const cardEl = document.getElementById('card-number');
    const rawNumber = cardEl.getAttribute('data-raw');
    if(rawNumber) {
        navigator.clipboard.writeText(rawNumber).then(() => {
            alert("تم نسخ رقم البطاقة: " + rawNumber);
        });
    }
}

// إغلاق جميع النوافذ المنبثقة
function closeModals() {
    document.getElementById('id-modal').style.display = 'none';
    document.getElementById('wa-modal').style.display = 'none';
    document.getElementById('wait-modal').style.display = 'none';
    document.getElementById('yalla-id-input').value = '';
}

// بدء عملية الشراء (فحص الرصيد أولاً)
function initiatePurchase(priceUSD, coinsAmount) {
    if (!auth.currentUser || !currentUserData) {
        alert("يرجى تسجيل الدخول أولاً.");
        return;
    }

    if (currentUserData.balance >= priceUSD) {
        // الرصيد كافٍ -> أظهر نافذة إدخال الأيدي
        pendingPurchase = { priceUSD, coinsAmount };
        document.getElementById('id-modal').style.display = 'flex';
    } else {
        // الرصيد غير كافٍ -> أظهر نافذة الواتساب
        const waNumber = "905424678123";
        const message = `مرحباً، أريد شحن بطاقتي.\nرقم بطاقتي هو: ${currentUserData.cardNumber}\nأحتاج لشحن باقة ${priceUSD} دولار.`;
        document.getElementById('wa-link').href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
        document.getElementById('wa-modal').style.display = 'flex';
    }
}

// تأكيد الشراء وإرسال الطلب للتليجرام
function confirmPurchase() {
    const yallaId = document.getElementById('yalla-id-input').value.trim();
    if (!yallaId) {
        alert("يرجى إدخال الأيدي (ID) الخاص بك بشكل صحيح!");
        return;
    }

    // إخفاء نافذة الأيدي وإظهار شاشة الانتظار
    document.getElementById('id-modal').style.display = 'none';
    document.getElementById('wait-modal').style.display = 'flex';

    const userRef = db.ref('users/' + auth.currentUser.uid);
    const newBalance = currentUserData.balance - pendingPurchase.priceUSD;

    // خصم الرصيد
    userRef.update({ balance: newBalance }).then(() => {
        
        // إرسال البيانات إلى بوت التليجرام
        const botToken = "7566249177:AAF_6YijyHlkcegWberO0U9XVXzw1yHvdpM";
        const chatId = "5998250367";
        const msg = `✅ طلب شحن جديد ناجح!\n\n` +
                    `👤 اسم المستخدم: ${currentUserData.name}\n` +
                    `💳 رقم البطاقة: ${currentUserData.cardNumber}\n` +
                    `🎮 أيدي يلا لايف (ID): ${yallaId}\n` +
                    `💰 الباقة: ${pendingPurchase.coinsAmount} كوينز\n` +
                    `💵 المبلغ المخصوم: ${pendingPurchase.priceUSD} دولار\n` +
                    `💳 الرصيد المتبقي: ${newBalance} دولار`;
        
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(msg)}`;
        
        fetch(telegramUrl)
            .then(response => {
                setTimeout(() => {
                    closeModals();
                    alert(`تم استلام طلبك بنجاح! سيتم شحن حسابك (ID: ${yallaId}) قريباً.`);
                }, 3000); // محاكاة شاشة الانتظار لمدة 3 ثواني
            })
            .catch(error => {
                console.error("خطأ في التليجرام:", error);
                closeModals();
                alert("تم خصم الرصيد، ولكن حدث خطأ في إرسال الطلب للوكيل. يرجى مراجعة الدعم.");
            });

    }).catch(error => {
        closeModals();
        alert("حدث خطأ في قاعدة البيانات ولم يتم خصم الرصيد.");
    });
}
ج

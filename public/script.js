function createWallets() {
  fetch('/create-wallets', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      document.getElementById('result').innerText = data.message;
      loadWallets(); // טען מחדש
    });
}

async function loadWallets() {
  try {
    const res = await fetch('/wallets.json');
    const wallets = await res.json();
    const container = document.getElementById('wallet-list');
    container.innerHTML = '';

    wallets.forEach((wallet, index) => {
      const div = document.createElement('div');
      div.className = 'wallet-box';
      div.innerHTML = `
        <strong>🪪 ארנק A${index + 1}</strong><br>
        🔑 ${wallet.publicKey}
        <button onclick="copyToClipboard('${wallet.publicKey}')">📎 העתק</button><br>
        <button onclick="checkBalance('${wallet.publicKey}', ${index})">📊 בדוק יתרה</button>
        <button onclick="sendFromWallet('${wallet.secretKey}', '${wallet.publicKey}')">📤 שלח מכאן</button>
        <button onclick="receiveToWallet('${wallet.publicKey}')">📥 קבל לכאן</button>
        <span id="balance-${index}"></span>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    document.getElementById('wallet-list').innerText = '❌ שגיאה בטעינת הארנקים: ' + err.message;
  }
}

async function checkBalance(pubKey, index) {
  try {
    const res = await fetch(`/balance?pubKey=${pubKey}`);
    const data = await res.json();
    document.getElementById(`balance-${index}`).innerText = ` | יתרה: ${data.balance} SOL`;
  } catch (err) {
    document.getElementById(`balance-${index}`).innerText = `❌ שגיאה: ${err.message}`;
  }
}

async function sendAll() {
  const to = document.getElementById('sendTo')?.value?.trim();
  const amount = parseFloat(document.getElementById('amountToSend')?.value?.trim());
  if (!to || isNaN(amount)) {
    alert("יש להזין כתובת וסכום תקינים");
    return;
  }

  document.getElementById("send-result").innerText = "⏳ מבצע שליחה מכל הארנקים...";

  try {
    const res = await fetch('/send-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, amount })
    });
    const data = await res.json();
    document.getElementById("send-result").innerText = data.message;
  } catch (err) {
    document.getElementById("send-result").innerText = "❌ שגיאה: " + err.message;
  }
}

function openPrompt(type) {
  const to = prompt(type === 'receive' ? "📍 הזן כתובת ששלחה אליך:" : "📍 הזן כתובת יעד:");
  const amount = prompt("💰 הזן סכום ב-SOL:");
  if (!to || !amount || isNaN(amount)) {
    alert("יש להזין כתובת וסכום תקינים");
    return;
  }

  if (type === 'receive') {
    alert(`📥 סימולציה: התקבלו ${amount} SOL מ־${to}`);
    return;
  }

  const endpoint = {
    send: '/send-all',
    buy: '/buy-all',
    sell: '/sell-all'
  }[type];

  if (!endpoint) return;

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, from: to, amount: parseFloat(amount) })
  })
    .then(res => res.json())
    .then(data => alert(data.message || "בוצע"))
    .catch(err => alert("❌ שגיאה: " + err.message));
}

async function sendFromWallet(secretKey, fromPublicKey) {
  const to = prompt("📍 לאן לשלוח את ה-SOL?");
  const amount = prompt("💰 כמה SOL לשלוח?");
  if (!to || isNaN(amount)) return alert("יש להזין כתובת וסכום תקינים");

  try {
    const res = await fetch('/send-one', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey, to, amount: parseFloat(amount) })
    });

    const data = await res.json();
    alert(data.message || "בוצע");
  } catch (err) {
    alert("❌ שגיאה: " + err.message);
  }
}

function receiveToWallet(pubKey) {
  const from = prompt("📍 כתובת ששלחה אליך:");
  const amount = prompt("💰 סכום שהתקבל:");
  if (!from || isNaN(amount)) return alert("יש להזין ערכים תקינים");

  alert(`📥 התקבלו ${amount} SOL מ־${from} לארנק ${pubKey} (סימולציה בלבד)`);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => alert("📎 הכתובת הועתקה"))
    .catch(() => alert("❌ שגיאה בהעתקה"));
}

function buyMyToken() {
  const amount = prompt("💰 כמה SOL לשלוח מכל ארנק לרכישת המטבע?");
  if (!amount || isNaN(amount)) return alert("❌ סכום לא תקין");

  document.getElementById("result").innerText = "🕒 מבצע רכישה מכל הארנקים...";

  fetch('/buy-token-shdy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: parseFloat(amount) })
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("result").innerText = data.message || "בוצע";
    })
    .catch(err => {
      document.getElementById("result").innerText = "❌ שגיאה: " + err.message;
    });
}

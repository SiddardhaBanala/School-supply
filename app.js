// app.js
const API_URL = "https://script.google.com/macros/s/AKfycbyc5G2Eo3gGYq7ywicq2pcwIC6zMJVHgIh5NcejoNBhl77MY6jnkqoSPgYbRY-yzRNbmQ/exec";


function $(id) { return document.getElementById(id) }

const loginScreen = $('login-screen');
const dashScreen = $('dashboard-screen');
const welcome = $('welcome');

$('loginBtn').addEventListener('click', async () => {
  const username = $('username').value.trim();
  const pin = $('pin').value.trim();
  if (!username || !pin) {
    $('loginMsg').innerText = 'Enter username and PIN';
    return;
  }
  $('loginMsg').innerText = 'Logging in...';

  const res = await postApi('login', { username, pin });
  if (res.ok) {
    localStorage.setItem('user', JSON.stringify(res));
    showDashboard(res);
  } else {
    $('loginMsg').innerText = 'Invalid credentials';
  }
});

$('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('user');
  location.reload();
});

function showDashboard(user) {
  loginScreen.classList.add('hidden');
  dashScreen.classList.remove('hidden');
  welcome.innerText = 'Welcome, ' + (user.school_name || user.username);

  if (user.role === 'school') {
    $('school-ui').classList.remove('hidden');
    loadSchoolOrders(user);
  }

  if (user.role === 'admin') {
    $('admin-ui').classList.remove('hidden');
    loadPendingOrders();
  }
}

async function loadSchoolOrders(user) {
  const res = await postApi('getOrders', { school_id: user.school_id });
  if (res.ok) {
    const ul = $('ordersList');
    ul.innerHTML = '';
    res.rows.forEach(r => {
      const li = document.createElement('li');
      li.innerText = `${r.date_for} — ${r.item} — ${r.quantity} — ${r.status}`;
      ul.appendChild(li);
    });
  }
}

$('placeOrder').addEventListener('click', async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const payload = {
    path: 'addOrder',
    date_for: $('dateFor').value,
    school_id: user.school_id,
    school_name: user.school_name,
    item: $('itemSelect').value,
    quantity: $('qty').value,
    note: $('note').value,
    created_by: user.username
  };
  const res = await postApi('addOrder', payload);
  if (res.ok) {
    alert('Order placed');
    loadSchoolOrders(user);
  }
});

$('addEntryBtn').addEventListener('click', async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const payload = {
    path: 'addEntry',
    date: $('admin_date').value,
    school_id: $('admin_school').value,
    school_name: '',
    item: $('admin_item').value,
    quantity: $('admin_qty').value,
    note: '',
    created_by: user.username
  };
  const res = await postApi('addEntry', payload);
  if (res.ok) {
    alert('Entry added');
    loadPendingOrders();
  }
});

async function loadPendingOrders() {
  const res = await postApi('getOrders', { status: 'pending' });
  const ul = $('pendingOrders');
  ul.innerHTML = '';
  if (res.ok) {
    res.rows.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `${r.school_name} (${r.school_id}) — ${r.item} — ${r.quantity}
      <br/>
      <button data-id="${r.order_id}" class="approve">Approve</button>
      <button data-id="${r.order_id}" class="reject">Reject</button>`;
      ul.appendChild(li);
    });

    document.querySelectorAll('.approve').forEach(b =>
      b.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await postApi('updateOrderStatus', { path: 'updateOrderStatus', order_id: id, status: 'approved' });
        loadPendingOrders();
      })
    );

    document.querySelectorAll('.reject').forEach(b =>
      b.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await postApi('updateOrderStatus', { path: 'updateOrderStatus', order_id: id, status: 'rejected' });
        loadPendingOrders();
      })
    );
  }
}

async function postApi(path, payload) {
  const body = payload || {};
  body.path = path;
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    return await resp.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'network_error' };
  }
}

// restore session
(function () {
  const user = localStorage.getItem('user');
  if (user) showDashboard(JSON.parse(user));
})();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .catch(() => { });
}

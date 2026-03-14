// ===== State =====
let state = {
  period: { label: '', start: '', end: '' },
  income: [],   // { id, source, amount, frequency }
  expenses: []  // { id, name, amount, category, frequency }
};

// ===== Persistence =====
function save() {
  localStorage.setItem('familyBudget', JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem('familyBudget');
  if (raw) {
    try { state = JSON.parse(raw); } catch (_) {}
  }
}

// ===== Frequency multiplier → monthly equivalent =====
function toMonthly(amount, frequency) {
  switch (frequency) {
    case 'weekly':    return amount * 52 / 12;
    case 'biweekly':  return amount * 26 / 12;
    case 'monthly':   return amount;
    case 'once':      return amount;
    default:          return amount;
  }
}

function freqLabel(f) {
  return { monthly: 'Monthly', biweekly: 'Bi-weekly', weekly: 'Weekly', once: 'One-time' }[f] || f;
}

// ===== Calculations =====
function totalIncome()   { return state.income.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0); }
function totalExpenses() { return state.expenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0); }
function balance()       { return totalIncome() - totalExpenses(); }

// ===== Render Summary =====
function fmt(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderSummary() {
  document.getElementById('total-income').textContent   = fmt(totalIncome());
  document.getElementById('total-expenses').textContent = fmt(totalExpenses());
  const bal = balance();
  const balEl = document.getElementById('balance');
  balEl.textContent = fmt(bal);
  const balCard = balEl.closest('.balance-card');
  if (bal < 0) balCard.classList.add('negative');
  else         balCard.classList.remove('negative');
}

// ===== Render Income List =====
function renderIncome() {
  const list = document.getElementById('income-list');
  list.innerHTML = '';
  if (!state.income.length) {
    list.innerHTML = '<li class="empty-msg">No income added yet.</li>';
    return;
  }
  state.income.forEach(item => {
    const li = document.createElement('li');
    li.className = 'entry-item';
    li.innerHTML = `
      <div class="entry-info">
        <span class="entry-name">${escHtml(item.source)}</span>
        <span class="entry-meta">${freqLabel(item.frequency)}</span>
      </div>
      <span class="entry-amount income-amt">${fmt(item.amount)}</span>
      <button class="delete-btn" onclick="deleteIncome('${item.id}')" title="Remove">&#x2715;</button>
    `;
    list.appendChild(li);
  });
}

// ===== Render Expense List =====
function renderExpenses() {
  const list = document.getElementById('expense-list');
  list.innerHTML = '';
  if (!state.expenses.length) {
    list.innerHTML = '<li class="empty-msg">No expenses added yet.</li>';
    return;
  }
  state.expenses.forEach(item => {
    const li = document.createElement('li');
    li.className = 'entry-item';
    li.innerHTML = `
      <div class="entry-info">
        <span class="entry-name">${escHtml(item.name)}</span>
        <span class="entry-meta">${escHtml(item.category)} &bull; ${freqLabel(item.frequency)}</span>
      </div>
      <span class="entry-amount expense-amt">${fmt(item.amount)}</span>
      <button class="delete-btn" onclick="deleteExpense('${item.id}')" title="Remove">&#x2715;</button>
    `;
    list.appendChild(li);
  });
}

// ===== Render Category Breakdown =====
function renderBreakdown() {
  const container = document.getElementById('category-breakdown');
  container.innerHTML = '';

  if (!state.expenses.length) {
    container.innerHTML = '<span class="empty-msg">Add expenses to see a breakdown.</span>';
    return;
  }

  const totals = {};
  state.expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + toMonthly(e.amount, e.frequency);
  });

  const maxVal = Math.max(...Object.values(totals));

  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, total]) => {
      const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
      const tile = document.createElement('div');
      tile.className = 'cat-tile';
      tile.innerHTML = `
        <div class="cat-name">${escHtml(cat)}</div>
        <div class="cat-amount">${fmt(total)}</div>
        <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct.toFixed(1)}%"></div></div>
      `;
      container.appendChild(tile);
    });
}

// ===== Render Period =====
function renderPeriod() {
  const p = state.period;
  const el = document.getElementById('period-display');
  if (p.label || p.start || p.end) {
    const parts = [];
    if (p.label) parts.push(p.label);
    if (p.start && p.end) parts.push(`${p.start} → ${p.end}`);
    else if (p.start)     parts.push(`From ${p.start}`);
    else if (p.end)       parts.push(`Until ${p.end}`);
    el.textContent = parts.join('  |  ');
  } else {
    el.textContent = '';
  }
  if (p.label)  document.getElementById('period-label').value = p.label;
  if (p.start)  document.getElementById('period-start').value = p.start;
  if (p.end)    document.getElementById('period-end').value   = p.end;
}

// ===== Full Re-render =====
function render() {
  renderSummary();
  renderIncome();
  renderExpenses();
  renderBreakdown();
  renderPeriod();
}

// ===== Actions =====
function addIncome(e) {
  e.preventDefault();
  const source    = document.getElementById('income-source').value.trim();
  const amount    = parseFloat(document.getElementById('income-amount').value);
  const frequency = document.getElementById('income-frequency').value;
  if (!source || isNaN(amount) || amount < 0) return;
  state.income.push({ id: uid(), source, amount, frequency });
  save(); render();
  e.target.reset();
}

function addExpense(e) {
  e.preventDefault();
  const name      = document.getElementById('expense-name').value.trim();
  const amount    = parseFloat(document.getElementById('expense-amount').value);
  const category  = document.getElementById('expense-category').value;
  const frequency = document.getElementById('expense-frequency').value;
  if (!name || isNaN(amount) || amount < 0) return;
  state.expenses.push({ id: uid(), name, amount, category, frequency });
  save(); render();
  e.target.reset();
}

function deleteIncome(id) {
  state.income = state.income.filter(i => i.id !== id);
  save(); render();
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
  save(); render();
}

function savePeriod() {
  state.period.label = document.getElementById('period-label').value.trim();
  state.period.start = document.getElementById('period-start').value;
  state.period.end   = document.getElementById('period-end').value;
  save(); renderPeriod();
}

function confirmReset() {
  if (confirm('Reset all budget data? This cannot be undone.')) {
    state = { period: { label: '', start: '', end: '' }, income: [], expenses: [] };
    save(); render();
  }
}

// ===== Helpers =====
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  load();
  render();
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WHATSAPP = '5561998072786';
const DURATIONS = { 'Corte': 30, 'Barba': 30, 'Corte + barba': 60 };
const config = window.FOX_BARBER_CONFIG || {};
const supabaseUrl = String(config.supabaseUrl || '').trim();
const supabaseAnonKey = String(config.supabaseAnonKey || '').trim();
const backendReady = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('SEU_') && !supabaseAnonKey.includes('SUA_'));
const supabase = backendReady ? createClient(supabaseUrl, supabaseAnonKey) : null;
let remoteBlocks = [];
let scheduleLoaded = false;
let currentAdmin = false;

const form = document.querySelector('#booking-form');
const dateInput = document.querySelector('#booking-date');
const timeSelect = document.querySelector('#time-select');
const bookingMessage = document.querySelector('#form-message');
const loginForm = document.querySelector('#login-form');
const emailInput = document.querySelector('#admin-email');
const passwordInput = document.querySelector('#admin-password');
const adminTools = document.querySelector('#admin-tools');
const adminMessage = document.querySelector('#admin-message');
const blockForm = document.querySelector('#block-form');
const blockDate = document.querySelector('#block-date');
const blockTime = document.querySelector('#block-time');
const demoList = document.querySelector('#demo-list');

function todayString() {
  const date = new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function dayOfWeek(value) {
  const parts = value.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]).getDay();
}

function minutesFromTime(value) {
  const parts = value.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function durationFor(service) {
  return DURATIONS[service] || 30;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function isUnavailable(date, start, end) {
  return remoteBlocks.some(function(item) {
    if (item.date !== date) return false;
    if (item.time === '*') return true;
    const blockedStart = minutesFromTime(item.time);
    return overlaps(start, end, blockedStart, blockedStart + 30);
  });
}

function refreshTimeOptions() {
  const date = dateInput.value;
  timeSelect.innerHTML = '';
  if (!backendReady) {
    timeSelect.add(new Option('Agenda em configuração', '', true, true));
    timeSelect.disabled = true;
    return;
  }
  if (!scheduleLoaded) {
    timeSelect.add(new Option('Carregando disponibilidade…', '', true, true));
    timeSelect.disabled = true;
    return;
  }
  if (!date) {
    timeSelect.add(new Option('Escolha a data primeiro', '', true, true));
    timeSelect.disabled = true;
    return;
  }
  if (date < todayString()) {
    timeSelect.add(new Option('Escolha uma data futura', '', true, true));
    timeSelect.disabled = true;
    return;
  }
  if (dayOfWeek(date) === 0) {
    timeSelect.add(new Option('Fechado aos domingos', '', true, true));
    timeSelect.disabled = true;
    return;
  }
  if (isUnavailable(date, 10 * 60, 10 * 60 + 30) && remoteBlocks.some(function(item) { return item.date === date && item.time === '*'; })) {
    timeSelect.add(new Option('Agenda fechada nesta data', '', true, true));
    timeSelect.disabled = true;
    return;
  }
  const duration = durationFor(form.elements.service.value || 'Corte');
  const now = new Date();
  const isToday = date === todayString();
  let count = 0;
  for (let minute = 10 * 60; minute + duration <= 20 * 60; minute += 30) {
    if (isToday && minute <= now.getHours() * 60 + now.getMinutes()) continue;
    if (isUnavailable(date, minute, minute + duration)) continue;
    const time = String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0');
    timeSelect.add(new Option(time, time));
    count++;
  }
  timeSelect.disabled = count === 0;
  if (!count) timeSelect.add(new Option('Sem horários livres', '', true, true));
}

function renderBlockList() {
  demoList.innerHTML = '';
  if (!remoteBlocks.length) {
    const empty = document.createElement('p');
    empty.className = 'form-small';
    empty.textContent = 'Nenhum horário bloqueado.';
    demoList.append(empty);
    return;
  }
  remoteBlocks.forEach(function(item) {
    const row = document.createElement('div');
    row.className = 'demo-item';
    const label = document.createElement('span');
    const readableDate = new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR');
    label.textContent = readableDate + ' · ' + (item.time === '*' ? 'dia inteiro bloqueado' : item.time + ' bloqueado');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Liberar';
    remove.addEventListener('click', async function() {
      remove.disabled = true;
      const result = await supabase.from('schedule_blocks').delete().eq('id', item.id);
      if (result.error) {
        adminMessage.textContent = 'Não consegui liberar esse horário. Tente novamente.';
        remove.disabled = false;
        return;
      }
      adminMessage.textContent = 'Horário liberado para os clientes.';
      await loadBlocks();
    });
    row.append(label, remove);
    demoList.append(row);
  });
}

async function loadBlocks() {
  if (!supabase) return;
  const result = await supabase.from('schedule_blocks').select('id,date,time').order('date').order('time');
  if (result.error) {
    scheduleLoaded = false;
    bookingMessage.textContent = 'Não foi possível carregar a agenda. Confirme pelo WhatsApp, por favor.';
    bookingMessage.classList.add('error');
    refreshTimeOptions();
    if (currentAdmin) adminMessage.textContent = 'Não consegui carregar os bloqueios. Verifique a conexão e tente novamente.';
    return;
  }
  remoteBlocks = result.data || [];
  scheduleLoaded = true;
  refreshTimeOptions();
  if (currentAdmin) renderBlockList();
}

async function isAuthorizedAdmin(user) {
  if (!user || !supabase) return false;
  const result = await supabase.from('site_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return !result.error && Boolean(result.data);
}

async function setAdminSession(user) {
  currentAdmin = await isAuthorizedAdmin(user);
  if (!currentAdmin) {
    adminTools.hidden = true;
    loginForm.hidden = false;
    adminMessage.textContent = 'Esta conta não tem autorização para alterar a agenda.';
    if (supabase) await supabase.auth.signOut();
    return false;
  }
  loginForm.hidden = true;
  adminTools.hidden = false;
  passwordInput.value = '';
  adminMessage.textContent = 'Você entrou na agenda da equipe.';
  await loadBlocks();
  return true;
}

dateInput.min = todayString();
blockDate.min = todayString();

dateInput.addEventListener('change', refreshTimeOptions);
form.elements.service.addEventListener('change', refreshTimeOptions);

form.addEventListener('submit', async function(event) {
  event.preventDefault();
  bookingMessage.textContent = '';
  bookingMessage.classList.remove('error');
  if (!backendReady) {
    bookingMessage.textContent = 'A agenda compartilhada ainda está sendo configurada. Chame a Fox Barber pelo WhatsApp.';
    bookingMessage.classList.add('error');
    return;
  }
  await loadBlocks();
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const service = String(data.get('service') || '');
  const date = String(data.get('date') || '');
  const time = String(data.get('time') || '');
  const phone = String(data.get('phone') || '').trim();
  if (!scheduleLoaded) return;
  if (!name || !service || !date || !time) {
    bookingMessage.textContent = 'Preencha os dados e escolha um horário.';
    bookingMessage.classList.add('error');
    return;
  }
  if (date < todayString() || dayOfWeek(date) === 0) {
    bookingMessage.textContent = 'Confira a data: a barbearia fecha aos domingos.';
    bookingMessage.classList.add('error');
    refreshTimeOptions();
    return;
  }
  const start = minutesFromTime(time);
  if (isUnavailable(date, start, start + durationFor(service))) {
    bookingMessage.textContent = 'Esse horário não está mais livre. Escolha outro.';
    bookingMessage.classList.add('error');
    refreshTimeOptions();
    return;
  }
  const readableDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
  const lines = [
    'Olá, Fox Barber! Quero solicitar um horário:',
    'Nome: ' + name,
    'Serviço: ' + service,
    'Data: ' + readableDate,
    'Horário preferido: ' + time,
    phone ? 'Meu telefone: ' + phone : '',
    'Pode confirmar a disponibilidade, por favor?'
  ].filter(Boolean).join('\n');
  window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines), '_blank', 'noopener');
  bookingMessage.textContent = 'Pedido preparado. Aguarde a confirmação da Fox Barber pelo WhatsApp.';
});

for (let minute = 10 * 60; minute < 20 * 60; minute += 30) {
  const time = String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0');
  blockTime.add(new Option(time, time));
}

blockForm.addEventListener('submit', async function(event) {
  event.preventDefault();
  const date = blockDate.value;
  const time = blockTime.value;
  if (!currentAdmin || !date || date < todayString()) return;
  const button = blockForm.querySelector('button[type="submit"]');
  button.disabled = true;
  adminMessage.textContent = 'Salvando bloqueio…';
  const result = await supabase.from('schedule_blocks').insert({ date: date, time: time });
  button.disabled = false;
  if (result.error) {
    adminMessage.textContent = result.error.code === '23505' ? 'Esse horário já está bloqueado.' : 'Não consegui bloquear esse horário. Tente novamente.';
    return;
  }
  adminMessage.textContent = 'Horário bloqueado para todos os clientes.';
  blockForm.reset();
  await loadBlocks();
});

loginForm.addEventListener('submit', async function(event) {
  event.preventDefault();
  if (!backendReady) {
    adminMessage.textContent = 'A conexão segura da agenda ainda precisa ser configurada.';
    return;
  }
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  adminMessage.textContent = 'Verificando acesso…';
  const result = await supabase.auth.signInWithPassword({ email: emailInput.value.trim(), password: passwordInput.value });
  button.disabled = false;
  if (result.error) {
    adminMessage.textContent = 'Não consegui entrar. Confira o e-mail e a senha da equipe.';
    return;
  }
  await setAdminSession(result.data.user);
});

document.querySelector('#admin-logout').addEventListener('click', async function() {
  if (supabase) await supabase.auth.signOut();
  currentAdmin = false;
  adminTools.hidden = true;
  loginForm.hidden = false;
  adminMessage.textContent = 'Você saiu da agenda da equipe.';
});

document.querySelector('#menu-toggle').addEventListener('click', function() {
  const nav = document.querySelector('#main-nav');
  const isOpen = nav.classList.toggle('open');
  this.setAttribute('aria-expanded', String(isOpen));
  this.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
});

document.querySelectorAll('#main-nav a').forEach(function(link) {
  link.addEventListener('click', function() {
    const nav = document.querySelector('#main-nav');
    nav.classList.remove('open');
    document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false');
  });
});

if (!backendReady) {
  adminMessage.textContent = 'A conexão segura da agenda ainda precisa ser configurada.';
  bookingMessage.textContent = 'A agenda compartilhada ainda está sendo configurada. Chame a Fox Barber pelo WhatsApp.';
  bookingMessage.classList.add('error');
  refreshTimeOptions();
} else {
  loadBlocks();
  supabase.auth.getSession().then(async function(result) {
    if (result.data.session) await setAdminSession(result.data.session.user);
  });
}

const { Notification } = require('electron');
const cron = require('node-cron');
const store = require('./store.cjs');

let mainWindowRef = null;

function initNotifications(win) {
  mainWindowRef = win;
  cron.schedule('0 9 * * *', () => { checkUpcoming(); });
}

function getTargetDate(m) {
  if (m.isLunar && m._lunarNextDate) {
    return new Date(m._lunarNextDate);
  }
  return new Date(m.date);
}

function checkUpcoming() {
  const memorials = store.getAll();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  memorials.forEach((m) => {
    const target = getTargetDate(m);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      showNotification(`今天是 ${m.name} 的${m.reason}`, '就是今天！');
    } else if (diffDays === 1) {
      showNotification(`明天是 ${m.name} 的${m.reason}`, '提前一天提醒');
    } else if (diffDays === 3) {
      showNotification(`还有3天是 ${m.name} 的${m.reason}`, '提前三天提醒');
    } else if (diffDays === 7) {
      showNotification(`还有7天是 ${m.name} 的${m.reason}`, '提前一周提醒');
    }
  });
}

function showNotification(title, body) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body });
  notification.on('click', () => {
    if (mainWindowRef) { mainWindowRef.show(); mainWindowRef.focus(); }
  });
  notification.show();
}

module.exports = { initNotifications, checkUpcoming };

import electron from 'electron';
const { Notification } = electron;
import cron from 'node-cron';
import * as store from './store.mjs';

let mainWindowRef = null;

export function initNotifications(win) {
  mainWindowRef = win;

  cron.schedule('0 9 * * *', () => {
    checkUpcoming();
  });
}

export function checkUpcoming() {
  const memorials = store.getAll();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  memorials.forEach((m) => {
    const memorialDate = new Date(m.date);
    memorialDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((memorialDate - today) / (1000 * 60 * 60 * 24));

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
    if (mainWindowRef) {
      mainWindowRef.show();
      mainWindowRef.focus();
    }
  });
  notification.show();
}

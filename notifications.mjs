import electron from 'electron';
const { Notification } = electron;
import cron from 'node-cron';
import * as store from './store.mjs';
import { getOccurrenceText } from './src/shared/memorial-date.mjs';

let showMainWindowRef = null;

export function initNotifications(showMainWindow) {
  showMainWindowRef = showMainWindow;
  cron.schedule('0 9 * * *', () => checkUpcoming());
}

export function checkUpcoming(now = new Date()) {
  const memorials = store.getAll();
  memorials.forEach((memorial) => {
    let occurrence;
    try {
      occurrence = getOccurrenceText(memorial, now);
    } catch (_) {
      return;
    }
    const { diffDays } = occurrence;
    if (diffDays === 0) {
      showNotification(`今天是 ${memorial.name} 的${memorial.reason}`, '就是今天！');
    } else if (diffDays === 1) {
      showNotification(`明天是 ${memorial.name} 的${memorial.reason}`, '提前一天提醒');
    } else if (diffDays === 3) {
      showNotification(`还有3天是 ${memorial.name} 的${memorial.reason}`, '提前三天提醒');
    } else if (diffDays === 7) {
      showNotification(`还有7天是 ${memorial.name} 的${memorial.reason}`, '提前一周提醒');
    }
  });
}

function showNotification(title, body) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body });
  notification.on('click', () => {
    showMainWindowRef?.();
  });
  notification.show();
}

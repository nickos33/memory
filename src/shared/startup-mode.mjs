export function getLoginItemOptions() {
  return { openAtLogin: true, openAsHidden: true };
}

export function shouldOpenMainWindow(loginSettings = {}) {
  return loginSettings.wasOpenedAtLogin !== true;
}

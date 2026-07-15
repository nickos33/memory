import test from 'node:test';
import assert from 'node:assert/strict';
import { getLoginItemOptions, shouldOpenMainWindow } from '../src/shared/startup-mode.mjs';

test('登录启动时不打开主窗口', () => {
  assert.equal(shouldOpenMainWindow({ wasOpenedAtLogin: true }), false);
});

test('手动启动时打开主窗口', () => {
  assert.equal(shouldOpenMainWindow({ wasOpenedAtLogin: false }), true);
  assert.equal(shouldOpenMainWindow({}), true);
});

test('登录项始终开启并请求隐藏启动', () => {
  assert.deepEqual(getLoginItemOptions(), { openAtLogin: true, openAsHidden: true });
});

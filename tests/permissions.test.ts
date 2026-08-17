import assert from 'node:assert/strict';
import test from 'node:test';

import { planIncludes } from '../server/src/auth/plans.ts';
import {
  allPermissions,
  resolvePermissions,
} from '../server/src/auth/permissions.ts';

test('owners always retain the complete permission set', () => {
  const permissions = resolvePermissions('owner', {
    deny: ['financials.view', 'settings.manage'],
  });

  assert.deepEqual(new Set(permissions), new Set(allPermissions));
});

test('role overrides can add and remove explicit permissions', () => {
  const permissions = resolvePermissions('project_manager', {
    allow: ['financials.view'],
    deny: ['reports.manage'],
  });

  assert.equal(permissions.includes('financials.view'), true);
  assert.equal(permissions.includes('reports.manage'), false);
  assert.equal(permissions.includes('worklogs.viewProject'), true);
});

test('finance access does not implicitly grant workspace administration', () => {
  const permissions = resolvePermissions('finance');

  assert.equal(permissions.includes('financials.view'), true);
  assert.equal(permissions.includes('settings.manage'), false);
  assert.equal(permissions.includes('members.manage'), false);
});

test('subscription plans unlock features at and above their minimum tier', () => {
  assert.equal(planIncludes('free', 'teamAnalytics'), false);
  assert.equal(planIncludes('team', 'teamAnalytics'), true);
  assert.equal(planIncludes('team', 'expenses'), false);
  assert.equal(planIncludes('pro', 'expenses'), true);
  assert.equal(planIncludes(undefined, 'proofTracking'), false);
});

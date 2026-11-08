import assert from 'node:assert/strict';
import { test } from 'node:test';

import { promoteAdminSql } from './make-admin.mjs';

test('promotes a trimmed address', () => {
  assert.equal(promoteAdminSql('  dana@example.com '), "select public.promote_admin('dana@example.com')");
});

test('refuses anything that is not a plain address', () => {
  assert.throws(() => promoteAdminSql(''), /plain email/);
  assert.throws(() => promoteAdminSql("x'); drop table x; --@a.b"), /plain email/);
  assert.throws(() => promoteAdminSql(undefined), /plain email/);
});

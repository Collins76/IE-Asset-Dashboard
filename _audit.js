// ==============================================================
// IE Asset Dashboard — Audit helper
// ==============================================================
// Thin convenience wrappers around window.IE_AUTH.logEvent().
// Include this script after _auth_guard.js on any page that
// needs to log audit events from multiple call sites.
//
// Usage:
//   IE_AUDIT.data('create', 'dt_maintenance', '2026-03', { totalRecords: 412 });
//   IE_AUDIT.admin('approve_user', 'profile', userId, { ... });
//   IE_AUDIT.auth('logout');
//
// The category is locked per helper so call sites don't have to
// remember the event taxonomy. All other fields are optional.
// Returns a Promise. Failures are logged to the console but never
// throw — audit logging must never break the UI.
// ==============================================================

(function () {
  'use strict';

  function call(category, action, resource_type, resource_id, metadata) {
    if (!window.IE_AUTH || !window.IE_AUTH.logEvent) {
      return Promise.resolve({ data: null, error: null });
    }
    return window.IE_AUTH.logEvent({
      category: category,
      action: action,
      event_type: action,
      resource_type: resource_type || null,
      resource_id: resource_id || null,
      metadata: metadata || null
    });
  }

  window.IE_AUDIT = {
    data: function (action, resource_type, resource_id, metadata) {
      return call('data', action, resource_type, resource_id, metadata);
    },
    admin: function (action, resource_type, resource_id, metadata) {
      return call('admin', action, resource_type, resource_id, metadata);
    },
    auth: function (action, metadata) {
      return call('auth', action, null, null, metadata);
    }
  };
})();

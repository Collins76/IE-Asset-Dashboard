// ==============================================================
// IE Asset Dashboard — Client-side Auth Guard
// ==============================================================
// Include this script on any page that requires a signed-in,
// approved user. It:
//   1. Creates a Supabase JS client (global: window.IE_AUTH.supabase)
//   2. Shows a full-screen loading overlay before first paint
//   3. Checks for an active session; no session -> redirect /login
//   4. Loads the caller's profiles row; not approved -> /pending
//   5. Installs a user chip + sign-out button in .nav-right
//   6. Exposes window.IE_AUTH { supabase, user, profile, session,
//      accessToken, logEvent, signOut, ready } to the rest of
//      the page and dispatches an 'ie-auth-ready' event
//   7. Listens to auth state changes and keeps accessToken fresh
//
// Required globals (must load BEFORE this file):
//   - https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   - /_config.js   (defines window.IE_CONFIG)
// ==============================================================

(function () {
  'use strict';

  // ---------- loading overlay ----------
  function injectStyles() {
    if (document.getElementById('ie-auth-styles')) return;
    var css = document.createElement('style');
    css.id = 'ie-auth-styles';
    css.textContent = [
      '#ie-auth-loading{position:fixed;inset:0;background:#0b1015;z-index:2147483646;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;color:#e2e8f0}',
      '#ie-auth-loading .ie-spin{width:42px;height:42px;border:3px solid #1a2535;border-top-color:#00d4ff;border-radius:50%;animation:ie-spin 0.9s linear infinite}',
      '@keyframes ie-spin{to{transform:rotate(360deg)}}',
      '#ie-auth-loading .ie-msg{font-size:12px;color:#7a8a9e;letter-spacing:.5px;text-transform:uppercase}',
      '#ie-auth-loading .ie-err{max-width:420px;text-align:center;padding:0 24px}',
      '#ie-auth-loading .ie-err-title{color:#ef4444;font-size:14px;font-weight:700;margin-bottom:8px}',
      '#ie-auth-loading .ie-err-body{color:#7a8a9e;font-size:12px;line-height:1.5;margin-bottom:18px}',
      '#ie-auth-loading .ie-err-btn{padding:8px 18px;background:#0f171f;border:1px solid #1a2535;color:#e2e8f0;border-radius:5px;cursor:pointer;font-size:12px;font-family:inherit}',
      '#ie-auth-loading .ie-err-btn:hover{border-color:#00d4ff;color:#00d4ff}',
      '#ie-user-chip{display:flex;align-items:center;gap:8px;padding:5px 10px;background:#0f171f;border:1px solid #1a2535;border-radius:6px;font-size:11px;color:#e2e8f0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#ie-user-chip .ie-role{padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0}',
      '#ie-user-chip .ie-role.admin{background:rgba(0,212,255,.15);color:#00d4ff;border:1px solid rgba(0,212,255,.3)}',
      '#ie-user-chip .ie-role.viewer{background:rgba(122,138,158,.15);color:#7a8a9e;border:1px solid rgba(122,138,158,.3)}',
      '#ie-user-chip .ie-email{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#ie-signout-btn{padding:6px 10px;background:#0f171f;border:1px solid #1a2535;color:#e2e8f0;border-radius:5px;cursor:pointer;font-size:11px;font-family:inherit;transition:border-color .15s,color .15s,background .15s}',
      '#ie-signout-btn:hover{border-color:#ef4444;color:#ef4444}',
      '.ie-admin-link{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;background:#0f171f;border:1px solid #1a2535;color:#00d4ff;border-radius:5px;cursor:pointer;font-size:11px;text-decoration:none;font-family:inherit;transition:background .15s,color .15s}',
      '.ie-admin-link:hover{background:#00d4ff;color:#0b1015;border-color:#00d4ff}'
    ].join('\n');
    document.head.appendChild(css);
  }

  function injectOverlay() {
    if (document.getElementById('ie-auth-loading')) return;
    var el = document.createElement('div');
    el.id = 'ie-auth-loading';
    el.innerHTML = '<div class="ie-spin"></div><div class="ie-msg">Checking access...</div>';
    (document.body || document.documentElement).appendChild(el);
  }

  function showOverlayError(title, body, includeSignOut) {
    var el = document.getElementById('ie-auth-loading');
    if (!el) return;
    var html =
      '<div class="ie-err">' +
      '<div class="ie-err-title">' + escapeHtml(title) + '</div>' +
      '<div class="ie-err-body">' + escapeHtml(body) + '</div>' +
      '<button class="ie-err-btn" id="ie-err-btn">' + (includeSignOut ? 'Sign out' : 'Reload') + '</button>' +
      '</div>';
    el.innerHTML = html;
    document.getElementById('ie-err-btn').addEventListener('click', function () {
      if (includeSignOut && window.IE_AUTH && window.IE_AUTH.signOut) {
        window.IE_AUTH.signOut();
      } else {
        window.location.reload();
      }
    });
  }

  function hideOverlay() {
    var el = document.getElementById('ie-auth-loading');
    if (el) el.remove();
  }

  function redirect(path) {
    window.location.replace(path);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------- init ----------
  async function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }

    injectStyles();
    injectOverlay();

    if (!window.IE_CONFIG || !window.supabase || !window.supabase.createClient) {
      showOverlayError(
        'Failed to load Supabase client',
        'The Supabase JavaScript SDK failed to load from the CDN, or _config.js is missing. Check your connection and reload.',
        false
      );
      return;
    }

    var client;
    try {
      client = window.supabase.createClient(
        window.IE_CONFIG.SUPABASE_URL,
        window.IE_CONFIG.SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false, // only /login handles the callback
            flowType: 'implicit'       // match login.html (see comment there)
          }
        }
      );
    } catch (e) {
      console.error('createClient failed', e);
      showOverlayError('Client initialization failed', String((e && e.message) || e), false);
      return;
    }

    // Stub IE_AUTH so other page scripts loading in parallel can reach
    // the Supabase client and the access token immediately.
    window.IE_AUTH = {
      supabase: client,
      session: null,
      user: null,
      profile: null,
      accessToken: window.IE_CONFIG.SUPABASE_ANON_KEY,
      ready: false,
      logEvent: function () { return Promise.resolve({ data: null, error: null }); },
      signOut: function () {
        try {
          client.auth.signOut().finally(function () { redirect('/login'); });
        } catch (e) {
          redirect('/login');
        }
      }
    };

    // Track session changes so the REST token stays fresh.
    client.auth.onAuthStateChange(function (_event, session) {
      if (session) {
        window.IE_AUTH.session = session;
        window.IE_AUTH.accessToken = session.access_token;
      } else {
        window.IE_AUTH.accessToken = window.IE_CONFIG.SUPABASE_ANON_KEY;
      }
    });

    // 1. Session check.
    var sessionResp;
    try {
      sessionResp = await client.auth.getSession();
    } catch (e) {
      console.error('getSession threw', e);
      redirect('/login');
      return;
    }
    var session = sessionResp && sessionResp.data && sessionResp.data.session;
    if (!session) {
      redirect('/login');
      return;
    }

    window.IE_AUTH.session = session;
    window.IE_AUTH.accessToken = session.access_token;
    window.IE_AUTH.user = session.user;

    // 2. Profile fetch.
    var profResp;
    try {
      profResp = await client
        .from('profiles')
        .select('id, email, full_name, role, status, created_at, approved_at, last_sign_in_at')
        .eq('id', session.user.id)
        .maybeSingle();
    } catch (e) {
      console.error('profile fetch threw', e);
      showOverlayError('Could not load profile', String((e && e.message) || e), true);
      return;
    }

    if (profResp.error) {
      console.error('profile fetch error', profResp.error);
      showOverlayError('Could not load profile', profResp.error.message || 'Unknown error', true);
      return;
    }

    if (!profResp.data) {
      // No profiles row — should not happen (handle_new_user trigger creates one),
      // but recover gracefully by forcing sign-out.
      showOverlayError(
        'Profile not found',
        'Your auth account exists but no profiles row was found. This is usually temporary — sign out and back in to resolve.',
        true
      );
      return;
    }

    var profile = profResp.data;
    window.IE_AUTH.profile = profile;

    // 3. Status gate.
    if (profile.status !== 'approved') {
      redirect('/pending');
      return;
    }

    // 4. Wire up the real logEvent.
    window.IE_AUTH.logEvent = function (opts) {
      opts = opts || {};
      var params = {
        p_event_type: opts.event_type || opts.action || 'event',
        p_event_category: opts.category || 'data',
        p_action: opts.action || 'unknown',
        p_resource_type: opts.resource_type || null,
        p_resource_id: opts.resource_id != null ? String(opts.resource_id) : null,
        p_metadata: opts.metadata || null,
        p_user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) || null
      };
      return client.rpc('log_event', params).then(function (r) {
        if (r.error) console.warn('log_event failed', r.error);
        return r;
      }).catch(function (e) {
        console.warn('log_event threw', e);
        return { error: e, data: null };
      });
    };

    // 5. If we just came from /auth/callback, log a login event.
    try {
      var fresh = sessionStorage.getItem('ie_fresh_login');
      if (fresh) {
        sessionStorage.removeItem('ie_fresh_login');
        window.IE_AUTH.logEvent({
          category: 'auth',
          event_type: 'signin',
          action: fresh === 'google' ? 'google_login' : 'magic_link_login',
          metadata: { path: window.location.pathname }
        });
      }
    } catch (e) { /* sessionStorage unavailable */ }

    // 6. Install header UI.
    installHeaderUI();

    // 7. Ready.
    window.IE_AUTH.ready = true;
    try {
      window.dispatchEvent(new CustomEvent('ie-auth-ready', { detail: { profile: profile } }));
    } catch (e) { /* old browser */ }

    hideOverlay();
  }

  // ---------- header UI ----------
  function installHeaderUI() {
    var navRight = document.querySelector('.nav-right');
    if (!navRight) return; // page has no navbar — skip silently

    var profile = window.IE_AUTH.profile;
    var isAdmin = profile.role === 'admin';

    if (isAdmin) {
      var usersLink = document.createElement('a');
      usersLink.href = '/admin#users';
      usersLink.className = 'ie-admin-link';
      usersLink.title = 'User Management';
      usersLink.textContent = 'Users';
      navRight.appendChild(usersLink);

      var auditLink = document.createElement('a');
      auditLink.href = '/admin#audit';
      auditLink.className = 'ie-admin-link';
      auditLink.title = 'Audit Log';
      auditLink.textContent = 'Audit';
      navRight.appendChild(auditLink);
    }

    var chip = document.createElement('div');
    chip.id = 'ie-user-chip';
    chip.innerHTML =
      '<span class="ie-role ' + (isAdmin ? 'admin' : 'viewer') + '">' +
      (isAdmin ? 'ADMIN' : 'VIEWER') +
      '</span>' +
      '<span class="ie-email" title="' + escapeHtml(profile.email || '') + '">' +
      escapeHtml(profile.email || '') +
      '</span>';
    navRight.appendChild(chip);

    var btn = document.createElement('button');
    btn.id = 'ie-signout-btn';
    btn.type = 'button';
    btn.textContent = 'Sign out';
    btn.addEventListener('click', function () {
      (window.IE_AUTH.logEvent({
        category: 'auth',
        event_type: 'signout',
        action: 'logout'
      }) || Promise.resolve()).finally(function () {
        window.IE_AUTH.signOut();
      });
    });
    navRight.appendChild(btn);
  }

  init();
})();

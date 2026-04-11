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
      '#ie-user-chip{display:flex;align-items:center;gap:8px;padding:4px 10px 4px 4px;background:#0f171f;border:1px solid #1a2535;border-radius:20px;font-size:11px;color:#e2e8f0;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#ie-user-chip .ie-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0d2a3a,#0a3040);border:1px solid #1a4050;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#00d4ff;flex-shrink:0;overflow:hidden}',
      '#ie-user-chip .ie-avatar img{width:100%;height:100%;object-fit:cover;display:block}',
      '#ie-user-chip .ie-name{display:flex;flex-direction:column;gap:1px;line-height:1.1;overflow:hidden}',
      '#ie-user-chip .ie-name-top{font-size:12px;font-weight:600;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}',
      '#ie-user-chip .ie-name-sub{font-size:9.5px;color:#7a8a9e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}',
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
        .select('id, email, full_name, first_name, last_name, avatar_url, role, status, created_at, approved_at, last_sign_in_at, login_city, login_region, login_country')
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

    // 3. Profile completeness gate.
    // New users who signed up via magic link without typing their name
    // are redirected to /complete-profile before anything else. Google
    // OAuth users usually have their name pre-filled by the trigger,
    // so they'll skip this step automatically.
    var currentPath = window.location.pathname.replace(/\/$/, '');
    var isOnCompletePage = currentPath === '/complete-profile' || currentPath === '/complete-profile.html';
    if (!profile.first_name && !isOnCompletePage) {
      redirect('/complete-profile');
      return;
    }

    // 4. Status gate.
    // Users still in pending or rejected status go to /pending,
    // EXCEPT when they're currently on the complete-profile page
    // (where we let them finish their profile before routing).
    if (profile.status !== 'approved' && !isOnCompletePage) {
      redirect('/pending');
      return;
    }

    // 5. Wire up the real logEvent.
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

    // 7. Session duration tracking.
    // Fire a heartbeat now and every 120 seconds while the tab is
    // visible. Pauses on visibilitychange so AFK time doesn't count.
    startSessionTracking(client);

    // 8. IP geolocation (once per session, non-blocking).
    // Only runs if we haven't already captured location for this tab.
    try {
      var ipKey = 'ie_ip_logged_' + session.user.id;
      if (!sessionStorage.getItem(ipKey)) {
        captureLoginLocation(client).then(function () {
          try { sessionStorage.setItem(ipKey, '1'); } catch (e) {}
        });
      }
    } catch (e) { /* sessionStorage unavailable */ }

    // 9. Ready.
    window.IE_AUTH.ready = true;
    try {
      window.dispatchEvent(new CustomEvent('ie-auth-ready', { detail: { profile: profile } }));
    } catch (e) { /* old browser */ }

    hideOverlay();
  }

  // ---------- session tracking ----------
  // Heartbeat cadence: 120 seconds. Each active tab gets its own
  // session_id (UUID-ish) so user_sessions correctly attributes
  // concurrent tabs to separate rows instead of collapsing them.
  var HEARTBEAT_MS = 120000;
  var _heartbeatTimer = null;
  var _sessionId = null;
  var _tabVisible = true;

  function makeSessionId() {
    // Small random id; not cryptographically secure but unique enough
    // to key one row per tab-lifetime in user_sessions.
    return (
      Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 10) + '-' +
      Math.random().toString(36).slice(2, 10)
    );
  }

  async function sendHeartbeat(client) {
    if (!_tabVisible) return;
    if (!_sessionId) return;
    try {
      var resp = await client.rpc('log_session_heartbeat', {
        p_session_id: _sessionId,
        p_user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) || null
      });
      if (resp && resp.error) console.warn('heartbeat failed', resp.error);
    } catch (e) {
      console.warn('heartbeat threw', e);
    }
  }

  function startSessionTracking(client) {
    if (_sessionId) return; // already started in this tab
    _sessionId = makeSessionId();
    // First heartbeat immediately so we capture session-start.
    sendHeartbeat(client);
    // Then every 120s.
    _heartbeatTimer = setInterval(function () { sendHeartbeat(client); }, HEARTBEAT_MS);

    // Pause heartbeat when the tab is hidden; resume when visible.
    if (typeof document !== 'undefined' && 'visibilityState' in document) {
      document.addEventListener('visibilitychange', function () {
        _tabVisible = document.visibilityState === 'visible';
        if (_tabVisible) sendHeartbeat(client);
      });
    }

    // Final heartbeat on tab close so we record the full duration.
    window.addEventListener('pagehide', function () { sendHeartbeat(client); });
    window.addEventListener('beforeunload', function () { sendHeartbeat(client); });
  }

  // ---------- IP geolocation ----------
  // Uses ipapi.co which is free and key-less (1000/day). Only fields
  // we care about are city/region/country; we don't store lat/lon.
  // Runs fire-and-forget; any network error is logged and ignored.
  async function captureLoginLocation(client) {
    try {
      var r = await fetch('https://ipapi.co/json/', {
        cache: 'no-store',
        credentials: 'omit'
      });
      if (!r.ok) return;
      var body = await r.json();
      if (!body || typeof body !== 'object') return;
      if (body.error) {
        console.warn('ipapi error', body.reason || body.error);
        return;
      }
      var city    = body.city || null;
      var region  = body.region || body.region_code || null;
      var country = body.country_name || body.country || null;
      if (!city && !region && !country) return;
      var rpc = await client.rpc('log_login_location', {
        p_city: city,
        p_region: region,
        p_country: country
      });
      if (rpc && rpc.error) console.warn('log_login_location failed', rpc.error);
      // Reflect on the current in-memory profile so the UI can show it.
      if (window.IE_AUTH && window.IE_AUTH.profile) {
        window.IE_AUTH.profile.login_city = city;
        window.IE_AUTH.profile.login_region = region;
        window.IE_AUTH.profile.login_country = country;
      }
    } catch (e) {
      console.warn('geolocation failed', e);
    }
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
    // Compute a display name from the profile data.
    var first = (profile.first_name || '').trim();
    var last  = (profile.last_name  || '').trim();
    var displayTop = first
      ? (first + (last ? ' ' + last : ''))
      : (profile.full_name || profile.email || '');
    var initials = (
      (first ? first.charAt(0) : '') +
      (last  ? last.charAt(0)  : '')
    ).toUpperCase() || (profile.email ? profile.email.charAt(0).toUpperCase() : '?');
    var avatarHtml;
    if (profile.avatar_url) {
      avatarHtml = '<img src="' + escapeHtml(profile.avatar_url) + '" alt="" onerror="this.outerHTML=\'' + escapeHtml(initials) + '\'">';
    } else {
      avatarHtml = escapeHtml(initials);
    }
    chip.innerHTML =
      '<div class="ie-avatar">' + avatarHtml + '</div>' +
      '<div class="ie-name">' +
        '<div class="ie-name-top" title="' + escapeHtml(displayTop) + '">' + escapeHtml(displayTop) + '</div>' +
        '<div class="ie-name-sub" title="' + escapeHtml(profile.email || '') + '">' + escapeHtml(profile.email || '') + '</div>' +
      '</div>' +
      '<span class="ie-role ' + (isAdmin ? 'admin' : 'viewer') + '">' +
      (isAdmin ? 'ADMIN' : 'VIEWER') +
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

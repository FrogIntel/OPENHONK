export const getCookieRejectJS = () => `
(function() {
  var REJECT_SELECTORS = [
    '#onetrust-reject-all-handler',
    'button[aria-label*="Reject" i]',
    'button[aria-label*="Decline" i]',
    'button[aria-label*="Refuse" i]',
    '#didomi-notice-disagree-button',
    'button.didomi-continue-without-agreeing',
    '#sp_reject_optin',
    '.sp_choice_type_REJECT',
    '#uc-btn-deny-banner',
    '#uc-btn-deny',
    'button[data-action*="reject" i]',
    'button[id*="reject" i]',
    'button[class*="reject" i]',
    '#cmplz-reject-all-button',
    '.cmplz-btn-deny',
    '#CybotCookiebotDialogBodyButtonDecline',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
    '#truste-consent-reject',
    '.truste-consent-reject',
    '#consent_prompt_decline',
    '#cookie-banner .button--secondary',
    '.cookie-banner__decline',
    '.js-cookie-reject',
    '.cookie-consent__decline',
    '#cookie-consent-decline',
    'button[data-cookie-banner="reject"]',
    '#reject-cookies',
    '.reject-cookies',
    '#cookieConsentReject',
    '.cc-reject',
    '.cc-deny',
    '#sl-consent-banner .sl-reject-btn',
    '#iubenda-cs-reject-btn',
    '.iubenda-cs-reject-btn',
    '#borlabs-cookie-btn-reject',
    '.borlabs-cookie-btn-reject',
    '#cookieyes-btn-reject',
    '.cookieyes-btn-reject',
  ];

  var HIDE_SELECTORS = [
    '#onetrust-banner-sdk',
    '#onetrust-consent-sdk',
    '#didomi-host',
    '#didomi-notice',
    '.sp_message_container',
    '#sp_message_container',
    '#qc-cmp2-container',
    '.qc-cmp2-container',
    '#usercentrics-root',
    '[data-testid="uc-default-wall"]',
    '#cmplz-cookiebanner-container',
    '#CybotCookiebotDialog',
    '#truste-consent-content',
    '#consent_prompt',
    '#cookie-banner',
    '.cookie-banner',
    '.cookie-consent',
    '.cookie-notice',
    '#cookieConsent',
    '#sl-consent-banner',
    '#iubenda-cs-banner',
    '.iubenda-cs-banner',
    '#borlabs-cookie-banner',
    '.borlabs-cookie-banner',
    '#cookieyes-banner',
    '.cookieyes-banner',
    '.gdpr-banner',
    '#gdpr-banner',
    '.privacy-banner',
    '#privacy-banner',
  ];

  var REJECT_TEXT_PATTERNS = [
    /^reject all$/i, /^reject$/i, /^decline all$/i, /^decline$/i,
    /^refuse all$/i, /^refuse$/i, /^deny all$/i, /^deny$/i,
    /^opt out$/i, /^opt-out$/i, /^only necessary$/i,
    /^essential only$/i, /^continue without$/i, /^necessary cookies only$/i,
    /^accept only necessary$/i, /^reject cookies$/i, /^no thanks$/i,
    /^nein danke$/i, /^ablehnen$/i, /^nur notwendige$/i,
    /^refuser$/i, /^refuser tout$/i, /^continuer sans$/i,
    /^rechazar$/i, /^rechazar todo$/i, /^solo necesarias$/i,
    /^rifiuta$/i, /^rifiuta tutto$/i, /^solo necessari$/i,
    /^afwijzen$/i, /^alle afwijzen$/i,
  ];

  function clickReject() {
    for (var i = 0; i < REJECT_SELECTORS.length; i++) {
      try {
        var el = document.querySelector(REJECT_SELECTORS[i]);
        if (el && el.offsetParent !== null) {
          el.click();
          return true;
        }
      } catch(e) {}
    }
    var buttons = document.querySelectorAll('button, a, input[type="button"]');
    for (var j = 0; j < buttons.length; j++) {
      var btn = buttons[j];
      if (btn.offsetParent === null) continue;
      var text = (btn.textContent || '').trim();
      if (text.length > 50) continue;
      for (var k = 0; k < REJECT_TEXT_PATTERNS.length; k++) {
        if (REJECT_TEXT_PATTERNS[k].test(text)) {
          btn.click();
          return true;
        }
      }
    }
    return false;
  }

  function hideBanners() {
    for (var i = 0; i < HIDE_SELECTORS.length; i++) {
      try {
        var el = document.querySelector(HIDE_SELECTORS[i]);
        if (el) {
          el.style.display = 'none';
        }
      } catch(e) {}
    }
  }

  function tryReject() {
    if (clickReject()) {
      return true;
    }
    hideBanners();
    return false;
  }

  if (!tryReject()) {
    var attempts = 0;
    var observer = new MutationObserver(function() {
      if (tryReject() || ++attempts > 30) {
        observer.disconnect();
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true, subtree: true
    });
    setTimeout(function() {
      tryReject();
      observer.disconnect();
    }, 5000);
  }
})();
`;

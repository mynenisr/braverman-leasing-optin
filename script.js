/*
 * Braverman Building Leasing - opt-in form handler (no build step).
 *
 * FORM_ENDPOINT
 *   Default: FormSubmit's AJAX endpoint (https://formsubmit.co), a free service
 *   that needs no account. It emails each submission to the address below.
 *   One-time setup: submit the form once yourself. FormSubmit then emails
 *   mynenisr@gmail.com an activation link. Click it, and later submissions
 *   arrive by email. Until it's activated, submissions aren't delivered and
 *   visitors see the "couldn't send" message.
 *
 *   Placeholder mode: set FORM_ENDPOINT = "" to skip sending and only show
 *   the thank-you message. Nothing is saved in that mode.
 *
 *   To use another backend (Formspree, Netlify Forms, Google Apps Script, your
 *   own API), put its URL here. It must accept a JSON POST and return 2xx.
 */
// TODO(leasing-number): replace "our leasing number" below with the new 267 number once purchased.
var FORM_ENDPOINT = "https://formsubmit.co/ajax/mynenisr@gmail.com";

(function () {
  "use strict";
  var form = document.getElementById("optin-form");
  if (!form) return;

  var thanks = document.getElementById("thanks");
  var sendError = document.getElementById("send_error");
  var btn = document.getElementById("submit_btn");

  function el(name) { return form.elements.namedItem(name); }

  function digitsOnly(s) { return (s || "").replace(/\D/g, ""); }

  function normalizeUSPhone(raw) {
    var d = digitsOnly(raw);
    if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
    if (d.length !== 10) return null;
    if (/^[01]/.test(d) || /^\d{3}[01]/.test(d)) return null; // invalid area code / exchange
    return "+1" + d;
  }

  function show(el, on) { el.classList.toggle("hidden", !on); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    show(sendError, false);

    var firstName = el("first_name").value.trim();
    var phone = normalizeUSPhone(el("phone").value);
    var okName = firstName.length > 0;
    var okPhone = phone !== null;
    show(document.getElementById("first_name_error"), !okName);
    show(document.getElementById("phone_error"), !okPhone);
    if (!okName) { el("first_name").focus(); return; }
    if (!okPhone) { el("phone").focus(); return; }

    // Honeypot: bots fill hidden fields. Pretend success and drop it.
    if (el("_honey").value) { finish(false, firstName); return; }

    var consented = el("sms_consent").checked;
    var payload = {
      _subject: "Braverman Building Leasing: new web inquiry" + (consented ? " (SMS opt-in: YES)" : " (no SMS)"),
      _template: "table",
      _captcha: "false",
      first_name: firstName,
      phone_e164: phone,
      unit_interest: el("unit_interest").value || "No preference",
      sms_consent: consented ? "YES" : "NO",
      sms_consent_text: consented ? document.getElementById("consent_text").textContent.replace(/\s+/g, " ").trim() : "",
      consent_timestamp_utc: new Date().toISOString(),
      page_url: window.location.href,
      form_version: "optin-v1 (2026-10-07)"
    };

    if (!FORM_ENDPOINT) { finish(consented, firstName); return; } // placeholder mode

    btn.disabled = true;
    btn.textContent = "Sending...";
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        var success = res.ok && (res.j.success === undefined || res.j.success === true || res.j.success === "true");
        if (success) { finish(consented, firstName); } else { fail(); }
      })
      .catch(fail);
  });

  function fail() {
    btn.disabled = false;
    btn.textContent = "Submit";
    show(sendError, true);
    sendError.focus();
  }

  function finish(consented, firstName) {
    form.reset();
    show(form, false);
    var name = firstName ? ", " + firstName.replace(/[<>&"]/g, "") : "";
    thanks.innerHTML = consented
      ? "<strong>Thanks" + name + "!</strong> You're signed up for leasing texts from Braverman Building Leasing. " +
        "You'll get a confirmation text from our leasing number. About 1&ndash;4 messages per week. Message and data rates may apply. " +
        "Reply STOP at any time to opt out, or HELP for help."
      : "<strong>Thanks" + name + "!</strong> We got your inquiry and will follow up by phone call. " +
        "You did not sign up for text messages, so we won't text you. You can sign up for texts any time on this page.";
    show(thanks, true);
    thanks.focus();
  }
})();

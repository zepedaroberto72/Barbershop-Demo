/**
 * US phone display helper: xxx-xxx-xxxx
 *
 * Digit rules (locale-agnostic; Spanish UI still uses this shape):
 * 1. Strip non-digits
 * 2. If exactly 11 digits and starts with 1 → drop the leading country code
 * 3. If still more than 10 digits → keep the last 10
 * 4. Format progressively: 661 → 661 | 661363 → 661-363 | 6613633038 → 661-363-3038
 *
 * Stored value matches what the user sees (display string). Backend already accepts
 * formatted strings and matches on digits where needed.
 */
(function (global) {
  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeUsPhoneDigits(raw) {
    let d = digitsOnly(raw);
    if (d.length === 11 && d.charAt(0) === "1") {
      d = d.slice(1);
    }
    if (d.length > 10) {
      d = d.slice(-10);
    }
    return d;
  }

  function formatUsPhone(value) {
    const d = normalizeUsPhoneDigits(value);
    if (!d) return "";
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + "-" + d.slice(3);
    return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6, 10);
  }

  function digitCountBefore(str, caret) {
    const pos = Math.max(0, Math.min(Number(caret) || 0, str.length));
    return digitsOnly(str.slice(0, pos)).length;
  }

  function caretForDigitCount(formatted, count) {
    if (count <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted.charAt(i))) {
        seen += 1;
        if (seen >= count) return i + 1;
      }
    }
    return formatted.length;
  }

  function applyFormatToInput(input, { restoreCaret, force } = {}) {
    if (!input) return;
    if (!force && (input.readOnly || input.disabled)) return;
    const before = input.value;
    const formatted = formatUsPhone(before);
    if (formatted === before) return;
    const digitsBefore =
      restoreCaret && typeof input.selectionStart === "number"
        ? digitCountBefore(before, input.selectionStart)
        : null;
    input.value = formatted;
    if (digitsBefore != null && typeof input.setSelectionRange === "function") {
      const next = caretForDigitCount(formatted, digitsBefore);
      try {
        input.setSelectionRange(next, next);
      } catch (_) {
        /* type=tel usually supports this; ignore if not */
      }
    }
  }

  function attachUsPhoneFormat(input) {
    if (!input || input.dataset.phoneFormatBound === "1") return input;
    input.dataset.phoneFormatBound = "1";
    // Only format while the field is a phone input — the invoice Send dialog
    // reuses one field and switches type between tel and email.
    input.addEventListener("input", () => {
      if (input.type !== "tel") return;
      applyFormatToInput(input, { restoreCaret: true });
    });
    input.addEventListener("blur", () => {
      if (input.type !== "tel") return;
      applyFormatToInput(input, { restoreCaret: false });
    });
    // Normalize existing / prefilled values (including readonly display rows).
    if (input.value && input.type === "tel") {
      applyFormatToInput(input, { force: true });
    }
    return input;
  }

  function attachUsPhoneFormatAll(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input[type="tel"]').forEach(attachUsPhoneFormat);
  }

  global.formatUsPhone = formatUsPhone;
  global.normalizeUsPhoneDigits = normalizeUsPhoneDigits;
  global.attachUsPhoneFormat = attachUsPhoneFormat;
  global.attachUsPhoneFormatAll = attachUsPhoneFormatAll;
})(typeof window !== "undefined" ? window : globalThis);

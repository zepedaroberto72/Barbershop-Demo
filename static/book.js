(() => {
  const cfg = window.BARBER_BOOK || {};
  const MAX_QTY = 10;
  const SLOT_BLOCK_MINUTES = 30;
  const STORAGE_KEY = "barber_book_flow_v1";
  const state = {
    services: [],
    barbers: [],
    view: "menu", // menu | lookup | flow
    qtyById: {}, // { [serviceId]: quantity }
    barberId: null, // null = any
    barberName: "Any Barber",
    date: null,
    slot: null,
    selectedSlots: [], // multi-select when bookMoreBarbers
    bookMoreBarbers: false,
    filterAvailableBarbers: false, // only barbers free for all YOUR PICKS times
    slotBarberFilterId: null, // which barber's times are shown in multi mode
    daySlotsCache: [], // raw slots for the selected day (multi mode)
    monthCursor: null,
    flowStep: "extras", // extras | staff | time | checkout | done
    doneCopy: "",
    /** When set, checkout reschedules this appointment instead of creating a new one. */
    editingAppointmentId: null,
    editVerify: null, // { phone, last_name_prefix }
    editingDurationMinutes: 0,
    editingServiceLabel: "",
  };

  function persist() {
    try {
      const payload = {
        view: state.view,
        flowStep: state.flowStep,
        qtyById: state.qtyById,
        barberId: state.barberId,
        barberName: state.barberName,
        date: state.date,
        slot: state.slot,
        selectedSlots: state.selectedSlots,
        bookMoreBarbers: state.bookMoreBarbers,
        filterAvailableBarbers: Boolean(state.filterAvailableBarbers),
        slotBarberFilterId: state.slotBarberFilterId,
        monthCursor: state.monthCursor
          ? toISODate(state.monthCursor instanceof Date ? state.monthCursor : new Date(state.monthCursor))
          : null,
        doneCopy: state.doneCopy || "",
        checkout: {
          phone: $("#co-phone")?.value || "",
          first: $("#co-first")?.value || "",
          last: $("#co-last")?.value || "",
          email: $("#co-email")?.value || "",
          notes: $("#co-notes")?.value || "",
          notesOpen: $("#co-notes") ? !$("#co-notes").hidden : false,
        },
        // Lookup fields are intentionally not persisted — screen always opens cleared.
        lookup: { phone: "", last: "" },
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function readPersisted() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearPersisted() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function applyCheckoutForm(data) {
    if (!data) return;
    if ($("#co-phone")) {
      $("#co-phone").value = formatPhoneUS(data.phone || "");
    }
    if ($("#co-first")) $("#co-first").value = capitalizeName(data.first || "");
    if ($("#co-last")) $("#co-last").value = capitalizeName(data.last || "");
    if ($("#co-email")) $("#co-email").value = data.email || "";
    if ($("#co-notes")) {
      $("#co-notes").value = data.notes || "";
      $("#co-notes").hidden = !data.notesOpen;
      if ($("#toggle-notes")) $("#toggle-notes").textContent = data.notesOpen ? "Hide" : "Add";
    }
  }

  function applyLookupForm(data) {
    if (!data) return;
    if ($("#lookup-phone")) {
      $("#lookup-phone").value = formatPhoneUS(data.phone || "");
    }
    if ($("#lookup-last")) {
      const el = $("#lookup-last");
      el.value = data.last || "";
      applyNameCapitalize(el, { lettersOnly: true, maxLen: 4 });
    }
  }

  const $ = (sel) => document.querySelector(sel);

  function phoneDigits(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 10);
  }

  /** Live US display: ###-###-#### from up to 10 digits. */
  function formatPhoneUS(value) {
    const d = phoneDigits(value);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function applyPhoneMask(el) {
    if (!el) return;
    const prev = el.value;
    const sel = typeof el.selectionStart === "number" ? el.selectionStart : prev.length;
    const digitsBefore = phoneDigits(prev.slice(0, sel)).length;
    const formatted = formatPhoneUS(prev);
    el.value = formatted;
    if (typeof el.setSelectionRange !== "function") return;
    let pos = 0;
    let counted = 0;
    while (pos < formatted.length && counted < digitsBefore) {
      if (/\d/.test(formatted[pos])) counted += 1;
      pos += 1;
    }
    try {
      el.setSelectionRange(pos, pos);
    } catch (_) {
      /* ignore unsupported input types */
    }
  }

  /**
   * Title-case words; keep "of" lowercase unless it's the first word.
   * e.g. "john of arc" → "John of Arc", "ewww" → "Ewww"
   */
  function capitalizeName(value) {
    let wordIndex = 0;
    return String(value || "").replace(/([^\s]+)|(\s+)/g, (part, word, space) => {
      if (space) return space;
      const lower = String(word).toLowerCase();
      const isFirst = wordIndex === 0;
      wordIndex += 1;
      if (!isFirst && lower === "of") return "of";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });
  }

  function applyNameCapitalize(el, opts = {}) {
    if (!el) return;
    const prev = el.value;
    const sel = typeof el.selectionStart === "number" ? el.selectionStart : prev.length;
    let raw = prev;
    if (opts.lettersOnly) {
      raw = raw.replace(/[^A-Za-z]/g, "");
    }
    if (typeof opts.maxLen === "number") {
      raw = raw.slice(0, opts.maxLen);
    }
    const next = capitalizeName(raw);
    if (next === prev) return;
    el.value = next;
    if (typeof el.setSelectionRange === "function") {
      try {
        const pos = Math.min(sel, next.length);
        el.setSelectionRange(pos, pos);
      } catch (_) {
        /* ignore */
      }
    }
  }

  function money(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function toISODate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseISODate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDayLong(iso) {
    return parseISODate(iso).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(value) {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function formatRange(startIso, minutes) {
    const start = new Date(startIso);
    const end = new Date(start.getTime() + minutes * 60000);
    const day = start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    return `${day}, ${formatTime(start)} – ${formatTime(end)}`;
  }

  function selectedLines() {
    return state.services
      .map((svc) => ({ svc, qty: Number(state.qtyById[svc.id]) || 0 }))
      .filter((line) => line.qty > 0);
  }

  function totalQty() {
    return selectedLines().reduce((n, line) => n + line.qty, 0);
  }

  function expandServiceIds() {
    const ids = [];
    selectedLines().forEach(({ svc, qty }) => {
      for (let i = 0; i < qty; i++) ids.push(svc.id);
    });
    return ids;
  }

  /** Unique barber names from selected multi-book slots (order preserved). */
  function selectedSlotBarberNames() {
    const names = [];
    const seen = new Set();
    (state.selectedSlots || []).forEach((slot) => {
      const name = slot?.technician_name;
      if (!name || seen.has(name)) return;
      seen.add(name);
      names.push(name);
    });
    return names;
  }

  /**
   * Barber label for a single-staff summary line (non multi-barber layout).
   */
  function barberNameForService(serviceId) {
    if (state.flowStep === "extras") return "";
    if (state.barberId) {
      const picked = state.barbers.find((b) => b.id === state.barberId);
      return picked?.name || state.barberName || "";
    }
    if (state.slot?.technician_name) return state.slot.technician_name;
    if (state.barberName && state.barberName !== "Any Barber" && state.barberName !== "Any staff")
      return state.barberName;
    return "";
  }

  /**
   * Group multi-barber picks by technician: times + services attributed the
   * same way checkout round-robins expanded units across selected slots.
   */
  function barberSummaryGroups() {
    const slots = state.selectedSlots || [];
    if (!slots.length) return [];

    const byTech = new Map();
    slots.forEach((slot) => {
      const id = slot.technician_id;
      if (!byTech.has(id)) {
        byTech.set(id, {
          technicianId: id,
          name: slot.technician_name || "Barber",
          slots: [],
        });
      }
      byTech.get(id).slots.push(slot);
    });

    const n = slots.length;
    const svcById = new Map(state.services.map((s) => [s.id, s]));
    const attributed = new Map(); // techId -> Map(serviceId -> qty)

    expandServiceIds().forEach((serviceId, idx) => {
      const slot = slots[idx % n];
      if (!slot) return;
      const techId = slot.technician_id;
      if (!attributed.has(techId)) attributed.set(techId, new Map());
      const bag = attributed.get(techId);
      bag.set(serviceId, (bag.get(serviceId) || 0) + 1);
    });

    return [...byTech.values()].map((group) => {
      const times = group.slots
        .slice()
        .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)))
        .map((s) => formatTime(s.starts_at));
      const coverageMins = group.slots.length * SLOT_BLOCK_MINUTES;
      const serviceMap = attributed.get(group.technicianId) || new Map();
      const services = [];
      serviceMap.forEach((qty, serviceId) => {
        const svc = svcById.get(serviceId);
        if (!svc || qty < 1) return;
        services.push({
          svc,
          qty,
          mins: svc.duration_minutes * qty,
          cents: svc.price_cents * qty,
        });
      });
      return {
        ...group,
        times,
        coverageMins,
        services,
      };
    });
  }

  function setQty(serviceId, qty) {
    const next = Math.max(0, Math.min(MAX_QTY, Number(qty) || 0));
    const updated = { ...state.qtyById, [serviceId]: next };
    if (next === 0) delete updated[serviceId];
    state.qtyById = updated;
    state.slot = null;
    persist();
    return true;
  }

  function totalDuration() {
    return selectedLines().reduce((n, { svc, qty }) => n + svc.duration_minutes * qty, 0);
  }

  function totalCents() {
    return selectedLines().reduce((n, { svc, qty }) => n + svc.price_cents * qty, 0);
  }

  async function api(path, opts) {
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.detail;
      throw new Error(typeof detail === "string" ? detail : "Request failed");
    }
    return data;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function scrollToPageTop() {
    const top = { top: 0, left: 0, behavior: "auto" };
    try {
      window.scrollTo(top);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (_) {
      window.scrollTo(0, 0);
    }
  }

  async function fadeSwap(apply) {
    const shell = document.body;
    shell.classList.add("sq-fading");
    await wait(220);
    apply();
    scrollToPageTop();
    // Force reflow so the enter fade always runs after the DOM swap.
    void shell.offsetWidth;
    shell.classList.remove("sq-fading");
    shell.classList.add("sq-fading-in");
    await wait(280);
    shell.classList.remove("sq-fading-in");
  }

  function syncSummaryVisibility() {
    const summary = $(".sq-summary");
    if (!summary) return;
    // Hide on landing/lookup/done and while picking a barber — show on
    // extras (if cart), time, and checkout.
    const inFlow = state.view === "flow";
    const hasCart = totalQty() > 0;
    const onStaff = state.flowStep === "staff";
    const showCardStep =
      state.flowStep === "extras" ||
      state.flowStep === "time" ||
      state.flowStep === "checkout";
    const show =
      inFlow &&
      !onStaff &&
      state.flowStep !== "done" &&
      (hasCart || showCardStep);
    summary.hidden = !show;
  }

  function hideFlowChrome() {
    const bar = $("#flow-bar");
    if (bar) bar.hidden = true;
    const checkoutFooter = $("#checkout-footer");
    if (checkoutFooter) checkoutFooter.hidden = true;
  }

  function paintMenu() {
    state.view = "menu";
    $("#step-menu").hidden = false;
    $("#step-flow").hidden = true;
    $("#step-lookup").hidden = true;
    hideFlowChrome();
    syncSummaryVisibility();
    scrollToPageTop();
    persist();
  }

  function paintLookup() {
    state.view = "lookup";
    $("#step-menu").hidden = true;
    $("#step-flow").hidden = true;
    $("#step-lookup").hidden = false;
    hideFlowChrome();
    scrollToPageTop();
    // Force labels (avoids stale HTML cache).
    const title = document.querySelector(".sq-lookup-title");
    if (title) title.textContent = "Modify Booking";
    const submit = $("#lookup-submit");
    if (submit) submit.textContent = "Modify Booking";
    const hero = $("#hero-my-bookings");
    if (hero) hero.textContent = "Modify Booking";
    // Always start fresh — do not keep prior phone / last-name entries.
    if ($("#lookup-phone")) $("#lookup-phone").value = "";
    if ($("#lookup-last")) $("#lookup-last").value = "";
    const err = $("#lookup-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    const results = $("#lookup-results");
    if (results) {
      results.hidden = true;
      results.innerHTML = "";
    }
    syncSummaryVisibility();
    persist();
  }

  function lookupVerifyPayload() {
    const phone = formatPhoneUS(phoneDigits($("#lookup-phone")?.value));
    const last = ($("#lookup-last")?.value || "").trim().slice(0, 4);
    return { phone, last_name_prefix: last };
  }

  async function cancelLookupBooking(appointmentId) {
    const verify = lookupVerifyPayload();
    if (!verify.phone || !verify.last_name_prefix) {
      throw new Error("Re-enter your phone and last name to cancel.");
    }
    return api("/api/public/cancel-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: appointmentId,
        ...verify,
      }),
    });
  }

  function startEditBooking(row) {
    const verify = lookupVerifyPayload();
    if (!verify.phone || !verify.last_name_prefix) {
      const err = $("#lookup-error");
      if (err) {
        err.textContent = "Re-enter your phone and last name to edit.";
        err.hidden = false;
      }
      return;
    }
    state.editingAppointmentId = row.id;
    state.editVerify = verify;
    state.editingDurationMinutes = Number(row.duration_minutes) || 30;
    state.editingServiceLabel = row.service || "Appointment";
    state.bookMoreBarbers = false;
    state.filterAvailableBarbers = false;
    state.selectedSlots = [];
    state.slot = null;
    state.qtyById = {}; // reschedule keeps existing services server-side
    const more = $("#book-more-barbers");
    if (more) more.checked = false;

    if (row.barber_id) {
      state.barberId = Number(row.barber_id);
      state.barberName = row.barber_name || "Barber";
      state.slotBarberFilterId = state.barberId;
    } else {
      state.barberId = null;
      state.barberName = "Any Barber";
      state.slotBarberFilterId = null;
    }

    const start = new Date(row.starts_at);
    if (Number.isFinite(start.getTime())) {
      state.date = toISODate(start);
      state.monthCursor = startOfMonth(start);
    }

    if ($("#co-phone")) $("#co-phone").value = formatPhoneUS(verify.phone);
    if ($("#co-first") && row.customer_first_name) {
      $("#co-first").value = capitalizeName(row.customer_first_name);
    }
    if ($("#co-last")) {
      // Prefill from lookup prefix; customer can complete full last name at checkout.
      $("#co-last").value = capitalizeName(verify.last_name_prefix);
    }

    showFlow("staff");
  }

  function showLookup() {
    return fadeSwap(paintLookup);
  }

  /**
   * Keep the time-step active pill in sync with Select Barber.
   * Specific barber → that id. Any Barber → null (first available after slots load).
   * When picks already exist, leave the current pill alone so multi-barber switching sticks.
   */
  function syncSlotBarberFromStaffChoice({ force = false } = {}) {
    if (!force && state.selectedSlots.length > 0) return;
    if (state.barberId != null) {
      state.slotBarberFilterId = state.barberId;
    } else {
      state.slotBarberFilterId = null;
    }
  }

  function paintFlow(step) {
    state.view = "flow";
    state.flowStep = step;
    $("#step-menu").hidden = true;
    $("#step-lookup").hidden = true;
    $("#step-flow").hidden = false;
    ["extras", "staff", "time", "checkout", "done"].forEach((name) => {
      const el = $(`#panel-${name}`);
      if (el) el.hidden = name !== step;
    });
    const hideNext = step === "checkout" || step === "done";
    const bar = $("#flow-bar");
    if (bar) bar.hidden = hideNext;
    const checkoutFooter = $("#checkout-footer");
    if (checkoutFooter) checkoutFooter.hidden = step !== "checkout";
    ["#summary-next", "#flow-bar-next"].forEach((sel) => {
      const next = $(sel);
      if (!next) return;
      next.hidden = hideNext;
      next.textContent = "Next";
    });
    if (step === "extras") renderAddons();
    if (step === "staff") renderStaffPicker();
    if (step === "time") {
      syncSlotBarberFromStaffChoice({ force: true });
      renderWeek();
      loadSlots();
    }
    if (step === "done" && state.doneCopy && $("#done-copy")) {
      $("#done-copy").textContent = state.doneCopy;
    }
    renderSummary();
    syncSummaryVisibility();
    syncNextButtons();
    scrollToPageTop();
    persist();
  }

  /** Longer visits use 30-min blocks (same barber, or multi-barber when enabled). */
  function usesBlockSlots() {
    if (isEditingBooking()) return false;
    return state.bookMoreBarbers || totalDuration() > SLOT_BLOCK_MINUTES;
  }

  function slotsNeededForDuration() {
    const needed = totalDuration();
    if (needed < 1) return 0;
    return Math.ceil(needed / SLOT_BLOCK_MINUTES);
  }

  function selectedCoverageMinutes() {
    if (usesBlockSlots()) {
      return state.selectedSlots.length * SLOT_BLOCK_MINUTES;
    }
    return state.slot ? totalDuration() : 0;
  }

  /** Coverage window: needed <= selected <= needed + 30. */
  function coverageWindow() {
    const needed = totalDuration();
    const selected = selectedCoverageMinutes();
    const threshold = SLOT_BLOCK_MINUTES;
    return {
      needed,
      selected,
      threshold,
      maxAllowed: needed + threshold,
      under: selected < needed,
      exact: selected === needed,
      within: selected > needed && selected <= needed + threshold,
      over: selected > needed + threshold,
      ok: needed > 0 && selected >= needed && selected <= needed + threshold,
    };
  }

  function coverageStatusMessage(c) {
    const { needed, selected, threshold, under, exact, within, over } = c;
    if (needed < 1) return "";
    if (under) {
      const more = needed - selected;
      return `Selected ${formatDuration(selected)} · Need ${formatDuration(more)} more`;
    }
    if (exact) {
      return `Selected ${formatDuration(selected)} · Time covered`;
    }
    if (within) {
      const surplus = selected - needed;
      return `Selected ${formatDuration(selected)} · Within ${formatDuration(
        threshold
      )} of needed (+${formatDuration(surplus)})`;
    }
    if (over) {
      const excess = selected - needed - threshold;
      return `Selected ${formatDuration(selected)} · ${formatDuration(
        excess
      )} over the ${formatDuration(threshold)} limit — remove slots`;
    }
    return `Selected ${formatDuration(selected)}`;
  }

  function coverageBlockReason() {
    if (!usesBlockSlots()) return "";
    const c = coverageWindow();
    if (c.needed < 1) return "Add at least one service to continue";
    if (!state.selectedSlots.length) {
      const n = slotsNeededForDuration();
      return n > 1
        ? `Select ${n} time slots to cover your appointment`
        : "Select a time slot to cover your appointment";
    }
    if (c.under) {
      return `Need ${formatDuration(c.needed - c.selected)} more to continue`;
    }
    if (c.over) {
      return `More than ${formatDuration(c.threshold)} over — remove some slots`;
    }
    return "";
  }

  function isEditingBooking() {
    return Boolean(state.editingAppointmentId);
  }

  function effectiveDurationMinutes() {
    if (isEditingBooking() && state.editingDurationMinutes > 0) {
      return state.editingDurationMinutes;
    }
    return totalDuration();
  }

  function timeSelectionComplete() {
    const needed = effectiveDurationMinutes();
    if (needed < 1 && !isEditingBooking()) return false;
    if (usesBlockSlots()) {
      const c = coverageWindow();
      return c.ok && state.selectedSlots.length > 0;
    }
    return Boolean(state.slot || (state.selectedSlots && state.selectedSlots[0]));
  }

  function syncNextButtons() {
    const editing = isEditingBooking();
    const needsService = !editing && totalQty() < 1;
    const timeIncomplete = !timeSelectionComplete();
    const onTime = state.flowStep === "time";
    const onCheckout = state.flowStep === "checkout";
    const needsTime = onTime && timeIncomplete;
    const checkoutBlocked =
      onCheckout && usesBlockSlots() && !editing && timeIncomplete;
    const blocked = needsService || needsTime;
    let title = "";
    if (needsService) title = "Add at least one service to continue";
    else if (needsTime || checkoutBlocked) {
      title =
        coverageBlockReason() ||
        (usesBlockSlots() && !editing
          ? "Select enough time slots to cover your total appointment time"
          : "Select a date and time to continue");
    }
    ["#summary-next", "#flow-bar-next"].forEach((sel) => {
      const next = $(sel);
      if (!next || next.hidden) return;
      next.disabled = blocked;
      next.title = title;
    });
    const confirm = $("#confirm-book");
    if (confirm) {
      confirm.textContent = editing ? "Save Changes" : "Book Appointment";
      if (onCheckout) {
        const stop = needsService || (usesBlockSlots() && !editing && timeIncomplete);
        confirm.disabled = stop;
        confirm.title = stop ? title || coverageBlockReason() : "";
      }
    }
  }

  /**
   * Book More Barbers is for multiple services. A single longer service uses
   * same-barber multi-slot picks instead — no multi-barber toggle.
   */
  function allowsBookMoreBarbers() {
    if (isEditingBooking()) return false;
    return totalQty() > 1 && totalDuration() > SLOT_BLOCK_MINUTES;
  }

  function syncBookMoreBarbersBox() {
    const box = $("#more-barbers-box");
    const toggle = $("#book-more-barbers");
    const allowed = allowsBookMoreBarbers();
    if (!allowed && state.bookMoreBarbers) {
      state.bookMoreBarbers = false;
      state.filterAvailableBarbers = false;
      if (state.slotBarberFilterId == null && state.barberId != null) {
        state.slotBarberFilterId = state.barberId;
      }
    }
    if (box) box.hidden = !allowed;
    if (toggle) {
      toggle.checked = Boolean(allowed && state.bookMoreBarbers);
      toggle.disabled = !allowed;
    }
  }

  function updateTimeHelpers() {
    syncBookMoreBarbersBox();
    const needed = totalDuration();
    const note = $("#duration-note");
    if (note) {
      if (needed < 1) {
        note.textContent = "";
      } else if (state.bookMoreBarbers) {
        note.textContent = `Need ${formatDuration(
          needed
        )} total — switch barbers below and tap clean time slots (${SLOT_BLOCK_MINUTES} mins each). Max ${formatDuration(
          SLOT_BLOCK_MINUTES
        )} over.`;
      } else if (usesBlockSlots()) {
        const n = slotsNeededForDuration();
        note.textContent = `Your service needs ${formatDuration(
          needed
        )}. Select ${n} time slot${n === 1 ? "" : "s"} (${SLOT_BLOCK_MINUTES} mins each) to cover the full visit.`;
      } else {
        note.textContent = `Your services need ${formatDuration(
          needed
        )}. Pick a start time — the full visit is reserved from that start.`;
      }
    }
    const coverage = $("#slot-coverage");
    if (coverage) {
      if (!usesBlockSlots() || needed < 1) {
        coverage.hidden = true;
      } else {
        const c = coverageWindow();
        coverage.hidden = false;
        coverage.textContent = coverageStatusMessage(c);
        coverage.classList.toggle("ok", c.ok);
        coverage.classList.toggle("over", c.over);
      }
    }
    renderBarberFilters();
    renderPickedSlots();
  }

  /** Full active roster for Book More — existing and newly added barbers. */
  function rosterBarbers() {
    return (state.barbers || []).map((b) => ({
      id: b.id,
      name: b.name || "Barber",
    }));
  }

  function barbersWithDaySlots() {
    const byId = new Map();
    (state.daySlotsCache || []).forEach((slot) => {
      if (!byId.has(slot.technician_id)) {
        byId.set(slot.technician_id, {
          id: slot.technician_id,
          name: slot.technician_name || "Barber",
        });
      }
    });
    // Prefer roster order when possible
    const ordered = [];
    rosterBarbers().forEach((b) => {
      if (byId.has(b.id)) ordered.push(byId.get(b.id));
    });
    byId.forEach((b) => {
      if (!ordered.some((x) => x.id === b.id)) ordered.push(b);
    });
    return ordered;
  }

  /** Book More chips: every roster barber, plus any day-slot names not yet in roster cache. */
  function bookMoreBarberList() {
    const byId = new Map();
    rosterBarbers().forEach((b) => byId.set(b.id, b));
    barbersWithDaySlots().forEach((b) => {
      if (!byId.has(b.id)) byId.set(b.id, b);
    });
    const ordered = [];
    rosterBarbers().forEach((b) => {
      if (byId.has(b.id)) ordered.push(byId.get(b.id));
    });
    byId.forEach((b) => {
      if (!ordered.some((x) => x.id === b.id)) ordered.push(b);
    });
    return ordered;
  }

  /** Normalize slot start to a comparable local timestamp key. */
  function slotTimeKey(startsAt) {
    const d = new Date(startsAt);
    if (Number.isNaN(d.getTime())) return String(startsAt || "");
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}T${d.getHours()}:${d.getMinutes()}`;
  }

  /** Distinct start times currently in YOUR PICKS (any barber). */
  function selectedUniqueTimes() {
    const times = [];
    const seen = new Set();
    (state.selectedSlots || []).forEach((s) => {
      const key = slotTimeKey(s.starts_at);
      if (!key || seen.has(key)) return;
      seen.add(key);
      times.push(key);
    });
    return times;
  }

  /** Times picked for a barber other than the one currently being edited. */
  function priorPickTimesForActiveBarber() {
    const activeId = state.slotBarberFilterId;
    const times = new Set();
    (state.selectedSlots || []).forEach((s) => {
      if (activeId != null && s.technician_id === activeId) return;
      const key = slotTimeKey(s.starts_at);
      if (key) times.add(key);
    });
    return times;
  }

  function barberHasAllPickTimes(barberId, timeKeys) {
    if (!timeKeys.length) return true;
    const available = new Set(
      (state.daySlotsCache || [])
        .filter((s) => s.technician_id === barberId)
        .map((s) => slotTimeKey(s.starts_at))
    );
    return timeKeys.every((t) => available.has(t));
  }

  /**
   * Available Barbers filter:
   * - Off → full roster (existing + new barbers).
   * - On, no picks yet → barbers with open times today.
   * - On, with picks → barbers free for every distinct your-picks time.
   * Always keep the active barber + anyone with picks.
   */
  function visibleBarbersForFilter(all) {
    if (!state.filterAvailableBarbers) return all;
    const times = selectedUniqueTimes();
    if (!times.length) {
      const withSlots = all.filter((b) =>
        (state.daySlotsCache || []).some((s) => s.technician_id === b.id)
      );
      // If nobody has slots yet (still loading), keep the full roster visible.
      return withSlots.length ? withSlots : all;
    }
    return all.filter((b) => {
      if (b.id === state.slotBarberFilterId) return true;
      if ((state.selectedSlots || []).some((s) => s.technician_id === b.id)) return true;
      return barberHasAllPickTimes(b.id, times);
    });
  }

  function renderBarberFilters() {
    const wrap = $("#barber-filters");
    if (!wrap) return;
    if (!state.bookMoreBarbers) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    const allBarbers = bookMoreBarberList();
    if (!allBarbers.length) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    if (
      state.barberId != null &&
      allBarbers.some((b) => b.id === state.barberId) &&
      state.selectedSlots.length === 0
    ) {
      // Before any picks, always land on the Select Barber choice.
      state.slotBarberFilterId = state.barberId;
    } else if (
      state.slotBarberFilterId == null ||
      !allBarbers.some((b) => b.id === state.slotBarberFilterId)
    ) {
      state.slotBarberFilterId =
        state.barberId && allBarbers.some((b) => b.id === state.barberId)
          ? state.barberId
          : allBarbers[0].id;
    }
    const barbers = visibleBarbersForFilter(allBarbers);
    // Keep the active filter on someone still visible after Available filtering.
    if (
      barbers.length &&
      !barbers.some((b) => b.id === state.slotBarberFilterId)
    ) {
      state.slotBarberFilterId = barbers[0].id;
    }
    wrap.hidden = false;
    wrap.innerHTML = "";

    const tools = document.createElement("div");
    tools.className = "sq-barber-filter-tools";
    const hasPicks = selectedUniqueTimes().length > 0;
    tools.innerHTML = `
      <label class="sq-available-barbers-toggle">
        <input type="checkbox" id="filter-available-barbers" ${
          state.filterAvailableBarbers ? "checked" : ""
        } />
        <span>Available Barbers</span>
      </label>
      <p class="sq-available-barbers-hint">${
        hasPicks
          ? "Shows barbers free for every time in your picks."
          : state.filterAvailableBarbers
            ? "Showing barbers with open times today. Turn off to see the full team."
            : "All barbers shown. Select one, then pick their times."
      }</p>`;
    const filterInput = tools.querySelector("#filter-available-barbers");
    if (filterInput) {
      filterInput.addEventListener("change", (ev) => {
        state.filterAvailableBarbers = Boolean(ev.target.checked);
        renderBarberFilters();
        renderSlotGroups(state.daySlotsCache);
        persist();
      });
    }
    wrap.appendChild(tools);

    const pickTimes = selectedUniqueTimes();
    const pills = document.createElement("div");
    pills.className = "sq-barber-pills";
    barbers.forEach((b) => {
      const count = state.selectedSlots.filter((s) => s.technician_id === b.id).length;
      const isActive = state.slotBarberFilterId === b.id;
      const hasBarberPicks = count > 0;
      const isAvailableMatch =
        state.filterAvailableBarbers &&
        pickTimes.length > 0 &&
        barberHasAllPickTimes(b.id, pickTimes);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = [
        "sq-barber-pill",
        isActive ? "is-active active" : "",
        hasBarberPicks && !isActive ? "has-picks" : "",
        // Black border guides available barbers when filter is on (active filled wins).
        isAvailableMatch && !isActive ? "is-available" : "",
      ]
        .filter(Boolean)
        .join(" ");
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (hasBarberPicks) {
        btn.setAttribute(
          "aria-label",
          `${b.name}, ${count} slot${count === 1 ? "" : "s"} picked`
        );
      } else if (isAvailableMatch) {
        btn.setAttribute("aria-label", `${b.name}, available for your picks`);
      }
      btn.innerHTML = `<span>${b.name}</span>${
        count ? `<em>${count}</em>` : ""
      }`;
      btn.addEventListener("click", () => {
        state.slotBarberFilterId = b.id;
        renderBarberFilters();
        renderSlotGroups(state.daySlotsCache);
        updateTimeHelpers();
        persist();
      });
      pills.appendChild(btn);
    });
    wrap.appendChild(pills);
  }

  function renderPickedSlots() {
    const wrap = $("#picked-slots");
    if (!wrap) return;
    if (!usesBlockSlots() || !state.selectedSlots.length) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    const byBarber = new Map();
    state.selectedSlots.forEach((slot) => {
      const name = slot.technician_name || "Barber";
      if (!byBarber.has(name)) byBarber.set(name, []);
      byBarber.get(name).push(slot);
    });
    wrap.innerHTML = `<p class="sq-picked-label">Your picks</p>`;
    byBarber.forEach((slots, name) => {
      const row = document.createElement("div");
      row.className = "sq-picked-row";
      const times = slots
        .map(
          (s) =>
            `<button type="button" class="sq-picked-chip" data-key="${slotKey(
              s
            )}">${formatTime(s.starts_at)} <span aria-hidden="true">×</span></button>`
        )
        .join("");
      row.innerHTML = `<strong>${name}</strong><div class="sq-picked-chips">${times}</div>`;
      row.querySelectorAll(".sq-picked-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const key = chip.dataset.key;
          const slot = state.selectedSlots.find((s) => slotKey(s) === key);
          if (!slot) return;
          toggleOrSetSlot(slot);
          renderSlotGroups(state.daySlotsCache);
          renderSummary();
          persist();
        });
      });
      wrap.appendChild(row);
    });
  }

  function renderSlotGroups(slots) {
    const groups = $("#slot-groups");
    const empty = $("#slots-empty");
    if (!groups || !empty) return;
    groups.innerHTML = "";
    empty.hidden = true;

    let visible = slots;
    if (state.bookMoreBarbers && state.slotBarberFilterId != null) {
      visible = slots.filter((s) => s.technician_id === state.slotBarberFilterId);
    } else if (usesBlockSlots() && !state.bookMoreBarbers) {
      const anchorId =
        state.barberId ||
        state.selectedSlots[0]?.technician_id ||
        null;
      if (anchorId != null) {
        visible = slots.filter((s) => s.technician_id === anchorId);
      } else {
        const seen = new Set();
        visible = slots.filter((s) => {
          if (seen.has(s.starts_at)) return false;
          seen.add(s.starts_at);
          return true;
        });
      }
    } else if (!state.barberId && !usesBlockSlots()) {
      const seen = new Set();
      visible = slots.filter((s) => {
        if (seen.has(s.starts_at)) return false;
        seen.add(s.starts_at);
        return true;
      });
    }

    if (!visible.length) {
      empty.hidden = false;
      empty.textContent = state.bookMoreBarbers
        ? "No open times for this barber. Try another barber or day."
        : "No open times this day. Try another date.";
      return;
    }

    const buckets = { Morning: [], Afternoon: [], Evening: [] };
    visible.forEach((slot) => {
      const h = new Date(slot.starts_at).getHours();
      if (h < 12) buckets.Morning.push(slot);
      else if (h < 17) buckets.Afternoon.push(slot);
      else buckets.Evening.push(slot);
    });

    Object.entries(buckets).forEach(([label, rows]) => {
      if (!rows.length) return;
      const wrap = document.createElement("div");
      wrap.className = "sq-slot-group";
      wrap.innerHTML = `<h4>${label}</h4>`;
      const grid = document.createElement("div");
      grid.className = "sq-slot-grid";
      const priorTimes = state.bookMoreBarbers ? priorPickTimesForActiveBarber() : new Set();
      rows.forEach((slot) => {
        const btn = document.createElement("button");
        btn.type = "button";
        const selected = isSlotSelected(slot);
        const blocked = usesBlockSlots() && !selected && !canAddMoreSlots();
        const matchOther =
          state.bookMoreBarbers &&
          !selected &&
          priorTimes.has(slotTimeKey(slot.starts_at));
        btn.className = [
          "sq-slot",
          selected ? "selected" : "",
          blocked ? "capped" : "",
          matchOther ? "has-prior-pick" : "",
        ]
          .filter(Boolean)
          .join(" ");
        btn.disabled = blocked;
        if (matchOther) {
          btn.title = "Same time as another barber’s pick";
        }
        btn.textContent = formatTime(slot.starts_at);
        btn.addEventListener("click", () => {
          if (!toggleOrSetSlot(slot)) return;
          renderBarberFilters();
          renderSlotGroups(state.daySlotsCache.length ? state.daySlotsCache : visible);
          renderSummary();
          persist();
        });
        grid.appendChild(btn);
      });
      wrap.appendChild(grid);
      groups.appendChild(wrap);
    });
  }

  function slotKey(slot) {
    return `${slot.starts_at}|${slot.technician_id}`;
  }

  function isSlotSelected(slot) {
    if (usesBlockSlots()) {
      return state.selectedSlots.some((s) => slotKey(s) === slotKey(slot));
    }
    return state.slot && state.slot.starts_at === slot.starts_at;
  }

  function toggleOrSetSlot(slot) {
    if (usesBlockSlots()) {
      const key = slotKey(slot);
      const exists = state.selectedSlots.some((s) => slotKey(s) === key);
      if (exists) {
        state.selectedSlots = state.selectedSlots.filter((s) => slotKey(s) !== key);
      } else {
        // Same-barber coverage: keep all picks on one technician.
        if (!state.bookMoreBarbers) {
          const anchorId =
            state.barberId || state.selectedSlots[0]?.technician_id || null;
          if (
            anchorId != null &&
            slot.technician_id !== anchorId &&
            state.selectedSlots.length
          ) {
            state.selectedSlots = [];
          } else if (
            state.selectedSlots.length &&
            state.selectedSlots[0].technician_id !== slot.technician_id
          ) {
            state.selectedSlots = [];
          }
        }
        const needed = totalDuration();
        const nextMins = selectedCoverageMinutes() + SLOT_BLOCK_MINUTES;
        // Allow covering the total, plus at most one extra 30-min block.
        if (needed > 0 && nextMins - needed > SLOT_BLOCK_MINUTES) {
          return false;
        }
        state.selectedSlots = [...state.selectedSlots, slot];
      }
      state.selectedSlots.sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
      state.slot = state.selectedSlots[0] || null;
      if (state.slot && !state.barberId) {
        state.barberName = state.bookMoreBarbers
          ? state.selectedSlots.map((s) => s.technician_name).filter(Boolean).join(", ")
          : state.slot.technician_name;
      }
      return true;
    }
    state.slot = slot;
    state.selectedSlots = [slot];
    if (!state.barberId) {
      state.barberName = slot.technician_name;
    }
    return true;
  }

  function canAddMoreSlots() {
    if (!usesBlockSlots()) return true;
    const needed = totalDuration();
    if (needed < 1) return false;
    return selectedCoverageMinutes() + SLOT_BLOCK_MINUTES - needed <= SLOT_BLOCK_MINUTES;
  }

  function showMenu() {
    return fadeSwap(paintMenu);
  }

  function showFlow(step) {
    return fadeSwap(() => paintFlow(step));
  }

  function renderMenuServices() {
    const grid = $("#menu-services");
    grid.innerHTML = "";
    state.services.forEach((svc) => {
      const card = document.createElement("article");
      card.className = "sq-card";
      card.innerHTML = `
        <h3>${svc.name}</h3>
        <p>${svc.description || ""}</p>
        <div class="sq-card-foot">
          <button type="button" data-id="${svc.id}">Book Now</button>
          <span class="sq-price">${money(svc.price_cents)} · ${svc.duration_minutes} mins</span>
        </div>`;
      card.querySelector("button").addEventListener("click", () => {
        state.qtyById = { [svc.id]: 1 };
        state.barberId = null;
        state.barberName = "Any Barber";
        state.slot = null;
        showFlow("extras");
      });
      grid.appendChild(card);
    });
  }

  function renderAddons() {
    const list = $("#addon-list");
    list.innerHTML = "";
    state.services.forEach((svc) => {
      const qty = Number(state.qtyById[svc.id]) || 0;
      const row = document.createElement("div");
      row.className = "sq-addon-row" + (qty > 0 ? " has-qty" : "");
      row.innerHTML = `
        <div class="sq-addon-copy">
          <strong>${svc.name}</strong>
          <span>${svc.description || ""}</span>
          <span>${money(svc.price_cents)} · ${svc.duration_minutes} min</span>
        </div>
        <div class="sq-qty" role="group" aria-label="Quantity for ${svc.name}">
          <button type="button" class="sq-qty-btn" data-act="dec" aria-label="Decrease">−</button>
          <span class="sq-qty-val">${qty}</span>
          <button type="button" class="sq-qty-btn" data-act="inc" aria-label="Increase">+</button>
        </div>`;
      row.querySelectorAll(".sq-qty-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.act;
          const next = act === "inc" ? qty + 1 : qty - 1;
          if (!setQty(svc.id, next)) return;
          renderAddons();
          renderSummary();
        });
      });
      list.appendChild(row);
    });
  }

  function renderStaffPicker() {
    const list = $("#staff-list");
    list.innerHTML = "";
    const any = document.createElement("button");
    any.type = "button";
    any.className = "sq-staff-row" + (state.barberId == null ? " selected" : "");
    any.innerHTML = `
      <span class="sq-avatar">∞</span>
      <strong>Any Barber</strong>
      <span class="sq-radio" aria-hidden="true"></span>`;
    any.addEventListener("click", () => {
      state.barberId = null;
      state.barberName = "Any Barber";
      state.slotBarberFilterId = null;
      state.slot = null;
      state.selectedSlots = [];
      renderStaffPicker();
      renderSummary();
      persist();
    });
    list.appendChild(any);

    state.barbers.forEach((b) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "sq-staff-row" + (state.barberId === b.id ? " selected" : "");
      row.innerHTML = `
        <span class="sq-avatar">${initials(b.name)}</span>
        <strong>${b.name}</strong>
        <span class="sq-radio" aria-hidden="true"></span>`;
      row.addEventListener("click", () => {
        state.barberId = b.id;
        state.barberName = b.name;
        state.slotBarberFilterId = b.id;
        state.slot = null;
        state.selectedSlots = [];
        renderStaffPicker();
        renderSummary();
        persist();
      });
      list.appendChild(row);
    });
  }

  function renderWeek() {
    if (!state.monthCursor) state.monthCursor = startOfMonth(new Date());
    if (!state.date) state.date = toISODate(new Date());
    const label = $("#month-label");
    label.textContent = state.monthCursor.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    const strip = $("#week-strip");
    strip.innerHTML = "";
    if (!state.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      state.date = toISODate(today);
    }
    const anchor = parseISODate(state.date);
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - anchor.getDay());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      const iso = toISODate(day);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sq-day" + (iso === state.date ? " selected" : "");
      btn.disabled = day < today;
      btn.innerHTML = `${day.toLocaleDateString(undefined, { weekday: "short" })}<strong>${day.getDate()}</strong>`;
      btn.addEventListener("click", () => {
        state.date = iso;
        state.slot = null;
        state.selectedSlots = [];
        state.monthCursor = startOfMonth(day);
        renderWeek();
        loadSlots();
        renderSummary();
        persist();
      });
      strip.appendChild(btn);
    }
    $("#day-title").textContent = formatDayLong(state.date);
  }

  async function loadSlots() {
    const empty = $("#slots-empty");
    const groups = $("#slot-groups");
    if (groups) groups.innerHTML = "";
    if (empty) empty.hidden = true;
    state.daySlotsCache = [];
    if (!state.date || totalQty() < 1) {
      updateTimeHelpers();
      return;
    }

    // Block mode (long single service or Book More): 30-min openings.
    // Short single-slot visits: start times that fit the full duration.
    const duration = usesBlockSlots()
      ? SLOT_BLOCK_MINUTES
      : Math.max(SLOT_BLOCK_MINUTES, totalDuration());
    let url = `/api/slots?day=${state.date}&duration_minutes=${duration}&travel_buffer_minutes=0`;
    // Book More loads every barber; same-barber block / single start filter to pick.
    if (!state.bookMoreBarbers && state.barberId) {
      url += `&technician_id=${state.barberId}`;
    }

    try {
      let slots = await api(url);
      const bookable = new Set(state.barbers.map((b) => b.id));
      slots = slots.filter(
        (s) => s.available !== false && bookable.has(s.technician_id)
      );
      state.daySlotsCache = slots;
      if (state.bookMoreBarbers) {
        const available = bookMoreBarberList();
        // Prefer Select Barber choice; Any Barber → first available on the day.
        if (
          state.barberId != null &&
          available.some((b) => b.id === state.barberId) &&
          (state.slotBarberFilterId == null ||
            state.slotBarberFilterId === state.barberId ||
            state.selectedSlots.length === 0)
        ) {
          state.slotBarberFilterId = state.barberId;
        } else if (
          state.slotBarberFilterId == null ||
          !available.some((b) => b.id === state.slotBarberFilterId)
        ) {
          state.slotBarberFilterId =
            state.barberId && available.some((b) => b.id === state.barberId)
              ? state.barberId
              : available[0]?.id ?? null;
        }
      }
      renderSlotGroups(slots);
      updateTimeHelpers();
    } catch (err) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = err.message || "Could not load times.";
      }
      updateTimeHelpers();
    }
  }

  function formatDuration(mins) {
    const n = Math.max(0, Number(mins) || 0);
    if (n < 60) return `${n} mins`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    if (!m) return h === 1 ? "1 hr" : `${h} hrs`;
    return `${h} hr${h > 1 ? "s" : ""} ${m} mins`;
  }

  function renderSummaryServiceRow(svc, qty, opts = {}) {
    const label = qty > 1 ? `${svc.name} ×${qty}` : svc.name;
    const lineMins = svc.duration_minutes * qty;
    const lineCents = svc.price_cents * qty;
    const who = opts.who ? `<span class="who">with ${opts.who}</span>` : "";
    return `
      <div>
        <strong>${label}</strong>
        ${who}
        <span class="sq-line-mins">${lineMins} mins</span>
      </div>
      <span>${money(lineCents)}</span>`;
  }

  function renderSummary() {
    const lines = $("#summary-lines");
    const totals = $("#summary-totals");
    const when = $("#summary-when");
    lines.innerHTML = "";
    lines.classList.remove("is-grouped");

    const multiGroups =
      state.bookMoreBarbers && state.selectedSlots.length
        ? barberSummaryGroups()
        : [];
    const useBarberGroups = multiGroups.length > 0 && state.flowStep !== "extras";

    if (useBarberGroups) {
      lines.classList.add("is-grouped");
      multiGroups.forEach((group) => {
        const li = document.createElement("li");
        li.className = "sq-summary-group";
        const timesLabel = group.times.join(", ");
        const servicesHtml = group.services.length
          ? `<ul class="sq-summary-group-services">${group.services
              .map(
                ({ svc, qty }) =>
                  `<li class="sq-summary-service">${renderSummaryServiceRow(svc, qty)}</li>`
              )
              .join("")}</ul>`
          : `<p class="sq-summary-group-note">Time reserved for this visit</p>`;
        li.innerHTML = `
          <div class="sq-summary-group-head">
            <strong class="sq-summary-barber">${group.name}</strong>
            <span class="sq-summary-group-times">${timesLabel} · ${formatDuration(
              group.coverageMins
            )}</span>
          </div>
          ${servicesHtml}`;
        lines.appendChild(li);
      });
    } else if (isEditingBooking()) {
      const li = document.createElement("li");
      const who =
        state.barberName && state.barberName !== "Any Barber"
          ? state.barberName
          : "";
      const minsEdit = state.editingDurationMinutes || 30;
      li.innerHTML = `
        <div>
          <strong>${state.editingServiceLabel || "Appointment"}</strong>
          ${who ? `<span class="who">with ${who}</span>` : ""}
          <span class="sq-line-mins">${minsEdit} mins</span>
        </div>
        <span></span>`;
      lines.appendChild(li);
    } else {
      selectedLines().forEach(({ svc, qty }) => {
        const li = document.createElement("li");
        const who =
          state.flowStep !== "extras" ? barberNameForService(svc.id) : "";
        li.innerHTML = renderSummaryServiceRow(svc, qty, { who });
        lines.appendChild(li);
      });
    }

    const cents = isEditingBooking() ? 0 : totalCents();
    const mins = effectiveDurationMinutes();
    totals.innerHTML = isEditingBooking()
      ? `
      <div><span>Total time</span><span>${formatDuration(mins)}</span></div>
      <div class="total"><span>Updating booking</span><span></span></div>`
      : `
      <div><span>Total time</span><span>${formatDuration(mins)}</span></div>
      <div><span>Subtotal</span><span>${money(cents)}</span></div>
      <div><span>Taxes</span><span>$0.00</span></div>
      <div class="total"><span>Total</span><span>${money(cents)}</span></div>
      <div><span>Due At Appointment</span><span>${money(cents)}</span></div>`;

    const barTotal = $("#flow-bar-total");
    const barTime = $("#flow-bar-time");
    if (barTotal) {
      barTotal.textContent = isEditingBooking() ? "Edit" : money(cents);
    }
    if (barTime) barTime.textContent = formatDuration(mins);

    if (useBarberGroups) {
      when.hidden = false;
      const day = state.date ? formatDayLong(state.date) : "";
      const nBarbers = multiGroups.length;
      when.textContent = `${day ? `${day} · ` : ""}${
        state.selectedSlots.length
      } Slot${state.selectedSlots.length > 1 ? "s" : ""} · ${formatDuration(
        selectedCoverageMinutes()
      )} with ${nBarbers} Barber${nBarbers > 1 ? "s" : ""}`;
    } else if (state.slot) {
      when.hidden = false;
      const who = state.barberId
        ? state.barberName
        : state.slot.technician_name || state.barberName;
      const withWho =
        who && who !== "Any Barber" && who !== "Any staff" ? ` · with ${who}` : "";
      when.textContent = `${formatRange(state.slot.starts_at, mins)}${withWho}`;
    } else {
      when.hidden = true;
    }
    updateTimeHelpers();
    syncSummaryVisibility();
    syncNextButtons();
  }

  function nextFromSummary() {
    if (!isEditingBooking() && totalQty() < 1) {
      alert("Add at least one service to continue.");
      return;
    }
    if (state.flowStep === "extras") showFlow("staff");
    else if (state.flowStep === "staff") {
      syncSlotBarberFromStaffChoice({ force: true });
      showFlow("time");
    } else if (state.flowStep === "time") {
      if (!timeSelectionComplete()) {
        alert(
          coverageBlockReason() ||
            (usesBlockSlots()
              ? `Select enough time slots to cover ${formatDuration(totalDuration())}.`
              : "Pick a time to continue.")
        );
        return;
      }
      showFlow("checkout");
    }
  }

  function backFlow() {
    if (state.flowStep === "extras") showMenu();
    else if (state.flowStep === "staff") {
      if (isEditingBooking()) {
        state.editingAppointmentId = null;
        state.editVerify = null;
        state.editingDurationMinutes = 0;
        state.editingServiceLabel = "";
        showLookup();
      } else {
        showFlow("extras");
      }
    } else if (state.flowStep === "time") showFlow("staff");
    else if (state.flowStep === "checkout") showFlow("time");
    else if (state.flowStep === "done") showMenu();
  }

  async function submitCheckout(e) {
    e.preventDefault();
    const err = $("#checkout-error");
    err.hidden = true;
    applyPhoneMask($("#co-phone"));
    applyNameCapitalize($("#co-first"));
    applyNameCapitalize($("#co-last"));
    const digits = phoneDigits($("#co-phone").value);
    const phone = formatPhoneUS(digits);
    const first = capitalizeName($("#co-first").value).trim();
    const last = capitalizeName($("#co-last").value).trim();
    const email = $("#co-email").value.trim();
    const notes = $("#co-notes").hidden ? "" : $("#co-notes").value.trim();
    if ($("#co-phone")) $("#co-phone").value = phone;
    if ($("#co-first")) $("#co-first").value = first;
    if ($("#co-last")) $("#co-last").value = last;
    if (!digits) {
      err.textContent = "Phone number is required.";
      err.hidden = false;
      $("#co-phone")?.focus();
      return;
    }
    if (digits.length !== 10) {
      err.textContent = "Enter a 10-digit phone number (###-###-####).";
      err.hidden = false;
      $("#co-phone")?.focus();
      return;
    }
    if (!first) {
      err.textContent = "First name is required.";
      err.hidden = false;
      $("#co-first")?.focus();
      return;
    }
    if (!last) {
      err.textContent = "Last name is required.";
      err.hidden = false;
      $("#co-last")?.focus();
      return;
    }
    if (!isEditingBooking() && totalQty() < 1) {
      err.textContent = "Missing service — go back and finish selecting.";
      err.hidden = false;
      return;
    }
    if (!timeSelectionComplete()) {
      err.textContent =
        coverageBlockReason() ||
        "Missing or invalid time coverage — go back and adjust your slots.";
      err.hidden = false;
      return;
    }
    const btn = $("#confirm-book");
    btn.disabled = true;
    try {
      // Edit / reschedule path — keep original services, update barber + time.
      if (state.editingAppointmentId && state.editVerify) {
        const slot = state.slot || state.selectedSlots[0];
        if (!slot) {
          err.textContent = "Pick a new time before saving.";
          err.hidden = false;
          btn.disabled = false;
          return;
        }
        const techId = state.barberId || slot.technician_id;
        const appt = await api("/api/public/reschedule-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_id: state.editingAppointmentId,
            phone: state.editVerify.phone,
            last_name_prefix: state.editVerify.last_name_prefix,
            technician_id: techId,
            starts_at: slot.starts_at,
          }),
        });
        const who = appt.technician?.name || state.barberName;
        state.doneCopy = `${appt.appliance} with ${who} on ${formatRange(
          appt.starts_at,
          appt.duration_minutes
        )}.`;
        $("#done-copy").textContent = state.doneCopy;
        state.editingAppointmentId = null;
        state.editVerify = null;
        state.editingDurationMinutes = 0;
        state.editingServiceLabel = "";
        showFlow("done");
        return;
      }

      const base = {
        customer_first_name: first,
        customer_last_name: last,
        customer_phone: phone,
        customer_email: email || null,
        notes: notes || null,
        marketing_opt_in: false,
        business_name: cfg.businessName,
      };
      const serviceIds = expandServiceIds();
      let appts = [];

      if (state.bookMoreBarbers && state.selectedSlots.length > 1) {
        const slots = state.selectedSlots;
        const n = slots.length;
        const buckets = Array.from({ length: n }, () => []);
        serviceIds.forEach((id, idx) => buckets[idx % n].push(id));
        for (let i = 0; i < n; i++) {
          const ids = buckets[i].length ? buckets[i] : [serviceIds[0]];
          const slot = slots[i];
          const techId = state.barberId || slot.technician_id;
          const appt = await api("/api/public/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...base,
              service_ids: ids,
              technician_id: techId,
              starts_at: slot.starts_at,
              notes: i === 0 ? base.notes : `Part of multi-barber booking${base.notes ? ` — ${base.notes}` : ""}`,
            }),
          });
          appts.push(appt);
        }
      } else {
        const slot = state.slot || state.selectedSlots[0];
        const techId = state.barberId || slot.technician_id;
        const appt = await api("/api/public/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...base,
            service_ids: serviceIds,
            technician_id: techId,
            starts_at: slot.starts_at,
          }),
        });
        appts = [appt];
      }

      const primary = appts[0];
      const who =
        appts.length > 1
          ? `${appts.length} barbers`
          : primary.technician?.name || state.barberName;
      state.doneCopy = `${primary.appliance} with ${who} on ${formatRange(
        primary.starts_at,
        primary.duration_minutes
      )}${appts.length > 1 ? ` (+${appts.length - 1} more booking${appts.length > 2 ? "s" : ""})` : ""}.`;
      $("#done-copy").textContent = state.doneCopy;
      showFlow("done");
    } catch (ex) {
      err.textContent = ex.message || "Booking failed";
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  function clearCheckoutForm() {
    $("#checkout-form")?.reset();
    if ($("#co-phone")) $("#co-phone").value = "";
    if ($("#co-first")) $("#co-first").value = "";
    if ($("#co-last")) $("#co-last").value = "";
    if ($("#co-email")) $("#co-email").value = "";
    if ($("#co-notes")) {
      $("#co-notes").value = "";
      $("#co-notes").hidden = true;
    }
    if ($("#toggle-notes")) $("#toggle-notes").textContent = "Add";
    const err = $("#checkout-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    persist();
  }

  function resetAll() {
    state.qtyById = {};
    state.barberId = null;
    state.barberName = "Any Barber";
    state.slot = null;
    state.selectedSlots = [];
    state.bookMoreBarbers = false;
    state.filterAvailableBarbers = false;
    state.slotBarberFilterId = null;
    state.daySlotsCache = [];
    state.doneCopy = "";
    state.editingAppointmentId = null;
    state.editVerify = null;
    state.editingDurationMinutes = 0;
    state.editingServiceLabel = "";
    state.date = toISODate(new Date());
    state.monthCursor = startOfMonth(new Date());
    clearCheckoutForm();
    const more = $("#book-more-barbers");
    if (more) more.checked = false;
    clearPersisted();
    showMenu();
  }

  function mapsChooserUrl(address) {
    // Opens the device maps handler so the customer can pick Apple Maps, Google Maps, etc.
    return `https://maps.apple.com/?q=${encodeURIComponent(address || "")}`;
  }

  function holdMinutes() {
    const n = Number(cfg.bookingHoldMinutes ?? cfg.shop?.bookingHoldMinutes ?? 10);
    return Number.isFinite(n) && n > 0 ? Math.min(60, Math.round(n)) : 10;
  }

  function refreshHoldLabel() {
    const label = $("#hold-minutes-label");
    if (label) label.textContent = String(holdMinutes());
  }

  /** "8:30 AM – 5:00 PM" → "8:30am - 5:00pm" */
  function formatHoursRange(raw) {
    return String(raw || "")
      .replace(/\u2013|\u2014/g, "-")
      .replace(/\s*-\s*/g, " - ")
      .replace(/\bAM\b/gi, "am")
      .replace(/\bPM\b/gi, "pm")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** e.g. "Saturday 8:30am - 5:00pm" */
  function formatDayHours(day, hours) {
    const d = String(day || "").trim();
    const h = formatHoursRange(hours);
    if (!d) return h;
    if (!h) return d;
    return `${d} ${h}`;
  }

  function wireShopMeta() {
    const shop = cfg.shop || {};
    const hours = shop.hours || [];
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const row = hours.find((h) => h.day === today) || hours[0];
    const line = $("#shop-hours-line");
    if (line && row) {
      line.textContent = formatDayHours(row.day, row.hours);
    }
    const hoursBody = document.querySelector(".sq-hours tbody");
    if (hoursBody && hours.length) {
      hoursBody.innerHTML = hours
        .map(
          (h) =>
            `<tr><td colspan="2">${formatDayHours(h.day, h.hours)}</td></tr>`
        )
        .join("");
    }
    const addr = shop.address || "";
    const addressLink = $("#shop-address-link");
    if (addressLink && addr) {
      addressLink.href = mapsChooserUrl(addr);
    }
    refreshHoldLabel();
  }

  async function submitLookup(e) {
    e.preventDefault();
    const err = $("#lookup-error");
    const results = $("#lookup-results");
    err.hidden = true;
    results.hidden = true;
    results.innerHTML = "";
    applyPhoneMask($("#lookup-phone"));
    applyNameCapitalize($("#lookup-last"), { lettersOnly: true, maxLen: 4 });
    const digits = phoneDigits($("#lookup-phone").value);
    const phone = formatPhoneUS(digits);
    if ($("#lookup-phone")) $("#lookup-phone").value = phone;
    const last = ($("#lookup-last").value || "").trim();
    if (!digits || last.length < 1) {
      err.textContent = "Enter your phone number and the first letters of your last name.";
      err.hidden = false;
      return;
    }
    if (digits.length < 7) {
      err.textContent = "Enter a valid phone number (###-###-####).";
      err.hidden = false;
      return;
    }
    const btn = $("#lookup-submit");
    btn.disabled = true;
    try {
      const rows = await api("/api/public/lookup-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          last_name_prefix: last.slice(0, 4),
        }),
      });
      // Upcoming only: starts_at >= now (exclude past slots from earlier today).
      const nowMs = Date.now();
      const upcoming = (Array.isArray(rows) ? rows : []).filter((row) => {
        const startMs = new Date(row.starts_at).getTime();
        if (!Number.isFinite(startMs) || startMs < nowMs) return false;
        const status = String(row.status || "").toLowerCase();
        return status !== "cancelled" && status !== "canceled";
      });
      if (!upcoming.length) {
        err.textContent = "No upcoming booking found. Check the phone and last name, or book a new appointment.";
        err.hidden = false;
        return;
      }
      results.innerHTML = upcoming
        .map((row) => {
          const when = formatRange(row.starts_at, row.duration_minutes);
          const who = row.barber_name ? `with ${row.barber_name}` : "";
          const hello = row.customer_first_name
            ? `Hi ${row.customer_first_name}`
            : "Your booking";
          const id = Number(row.id);
          const payload = encodeURIComponent(JSON.stringify(row));
          return `<article class="sq-lookup-card" data-appointment-id="${id}">
            <p class="sq-lookup-hello">${hello}</p>
            <h2>${row.service}</h2>
            <p class="sq-lookup-when">${when}</p>
            ${who ? `<p class="sq-lookup-who">${who}</p>` : ""}
            <p class="sq-lookup-status">${row.status}</p>
            <div class="sq-lookup-actions">
              <button type="button" class="sq-btn sq-btn-ghost sq-lookup-edit" data-edit="${payload}">Edit</button>
              <button type="button" class="sq-btn sq-btn-danger sq-lookup-cancel" data-cancel-id="${id}">Cancel</button>
            </div>
          </article>`;
        })
        .join("");
      results.hidden = false;
    } catch (ex) {
      err.textContent = ex.message || "Could not look up your booking.";
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  async function onLookupResultsClick(ev) {
    const editBtn = ev.target.closest(".sq-lookup-edit");
    if (editBtn) {
      try {
        const row = JSON.parse(decodeURIComponent(editBtn.getAttribute("data-edit") || ""));
        startEditBooking(row);
      } catch (_) {
        const err = $("#lookup-error");
        if (err) {
          err.textContent = "Could not open this booking for edit.";
          err.hidden = false;
        }
      }
      return;
    }
    const cancelBtn = ev.target.closest(".sq-lookup-cancel");
    if (!cancelBtn) return;
    const id = Number(cancelBtn.getAttribute("data-cancel-id"));
    if (!id) return;
    if (!window.confirm("Cancel this appointment? The time slot will open again.")) {
      return;
    }
    const err = $("#lookup-error");
    cancelBtn.disabled = true;
    try {
      await cancelLookupBooking(id);
      const card = cancelBtn.closest(".sq-lookup-card");
      if (card) card.remove();
      const results = $("#lookup-results");
      if (results && !results.querySelector(".sq-lookup-card")) {
        results.hidden = true;
        if (err) {
          err.textContent = "Appointment cancelled.";
          err.hidden = false;
        }
      }
    } catch (ex) {
      if (err) {
        err.textContent = ex.message || "Could not cancel appointment.";
        err.hidden = false;
      }
      cancelBtn.disabled = false;
    }
  }

  $("#book-more-barbers")?.addEventListener("change", (ev) => {
    state.bookMoreBarbers = Boolean(ev.target.checked);
    state.slot = null;
    state.selectedSlots = [];
    // Off filter by default so every roster barber (existing + new) is selectable.
    state.filterAvailableBarbers = false;
    state.slotBarberFilterId = state.barberId;
    if (state.flowStep === "time") {
      loadSlots();
      renderSummary();
    } else {
      updateTimeHelpers();
      syncNextButtons();
    }
    persist();
  });
  $("#hero-my-bookings")?.addEventListener("click", () => showLookup());
  $("#lookup-back")?.addEventListener("click", () => showMenu());
  $("#lookup-form")?.addEventListener("submit", submitLookup);
  $("#lookup-results")?.addEventListener("click", onLookupResultsClick);
  $("#flow-back")?.addEventListener("click", backFlow);
  $("#summary-next")?.addEventListener("click", nextFromSummary);
  $("#flow-bar-next")?.addEventListener("click", nextFromSummary);
  $("#checkout-form")?.addEventListener("submit", submitCheckout);
  $("#clear-checkout-form")?.addEventListener("click", clearCheckoutForm);
  $("#flow-start-over")?.addEventListener("click", () => {
    if (window.confirm("Clear this booking and start over?")) resetAll();
  });
  $("#book-another")?.addEventListener("click", resetAll);
  $("#toggle-notes")?.addEventListener("click", () => {
    const ta = $("#co-notes");
    const open = ta.hidden;
    ta.hidden = !open;
    $("#toggle-notes").textContent = open ? "Hide" : "Add";
    if (open) ta.focus();
  });
  $("#month-prev")?.addEventListener("click", () => {
    const d = parseISODate(state.date || toISODate(new Date()));
    d.setDate(d.getDate() - 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) d.setTime(today.getTime());
    state.date = toISODate(d);
    state.monthCursor = startOfMonth(d);
    state.slot = null;
    state.selectedSlots = [];
    renderWeek();
    loadSlots();
    persist();
  });
  $("#month-next")?.addEventListener("click", () => {
    const d = parseISODate(state.date || toISODate(new Date()));
    d.setDate(d.getDate() + 7);
    state.date = toISODate(d);
    state.monthCursor = startOfMonth(d);
    state.slot = null;
    state.selectedSlots = [];
    renderWeek();
    loadSlots();
    persist();
  });

  ["co-phone", "lookup-phone"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      applyPhoneMask(el);
      persist();
    });
    el.addEventListener("change", () => {
      applyPhoneMask(el);
      persist();
    });
  });
  ["co-first", "co-last"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      applyNameCapitalize(el);
      persist();
    });
    el.addEventListener("change", () => {
      applyNameCapitalize(el);
      persist();
    });
  });
  const lookupLast = $("#lookup-last");
  if (lookupLast) {
    const formatLookupLast = () => {
      applyNameCapitalize(lookupLast, { lettersOnly: true, maxLen: 4 });
      persist();
    };
    lookupLast.addEventListener("input", formatLookupLast);
    lookupLast.addEventListener("change", formatLookupLast);
  }
  ["co-email", "co-notes"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", persist);
    el.addEventListener("input", persist);
  });

  (async () => {
    wireShopMeta();
    const [services, barbers] = await Promise.all([
      api("/api/services"),
      api("/api/technicians"),
    ]);
    state.services = services;
    // Desk "Admin" login row is not a bookable chair.
    state.barbers = barbers.filter((b) => String(b.name).toLowerCase() !== "admin");
    renderMenuServices();

    const saved = readPersisted();
    const serviceIds = new Set(state.services.map((s) => s.id));
    const barberIds = new Set(state.barbers.map((b) => b.id));

    if (saved) {
      const qty = {};
      Object.entries(saved.qtyById || {}).forEach(([id, q]) => {
        const nid = Number(id);
        if (serviceIds.has(nid) && Number(q) > 0) qty[nid] = Math.min(MAX_QTY, Number(q));
      });
      state.qtyById = qty;
      if (saved.barberId == null) {
        state.barberId = null;
        state.barberName =
          saved.barberName === "Any staff" ? "Any Barber" : saved.barberName || "Any Barber";
      } else if (barberIds.has(Number(saved.barberId))) {
        state.barberId = Number(saved.barberId);
        state.barberName = saved.barberName || "Any Barber";
      }
      state.date = saved.date || toISODate(new Date());
      state.monthCursor = saved.monthCursor
        ? startOfMonth(parseISODate(saved.monthCursor))
        : startOfMonth(parseISODate(state.date));
      state.slot = saved.slot || null;
      state.selectedSlots = Array.isArray(saved.selectedSlots) ? saved.selectedSlots : [];
      // Default off; only restore when multi-service Book More is allowed.
      state.bookMoreBarbers =
        totalQty() > 1 &&
        totalDuration() > SLOT_BLOCK_MINUTES &&
        Boolean(saved.bookMoreBarbers);
      state.filterAvailableBarbers = state.bookMoreBarbers
        ? Boolean(saved.filterAvailableBarbers)
        : false;
      state.doneCopy = saved.doneCopy || "";
      applyCheckoutForm(saved.checkout);
      // Do not restore lookup fields — Modify Booking always opens empty.
      const more = $("#book-more-barbers");
      if (more) more.checked = state.bookMoreBarbers;

      if (saved.view === "lookup") {
        paintLookup();
      } else if (saved.view === "flow" && saved.flowStep) {
        // Need at least one service for flow (except we allow viewing done)
        if (saved.flowStep === "done" || totalQty() > 0) {
          paintFlow(saved.flowStep);
        } else {
          paintMenu();
        }
      } else {
        paintMenu();
      }
    } else {
      state.date = toISODate(new Date());
      state.monthCursor = startOfMonth(new Date());
      paintMenu();
    }
  })();
})();

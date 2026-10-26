const DAY_START = 8;
const DAY_HOURS = 10;
const SLOT_STEP_MINUTES = 30;

/** Static city centers for Central Valley demo (no geocoding API). Keep in sync with app/geo.py. */
const CITY_COORDS = {
  bakersfield: { lat: 35.3733, lng: -119.0187 },
  wasco: { lat: 35.5941, lng: -119.3409 },
  shafter: { lat: 35.5005, lng: -119.2718 },
  taft: { lat: 35.1425, lng: -119.4565 },
  delano: { lat: 35.7688, lng: -119.2471 },
};

/** Zip → city key (mirrors app/geo.py ZIP_TO_CITY). */
const ZIP_TO_CITY = {
  "93301": "bakersfield",
  "93302": "bakersfield",
  "93304": "bakersfield",
  "93305": "bakersfield",
  "93306": "bakersfield",
  "93307": "bakersfield",
  "93308": "bakersfield",
  "93309": "bakersfield",
  "93311": "bakersfield",
  "93312": "bakersfield",
  "93313": "bakersfield",
  "93314": "bakersfield",
  "93280": "wasco",
  "93263": "shafter",
  "93268": "taft",
  "93215": "delano",
  "93216": "delano",
};

/** Shop/start_location tokens → city (mirrors app/geo.py START_LOCATION_CITY). */
const START_LOCATION_CITY = {
  north: "bakersfield",
  south: "bakersfield",
  shop: "bakersfield",
};

const DEFAULT_MAP_CENTER = [35.45, -119.25];
const DEFAULT_MAP_ZOOM = 9;
/** Comfortable fit for day routes after accordion expand (not too tight / not too far). */
const MAP_FIT_PADDING = [56, 48];
const MAP_FIT_MAX_ZOOM = 12;
/** Street-level zoom when focusing one appointment from Show on map. */
const MAP_APPT_FOCUS_ZOOM = 16;
/** Must match .day-map / .tech-day-map height transition (~300ms) + paint slack. */
const MAP_EXPAND_SETTLE_MS = 340;

const MAP_BASEMAP_MODES = ["street", "satellite"];
const MAP_TILE_STREET =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_TILE_SATELLITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const MAP_TILE_STREET_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAP_TILE_SATELLITE_ATTR =
  "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

/**
 * Layout bands (CSS is source of truth; classes help maps + drawer scroll).
 * phone ≤640 · tablet 641–1024 · desktop ≥1025
 */
const PHONE_MQ = window.matchMedia("(max-width: 640px)");
const TABLET_MQ = window.matchMedia("(min-width: 641px) and (max-width: 1024px)");
const NARROW_MQ = window.matchMedia("(max-width: 1024px)");
/** Analytics + History — mobile Cuts hub tabs */
const JOBS_HUB_PAGES = ["analytics", "history"];

function isNarrowNav() {
  return NARROW_MQ.matches;
}

function isJobsHubPage(page) {
  return JOBS_HUB_PAGES.includes(page);
}

function hourHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--hour-h").trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 56;
}

const PREFS_KEY = "repairDesk.prefs.v1";

const DAY_BOARD_VIEWS = ["stacked", "columns", "focus"];
const DAY_BOARD_COLS_PER_PAGE = 3;

const DEFAULT_PREFS = {
  defaultDuration: 90,
  defaultTravel: 30,
  showMap: false, // Barbershop desk — no day route map
  /** Day / tech-day Leaflet basemap: street | satellite */
  mapBasemap: "street",
  density: "comfortable",
  accent: "neutral",
  fontPairing: "workshop",
  fontSize: "M",
  language: "en",
  /** Day home: focus = calendar for one barber (default); stacked = all overview */
  dayBoardView: "focus",
};

/** Display / body / metric stacks — loaded via Google Fonts in index.html. */
const FONT_PAIRINGS = {
  workshop: {
    label: "Workshop",
    display: '"Syne", "Manrope", sans-serif',
    body: '"DM Sans", sans-serif',
    metric: '"Source Sans 3", "DM Sans", sans-serif',
  },
  editorial: {
    label: "Editorial",
    display: '"Fraunces", "Manrope", serif',
    body: '"Source Sans 3", sans-serif',
    metric: '"Source Sans 3", sans-serif',
  },
  geometric: {
    label: "Geometric",
    display: '"Outfit", "Manrope", sans-serif',
    body: '"Figtree", sans-serif',
    metric: '"Figtree", sans-serif',
  },
  precision: {
    label: "Precision",
    display: '"Space Grotesk", "Manrope", sans-serif',
    body: '"IBM Plex Sans", sans-serif',
    metric: '"IBM Plex Sans", sans-serif',
  },
};

const FONT_SIZE_SCALE = {
  S: "14px",
  M: "16px",
  L: "18px",
};

/*
 * Product vocabulary (keep EN/ES aligned):
 * EN — Booking: create CTA ("New Booking"); Appointment: detail/edit record;
 *      job: analytics counts & board density copy only.
 * ES — cita: booking/appointment UI; trabajo: analytics/job-count copy only;
 *      electrodoméstico: appliance (not aparato).
 */
const I18N = {
  en: {
    "label.brand": "Exclusive Barber Studio",
    "label.scheduling": "Booking",
    "label.availability": "Availability",
    "label.jobs": "Cuts",
    "label.analytics": "Analytics",
    "label.invoice": "Invoice",
    "label.history": "History",
    "label.settings": "Settings",
    "label.newBooking": "New Booking",
    "label.today": "Today",
    "label.weekly": "Weekly",
    "label.monthly": "Monthly",
    "label.save": "Save settings",
    "label.export": "Export Excel",
    "label.refresh": "Refresh",
    "label.all": "All",
    "auth.logout": "Log out",
    "auth.loggedInAs": "{name}",
    "auth.changePassword": "Password",
    "auth.changePasswordTitle": "Change password",
    "auth.currentPassword": "Current password",
    "auth.newPassword": "New password",
    "auth.savePassword": "Save password",
    "auth.passwordChanged": "Password updated.",
    "auth.mustChange": "Please change the default admin password.",
    "auth.forbidden": "You don’t have access to Settings.",
    "users.title": "Users",
    "users.hint": "Admin and staff logins. Email is required for password-reset links; phone is for contact.",
    "users.username": "Username",
    "users.email": "Email",
    "users.phone": "Phone",
    "users.tempPassword": "Temp password",
    "users.role": "Role",
    "users.roleUser": "User",
    "users.roleAdmin": "Admin",
    "users.add": "Add user",
    "users.active": "Active",
    "users.inactive": "Inactive",
    "users.deactivate": "Deactivate",
    "users.reactivate": "Reactivate",
    "users.resetPwGroup": "Password reset",
    "users.resetPw": "Set temp password",
    "users.sendReset": "Email reset link",
    "users.save": "Save",
    "users.added": "User added.",
    "users.updated": "User updated.",
    "users.resetOk": "Temporary password set.",
    "users.emailSent": "Reset email sent.",
    "users.promptTempPw": "Temporary password (min 6 characters):",
    "users.alsoEmail": "Also email a reset link?",
    "settings.teamNamePh": "Display name",
    "settings.addMember": "Add team member",
    "settings.memberAdded": "Team member added.",
    "settings.memberUpdated": "Team member updated.",
    "settings.noMembersYet": "No team members yet.",
    "settings.confirmDeactivateMember": "Deactivate this team member? They leave Booking and cannot sign in until reactivated.",
    "settings.confirmPurgeMember": "Permanently delete this team member? Only allowed when they have no appointments. This cannot be undone.",
    "settings.memberDeactivated": "Team member deactivated.",
    "settings.memberReactivated": "Team member reactivated.",
    "settings.memberPurged": "Team member permanently deleted.",
    "settings.couldNotLoadTeam": "Could not load team.",
    "settings.loginAs": "Login",
    "settings.moveUp": "Move up",
    "settings.moveDown": "Move down",
    "settings.dragToReorder": "Drag name to reorder",
    "settings.orderUpdated": "Team order updated.",
    "settings.couldNotReorder": "Could not reorder team member.",
    "common.search": "Search",
    "common.status": "Status",
    "common.name": "Name",
    "common.color": "Color",
    "common.done": "Done",
    "prevDay": "Previous day",
    "nextDay": "Next day",
    "prevWeek": "Previous week",
    "nextWeek": "Next week",
    "prevMonth": "Previous month",
    "nextMonth": "Next month",
    "scheduling.routeEyebrow": "Day route",
    "scheduling.routeTitle": "Stops on the Map",
    "scheduling.mapEmpty": "No stops scheduled this day.",
    "availability.eyebrow": "Capacity",
    "availability.lead": "Set each barber’s working days and hours, and block off days, weeks, or months (PTO and shop closures).",
    "availability.date": "Date",
    "availability.loading": "Loading availability…",
    "availability.noTechs": "No active barbers to show.",
    "availability.modeHours": "Hours",
    "availability.workDays": "Working days",
    "availability.workHours": "Hours",
    "availability.workStart": "Start",
    "availability.workEnd": "End",
    "availability.saveHours": "Save hours",
    "availability.hoursSaved": "Hours saved.",
    "availability.blocks": "Blocked time",
    "availability.noBlocks": "No blocked periods.",
    "availability.addBlock": "Add block",
    "availability.blockAs": "Block as",
    "availability.spanHours": "Hours",
    "availability.spanDay": "Day",
    "availability.spanWeek": "Week",
    "availability.spanMonth": "Month",
    "availability.blockStart": "From",
    "availability.blockEnd": "To",
    "availability.reason": "Reason",
    "availability.reasonPh": "PTO, shop closed…",
    "availability.removeBlock": "Remove",
    "availability.calHint": "Select a barber, then tap a day to enter From/To hours, or use Add block with Block as above.",
    "availability.selectTechBlock": "Select a barber to add a block.",
    "availability.needHourTimes": "Choose From and To times for an hour block.",
    "availability.blockAdded": "Blocked time added.",
    "availability.blockRemoved": "Block removed.",
    "availability.offDay": "Off",
    "availability.blocked": "Blocked",
    "availability.rangeLabel": "{start} – {end}",
    "availability.hoursLabel": "{start} – {end}",
    "availability.confirmRemove": "Remove this blocked period?",
    "availability.daySheetEyebrow": "Block time",
    "availability.daySheetTech": "{name}",
    "availability.daySheetExisting": "Already blocked",
    "availability.daySheetEmpty": "No blocks on this day yet.",
    "map.recenter": "Recenter",
    "map.recenterHint": "Fit map to visible stops",
    "map.showAll": "Show All Barbers",
    "map.openDetails": "Open details",
    "map.stopN": "stop {n}",
    "map.tapToInteract": "Tap to interact with map",
    "map.tapToExpand": "Tap to expand map",
    "map.collapse": "Collapse map",
    "map.basemap": "Basemap",
    "map.basemapStreet": "Street",
    "map.basemapSatellite": "Satellite",
    "board.tapToReview": "Tap to open calendar",
    "board.focusTitle": "Calendar",
    "board.weekTitle": "Week calendar",
    "board.allTechs": "All Barbers",
    "board.techOnly": "{name} only",
    "board.technician": "Barber",
    "board.openDayView": "Open Day view",
    "board.jobOne": "1 cut",
    "board.jobsMany": "{n} cuts",
    "board.filterByTech": "Filter by barber",
    "board.filterWeek": "Filter week by barber",
    "board.filterMonth": "Filter month by barber",
    "board.showTechOnly": "Show {name} only",
    "board.showTechOnlyMap": "Show {name} only on map and calendar",
    "board.noTechs": "No barbers",
    "board.noActiveTechs": "No active barbers to show.",
    "board.monthHint": "Click a job for details. Empty day opens Day view.",
    "board.more": "+{n} more",
    "board.clickEmptyToBook": "Click empty time to book",
    "board.dayMetaShop": "{jobs} · {shop}",
    "board.dayTimelineAria": "{name} day timeline",
    "board.prevTech": "Previous Barber",
    "board.nextTech": "Next Barber",
    "board.techOf": "{name} · {i} of {n}",
    "board.showOneTech": "One at a time",
    "board.viewAllTechs": "View all",
    "board.overviewAria": "Barbers Day Overview",
    "board.openTechTimeline": "Show {name}'s day timeline",
    "board.nextStop": "Next · {time} · {label}",
    "board.nextStopDone": "Done for the day",
    "board.noJobsToday": "No jobs",
    "board.viewModeAria": "Day board view",
    "board.viewStacked": "Stacked",
    "board.viewColumns": "Columns",
    "board.viewFocus": "Focus",
    "board.selectTechnician": "Select Barber",
    "board.chooseTechnician": "Choose Barber",
    "board.technicianMenu": "Barbers",
    "board.columnsPagerAria": "Barber Columns Pages",
    "board.columnsPrev": "Previous Barbers",
    "board.columnsNext": "Next Barbers",
    "board.columnsPage": "{i} / {n}",
    "techDay.columnMeta": "{jobs} · {open} open",
    "techDay.columnMetaShop": "{jobs} · {open} open · {shop}",
    "analytics.eyebrow": "Calendar insights",
    "analytics.lead": "Cuts, hours, and mix from live and past appointments.",
    "analytics.barber": "Barber",
    "analytics.range": "Range",
    "analytics.from": "From",
    "analytics.to": "To",
    "analytics.presetWeek": "This week",
    "analytics.presetMonth": "This month",
    "analytics.preset30": "Last 30 days",
    "analytics.preset90": "Last 90 days",
    "analytics.presetYear": "This year",
    "analytics.preset12m": "Last 12 months",
    "analytics.presetCustom": "Custom",
    "analytics.activeJobs": "Active cuts",
    "analytics.jobHours": "Cut hours",
    "analytics.booked": "Booked",
    "analytics.utilization": "Utilization",
    "analytics.cancelledHint": "{n} cancelled · {t} total",
    "analytics.travelHint": "{n}h travel buffers",
    "analytics.capacityHint": "of {n}h weekday capacity",
    "analytics.jobsPerDay": "Cuts Per Day",
    "analytics.jobsPerMonth": "Cuts Per Month",
    "analytics.byTechnician": "By Barber",
    "analytics.statusMix": "Status Mix",
    "analytics.jobType": "Cut Type",
    "analytics.appliance": "Service",
    "analytics.empty": "No data in this range.",
    "analytics.noTech": "No barber cuts in this range.",
    "analytics.loading": "Loading analytics…",
    "analytics.badRange": "End date must be on or after start.",
    "analytics.techCol": "Barber",
    "analytics.jobsCol": "Cuts",
    "analytics.jobHoursCol": "Cut hours",
    "analytics.travelCol": "Travel",
    "day.Mon": "Mon",
    "day.Tue": "Tue",
    "day.Wed": "Wed",
    "day.Thu": "Thu",
    "day.Fri": "Fri",
    "day.Sat": "Sat",
    "day.Sun": "Sun",
    "status.scheduled": "Scheduled",
    "status.confirmed": "Confirmed",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",
    "invoice.eyebrow": "Billing",
    "invoice.title": "Invoice builder",
    "invoice.lead": "Pick a day’s appointment or enter details manually, then send or print.",
    "invoice.sourceJob": "Source job",
    "invoice.addLine": "Add line",
    "invoice.addServiceLine": "Add service line",
    "invoice.addMaterialLine": "Add material line",
    "invoice.removeLastLine": "Remove last line",
    "invoice.clearLines": "Clear lines",
    "invoice.clearForm": "Clear Form",
    "invoice.clearedForm": "Invoice form cleared.",
    "invoice.editNotes": "Edit notes",
    "invoice.editTax": "Edit tax",
    "invoice.text": "Text",
    "invoice.email": "Email",
    "invoice.print": "Print",
    "invoice.save": "Save",
    "invoice.export": "Export",
    "invoice.saved": "Invoice saved.",
    "invoice.savedUpdated": "Invoice updated.",
    "invoice.saveFailed": "Could not save invoice.",
    "invoice.saveNeedContent": "Add customer or line items before saving.",
    "invoice.savedList": "Saved invoices",
    "invoice.savedEmpty": "No saved invoices yet.",
    "invoice.savedLoading": "Loading saved invoices…",
    "invoice.savedOption": "{number} · {name} · {total}",
    "invoice.day": "Invoice day",
    "invoice.dayPick": "Day’s appointments",
    "invoice.dayPickPlaceholder": "Select an appointment…",
    "invoice.dayEmpty": "No appointments this day.",
    "invoice.dayListHint": "Tap a job to fill the invoice.",
    "invoice.dayOption": "{time} · {name} · {job}",
    "invoice.manualEntry": "Enter manually",
    "invoice.manualMode": "Manual invoice",
    "invoice.phoneLink": "Link by phone",
    "invoice.phoneFind": "Find",
    "invoice.phoneHint": "Match appointments by customer phone, then pick one to fill the invoice.",
    "invoice.phoneNeed": "Enter at least 7 digits of a phone number.",
    "invoice.phoneMatches": "Matches for {phone}",
    "invoice.phoneNone": "No appointments match that phone.",
    "invoice.browseMore": "Browse more jobs",
    "invoice.search": "Search",
    "invoice.searchPh": "Customer, phone, appliance…",
    "invoice.loading": "Loading jobs…",
    "invoice.noJobs": "No jobs found.",
    "invoice.sub": "Appliance service · Central Valley",
    "invoice.docTitle": "Invoice",
    "invoice.billTo": "Bill to",
    "invoice.selectJob": "Select a job or enter manually",
    "invoice.customerNamePh": "Customer name",
    "invoice.phonePh": "Phone",
    "invoice.emailPh": "Email",
    "invoice.addressPh": "Address",
    "invoice.serviceLinePh": "Service description",
    "invoice.materialLinePh": "Part / material",
    "invoice.service": "Job",
    "invoice.servicePh": "Appliance · job type · date",
    "invoice.sectionService": "Service",
    "invoice.sectionServiceHint": "Unit price × hours",
    "invoice.sectionMaterials": "Materials",
    "invoice.sectionMaterialsHint": "Price × quantity",
    "invoice.tech": "Barber: {name}",
    "invoice.techPh": "Barber",
    "invoice.desc": "Description",
    "invoice.unitPrice": "Unit price",
    "invoice.hours": "Hours",
    "invoice.price": "Price",
    "invoice.quantity": "Quantity",
    "invoice.lineTotal": "Total",
    "invoice.qty": "Qty",
    "invoice.rate": "Rate",
    "invoice.amount": "Amount",
    "invoice.notes": "Notes",
    "invoice.notesPh": "Thank you for your business.",
    "invoice.notesDefault": "Thank you for choosing Exclusive Barber Studio.",
    "invoice.subtotalService": "Service subtotal",
    "invoice.subtotalMaterials": "Materials subtotal",
    "invoice.subtotal": "Subtotal",
    "invoice.tax": "Tax",
    "invoice.total": "Total",
    "invoice.remove": "Remove",
    "invoice.serviceCall": "Service call / travel",
    "invoice.partsMisc": "Parts / misc",
    "invoice.materialDefault": "Part / material",
    "invoice.sendEyebrow": "Send invoice",
    "invoice.sendTextTitle": "Text invoice",
    "invoice.sendEmailTitle": "Email invoice",
    "invoice.sendToPhone": "Phone",
    "invoice.sendToEmail": "Email",
    "invoice.sendHintSms": "Short summary with total and job. Edit the number if needed.",
    "invoice.sendHintEmail": "PDF invoice attached. To is filled from Bill to — edit if needed.",
    "invoice.exportFailed": "Could not export PDF.",
    "invoice.send": "Send",
    "invoice.needJobOrManual": "Pick a day’s appointment or enter invoice details first.",
    "invoice.needDest": "Enter a destination.",
    "invoice.smsNotConfigured": "SMS isn’t configured (set Twilio env vars).",
    "invoice.emailNotConfigured": "Email isn’t configured (set SENDGRID_API_KEY and EMAIL_FROM).",
    "invoice.smsSent": "Invoice text sent.",
    "invoice.emailSent": "Invoice email sent.",
    "invoice.sendFailed": "Could not send.",
    "invoice.clearedLines": "Line items cleared.",
    "invoice.removedLine": "Last line removed.",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.required": "Required",
    "common.edit": "Edit",
    "common.email": "Email",
    "common.address": "Address",
    "common.notes": "Notes",
    "common.date": "Date",
    "appliance.washer": "Washer",
    "appliance.dryer": "Dryer",
    "appliance.refrigerator": "Refrigerator",
    "appliance.dishwasher": "Dishwasher",
    "appliance.oven": "Oven / Range",
    "appliance.microwave": "Microwave",
    "appliance.iceMaker": "Ice Maker",
    "appliance.garbageDisposal": "Garbage Disposal",
    "appliance.other": "Other",
    "jobType.inspection": "Inspection",
    "jobType.diagnose": "Diagnose",
    "jobType.repair": "Repair",
    "jobType.replacement": "Replacement",
    "jobType.followup": "Follow-up",
    "jobType.other": "Other",
    "jobType.optionWithDuration": "{name} ({n} hr)",
    "booking.phoneIntake": "Phone intake",
    "booking.reqLegend": "Indicates a required field",
    "booking.customer": "Customer",
    "booking.phone": "Phone",
    "booking.accessNotes": "Access notes",
    "booking.job": "Job",
    "booking.appliance": "Appliance",
    "booking.jobType": "Job type",
    "booking.issue": "Issue",
    "booking.schedule": "Schedule",
    "booking.technician": "Barber",
    "booking.duration": "Duration (minutes)",
    "booking.durationPh": "Auto",
    "booking.travel": "Travel (miles)",
    "booking.travelPh": "Auto",
    "booking.daySlots": "Day slots",
    "booking.availableOnly": "Available only",
    "booking.hideBlocked": "Hide blocked times",
    "booking.dayView": "Day view",
    "booking.noSlot": "No slot selected",
    "booking.submit": "Book appointment",
    "booking.saveChanges": "Save changes",
    "booking.techHint": "Open times across barbers — pick a slot or select a barber; grey = blocked.",
    "booking.editTechHint": "Change barber to filter slots; grey = conflict or travel.",
    "booking.suggestedTech": "Suggested Barber",
    "booking.useSuggestion": "Use suggestion",
    "booking.suggested": "Suggested: {name}",
    "booking.selectTech": "Select Barber…",
    "booking.phonePh": "xxx-xxx-xxxx",
    "booking.namePh": "Full name",
    "booking.emailPh": "name@example.com",
    "booking.addressPh": "Street address",
    "booking.accessPh": "Gate code, pets…",
    "booking.issuePh": "What’s going on?",
    "booking.notesPh": "Optional",
    "booking.selectAppliance": "Select appliance…",
    "booking.selectJobType": "Select job type…",
    "booking.knownCustomer": "Known customer: {name} · {address}. Tap to fill.",
    "booking.slotsPickTech": "Day Slots · All Barbers",
    "booking.slotsAllTechs": "Day Slots · All Barbers · {day}",
    "booking.openSlotsNamed": "Open slots · {tech} · {day}{open}",
    "booking.openSlotsTech": "Open slots · {tech}{open}",
    "booking.openCount": " · {n} open",
    "booking.selected": "Selected {start} – {end}",
    "booking.selectTechSlots": "Select a barber to load their open times, or pick a slot from availability.",
    "booking.loadingSlots": "Loading open slots…",
    "booking.noOpenTimes": "No open times this day — try another barber, day, or shorter duration.",
    "booking.openShown": "{n} open time{plural} shown{blocked}",
    "booking.blockedHidden": " · {n} blocked hidden",
    "booking.openBlocked": "{open} open · {blocked} blocked",
    "booking.noCandidate": "No candidate slots for this duration within the workday.",
    "booking.noOpenAvailableOnly": "No open slots this day. Turn off “Available only” to see blocked times, or try another barber/day.",
    "booking.open": "Open",
    "booking.blocked": "Blocked",
    "booking.openTitle": "Open {start} – {end}",
    "booking.unavailableTitle": "{time} unavailable{reason}",
    "booking.selectTechDayView": "Choose a day to open Day view.",
    "booking.reqPhone": "Phone number is required.",
    "booking.reqPhoneValid": "Enter a valid phone number.",
    "booking.reqName": "Name is required.",
    "booking.reqAddress": "Address is required.",
    "booking.reqAppliance": "Appliance is required.",
    "booking.reqJobType": "Job type is required.",
    "booking.reqIssue": "Issue / description is required.",
    "booking.reqTech": "Select a barber before booking.",
    "booking.reqSlot": "Pick an open slot before booking.",
    "detail.appointment": "Appointment",
    "detail.edit": "Edit appointment",
    "detail.cancelJob": "Cancel appointment",
    "detail.cancelHint": "Marks cancelled and frees the time slot; kept in history",
    "detail.confirmCancel": "Cancel this appointment? The time slot will open again. The job stays in history as cancelled.",
    "detail.cancelled": "Appointment cancelled — slot is open.",
    "detail.couldNotCancel": "Could not cancel appointment.",
    "detail.deleteJob": "Delete",
    "detail.deleteHint": "Permanently removes this appointment and frees the time slot",
    "detail.confirmDelete": "Permanently delete this appointment? This cannot be undone. The time slot will open again.",
    "detail.deleted": "Appointment deleted — slot is open.",
    "detail.couldNotDelete": "Could not delete appointment.",
    "detail.travel": "{n}m travel",
    "detail.showOnMap": "Show on map",
    "detail.backFromInvoice": "Back to appointment",
    "detail.invoiceEyebrow": "Invoice",
    "techDay.eyebrow": "Barber Day",
    "techDay.eyebrowAll": "All Barbers",
    "techDay.title": "Day calendar",
    "techDay.close": "Close Day view",
    "techDay.travelRoute": "Day Stops",
    "techDay.mapEmpty": "No stops scheduled this day.",
    "techDay.hint": "Click an open slot to select it. Close anytime — booking stays open.",
    "techDay.loading": "Loading day calendar…",
    "techDay.loadingRoute": "Loading route…",
    "techDay.routeError": "Could not load travel for this day.",
    "techDay.meta": "{day} · {duration} min jobs · {travel}m travel · open times highlighted",
    "techDay.noJobs": "Starts from {start}. No jobs yet — open slots show on the calendar.",
    "techDay.noJobsAll": "No jobs yet — open slots show on each barber’s calendar.",
    "techDay.summary": "{n} stop{plural} · ~{travel}m travel buffers · from {start}",
    "techDay.summaryAll": "{n} stop{plural} · ~{travel}m travel · {techs} barbers",
    "techDay.stopTravel": "{n}m travel before · {name}",
    "techDay.stopLabel": "Stop {n} · {travel}m travel",
    "techDay.travelBand": "{n}m travel",
    "techDay.openOne": "1 open time",
    "techDay.openMany": "{n} open times",
    "techDay.travelAria": "Travel and route for selected barber",
    "techDay.travelAriaAll": "Travel and route for all barbers",
    "history.eyebrow": "Records",
    "history.lead": "Completed, cancelled, and cuts before today. Import or export spreadsheets to sync with other software.",
    "history.searchPh": "Name, phone, service…",
    "history.all": "All history",
    "history.scheduledPast": "Scheduled (past days)",
    "history.confirmedPast": "Confirmed (past days)",
    "history.loading": "Loading…",
    "history.empty": "No matching history appointments.",
    "history.prev": "Previous",
    "history.next": "Next",
    "history.pageOf": "Page {page} of {pages}",
    "history.pagerAria": "History pages",
    "history.import": "Import",
    "history.export": "Export",
    "history.importOk": "Imported {n} appointments ({s} skipped).",
    "history.importFailed": "Could not import spreadsheet.",
    "history.exportFailed": "Could not export history.",
    "settings.lead": "Team, pricing, look, and language — changes apply live.",
    "settings.teamTitle": "Team",
    "settings.teamHint": "Each person is a login and a scheduler — one row for both.",
    "settings.teamHintSelf": "Your profile — name, contact, and color. Changes sync for the shop.",
    "settings.leadStaff": "Your profile, look, and language — changes apply to your account.",
    "auth.changePasswordSelf": "Change password",
    "settings.bookingHold": "Customer booking hold (min)",
    "settings.bookingHoldHint": "Shown on checkout (“Appointment held for X minutes”). Applies to the customer /book site.",
    "settings.techTitle": "Barbers",
    "settings.techHint": "Remove moves a barber to Inactive (history stays linked). Reactivate restores them to Booking and New Booking.",
    "settings.techNamePh": "New Barber",
    "settings.techActive": "Active",
    "settings.techInactive": "Inactive",
    "settings.techRemove": "Remove",
    "settings.techReactivate": "Reactivate",
    "settings.techDeleteForever": "Delete permanently",
    "settings.techSave": "Save",
    "settings.colorSaved": "Color saved.",
    "settings.noTechsYet": "No barbers yet.",
    "settings.nameRequired": "Name is required.",
    "settings.techUpdated": "Barber updated.",
    "settings.movedInactive": "Moved to Inactive. Reactivate anytime.",
    "settings.techReactivated": "Barber reactivated — now in Booking and New Booking.",
    "settings.techPurged": "Barber permanently deleted.",
    "settings.couldNotSaveColor": "Could not save color.",
    "settings.couldNotUpdate": "Could not update barber.",
    "settings.couldNotRemove": "Could not remove barber.",
    "settings.couldNotReactivate": "Could not reactivate barber.",
    "settings.couldNotDelete": "Could not delete barber.",
    "settings.confirmRemoveTech": "Remove this barber from scheduling? They move to Inactive — history jobs stay linked. You can Reactivate later.",
    "settings.confirmPurgeTech": "Permanently delete this barber? Only allowed when they have no appointments. This cannot be undone.",
    "settings.startLocation": "Start location",
    "settings.addTech": "Add Barber",
    "settings.languageTitle": "Language",
    "settings.language": "Language",
    "settings.languageHint": "Applies to navigation, scheduling boards, Availability, History, Analytics, Invoice, Settings, booking forms, and common buttons.",
    "settings.scheduleTitle": "Schedule defaults",
    "settings.defaultDuration": "Default job duration (min)",
    "settings.defaultTravel": "Default travel buffer (min)",
    "settings.boardTitle": "Board",
    "settings.showMap": "Show day route map",
    "settings.density": "Timeline density",
    "settings.densityComfortable": "Comfortable",
    "settings.densityCompact": "Compact",
    "settings.lookTitle": "Look",
    "settings.accent": "Accent",
    "settings.accentNeutral": "Neutral",
    "settings.accentRed": "Red",
    "settings.accentBlue": "Blue",
    "settings.accentTeal": "Teal",
    "settings.accentGreen": "Green",
    "settings.accentAmber": "Amber",
    "settings.persistHint": "Changes apply immediately and persist in localStorage.",
    "settings.typoTitle": "Typography",
    "settings.fontPairing": "Font pairing",
    "settings.fontSize": "Base size",
    "settings.sizeS": "Small",
    "settings.sizeM": "Medium",
    "settings.sizeL": "Large",
    "settings.reset": "Reset defaults",
    "settings.saved": "Saved — applied to the live app.",
    "settings.fontPreview": "Preview: {pairing} · size {size} — headers use the display face; body copy stays readable.",
  },
  es: {
    "label.brand": "Exclusive Barber Studio",
    "label.scheduling": "Reservas",
    "label.availability": "Disponibilidad",
    "label.jobs": "Cortes",
    "label.analytics": "Analítica",
    "label.invoice": "Factura",
    "label.history": "Historial",
    "label.settings": "Ajustes",
    "label.newBooking": "Nueva cita",
    "label.today": "Hoy",
    "label.weekly": "Semanal",
    "label.monthly": "Mensual",
    "label.save": "Guardar ajustes",
    "label.export": "Exportar Excel",
    "label.refresh": "Actualizar",
    "label.all": "Todos",
    "auth.logout": "Salir",
    "auth.loggedInAs": "{name}",
    "auth.changePassword": "Contraseña",
    "auth.changePasswordTitle": "Cambiar contraseña",
    "auth.currentPassword": "Contraseña actual",
    "auth.newPassword": "Nueva contraseña",
    "auth.savePassword": "Guardar contraseña",
    "auth.passwordChanged": "Contraseña actualizada.",
    "auth.mustChange": "Cambie la contraseña predeterminada del admin.",
    "auth.forbidden": "No tiene acceso a Ajustes.",
    "users.title": "Usuarios",
    "users.hint": "Accesos de admin y personal. El correo es obligatorio para restablecer; el teléfono es de contacto.",
    "users.username": "Usuario",
    "users.email": "Correo",
    "users.phone": "Teléfono",
    "users.tempPassword": "Contraseña temporal",
    "users.role": "Rol",
    "users.roleUser": "Usuario",
    "users.roleAdmin": "Admin",
    "users.add": "Agregar usuario",
    "users.active": "Activo",
    "users.inactive": "Inactivo",
    "users.deactivate": "Desactivar",
    "users.reactivate": "Reactivar",
    "users.resetPwGroup": "Restablecer contraseña",
    "users.resetPw": "Temp. password",
    "users.sendReset": "Enviar enlace",
    "users.save": "Guardar",
    "users.added": "Usuario agregado.",
    "users.updated": "Usuario actualizado.",
    "users.resetOk": "Contraseña temporal establecida.",
    "users.emailSent": "Correo de restablecimiento enviado.",
    "users.promptTempPw": "Contraseña temporal (mín. 6 caracteres):",
    "users.alsoEmail": "¿También enviar enlace por correo?",
    "settings.teamNamePh": "Nombre para mostrar",
    "settings.addMember": "Agregar al equipo",
    "settings.memberAdded": "Miembro agregado.",
    "settings.memberUpdated": "Miembro actualizado.",
    "settings.noMembersYet": "Aún no hay miembros.",
    "settings.confirmDeactivateMember": "¿Desactivar a este miembro? Sale de Programación y no podrá iniciar sesión hasta reactivarlo.",
    "settings.confirmPurgeMember": "¿Eliminar permanentemente a este miembro? Solo si no tiene citas. No se puede deshacer.",
    "settings.memberDeactivated": "Miembro desactivado.",
    "settings.memberReactivated": "Miembro reactivado.",
    "settings.memberPurged": "Miembro eliminado permanentemente.",
    "settings.couldNotLoadTeam": "No se pudo cargar el equipo.",
    "settings.loginAs": "Acceso",
    "settings.moveUp": "Subir",
    "settings.moveDown": "Bajar",
    "settings.dragToReorder": "Arrastra el nombre para reordenar",
    "settings.orderUpdated": "Orden del equipo actualizado.",
    "settings.couldNotReorder": "No se pudo reordenar el miembro.",
    "common.search": "Buscar",
    "common.status": "Estado",
    "common.name": "Nombre",
    "common.color": "Color",
    "common.done": "Listo",
    "prevDay": "Día anterior",
    "nextDay": "Día siguiente",
    "prevWeek": "Semana anterior",
    "nextWeek": "Semana siguiente",
    "prevMonth": "Mes anterior",
    "nextMonth": "Mes siguiente",
    "scheduling.routeEyebrow": "Ruta del día",
    "scheduling.routeTitle": "Paradas en el mapa",
    "scheduling.mapEmpty": "No hay paradas programadas este día.",
    "availability.eyebrow": "Capacidad",
    "availability.lead": "Defina los días y horas de trabajo de cada barbero, y bloquee días, semanas o meses (vacaciones o cierres).",
    "availability.date": "Fecha",
    "availability.loading": "Cargando disponibilidad…",
    "availability.noTechs": "No hay barberos activos para mostrar.",
    "availability.modeHours": "Horario",
    "availability.workDays": "Días laborales",
    "availability.workHours": "Horas",
    "availability.workStart": "Inicio",
    "availability.workEnd": "Fin",
    "availability.saveHours": "Guardar horario",
    "availability.hoursSaved": "Horario guardado.",
    "availability.blocks": "Tiempo bloqueado",
    "availability.noBlocks": "Sin periodos bloqueados.",
    "availability.addBlock": "Agregar bloqueo",
    "availability.blockAs": "Bloquear como",
    "availability.spanHours": "Horas",
    "availability.spanDay": "Día",
    "availability.spanWeek": "Semana",
    "availability.spanMonth": "Mes",
    "availability.blockStart": "Desde",
    "availability.blockEnd": "Hasta",
    "availability.reason": "Motivo",
    "availability.reasonPh": "Vacaciones, cerrado…",
    "availability.removeBlock": "Quitar",
    "availability.calHint": "Elija un barbero y toque un día para definir Desde/Hasta, o use Agregar bloqueo con Bloquear como arriba.",
    "availability.selectTechBlock": "Seleccione un barbero para agregar un bloqueo.",
    "availability.needHourTimes": "Elija las horas Desde y Hasta para un bloqueo por horas.",
    "availability.blockAdded": "Tiempo bloqueado agregado.",
    "availability.blockRemoved": "Bloqueo eliminado.",
    "availability.offDay": "Libre",
    "availability.blocked": "Bloqueado",
    "availability.rangeLabel": "{start} – {end}",
    "availability.hoursLabel": "{start} – {end}",
    "availability.confirmRemove": "¿Quitar este periodo bloqueado?",
    "availability.daySheetEyebrow": "Bloquear tiempo",
    "availability.daySheetTech": "{name}",
    "availability.daySheetExisting": "Ya bloqueado",
    "availability.daySheetEmpty": "Aún no hay bloqueos este día.",
    "map.recenter": "Centrar de nuevo",
    "map.recenterHint": "Ajustar el mapa a las paradas visibles",
    "map.showAll": "Mostrar todos los barberos",
    "map.openDetails": "Abrir detalles",
    "map.stopN": "parada {n}",
    "map.tapToInteract": "Toca para usar el mapa",
    "map.tapToExpand": "Toca para ampliar el mapa",
    "map.collapse": "Cerrar mapa",
    "map.basemap": "Mapa base",
    "map.basemapStreet": "Calle",
    "map.basemapSatellite": "Satélite",
    "board.tapToReview": "Toca para abrir el calendario",
    "board.focusTitle": "Calendario",
    "board.weekTitle": "Calendario semanal",
    "board.allTechs": "Todos los barberos",
    "board.techOnly": "Solo {name}",
    "board.technician": "Barbero",
    "board.openDayView": "Abrir vista del día",
    "board.jobOne": "1 corte",
    "board.jobsMany": "{n} cortes",
    "board.filterByTech": "Filtrar por barbero",
    "board.filterWeek": "Filtrar semana por barbero",
    "board.filterMonth": "Filtrar mes por barbero",
    "board.showTechOnly": "Mostrar solo {name}",
    "board.showTechOnlyMap": "Mostrar solo {name} en el mapa y el calendario",
    "board.noTechs": "Sin barberos",
    "board.noActiveTechs": "No hay barberos activos para mostrar.",
    "board.monthHint": "Haga clic en un trabajo para ver detalles. Un día vacío abre la vista del día.",
    "board.more": "+{n} más",
    "board.clickEmptyToBook": "Haga clic en un horario vacío para agendar",
    "board.dayMetaShop": "{jobs} · {shop}",
    "board.dayTimelineAria": "Línea de tiempo del día de {name}",
    "board.prevTech": "Barbero anterior",
    "board.nextTech": "Barbero siguiente",
    "board.techOf": "{name} · {i} de {n}",
    "board.showOneTech": "De uno en uno",
    "board.viewAllTechs": "Ver todos",
    "board.overviewAria": "Resumen del día por barbero",
    "board.openTechTimeline": "Mostrar la línea de tiempo de {name}",
    "board.nextStop": "Siguiente · {time} · {label}",
    "board.nextStopDone": "Día terminado",
    "board.noJobsToday": "Sin trabajos",
    "board.viewModeAria": "Vista del tablero del día",
    "board.viewStacked": "Apilado",
    "board.viewColumns": "Columnas",
    "board.viewFocus": "Enfoque",
    "board.selectTechnician": "Seleccionar barbero",
    "board.chooseTechnician": "Elegir barbero",
    "board.technicianMenu": "Barberos",
    "board.columnsPagerAria": "Páginas de columnas de barberos",
    "board.columnsPrev": "Barberos anteriores",
    "board.columnsNext": "Barberos siguientes",
    "board.columnsPage": "{i} / {n}",
    "techDay.columnMeta": "{jobs} · {open} libres",
    "techDay.columnMetaShop": "{jobs} · {open} libres · {shop}",
    "analytics.eyebrow": "Información del calendario",
    "analytics.lead": "Cortes, horas y mezcla de citas en vivo y pasadas.",
    "analytics.barber": "Barbero",
    "analytics.range": "Rango",
    "analytics.from": "Desde",
    "analytics.to": "Hasta",
    "analytics.presetWeek": "Esta semana",
    "analytics.presetMonth": "Este mes",
    "analytics.preset30": "Últimos 30 días",
    "analytics.preset90": "Últimos 90 días",
    "analytics.presetYear": "Este año",
    "analytics.preset12m": "Últimos 12 meses",
    "analytics.presetCustom": "Personalizado",
    "analytics.activeJobs": "Cortes activos",
    "analytics.jobHours": "Horas de corte",
    "analytics.booked": "Reservado",
    "analytics.utilization": "Utilización",
    "analytics.cancelledHint": "{n} cancelados · {t} total",
    "analytics.travelHint": "{n}h de viaje",
    "analytics.capacityHint": "de {n}h de capacidad entre semana",
    "analytics.jobsPerDay": "Cortes Por Día",
    "analytics.jobsPerMonth": "Cortes Por Mes",
    "analytics.byTechnician": "Por barbero",
    "analytics.statusMix": "Mezcla De Estados",
    "analytics.jobType": "Tipo De Corte",
    "analytics.appliance": "Servicio",
    "analytics.empty": "Sin datos en este rango.",
    "analytics.noTech": "Sin cortes de barberos en este rango.",
    "analytics.loading": "Cargando analítica…",
    "analytics.badRange": "La fecha final debe ser igual o posterior al inicio.",
    "analytics.techCol": "Barbero",
    "analytics.jobsCol": "Cortes",
    "analytics.jobHoursCol": "Horas de corte",
    "analytics.travelCol": "Viaje",
    "day.Mon": "Lun",
    "day.Tue": "Mar",
    "day.Wed": "Mié",
    "day.Thu": "Jue",
    "day.Fri": "Vie",
    "day.Sat": "Sáb",
    "day.Sun": "Dom",
    "status.scheduled": "Programado",
    "status.confirmed": "Confirmado",
    "status.completed": "Completado",
    "status.cancelled": "Cancelado",
    "invoice.eyebrow": "Facturación",
    "invoice.title": "Generador de facturas",
    "invoice.lead": "Elija una cita del día o escriba los datos a mano; luego envíe o imprima.",
    "invoice.sourceJob": "Trabajo de origen",
    "invoice.addLine": "Agregar línea",
    "invoice.addServiceLine": "Agregar línea de servicio",
    "invoice.addMaterialLine": "Agregar línea de material",
    "invoice.removeLastLine": "Quitar última línea",
    "invoice.clearLines": "Borrar líneas",
    "invoice.clearForm": "Limpiar formulario",
    "invoice.clearedForm": "Formulario de factura limpiado.",
    "invoice.editNotes": "Editar notas",
    "invoice.editTax": "Editar impuesto",
    "invoice.text": "Texto",
    "invoice.email": "Correo",
    "invoice.print": "Imprimir",
    "invoice.save": "Guardar",
    "invoice.export": "Exportar",
    "invoice.saved": "Factura guardada.",
    "invoice.savedUpdated": "Factura actualizada.",
    "invoice.saveFailed": "No se pudo guardar la factura.",
    "invoice.saveNeedContent": "Agregue cliente o líneas antes de guardar.",
    "invoice.savedList": "Facturas guardadas",
    "invoice.savedEmpty": "Aún no hay facturas guardadas.",
    "invoice.savedLoading": "Cargando facturas guardadas…",
    "invoice.savedOption": "{number} · {name} · {total}",
    "invoice.day": "Día de factura",
    "invoice.dayPick": "Citas del día",
    "invoice.dayPickPlaceholder": "Seleccione una cita…",
    "invoice.dayEmpty": "No hay citas este día.",
    "invoice.dayListHint": "Toque un trabajo para llenar la factura.",
    "invoice.dayOption": "{time} · {name} · {job}",
    "invoice.manualEntry": "Escribir a mano",
    "invoice.manualMode": "Factura manual",
    "invoice.phoneLink": "Vincular por teléfono",
    "invoice.phoneFind": "Buscar",
    "invoice.phoneHint": "Busque citas por teléfono del cliente y elija una para llenar la factura.",
    "invoice.phoneNeed": "Ingrese al menos 7 dígitos del teléfono.",
    "invoice.phoneMatches": "Coincidencias para {phone}",
    "invoice.phoneNone": "Ninguna cita coincide con ese teléfono.",
    "invoice.browseMore": "Ver más trabajos",
    "invoice.search": "Buscar",
    "invoice.searchPh": "Cliente, teléfono, electrodoméstico…",
    "invoice.loading": "Cargando trabajos…",
    "invoice.noJobs": "No se encontraron trabajos.",
    "invoice.sub": "Servicio de electrodomésticos · Central Valley",
    "invoice.docTitle": "Factura",
    "invoice.billTo": "Facturar a",
    "invoice.selectJob": "Seleccione una cita o escriba a mano",
    "invoice.customerNamePh": "Nombre del cliente",
    "invoice.phonePh": "Teléfono",
    "invoice.emailPh": "Correo",
    "invoice.addressPh": "Dirección",
    "invoice.serviceLinePh": "Descripción del servicio",
    "invoice.materialLinePh": "Pieza / material",
    "invoice.service": "Trabajo",
    "invoice.servicePh": "Electrodoméstico · tipo · fecha",
    "invoice.sectionService": "Servicio",
    "invoice.sectionServiceHint": "Precio unitario × horas",
    "invoice.sectionMaterials": "Materiales",
    "invoice.sectionMaterialsHint": "Precio × cantidad",
    "invoice.tech": "Barbero: {name}",
    "invoice.techPh": "Barbero",
    "invoice.desc": "Descripción",
    "invoice.unitPrice": "Precio unitario",
    "invoice.hours": "Horas",
    "invoice.price": "Precio",
    "invoice.quantity": "Cantidad",
    "invoice.lineTotal": "Total",
    "invoice.qty": "Cant.",
    "invoice.rate": "Tarifa",
    "invoice.amount": "Importe",
    "invoice.notes": "Notas",
    "invoice.notesPh": "Gracias por su preferencia.",
    "invoice.notesDefault": "Gracias por elegir Exclusive Barber Studio.",
    "invoice.subtotalService": "Subtotal servicio",
    "invoice.subtotalMaterials": "Subtotal materiales",
    "invoice.subtotal": "Subtotal",
    "invoice.tax": "Impuesto",
    "invoice.total": "Total",
    "invoice.remove": "Quitar",
    "invoice.serviceCall": "Visita / viaje",
    "invoice.partsMisc": "Piezas / varios",
    "invoice.materialDefault": "Pieza / material",
    "invoice.sendEyebrow": "Enviar factura",
    "invoice.sendTextTitle": "Enviar por texto",
    "invoice.sendEmailTitle": "Enviar por correo",
    "invoice.sendToPhone": "Teléfono",
    "invoice.sendToEmail": "Correo",
    "invoice.sendHintSms": "Resumen breve con total y trabajo. Edite el número si hace falta.",
    "invoice.sendHintEmail": "Factura en PDF adjunta. El correo se toma de Facturar a — edítelo si hace falta.",
    "invoice.exportFailed": "No se pudo exportar el PDF.",
    "invoice.send": "Enviar",
    "invoice.needJobOrManual": "Elija una cita del día o complete los datos primero.",
    "invoice.needDest": "Ingrese un destino.",
    "invoice.smsNotConfigured": "SMS no configurado (defina variables Twilio).",
    "invoice.emailNotConfigured": "Correo no configurado (defina SENDGRID_API_KEY y EMAIL_FROM).",
    "invoice.smsSent": "Factura enviada por texto.",
    "invoice.emailSent": "Factura enviada por correo.",
    "invoice.sendFailed": "No se pudo enviar.",
    "invoice.clearedLines": "Líneas borradas.",
    "invoice.removedLine": "Última línea quitada.",
    "common.cancel": "Cancelar",
    "common.close": "Cerrar",
    "common.required": "Obligatorio",
    "common.edit": "Editar",
    "common.email": "Correo",
    "common.address": "Dirección",
    "common.notes": "Notas",
    "common.date": "Fecha",
    "appliance.washer": "Lavadora",
    "appliance.dryer": "Secadora",
    "appliance.refrigerator": "Refrigerador",
    "appliance.dishwasher": "Lavavajillas",
    "appliance.oven": "Horno / Estufa",
    "appliance.microwave": "Microondas",
    "appliance.iceMaker": "Máquina de hielo",
    "appliance.garbageDisposal": "Triturador de basura",
    "appliance.other": "Otro",
    "jobType.inspection": "Inspección",
    "jobType.diagnose": "Diagnóstico",
    "jobType.repair": "Reparación",
    "jobType.replacement": "Reemplazo",
    "jobType.followup": "Seguimiento",
    "jobType.other": "Otro",
    "jobType.optionWithDuration": "{name} ({n} h)",
    "booking.phoneIntake": "Toma telefónica",
    "booking.reqLegend": "Indica un campo obligatorio",
    "booking.customer": "Cliente",
    "booking.phone": "Teléfono",
    "booking.accessNotes": "Notas de acceso",
    "booking.job": "Trabajo",
    "booking.appliance": "Electrodoméstico",
    "booking.jobType": "Tipo de trabajo",
    "booking.issue": "Problema",
    "booking.schedule": "Agenda",
    "booking.technician": "Barbero",
    "booking.duration": "Duración (minutos)",
    "booking.durationPh": "Auto",
    "booking.travel": "Viaje (millas)",
    "booking.travelPh": "Auto",
    "booking.daySlots": "Horarios del día",
    "booking.availableOnly": "Solo disponibles",
    "booking.hideBlocked": "Ocultar horarios bloqueados",
    "booking.dayView": "Vista del día",
    "booking.noSlot": "Sin horario seleccionado",
    "booking.submit": "Agendar cita",
    "booking.saveChanges": "Guardar cambios",
    "booking.techHint": "Horarios libres de todos los barberos — elija un horario o un barbero; gris = bloqueado.",
    "booking.editTechHint": "Cambie de barbero para filtrar horarios; gris = conflicto o viaje.",
    "booking.suggestedTech": "Barbero sugerido",
    "booking.useSuggestion": "Usar sugerencia",
    "booking.suggested": "Sugerido: {name}",
    "booking.selectTech": "Seleccionar barbero…",
    "booking.phonePh": "xxx-xxx-xxxx",
    "booking.namePh": "Nombre completo",
    "booking.emailPh": "nombre@ejemplo.com",
    "booking.addressPh": "Dirección",
    "booking.accessPh": "Código del portón, mascotas…",
    "booking.issuePh": "¿Qué ocurre?",
    "booking.notesPh": "Opcional",
    "booking.selectAppliance": "Seleccionar electrodoméstico…",
    "booking.selectJobType": "Seleccionar tipo de trabajo…",
    "booking.knownCustomer": "Cliente conocido: {name} · {address}. Toque para completar.",
    "booking.slotsPickTech": "Horarios · Todos los barberos",
    "booking.slotsAllTechs": "Horarios · Todos los barberos · {day}",
    "booking.openSlotsNamed": "Horarios libres · {tech} · {day}{open}",
    "booking.openSlotsTech": "Horarios libres · {tech}{open}",
    "booking.openCount": " · {n} libres",
    "booking.selected": "Seleccionado {start} – {end}",
    "booking.selectTechSlots": "Seleccione un barbero para ver sus horarios, o elija un horario de la disponibilidad.",
    "booking.loadingSlots": "Cargando horarios…",
    "booking.noOpenTimes": "Sin horarios libres este día — pruebe otro barbero, día o una duración más corta.",
    "booking.openShown": "{n} libres mostrados{blocked}",
    "booking.blockedHidden": " · {n} bloqueados ocultos",
    "booking.openBlocked": "{open} libres · {blocked} bloqueados",
    "booking.noCandidate": "No hay horarios candidatos para esta duración dentro de la jornada.",
    "booking.noOpenAvailableOnly": "Sin horarios libres este día. Desactive “Solo disponibles” para ver bloqueados, u otro barbero/día.",
    "booking.open": "Libre",
    "booking.blocked": "Bloqueado",
    "booking.openTitle": "Libre {start} – {end}",
    "booking.unavailableTitle": "{time} no disponible{reason}",
    "booking.selectTechDayView": "Elija un día para abrir la vista del día.",
    "booking.reqPhone": "El teléfono es obligatorio.",
    "booking.reqPhoneValid": "Ingrese un teléfono válido.",
    "booking.reqName": "El nombre es obligatorio.",
    "booking.reqAddress": "La dirección es obligatoria.",
    "booking.reqAppliance": "El electrodoméstico es obligatorio.",
    "booking.reqJobType": "El tipo de trabajo es obligatorio.",
    "booking.reqIssue": "El problema / descripción es obligatorio.",
    "booking.reqTech": "Seleccione un barbero antes de agendar.",
    "booking.reqSlot": "Elija un horario libre antes de agendar.",
    "detail.appointment": "Cita",
    "detail.edit": "Editar cita",
    "detail.cancelJob": "Cancelar cita",
    "detail.cancelHint": "La marca como cancelada y libera el horario; queda en el historial",
    "detail.confirmCancel": "¿Cancelar esta cita? El horario quedará libre. El trabajo permanece en el historial como cancelado.",
    "detail.cancelled": "Cita cancelada — horario libre.",
    "detail.couldNotCancel": "No se pudo cancelar la cita.",
    "detail.deleteJob": "Eliminar",
    "detail.deleteHint": "Elimina permanentemente esta cita y libera el horario",
    "detail.confirmDelete": "¿Eliminar permanentemente esta cita? No se puede deshacer. El horario quedará libre.",
    "detail.deleted": "Cita eliminada — horario libre.",
    "detail.couldNotDelete": "No se pudo eliminar la cita.",
    "detail.travel": "{n} min de viaje",
    "detail.showOnMap": "Ver en el mapa",
    "detail.backFromInvoice": "Volver a la cita",
    "detail.invoiceEyebrow": "Factura",
    "techDay.eyebrow": "Día del barbero",
    "techDay.eyebrowAll": "Todos los barberos",
    "techDay.title": "Calendario del día",
    "techDay.close": "Cerrar vista del día",
    "techDay.travelRoute": "Paradas del día",
    "techDay.mapEmpty": "No hay paradas programadas este día.",
    "techDay.hint": "Haga clic en un horario libre para seleccionarlo. Puede cerrar cuando quiera — la cita sigue abierta.",
    "techDay.loading": "Cargando calendario del día…",
    "techDay.loadingRoute": "Cargando ruta…",
    "techDay.routeError": "No se pudo cargar el viaje de este día.",
    "techDay.meta": "{day} · trabajos de {duration} min · {travel} min de viaje · horarios libres resaltados",
    "techDay.noJobs": "Sale de {start}. Aún no hay trabajos — los horarios libres se ven en el calendario.",
    "techDay.noJobsAll": "Aún no hay trabajos — los horarios libres se ven en el calendario de cada barbero.",
    "techDay.summary": "{n} parada{plural} · ~{travel} min de viaje · desde {start}",
    "techDay.summaryAll": "{n} parada{plural} · ~{travel} min de viaje · {techs} barberos",
    "techDay.stopTravel": "{n} min de viaje antes · {name}",
    "techDay.stopLabel": "Parada {n} · {travel} min de viaje",
    "techDay.travelBand": "{n} min de viaje",
    "techDay.openOne": "1 horario libre",
    "techDay.openMany": "{n} horarios libres",
    "techDay.travelAria": "Viaje y ruta del barbero seleccionado",
    "techDay.travelAriaAll": "Viaje y ruta de todos los barberos",
    "history.eyebrow": "Registros",
    "history.lead": "Completados, cancelados y cortes anteriores a hoy. Importe o exporte hojas para sincronizar con otro software.",
    "history.searchPh": "Nombre, teléfono, servicio…",
    "history.all": "Todo el historial",
    "history.scheduledPast": "Programado (días pasados)",
    "history.confirmedPast": "Confirmado (días pasados)",
    "history.loading": "Cargando…",
    "history.empty": "No hay citas coincidentes en el historial.",
    "history.prev": "Anterior",
    "history.next": "Siguiente",
    "history.pageOf": "Página {page} de {pages}",
    "history.pagerAria": "Páginas del historial",
    "history.import": "Importar",
    "history.export": "Exportar",
    "history.importOk": "Se importaron {n} citas ({s} omitidas).",
    "history.importFailed": "No se pudo importar la hoja.",
    "history.exportFailed": "No se pudo exportar el historial.",
    "settings.lead": "Equipo, precios, apariencia e idioma — los cambios aplican en vivo.",
    "settings.teamTitle": "Equipo",
    "settings.teamHint": "Cada persona es un acceso y un programador — una sola fila para ambos.",
    "settings.teamHintSelf": "Su perfil — nombre, contacto y color. Los cambios se sincronizan con el negocio.",
    "settings.leadStaff": "Su perfil, apariencia e idioma — los cambios aplican a su cuenta.",
    "auth.changePasswordSelf": "Cambiar contraseña",
    "settings.techTitle": "Barberos",
    "settings.techHint": "Quitar mueve al barbero a Inactivo (el historial queda vinculado). Reactivar lo restaura en Reserva y Nueva cita.",
    "settings.techNamePh": "Nuevo barbero",
    "settings.techActive": "Activos",
    "settings.techInactive": "Inactivos",
    "settings.techRemove": "Quitar",
    "settings.techReactivate": "Reactivar",
    "settings.techDeleteForever": "Eliminar permanentemente",
    "settings.techSave": "Guardar",
    "settings.colorSaved": "Color guardado.",
    "settings.noTechsYet": "Aún no hay barberos.",
    "settings.nameRequired": "El nombre es obligatorio.",
    "settings.techUpdated": "Barbero actualizado.",
    "settings.movedInactive": "Movido a Inactivo. Puede reactivar cuando quiera.",
    "settings.techReactivated": "Barbero reactivado — ahora en Reserva y Nueva cita.",
    "settings.techPurged": "Barbero eliminado permanentemente.",
    "settings.couldNotSaveColor": "No se pudo guardar el color.",
    "settings.couldNotUpdate": "No se pudo actualizar el barbero.",
    "settings.couldNotRemove": "No se pudo quitar el barbero.",
    "settings.couldNotReactivate": "No se pudo reactivar el barbero.",
    "settings.couldNotDelete": "No se pudo eliminar el barbero.",
    "settings.confirmRemoveTech": "¿Quitar este barbero de la programación? Pasa a Inactivo — las citas del historial siguen vinculadas. Puede reactivar después.",
    "settings.confirmPurgeTech": "¿Eliminar permanentemente este barbero? Solo se permite si no tiene citas. No se puede deshacer.",
    "settings.startLocation": "Ubicación de inicio",
    "settings.addTech": "Agregar barbero",
    "settings.languageTitle": "Idioma",
    "settings.language": "Idioma",
    "settings.languageHint": "Aplica a la navegación, tableros de programación, Disponibilidad, Historial, Analítica, Factura, Ajustes, formularios de cita y botones comunes.",
    "settings.scheduleTitle": "Valores de agenda",
    "settings.defaultDuration": "Duración predeterminada (min)",
    "settings.defaultTravel": "Buffer de viaje (min)",
    "settings.boardTitle": "Tablero",
    "settings.showMap": "Mostrar mapa de ruta del día",
    "settings.density": "Densidad de la línea de tiempo",
    "settings.densityComfortable": "Cómoda",
    "settings.densityCompact": "Compacta",
    "settings.lookTitle": "Apariencia",
    "settings.accent": "Acento",
    "settings.accentNeutral": "Neutro",
    "settings.accentRed": "Rojo",
    "settings.accentBlue": "Azul",
    "settings.accentTeal": "Verde azulado",
    "settings.accentGreen": "Verde",
    "settings.accentAmber": "Ámbar",
    "settings.persistHint": "Los cambios se aplican de inmediato y se guardan en localStorage.",
    "settings.typoTitle": "Tipografía",
    "settings.fontPairing": "Combinación de fuentes",
    "settings.fontSize": "Tamaño base",
    "settings.sizeS": "Pequeño",
    "settings.sizeM": "Mediano",
    "settings.sizeL": "Grande",
    "settings.reset": "Restablecer",
    "settings.saved": "Guardado — aplicado en la app.",
    "settings.fontPreview": "Vista previa: {pairing} · tamaño {size} — títulos con la fuente display.",
  },
};

function titleCase(str) {
  return String(str ?? "")
    .trim()
    .split(/(\s+|[-_/·•])/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || /^[-_/·•]$/.test(part)) return part;
      return part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase();
    })
    .join("");
}

function currentLang() {
  const lang = state.prefs?.language || "en";
  return I18N[lang] ? lang : "en";
}

function t(key, vars) {
  const lang = currentLang();
  let str = I18N[lang]?.[key] ?? I18N.en[key] ?? key;
  if (vars && typeof vars === "object") {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replaceAll(`{${k}}`, String(v));
    });
  }
  return str;
}

function label(key) {
  return t(`label.${key}`);
}

function statusLabel(raw) {
  const key = String(raw || "").trim().toLowerCase();
  if (!key) return "";
  const translated = t(`status.${key}`, null);
  if (translated && translated !== `status.${key}`) return titleCase(translated);
  return titleCase(raw);
}

function dayLabel(raw) {
  const key = String(raw || "").trim();
  const translated = t(`day.${key}`);
  if (translated && translated !== `day.${key}`) return translated;
  return titleCase(key);
}

function analyticsItemLabel(raw, { status = false } = {}) {
  if (status) return statusLabel(raw);
  const key = String(raw || "").trim();
  if (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(key)) return dayLabel(key);
  return titleCase(raw);
}

const APPLIANCE_I18N = {
  Washer: "appliance.washer",
  Dryer: "appliance.dryer",
  Refrigerator: "appliance.refrigerator",
  Dishwasher: "appliance.dishwasher",
  "Oven / Range": "appliance.oven",
  Microwave: "appliance.microwave",
  "Ice Maker": "appliance.iceMaker",
  "Garbage Disposal": "appliance.garbageDisposal",
  Other: "appliance.other",
};

const JOB_TYPE_I18N = {
  Inspection: "jobType.inspection",
  Diagnose: "jobType.diagnose",
  Repair: "jobType.repair",
  Replacement: "jobType.replacement",
  "Follow-up": "jobType.followup",
  Other: "jobType.other",
};

/** Default booking duration (minutes) per job type — keep in sync with app/schemas.py. */
const JOB_TYPE_DEFAULT_DURATION = {
  Diagnose: 60,
  Repair: 120,
  Replacement: 60,
  "Follow-up": 60,
  Other: 60,
  Service: 30,
};

/** Average drive speed for Central Valley city-to-city travel estimates (mph). */
const AVG_DRIVE_MPH = 35;
const EARTH_RADIUS_MI = 3958.8;
/** Same-city / short-hop floor when city centers match. */
const SAME_CITY_TRAVEL_MIN = 15;
/** UI travel field is miles; backend/slots still use minutes (max 120 → ~70 mi @ 35 mph). */
const MAX_TRAVEL_MILES = 70;

function applianceLabel(raw) {
  const key = APPLIANCE_I18N[String(raw || "").trim()];
  return key ? t(key) : String(raw || "");
}

function jobTypeLabel(raw) {
  const key = JOB_TYPE_I18N[String(raw || "").trim()];
  return key ? t(key) : String(raw || "Repair");
}

function jobTypeDefaultDuration(jobType) {
  const key = String(jobType || "").trim();
  return JOB_TYPE_DEFAULT_DURATION[key] ?? JOB_TYPE_DEFAULT_DURATION.Repair;
}

function jobTypeOptionLabel(jobType) {
  const mins = jobTypeDefaultDuration(jobType);
  const hours = mins / 60;
  const n = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10;
  return t("jobType.optionWithDuration", { name: jobTypeLabel(jobType), n });
}

function syncJobTypeOptionLabels() {
  document.querySelectorAll('select[name="job_type"] option').forEach((opt) => {
    const value = opt.value;
    if (!value) return;
    if (JOB_TYPE_I18N[value] || JOB_TYPE_DEFAULT_DURATION[value]) {
      opt.textContent = jobTypeOptionLabel(value);
    }
  });
}

function isFieldDirty(form, key) {
  return form?.dataset?.[key] === "1";
}

function setFieldDirty(form, key, dirty) {
  if (!form?.dataset) return;
  if (dirty) form.dataset[key] = "1";
  else delete form.dataset[key];
}

function clearScheduleFieldDirt(form) {
  setFieldDirty(form, "durationDirty", false);
  setFieldDirty(form, "travelDirty", false);
}

function parseOptionalMinutes(inputEl, fallback, { min = 0, max = 240 } = {}) {
  const raw = String(inputEl?.value ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function defaultTravelBuffer() {
  return Number(state.prefs?.defaultTravel) || 30;
}

function roundTravelMiles(miles) {
  const n = Math.round(Number(miles) || 0);
  return Math.min(MAX_TRAVEL_MILES, Math.max(0, n));
}

/** Minutes (stored buffer) → whole miles for the Travel input. */
function travelMinutesToMiles(mins) {
  const minutes = Number(mins) || 0;
  if (minutes <= 0) return 0;
  return roundTravelMiles((minutes / 60) * AVG_DRIVE_MPH);
}

/** Miles (UI) → minutes for slots / API (same ~35 mph as geo estimate). */
function milesToTravelMinutes(miles) {
  const m = Number(miles) || 0;
  if (m <= 0) return 0;
  return roundTravelMinutes((m / AVG_DRIVE_MPH) * 60);
}

function defaultTravelMiles() {
  return travelMinutesToMiles(defaultTravelBuffer());
}

function sameCityTravelMiles() {
  return travelMinutesToMiles(SAME_CITY_TRAVEL_MIN);
}

/** Duration for slots / submit: typed value, else job-type default. */
function effectiveDurationMinutes(form) {
  const fallback = jobTypeDefaultDuration(form?.job_type?.value);
  const isService = String(form?.job_type?.value || "").trim() === "Service";
  return parseOptionalMinutes(form?.duration_minutes, fallback, {
    min: isService ? 15 : 30,
    max: 240,
  });
}

/**
 * Travel for slots / submit: form shows miles; convert to minutes.
 * Empty field → prefs default (minutes). Estimate fills miles when not dirty.
 */
function effectiveTravelMinutes(form) {
  const inputEl = form?.travel_miles || form?.travel_buffer_minutes;
  const raw = String(inputEl?.value ?? "").trim();
  if (!raw) return defaultTravelBuffer();
  const miles = Number(raw);
  if (!Number.isFinite(miles)) return defaultTravelBuffer();
  return milesToTravelMinutes(Math.min(MAX_TRAVEL_MILES, Math.max(0, miles)));
}

function applyDurationFromJobType(form, { force = false } = {}) {
  if (!form?.duration_minutes || !form.job_type) return;
  const jobType = form.job_type.value;
  if (!jobType) return;
  const empty = !String(form.duration_minutes.value || "").trim();
  if (!force && isFieldDirty(form, "durationDirty") && !empty) return;
  form.duration_minutes.value = jobTypeDefaultDuration(jobType);
}

function roundTravelMinutes(mins) {
  const n = Math.round(Number(mins) || 0);
  const stepped = Math.round(n / 5) * 5;
  return Math.min(120, Math.max(0, stepped));
}

function travelMilesInput(form) {
  return form?.travel_miles || form?.travel_buffer_minutes || null;
}

/** Infer city key from address / shop label (city name, zip, or start_location token). */
function inferCityKey(address) {
  const lower = String(address || "").toLowerCase();
  if (!lower.trim()) return null;
  for (const key of Object.keys(CITY_COORDS)) {
    if (lower.includes(key)) return key;
  }
  const zips = lower.match(/\b9\d{4}\b/g) || [];
  for (const z of zips) {
    if (ZIP_TO_CITY[z]) return ZIP_TO_CITY[z];
  }
  for (const [token, city] of Object.entries(START_LOCATION_CITY)) {
    if (lower.includes(token)) return city;
  }
  return null;
}

/** Stable city center (no marker jitter) for travel math — aligned with app/geo.py. */
function cityCenterForAddress(address) {
  const city = inferCityKey(address) || "bakersfield";
  const base = CITY_COORDS[city] || CITY_COORDS.bakersfield;
  return { lat: base.lat, lng: base.lng, city };
}

function haversineMiles(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimate drive distance (miles) between two addresses using city centers. */
function estimateTravelMilesBetween(fromAddr, toAddr) {
  const from = cityCenterForAddress(fromAddr);
  const to = cityCenterForAddress(toAddr);
  if (from.city && to.city && from.city === to.city) {
    return sameCityTravelMiles();
  }
  const miles = haversineMiles(from, to);
  if (!Number.isFinite(miles) || miles < 0.5) {
    return sameCityTravelMiles();
  }
  return roundTravelMiles(Math.max(sameCityTravelMiles(), miles));
}

/** Estimate drive minutes between two addresses (miles → ~35 mph). */
function estimateTravelMinutesBetween(fromAddr, toAddr) {
  return milesToTravelMinutes(estimateTravelMilesBetween(fromAddr, toAddr));
}

const dayAppointmentsCache = new Map();

async function appointmentsForDay(day) {
  if (!day) return [];
  if (day === state.day && Array.isArray(state.appointments)) {
    return state.appointments;
  }
  if (dayAppointmentsCache.has(day)) return dayAppointmentsCache.get(day);
  try {
    const jobs = await api(`/api/appointments?day=${encodeURIComponent(day)}`);
    dayAppointmentsCache.set(day, jobs);
    return jobs;
  } catch (_) {
    return [];
  }
}

function invalidateDayAppointmentsCache(day) {
  if (day) dayAppointmentsCache.delete(day);
  else dayAppointmentsCache.clear();
}

/**
 * Prior stop for travel: latest same-tech appointment ending before the proposed
 * start (that day). Falls back to technician start_location / Shop.
 */
function priorOriginAddress(jobs, { technicianId, beforeIso, ignoreId }) {
  const tid = Number(technicianId);
  if (!Number.isFinite(tid) || tid <= 0) return null;
  const beforeMs = beforeIso ? new Date(beforeIso).getTime() : Infinity;
  const prior = [...(jobs || [])]
    .filter((job) => {
      if (Number(job.technician_id) !== tid) return false;
      if (ignoreId != null && Number(job.id) === Number(ignoreId)) return false;
      const status = String(job.status || "").toLowerCase();
      if (status === "cancelled") return false;
      const endMs = new Date(job.ends_at || job.starts_at).getTime();
      return Number.isFinite(endMs) && endMs <= beforeMs;
    })
    .sort(
      (a, b) =>
        new Date(b.ends_at || b.starts_at).getTime() -
        new Date(a.ends_at || a.starts_at).getTime()
    )[0];
  const addr = prior?.customer?.address;
  if (addr && String(addr).trim()) return String(addr).trim();
  const tech =
    state.technicians.find((t) => t.id === tid) ||
    state.allTechnicians.find((t) => t.id === tid);
  return (tech?.start_location || "Shop").trim() || "Shop";
}

function techStartLocation(technicianId) {
  const tid = Number(technicianId);
  const tech =
    state.technicians.find((t) => t.id === tid) ||
    state.allTechnicians.find((t) => t.id === tid);
  return (tech?.start_location || "Shop").trim() || "Shop";
}

/** Auto-estimate travel distance in miles for the form field. */
async function computeTravelEstimateMiles(mode) {
  const form = mode === "edit" ? els.editForm : els.form;
  const techSelect = mode === "edit" ? els.editTechSelect : els.techSelect;
  const day = mode === "edit" ? editDayValue() : bookingDayValue();
  const startsAt =
    mode === "edit" ? els.editStartsAt?.value : els.startsAt?.value;
  const toAddr = String(form?.customer_address?.value || "").trim();
  if (!toAddr) return defaultTravelMiles();

  const techId = techSelect?.value || "";
  if (!techId) return defaultTravelMiles();

  // No proposed slot yet → leave from shop/start. With a slot → prior job that day before it.
  let fromAddr = techStartLocation(techId);
  if (startsAt && day) {
    const jobs = await appointmentsForDay(day);
    fromAddr =
      priorOriginAddress(jobs, {
        technicianId: techId,
        beforeIso: startsAt,
        ignoreId: mode === "edit" ? state.activeAppointmentId : null,
      }) || fromAddr;
  }
  return estimateTravelMilesBetween(fromAddr, toAddr);
}

async function refreshTravelEstimate(mode, { force = false } = {}) {
  const form = mode === "edit" ? els.editForm : els.form;
  const input = travelMilesInput(form);
  if (!input) return;
  // Staff New Booking is in-shop (mirrors /book): always 0 travel.
  if (mode === "booking") {
    input.value = "0";
    setFieldDirty(form, "travelDirty", true);
    return;
  }
  if (!force && isFieldDirty(form, "travelDirty")) return;
  const estimate = await computeTravelEstimateMiles(mode);
  const next = String(estimate);
  if (input.value === next) return;
  input.value = next;
}

function localeTag() {
  return currentLang() === "es" ? "es" : "en-US";
}

function formatHourLabel(hour) {
  return new Date(2000, 0, 1, hour).toLocaleTimeString(localeTag(), { hour: "numeric" });
}

function jobsCountLabel(n) {
  const count = Number(n) || 0;
  return count === 1 ? t("board.jobOne") : t("board.jobsMany", { n: count });
}

function syncTechSelectPlaceholders() {
  const bookingOpt = els.techSelect?.querySelector('option[value=""]');
  if (bookingOpt) bookingOpt.textContent = "Any Barber";
  const editOpt = els.editTechSelect?.querySelector('option[value=""]');
  if (editOpt) editOpt.textContent = t("booking.selectTech");
}

function applyChrome() {
  const lang = currentLang();
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (!key) return;
    const text = t(key);
    el.setAttribute("aria-label", text);
    if (el.hasAttribute("title")) el.setAttribute("title", text);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  document.querySelectorAll("[data-label]").forEach((el) => {
    const key = el.getAttribute("data-label");
    if (!key) return;
    el.textContent = label(key);
  });
  syncJobTypeOptionLabels();
  syncJobsHubChrome();
  syncAccountUserLabel();
  syncSettingsRoleCopy();
  updateDocumentTitle();
  deskSelectRegistry.forEach((api) => api.sync());
}

/** Re-apply language to JS-rendered UI after prefs/chrome update. */
function refreshDynamicI18n() {
  if (state.selectedSlot) setBookingSlot(state.selectedSlot);
  else if (els.selectedSlot) els.selectedSlot.textContent = t("booking.noSlot");

  if (state.editSelectedSlot) setEditSlot(state.editSelectedSlot);
  else if (els.editSelectedSlot) els.editSelectedSlot.textContent = t("booking.noSlot");

  if (els.drawer && !els.drawer.hidden) {
    syncDrawerDayLabel();
    updateSlotsLabel(els.slotsLabel, els.techSelect, bookingDayValue());
    loadSlots();
    if (state.lastTechSuggest) showTechSuggest("booking", state.lastTechSuggest);
  }

  if (els.detailDialog?.open) {
    if (els.detailDialog.dataset.mode === "invoice") {
      els.detailEyebrow.textContent = t("detail.invoiceEyebrow");
      if (els.detailInvoiceBack) els.detailInvoiceBack.textContent = t("detail.backFromInvoice");
    } else if (els.detailDialog.dataset.mode === "edit") {
      els.detailEyebrow.textContent = t("detail.edit");
      syncDetailDayLabel(editDayValue());
      updateSlotsLabel(els.editSlotsLabel, els.editTechSelect, editDayValue());
      if (els.editTechSelect?.value) loadEditSlots();
      if (state.lastEditTechSuggest) showTechSuggest("edit", state.lastEditTechSuggest);
    } else if (state.activeAppointmentId) {
      openDetail(state.activeAppointmentId);
    }
  }

  if (state.techDay && !els.techDayPopover?.hidden) {
    openTechDayPopover(state.techDay.mode, { preserveFilter: true });
  }

  if (!state.invoiceJobId && state.invoiceMode !== "manual") {
    const nameEl = document.getElementById("invoice-customer-name");
    if (nameEl && !nameEl.value) nameEl.placeholder = t("invoice.customerNamePh");
  }
  if (state.page === "invoice") {
    ensureInvoiceDayDefault();
    fillInvoiceTechFilter();
    loadInvoiceDayAppointments();
    loadInvoiceJobs();
    ensureNewInvoiceDefaults();
    if (els.invoiceSavedDetails?.open) loadSavedInvoices();
  }

  if (state.page === "history") {
    loadPastAppointments();
  }

  if (state.page === "analytics") {
    loadAnalytics();
  }

  if (state.page === "availability") {
    loadAvailability();
  }

  syncTechSelectPlaceholders();
  syncBasemapToggleLabels();
  if (state.page === "settings") {
    loadTeamSettings();
  }
}

function updateDocumentTitle() {
  const brand = label("brand");
  const page = state.page || "scheduling";
  const pageLabel = label(page === "scheduling" ? "scheduling" : page);
  document.title = page === "scheduling" ? brand : `${brand} · ${pageLabel}`;
}


/** Workshop palette for map/calendar — solid presets, no free-form picker. */
const TECH_COLOR_PALETTE = [
  // Near-black greys match seed barbers / calendar accents (must stay selectable).
  "#111111", // charcoal
  "#1A1A1A", // ink
  "#222222", // soot
  "#2A2A2A", // graphite
  "#333333", // slate
  "#3A3A3A", // steel
  "#444444", // ash
  "#4A4A4A", // stone
  "#555555", // pewter
  "#0D9488", // teal
  "#EA580C", // orange
  "#2563EB", // blue
  "#DB2777", // pink
  "#16A34A", // green
  "#D97706", // amber
  "#0891B2", // cyan
  "#DC2626", // red
  "#7C3AED", // violet
  "#4D7C0F", // lime
  "#E11D48", // rose
  "#4F46E5", // indigo
  "#C026D3", // fuchsia
  "#0284C7", // sky
  "#A16207", // gold
  "#9333EA", // purple
];

const TECH_COLOR_NAMES = {
  "#111111": "Charcoal",
  "#1A1A1A": "Ink",
  "#222222": "Soot",
  "#2A2A2A": "Graphite",
  "#333333": "Slate",
  "#3A3A3A": "Steel",
  "#444444": "Ash",
  "#4A4A4A": "Stone",
  "#555555": "Pewter",
  "#0D9488": "Teal",
  "#EA580C": "Orange",
  "#2563EB": "Blue",
  "#DB2777": "Pink",
  "#16A34A": "Green",
  "#D97706": "Amber",
  "#0891B2": "Cyan",
  "#DC2626": "Red",
  "#7C3AED": "Violet",
  "#4D7C0F": "Lime",
  "#E11D48": "Rose",
  "#4F46E5": "Indigo",
  "#C026D3": "Fuchsia",
  "#0284C7": "Sky",
  "#A16207": "Gold",
  "#9333EA": "Purple",
};

const state = {
  currentUser: null,
  day: toDateInputValue(new Date()),
  technicians: [],
  allTechnicians: [],
  appointments: [],
  history: [],
  /** History list pagination (page size 20; filters keep status/date tabs). */
  historyPage: 1,
  historyPageSize: 20,
  historyTotal: 0,
  invoiceJobs: [],
  invoiceDayJobs: [],
  invoiceLines: [],
  invoiceJobId: null,
  invoiceId: null,
  invoiceMode: "job",
  invoiceSendChannel: null,
  invoiceSaved: [],
  /** When invoice toolbar/sheet are parked inside the appointment modal. */
  invoiceWorkspaceHome: null,
  invoiceInDetail: false,
  selectedSlot: null,
  editSelectedSlot: null,
  activeAppointmentId: null,
  /** Staff New Booking wizard (mirrors /book). */
  staffBook: {
    step: "service",
    services: [],
    qtyById: {},
  },
  teamMembersCache: [],
  teamSettingsSelectedId: null,
  servicesSettingsCache: [],
  phoneLookupTimer: null,
  techSuggestTimer: null,
  editTechSuggestTimer: null,
  travelEstimateTimer: null,
  editTravelEstimateTimer: null,
  scheduleMode: "day",
  slotsAvailableOnly: true,
  editSlotsAvailableOnly: true,
  techDayAvailableOnly: true,
  lastTechSuggest: null,
  lastEditTechSuggest: null,
  pastSearchTimer: null,
  invoiceSearchTimer: null,
  map: null,
  mapLayers: null,
  mapMarkersById: new Map(),
  pendingMapFocusId: null,
  /** Bumped on day-board view changes to cancel in-flight Show-on-map pin zoom. */
  dayMapViewEpoch: 0,
  mapTechFilterId: null,
  mapTouchUnlocked: false,
  mapExpanded: false,
  boardTouchUnlocked: false,
  /** Phone Day board: explicit “all techs” stacked; otherwise one-at-a-time. */
  phoneDayShowAll: false,
  techDayMap: null,
  techDayMapLayers: null,
  techDayMapBounds: null,
  techDayMapExpanded: false,
  techDay: null,
  techDaySlots: [],
  /** Index into all-techs list when phone booking Day view shows one column. */
  /** Phone booking Day board index; null until first solo open (then linked tech). */
  techDayPhoneIndex: null,
  techDayPhoneShowAll: false,
  /** Columns view: 0-based page of up to 3 tech timelines. */
  dayBoardColumnsPage: 0,
  page: "scheduling",
  /** Last Cuts hub tab (analytics | history) for mobile #jobs */
  jobsTab: "analytics",
  availabilityDay: null,
  availabilityMode: "hours",
  availabilityBlocks: [],
  availabilityTechFilter: "",
  /** null until first Analytics open — then defaults to linked barber (admin) or self (staff). */
  analyticsTechFilter: null,
  analytics: null,
  prefs: { ...DEFAULT_PREFS },
};

const els = {
  board: document.getElementById("board"),
  loading: document.getElementById("loading"),
  dayPicker: document.getElementById("day-picker"),
  prevDay: document.getElementById("prev-day"),
  nextDay: document.getElementById("next-day"),
  todayBtn: document.getElementById("today-btn"),
  weeklyBtn: document.getElementById("weekly-btn"),
  monthlyBtn: document.getElementById("monthly-btn"),
  newBookingBtn: document.getElementById("new-booking-btn"),
  drawer: document.getElementById("drawer"),
  closeDrawer: document.getElementById("close-drawer"),
  drawerScrim: document.getElementById("drawer-scrim"),
  drawerDay: document.getElementById("drawer-day"),
  cancelForm: document.getElementById("cancel-form"),
  form: document.getElementById("booking-form"),
  techSelect: document.getElementById("tech-select"),
  bookingDay: document.getElementById("booking-day"),
  slots: document.getElementById("slots"),
  slotsSummary: document.getElementById("slots-summary"),
  slotsAvailableOnly: document.getElementById("slots-available-only"),
  refreshSlots: document.getElementById("refresh-slots"),
  viewTechDay: document.getElementById("view-tech-day"),
  startsAt: document.getElementById("starts-at"),
  selectedSlot: document.getElementById("selected-slot"),
  slotsLabel: document.getElementById("slots-label"),
  formError: document.getElementById("form-error"),
  customerHit: document.getElementById("customer-hit"),
  techSuggest: document.getElementById("tech-suggest"),
  techSuggestTitle: document.getElementById("tech-suggest-title"),
  techSuggestReason: document.getElementById("tech-suggest-reason"),
  techSuggestUse: document.getElementById("tech-suggest-use"),
  detailDialog: document.getElementById("detail-dialog"),
  detailEyebrow: document.getElementById("detail-eyebrow"),
  detailTitle: document.getElementById("detail-title"),
  detailDay: document.getElementById("detail-day"),
  detailBody: document.getElementById("detail-body"),
  detailView: document.getElementById("detail-view"),
  editForm: document.getElementById("edit-form"),
  editTechSelect: document.getElementById("edit-tech-select"),
  editDay: document.getElementById("edit-day"),
  editSlots: document.getElementById("edit-slots"),
  editSlotsSummary: document.getElementById("edit-slots-summary"),
  editSlotsAvailableOnly: document.getElementById("edit-slots-available-only"),
  editSlotsLabel: document.getElementById("edit-slots-label"),
  editRefreshSlots: document.getElementById("edit-refresh-slots"),
  editViewTechDay: document.getElementById("edit-view-tech-day"),
  editStartsAt: document.getElementById("edit-starts-at"),
  editSelectedSlot: document.getElementById("edit-selected-slot"),
  editError: document.getElementById("edit-error"),
  editTechSuggest: document.getElementById("edit-tech-suggest"),
  editTechSuggestTitle: document.getElementById("edit-tech-suggest-title"),
  editTechSuggestReason: document.getElementById("edit-tech-suggest-reason"),
  editTechSuggestUse: document.getElementById("edit-tech-suggest-use"),
  editAppt: document.getElementById("edit-appt"),
  cancelEdit: document.getElementById("cancel-edit"),
  cancelAppt: document.getElementById("cancel-appt"),
  deleteAppt: document.getElementById("delete-appt"),
  deleteApptEdit: document.getElementById("delete-appt-edit"),
  appToast: document.getElementById("app-toast"),
  showOnMap: document.getElementById("show-on-map"),
  closeDetail: document.getElementById("close-detail"),
  techDayPopover: document.getElementById("tech-day-popover"),
  techDayTitle: document.getElementById("tech-day-title"),
  techDayMeta: document.getElementById("tech-day-meta"),
  techDayAvailableOnly: document.getElementById("tech-day-available-only"),
  techDayOpenCount: document.getElementById("tech-day-open-count"),
  techDayBody: document.getElementById("tech-day-body"),
  techDayTravelSummary: document.getElementById("tech-day-travel-summary"),
  techDayMap: document.getElementById("tech-day-map"),
  techDayMapShell: document.getElementById("tech-day-map-shell"),
  techDayMapToggle: document.getElementById("tech-day-map-toggle"),
  techDayMapEmpty: document.getElementById("tech-day-map-empty"),
  techDayMapRecenter: document.getElementById("tech-day-map-recenter"),
  techDayStops: document.getElementById("tech-day-stops"),
  closeTechDay: document.getElementById("close-tech-day"),
  mapLegend: document.getElementById("map-legend"),
  mapRecenter: document.getElementById("map-recenter"),
  mapEmpty: document.getElementById("map-empty"),
  dayMap: document.getElementById("day-map"),
  dayMapShell: document.getElementById("day-map-shell"),
  dayMapUnlock: document.getElementById("day-map-unlock"),
  dayMapTechNav: document.getElementById("day-map-tech-nav"),
  dayMapTechNavLabel: document.getElementById("day-map-tech-nav-label"),
  dayMapDone: document.getElementById("day-map-done"),
  boardShell: document.getElementById("board-shell"),
  dayBoardToolbar: document.getElementById("day-board-toolbar"),
  dayBoardViewToggle: document.getElementById("day-board-view-toggle"),
  dayBoardColumnsPager: document.getElementById("day-board-columns-pager"),
  focusTechMenu: null,
  focusTechMenuTrigger: null,
  dayBoardColumnsPage: document.getElementById("day-board-columns-page"),
  dayBoardColumnsPrev: document.getElementById("day-board-columns-prev"),
  dayBoardColumnsNext: document.getElementById("day-board-columns-next"),
  boardUnlock: document.getElementById("board-unlock"),
  boardFocus: document.getElementById("board-focus"),
  boardFocusScrim: document.getElementById("board-focus-scrim"),
  boardFocusScroll: document.getElementById("board-focus-scroll"),
  boardFocusDone: document.getElementById("board-focus-done"),
  boardFocusPlaceholder: null,
  routeMap: document.getElementById("route-map"),
  schedulingActions: document.getElementById("scheduling-actions"),
  jobsHubChrome: document.getElementById("jobs-hub-chrome"),
  invoiceJobList: document.getElementById("invoice-job-list"),
  invoiceSearch: document.getElementById("invoice-search"),
  invoiceServiceLines: document.getElementById("invoice-service-lines"),
  invoiceMaterialLines: document.getElementById("invoice-material-lines"),
  invoiceSheet: document.getElementById("invoice-sheet"),
  invoiceToolbar: document.getElementById("invoice-toolbar"),
  invoiceSheetWrap: document.getElementById("invoice-sheet-wrap"),
  detailInvoice: document.getElementById("detail-invoice"),
  detailInvoiceHost: document.getElementById("detail-invoice-host"),
  detailInvoiceBack: document.getElementById("detail-invoice-back"),
  detailInvoiceClose: document.getElementById("detail-invoice-close"),
  invoiceEditBtn: document.getElementById("invoice-edit-btn"),
  invoiceSendBtn: document.getElementById("invoice-send-btn"),
  invoiceSendWrap: document.getElementById("invoice-send-wrap"),
  invoiceSendPanel: document.getElementById("invoice-send-panel"),
  invoiceText: document.getElementById("invoice-text"),
  invoiceEmail: document.getElementById("invoice-email"),
  invoicePrint: document.getElementById("invoice-print"),
  invoiceSave: document.getElementById("invoice-save"),
  invoiceExport: document.getElementById("invoice-export"),
  invoiceTaxRate: document.getElementById("invoice-tax-rate"),
  invoiceNotes: document.getElementById("invoice-notes"),
  invoiceDay: document.getElementById("invoice-day"),
  invoiceTechFilter: document.getElementById("invoice-tech-filter"),
  invoiceDayList: document.getElementById("invoice-day-list"),
  invoiceDayEmpty: document.getElementById("invoice-day-empty"),
  invoiceManualBtn: document.getElementById("invoice-manual-btn"),
  invoicePhone: document.getElementById("invoice-phone"),
  invoicePhoneFind: document.getElementById("invoice-phone-find"),
  invoiceSavedDetails: document.getElementById("invoice-saved"),
  invoiceSavedList: document.getElementById("invoice-saved-list"),
  invoiceSendDialog: document.getElementById("invoice-send-dialog"),
  invoiceSendForm: document.getElementById("invoice-send-form"),
  invoiceSendTitle: document.getElementById("invoice-send-title"),
  invoiceSendDest: document.getElementById("invoice-send-dest"),
  invoiceSendDestLabel: document.getElementById("invoice-send-dest-label"),
  invoiceSendHint: document.getElementById("invoice-send-hint"),
  invoiceSendError: document.getElementById("invoice-send-error"),
  invoiceSendCancel: document.getElementById("invoice-send-cancel"),
  invoiceSendClose: document.getElementById("invoice-send-close"),
  pastList: document.getElementById("past-list"),
  pastSearch: document.getElementById("past-search"),
  pastStatus: document.getElementById("past-status"),
  pastStart: document.getElementById("past-start"),
  pastEnd: document.getElementById("past-end"),
  pastRefresh: document.getElementById("past-refresh"),
  pastExport: document.getElementById("past-export"),
  pastImport: document.getElementById("past-import"),
  pastImportFile: document.getElementById("past-import-file"),
  pastPager: document.getElementById("past-pager"),
  pastPrev: document.getElementById("past-prev"),
  pastNext: document.getElementById("past-next"),
  pastPageLabel: document.getElementById("past-page-label"),
  invoiceStart: document.getElementById("invoice-start"),
  invoiceEnd: document.getElementById("invoice-end"),
  invoiceDateRefresh: document.getElementById("invoice-date-refresh"),
  accountUsername: document.getElementById("account-username"),
  logoutBtn: document.getElementById("logout-btn"),
  changePasswordBtn: document.getElementById("change-password-btn"),
  changePasswordDialog: document.getElementById("change-password-dialog"),
  changePasswordForm: document.getElementById("change-password-form"),
  changePwCurrent: document.getElementById("change-pw-current"),
  changePwNew: document.getElementById("change-pw-new"),
  changePwError: document.getElementById("change-pw-error"),
  changePwCancel: document.getElementById("change-pw-cancel"),
  teamSettingsList: document.getElementById("team-settings-list"),
  teamAddForm: document.getElementById("team-add-form"),
  teamAddUsername: document.getElementById("team-add-username"),
  teamAddName: document.getElementById("team-add-name"),
  teamAddEmail: document.getElementById("team-add-email"),
  teamAddPhone: document.getElementById("team-add-phone"),
  teamAddPassword: document.getElementById("team-add-password"),
  teamAddRole: document.getElementById("team-add-role"),
  teamAddColor: document.getElementById("team-add-color"),
  teamAddSwatches: document.getElementById("team-add-swatches"),
  teamAddLocation: document.getElementById("team-add-location"),
  teamSettingsMsg: document.getElementById("team-settings-msg"),
  settingsForm: document.getElementById("settings-form"),
  settingsReset: document.getElementById("settings-reset"),
  settingsSaved: document.getElementById("settings-saved"),
  pageScheduling: document.getElementById("page-scheduling"),
  invoiceFromDetail: document.getElementById("invoice-from-detail"),
  analyticsPreset: document.getElementById("analytics-preset"),
  analyticsStart: document.getElementById("analytics-start"),
  analyticsEnd: document.getElementById("analytics-end"),
  analyticsRefresh: document.getElementById("analytics-refresh"),
  analyticsTechFilter: document.getElementById("analytics-tech-filter"),
  analyticsSummary: document.getElementById("analytics-summary"),
  analyticsGrid: document.getElementById("analytics-grid"),
  availabilityDay: document.getElementById("availability-day"),
  availabilityDayNav: document.getElementById("availability-day-nav"),
  availabilityPrev: document.getElementById("availability-prev"),
  availabilityNext: document.getElementById("availability-next"),
  availabilityToday: document.getElementById("availability-today"),
  availabilityRefresh: document.getElementById("availability-refresh"),
  availabilityAddBlock: document.getElementById("availability-add-block"),
  availabilityList: document.getElementById("availability-list"),
  availabilityTechFilter: document.getElementById("availability-tech-filter"),
  availabilityBlockSpan: document.getElementById("availability-block-span"),
  availabilitySpanWrap: document.getElementById("availability-span-wrap"),
  availabilityCalFromWrap: document.getElementById("availability-cal-from-wrap"),
  availabilityCalToWrap: document.getElementById("availability-cal-to-wrap"),
  availabilityCalFrom: document.getElementById("availability-cal-from"),
  availabilityCalTo: document.getElementById("availability-cal-to"),
  availabilityCalHint: document.getElementById("availability-cal-hint"),
  availabilityModeHours: document.getElementById("availability-mode-hours"),
  availabilityModeWeek: document.getElementById("availability-mode-week"),
  availabilityModeMonth: document.getElementById("availability-mode-month"),
  availabilityDaySheet: document.getElementById("availability-day-sheet"),
  availabilityDaySheetTitle: document.getElementById("availability-day-sheet-title"),
  availabilityDaySheetTech: document.getElementById("availability-day-sheet-tech"),
  availabilityDaySheetBlocks: document.getElementById("availability-day-sheet-blocks"),
  availabilityDaySheetForm: document.getElementById("availability-day-sheet-form"),
  availabilityDaySheetFrom: document.getElementById("availability-day-sheet-from"),
  availabilityDaySheetTo: document.getElementById("availability-day-sheet-to"),
  availabilityDaySheetReason: document.getElementById("availability-day-sheet-reason"),
  availabilityDaySheetClose: document.getElementById("availability-day-sheet-close"),
  availabilityDaySheetCancel: document.getElementById("availability-day-sheet-cancel"),
};

/** Light custom menus for desk <select>s (History Status, Team Barber). */
const deskSelectRegistry = new Map();

function normalizeDayBoardView(value) {
  let v = String(value || "").toLowerCase();
  /* Migrate earlier “single” preference key → Focus. */
  if (v === "single") v = "focus";
  /* Default landing: day calendar (Focus), not All-barbers Stacked. */
  return DAY_BOARD_VIEWS.includes(v) ? v : "focus";
}

function normalizeMapBasemap(value) {
  const v = String(value || "").toLowerCase();
  return MAP_BASEMAP_MODES.includes(v) ? v : "street";
}

function currentMapBasemap() {
  return normalizeMapBasemap(state.prefs?.mapBasemap);
}

function createBasemapTileLayers() {
  return {
    street: L.tileLayer(MAP_TILE_STREET, {
      maxZoom: 19,
      attribution: MAP_TILE_STREET_ATTR,
    }),
    satellite: L.tileLayer(MAP_TILE_SATELLITE, {
      maxZoom: 19,
      attribution: MAP_TILE_SATELLITE_ATTR,
    }),
  };
}

function syncBasemapToggleUI(map) {
  const wrap = map?._rdBasemapToggleEl;
  if (!wrap) return;
  const mode = map._rdBasemapMode || currentMapBasemap();
  wrap.setAttribute("aria-label", t("map.basemap"));
  wrap.querySelectorAll("[data-basemap]").forEach((btn) => {
    const active = btn.dataset.basemap === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    if (btn.dataset.basemap === "street") {
      btn.textContent = t("map.basemapStreet");
    } else if (btn.dataset.basemap === "satellite") {
      btn.textContent = t("map.basemapSatellite");
    }
  });
}

function syncBasemapToggleLabels() {
  [state.map, state.techDayMap].forEach((map) => {
    if (map) syncBasemapToggleUI(map);
  });
}

function addBasemapToggleControl(map) {
  if (!map || map._rdBasemapControl || typeof L === "undefined") return;
  const Control = L.Control.extend({
    options: { position: "topright" },
    onAdd() {
      const wrap = L.DomUtil.create("div", "map-basemap-toggle");
      wrap.setAttribute("role", "group");
      ["street", "satellite"].forEach((mode) => {
        const btn = L.DomUtil.create("button", "map-basemap-btn", wrap);
        btn.type = "button";
        btn.dataset.basemap = mode;
      });
      map._rdBasemapToggleEl = wrap;
      syncBasemapToggleUI(map);
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.disableScrollPropagation(wrap);
      wrap.querySelectorAll("[data-basemap]").forEach((btn) => {
        L.DomEvent.on(btn, "click", (e) => {
          L.DomEvent.stop(e);
          setMapBasemap(btn.dataset.basemap);
        });
      });
      return wrap;
    },
  });
  map._rdBasemapControl = new Control().addTo(map);
}

function attachMapBasemaps(map) {
  if (!map || map._rdBasemaps) return map._rdBasemaps;
  const layers = createBasemapTileLayers();
  const mode = currentMapBasemap();
  layers[mode].addTo(map);
  map._rdBasemaps = layers;
  map._rdBasemapMode = mode;
  addBasemapToggleControl(map);
  return layers;
}

/** Switch Street / Satellite on all live maps; persist unless persist=false. */
function setMapBasemap(mode, { persist = true } = {}) {
  const next = normalizeMapBasemap(mode);
  [state.map, state.techDayMap].forEach((map) => {
    if (!map?._rdBasemaps) return;
    const prev = map._rdBasemapMode;
    if (prev !== next) {
      if (prev && map._rdBasemaps[prev] && map.hasLayer(map._rdBasemaps[prev])) {
        map.removeLayer(map._rdBasemaps[prev]);
      }
      map._rdBasemaps[next].addTo(map);
      map._rdBasemapMode = next;
    }
    syncBasemapToggleUI(map);
  });
  if (persist && state.prefs?.mapBasemap !== next) {
    state.prefs = normalizePrefs({ ...state.prefs, mapBasemap: next });
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
    } catch (_) {
      /* ignore quota / private mode */
    }
  }
}

/** Accent color families for Look settings (legacy forest/slate remapped). */
const ACCENT_FAMILIES = new Set(["neutral", "red", "blue", "teal", "green", "amber"]);

function normalizeAccent(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "forest") return "green";
  if (raw === "slate") return "neutral";
  if (ACCENT_FAMILIES.has(raw)) return raw;
  return "neutral";
}

function normalizePrefs(prefs = {}) {
  const { labels: _ignoredLabels, ...rest } = prefs || {};
  const merged = {
    ...DEFAULT_PREFS,
    ...rest,
  };
  merged.dayBoardView = normalizeDayBoardView(merged.dayBoardView);
  merged.mapBasemap = normalizeMapBasemap(merged.mapBasemap);
  merged.accent = normalizeAccent(merged.accent);
  // Barbershop desk: never show the day route map (even if an old pref had it on).
  merged.showMap = false;
  return merged;
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return normalizePrefs();
    return normalizePrefs(JSON.parse(raw));
  } catch (_) {
    return normalizePrefs();
  }
}

function savePrefs(prefs) {
  state.prefs = normalizePrefs(prefs);
  localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
  applyPrefs();
}

function applyTypography(prefs = state.prefs) {
  const pairingKey = FONT_PAIRINGS[prefs.fontPairing] ? prefs.fontPairing : "workshop";
  const pairing = FONT_PAIRINGS[pairingKey];
  const sizeKey = FONT_SIZE_SCALE[prefs.fontSize] ? prefs.fontSize : "M";
  const root = document.documentElement;
  root.style.setProperty("--font-display", pairing.display);
  root.style.setProperty("--font-body", pairing.body);
  root.style.setProperty("--font-brand", pairing.display);
  root.style.setProperty("--font-metric", pairing.metric);
  root.style.setProperty("--font-size-base", FONT_SIZE_SCALE[sizeKey]);
  document.body.dataset.fontPairing = pairingKey;
  document.body.dataset.fontSize = sizeKey;

  const preview = document.getElementById("font-preview");
  if (preview) {
    preview.textContent = t("settings.fontPreview", { pairing: pairing.label, size: sizeKey });
  }
}

function applyPrefs() {
  const p = state.prefs;
  const prevLang = document.body.dataset.language || "";
  const nextLang = p.language === "es" ? "es" : "en";
  document.body.dataset.density = p.density || "comfortable";
  document.body.dataset.accent = normalizeAccent(p.accent);
  document.body.dataset.language = nextLang;
  applyTypography(p);
  applyChrome();
  syncRouteMapVisibility();

  // Keep an open New Booking form in sync (service duration + zero travel).
  if (els.form && !els.drawer?.hidden) {
    syncStaffBookHiddenFields();
    void refreshTravelEstimate("booking", { force: true });
  }

  if (state.technicians.length) {
    renderSchedule();
    if (isDayScheduleMode()) renderRouteMap();
  }
  if (state.page === "scheduling" && isDayScheduleMode() && p.showMap !== false && state.map) {
    setTimeout(() => state.map.invalidateSize(), 80);
  }
  // Re-render JS-owned copy when language changes (or on first prefs apply).
  if (!prevLang || prevLang !== nextLang) {
    refreshDynamicI18n();
  }
}

function findAppointment(id) {
  const nid = Number(id);
  return (
    state.appointments.find((a) => a.id === nid) ||
    state.history.find((a) => a.id === nid) ||
    state.invoiceJobs.find((a) => a.id === nid) ||
    null
  );
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function formatDayLong(iso) {
  return new Date(iso).toLocaleDateString(localeTag(), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function techById(id) {
  return state.technicians.find((t) => t.id === Number(id));
}

function updateSlotsLabel(labelEl, techSelect, dayValue, openCount) {
  if (!labelEl) return;
  const tech = techById(techSelect?.value);
  const day = dayValue || "";
  const openPart =
    typeof openCount === "number" ? t("booking.openCount", { n: openCount }) : "";
  if (!tech) {
    labelEl.textContent = day
      ? t("booking.slotsAllTechs", { day: formatDayLabel(day) })
      : t("booking.slotsPickTech");
  } else if (day) {
    labelEl.textContent = t("booking.openSlotsNamed", {
      tech: tech.name,
      day: formatDayLabel(day),
      open: openPart,
    });
  } else {
    labelEl.textContent = t("booking.openSlotsTech", {
      tech: tech.name,
      open: openPart,
    });
  }
}

function formatDayLabel(isoDay) {
  if (!isoDay) return "";
  const d = new Date(`${isoDay}T12:00:00`);
  return d.toLocaleDateString(localeTag(), { weekday: "short", month: "short", day: "numeric" });
}

/** Readable day for booking / appointment sheet headers. */
function formatDayHeader(isoDay) {
  if (!isoDay) return "";
  const d = new Date(`${isoDay}T12:00:00`);
  return d.toLocaleDateString(localeTag(), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function syncDrawerDayLabel() {
  if (!els.drawerDay) return;
  const day = bookingDayValue();
  els.drawerDay.textContent = day ? formatDayHeader(day) : "";
  els.drawerDay.hidden = !day;
}

function syncDetailDayLabel(isoOrDay) {
  if (!els.detailDay) return;
  let day = "";
  if (isoOrDay) {
    day = String(isoOrDay).includes("T")
      ? String(isoOrDay).slice(0, 10)
      : String(isoOrDay);
  } else {
    day = editDayValue();
  }
  els.detailDay.textContent = day ? formatDayHeader(day) : "";
  els.detailDay.hidden = !day;
}

function bookingDayValue() {
  return (els.bookingDay && els.bookingDay.value) || state.day;
}

function editDayValue() {
  return (els.editDay && els.editDay.value) || state.day;
}

function setBookingSlot(slot) {
  state.selectedSlot = slot;
  if (slot.technician_id != null && els.techSelect) {
    els.techSelect.value = String(slot.technician_id);
  }
  els.startsAt.value = slot.starts_at;
  els.selectedSlot.textContent = t("booking.selected", {
    start: formatTime(slot.starts_at),
    end: formatTime(slot.ends_at),
  });
  highlightSlotButtons(els.slots, slot.starts_at, slot.technician_id);
  highlightTechDaySlot(slot.starts_at, slot.technician_id ?? els.techSelect?.value);
  renderStaffBookSummary();
  refreshTravelEstimate("booking").then(() => {
    /* staff booking travel stays 0 */
  });
}

function highlightSlotButtons(container, startsAt, techId) {
  if (!container) return;
  const tid = techId != null && techId !== "" ? Number(techId) : null;
  container.querySelectorAll(".slot-btn, .staff-sq-slot").forEach((btn) => {
    const idx = Number(btn.dataset.idx);
    const slot = container._slots ? container._slots[idx] : null;
    const timeMatch = !!(slot && sameInstant(startsAt, slot.starts_at));
    const techMatch =
      tid == null || !slot || Number(slot.technician_id) === tid;
    const on = timeMatch && techMatch;
    btn.classList.toggle("active", on);
    btn.classList.toggle("selected", on);
  });
}

function highlightTechDaySlot(startsAt, techId) {
  if (!els.techDayBody) return;
  const tid = techId != null && techId !== "" ? Number(techId) : null;
  els.techDayBody.querySelectorAll(".slot-mark").forEach((btn) => {
    const timeMatch = sameInstant(startsAt, btn.dataset.startsAt);
    const techMatch = tid == null || Number(btn.dataset.techId) === tid;
    btn.classList.toggle("active", timeMatch && techMatch);
  });
}

function syncTechDayLayoutClass() {
  const open = Boolean(els.techDayPopover && !els.techDayPopover.hidden);
  document.body.classList.toggle("has-tech-day", open);
  syncTouchLockSuppression();
}

function closeTechDayPopover() {
  if (!els.techDayPopover) return;
  els.techDayPopover.hidden = true;
  state.techDay = null;
  state.techDaySlots = [];
  state.techDayMapBounds = null;
  state.techDayMapExpanded = false;
  syncTechDayMapExpanded();
  if (state.techDayMapLayers) state.techDayMapLayers.clearLayers();
  if (els.techDayTravelSummary) els.techDayTravelSummary.textContent = "";
  if (els.techDayStops) els.techDayStops.innerHTML = "";
  if (els.techDayMapEmpty) els.techDayMapEmpty.hidden = true;
  if (els.techDayBody) {
    els.techDayBody.classList.remove("is-multi");
    els.techDayBody.innerHTML = "";
  }
  syncTechDayLayoutClass();
}

function applySlotFromTechDay(slot) {
  if (!slot || slot.available === false || !state.techDay) return;
  const techId = slot.technician_id;
  if (state.techDay.mode === "edit") {
    if (techId && els.editTechSelect) els.editTechSelect.value = String(techId);
    setEditSlot(slot);
    highlightSlotButtons(els.editSlots, slot.starts_at);
    // Refresh the slot list only — keep current Day view (all techs vs filtered).
    void loadEditSlots({ skipTechDayRefresh: true });
  } else {
    if (techId && els.techSelect) els.techSelect.value = String(techId);
    setBookingSlot(slot);
    void loadSlots({ skipTechDayRefresh: true });
  }
  highlightTechDaySlot(slot.starts_at, techId);
}

function renderTechDayTimeline(tech, jobs, slots, preferred, opts = {}) {
  const HOUR_HEIGHT = hourHeight();
  const preferredTechId =
    opts.preferredTechId != null && opts.preferredTechId !== ""
      ? Number(opts.preferredTechId)
      : null;
  const hours = Array.from({ length: DAY_HOURS + 1 }, (_, i) => {
    const hour = DAY_START + i;
    return `<div class="hour" style="top:${i * HOUR_HEIGHT}px"><span>${escapeHtml(formatHourLabel(hour))}</span></div>`;
  }).join("");

  const jobBlocks = jobs
    .map((job) => {
      const startMin = minutesFromDayStart(job.starts_at);
      const endMin = minutesFromDayStart(job.ends_at);
      const travel = Number(job.travel_buffer_minutes) || 0;
      const travelTop = ((startMin - travel) / 60) * HOUR_HEIGHT;
      const travelHeight = (travel / 60) * HOUR_HEIGHT;
      const top = (startMin / 60) * HOUR_HEIGHT;
      const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 34);
      const isCurrent =
        state.techDay?.mode === "edit" && job.id === state.activeAppointmentId;
      return `
        <div class="travel" style="top:${Math.max(travelTop, 0)}px;height:${travelHeight}px">${escapeHtml(t("techDay.travelBand", { n: travel }))}</div>
        <div class="job tech-day-job${isCurrent ? " current" : ""}" style="top:${top}px;height:${height}px;background:${tech.color}">
          <strong>${escapeHtml(applianceLabel(job.appliance))} · ${formatTime(job.starts_at)}</strong>
          <span>${escapeHtml(jobTypeLabel(job.job_type))} · ${escapeHtml(job.customer.name)}</span>
          <span>${escapeHtml(job.customer.address)}</span>
        </div>`;
    })
    .join("");

  const openCount = slots.filter((s) => s.available !== false).length;
  if (!opts.skipOpenCount && els.techDayOpenCount) {
    els.techDayOpenCount.textContent =
      openCount === 1 ? t("techDay.openOne") : t("techDay.openMany", { n: openCount });
  }

  const slotMarks = slots
    .map((slot) => {
      const available = slot.available !== false;
      if (state.techDayAvailableOnly && !available) return "";
      const startMin = minutesFromDayStart(slot.starts_at);
      const endMin = minutesFromDayStart(slot.ends_at);
      const top = (startMin / 60) * HOUR_HEIGHT;
      const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22);
      const techMatch =
        preferredTechId == null || preferredTechId === Number(tech.id);
      const active =
        available && techMatch && sameInstant(preferred, slot.starts_at) ? "active" : "";
      const unavailable = available ? "" : "unavailable";
      const disabled = available ? "" : "disabled";
      const title = available
        ? t("booking.openTitle", {
            start: formatTime(slot.starts_at),
            end: formatTime(slot.ends_at),
          })
        : t("booking.unavailableTitle", {
            time: formatTime(slot.starts_at),
            reason: slot.reason ? ` · ${slot.reason}` : "",
          });
      return `<button type="button" class="slot-mark ${active} ${unavailable}" data-tech-id="${tech.id}" data-starts-at="${escapeHtml(slot.starts_at)}" ${disabled} style="top:${top}px;height:${height}px" title="${escapeHtml(title)}">
        <span>${formatTime(slot.starts_at)}</span>
      </button>`;
    })
    .join("");

  const jobsPart = jobsCountLabel(jobs.length);
  const meta = tech.start_location
    ? t("techDay.columnMetaShop", {
        jobs: jobsPart,
        open: openCount,
        shop: tech.start_location,
      })
    : t("techDay.columnMeta", { jobs: jobsPart, open: openCount });

  return `
    <section class="tech tech-day-column" data-tech-id="${tech.id}" style="--tech-color:${escapeHtml(tech.color)}">
      <div class="tech-top">
        <h2 style="color:${tech.color}">${escapeHtml(tech.name)}</h2>
        <span title="${escapeHtml(meta)}">${escapeHtml(meta)}</span>
      </div>
      <div class="timeline">${hours}${jobBlocks}${slotMarks}</div>
    </section>`;
}

function invalidateTechDayMapSize() {
  /* tech-day map removed */
}


function afterMapExpandLayout(map, fitFn, { settleMs = MAP_EXPAND_SETTLE_MS } = {}) {
  if (!map) return;
  const el = map.getContainer?.() || null;
  let finished = false;
  const minExpandedH = Math.min(window.innerHeight || 600, 900) * 0.5;

  const runFit = () => {
    if (finished) return;
    finished = true;
    try {
      if (el) void el.offsetHeight;
      map._sizeChanged = true;
      map.invalidateSize({ animate: false });
      if (typeof fitFn === "function") fitFn();
      setTimeout(() => {
        try {
          map._sizeChanged = true;
          map.invalidateSize({ animate: false });
          if (typeof fitFn === "function") fitFn();
        } catch (_) {
          /* ignore */
        }
      }, 140);
    } catch (_) {
      /* ignore */
    }
  };

  if (!fitFn) {
    requestAnimationFrame(runFit);
    return;
  }

  const tryFit = () => {
    if (finished) return;
    const h = el?.clientHeight || el?.offsetHeight || 0;
    // Still compact — wait for timeout fallback (or a later transitionend).
    if (h < minExpandedH) return;
    if (el) el.removeEventListener("transitionend", onTransitionEnd);
    requestAnimationFrame(() => requestAnimationFrame(runFit));
  };

  const onTransitionEnd = (event) => {
    if (!el || event.target !== el) return;
    if (event.propertyName && event.propertyName !== "height") return;
    tryFit();
  };
  if (el) el.addEventListener("transitionend", onTransitionEnd);

  // Fallback if transitionend is skipped (reduced motion, already tall, etc.)
  setTimeout(() => {
    if (el) el.removeEventListener("transitionend", onTransitionEnd);
    if (finished) return;
    runFit();
  }, settleMs + 100);
}

function syncTechDayMapExpanded() {
  /* tech-day map removed */
}


function setTechDayMapExpanded() {
  /* tech-day map removed */
}


function fitTechDayMapToStops() {
  /* tech-day map removed */
}


function ensureTechDayMap() {
  // Tech-day Leaflet map removed from barbershop desk.
  return null;
}

function renderTechDayTravel(techColumns, travelBuffer) {
  const columns = Array.isArray(techColumns) ? techColumns : [];
  const multi = columns.length > 1;
  const travelAside = els.techDayPopover?.querySelector(".tech-day-travel");
  if (travelAside) {
    travelAside.setAttribute(
      "aria-label",
      multi ? t("techDay.travelAriaAll") : t("techDay.travelAria")
    );
  }

  const allStops = [];
  columns.forEach(({ tech, jobs }) => {
    [...jobs]
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .forEach((job, idx) => {
        allStops.push({ tech, job, stopNum: idx + 1 });
      });
  });
  allStops.sort((a, b) => new Date(a.job.starts_at) - new Date(b.job.starts_at));

  const totalTravel = allStops.reduce(
    (sum, { job }) => sum + (job.travel_buffer_minutes || travelBuffer || 30),
    0
  );

  if (els.techDayTravelSummary) {
    if (!allStops.length) {
      if (multi || !columns.length) {
        els.techDayTravelSummary.textContent = t("techDay.noJobsAll");
      } else {
        const startLoc = columns[0].tech.start_location || "Shop";
        els.techDayTravelSummary.textContent = t("techDay.noJobs", { start: startLoc });
      }
    } else if (multi) {
      els.techDayTravelSummary.textContent = t("techDay.summaryAll", {
        n: allStops.length,
        plural: allStops.length === 1 ? "" : "s",
        travel: totalTravel,
        techs: columns.length,
      });
    } else {
      const startLoc = columns[0].tech.start_location || "Shop";
      els.techDayTravelSummary.textContent = t("techDay.summary", {
        n: allStops.length,
        plural: allStops.length === 1 ? "" : "s",
        travel: totalTravel,
        start: startLoc,
      });
    }
  }

  if (els.techDayStops) {
    els.techDayStops.innerHTML = allStops
      .map(({ tech, job, stopNum }) => {
        const buffer = job.travel_buffer_minutes || travelBuffer || 30;
        const nameLabel = multi
          ? `${tech.name} · ${job.customer.name}`
          : job.customer.name;
        return `<li>
          <span class="tech-day-stop-num" style="background:${escapeHtml(tech.color)}">${stopNum}</span>
          <div class="tech-day-stop-copy">
            <strong>${formatTime(job.starts_at)} · ${escapeHtml(applianceLabel(job.appliance))}</strong>
            <span>${escapeHtml(job.customer.address)}</span>
            <span>${escapeHtml(t("techDay.stopTravel", { n: buffer, name: nameLabel }))}</span>
          </div>
        </li>`;
      })
      .join("");
  }
}

async function openTechDayPopover(mode, opts = {}) {
  if (!els.techDayPopover) return;
  const techSelect = mode === "edit" ? els.editTechSelect : els.techSelect;
  const day = mode === "edit" ? editDayValue() : bookingDayValue();
  if (!day) return;

  // Filter source: dropdown on open/tech-change; preserve current Day view filter on refresh
  // so picking a slot (which sets the form tech) does not collapse an all-techs calendar.
  let selectedTechId = null;
  if (opts.forceAll) {
    selectedTechId = null;
  } else if (
    opts.preserveFilter &&
    state.techDay &&
    state.techDay.mode === mode &&
    !els.techDayPopover.hidden
  ) {
    selectedTechId =
      state.techDay.technicianId != null ? Number(state.techDay.technicianId) : null;
  } else if (techSelect?.value) {
    selectedTechId = Number(techSelect.value);
  }

  const visibleTechs =
    selectedTechId != null
      ? state.technicians.filter((t) => t.id === selectedTechId)
      : [...state.technicians];
  if (!visibleTechs.length) {
    els.techDayBody.innerHTML = `<p class="status">${escapeHtml(t("board.noActiveTechs"))}</p>`;
    els.techDayPopover.hidden = false;
    syncTechDayLayoutClass();
    return;
  }

  const duration =
    mode === "edit"
      ? effectiveDurationMinutes(els.editForm)
      : effectiveDurationMinutes(els.form);
  const travel =
    mode === "edit"
      ? effectiveTravelMinutes(els.editForm)
      : effectiveTravelMinutes(els.form);
  const preferred = mode === "edit" ? els.editStartsAt.value : els.startsAt.value;

  state.techDay = {
    mode,
    technicianId: selectedTechId,
    day,
  };
  els.techDayPopover.hidden = false;
  syncTechDayLayoutClass();

  const eyebrow = els.techDayPopover.querySelector(".eyebrow");
  if (eyebrow) {
    eyebrow.textContent =
      selectedTechId != null ? t("techDay.eyebrow") : t("techDay.eyebrowAll");
  }
  els.techDayTitle.textContent =
    selectedTechId != null ? visibleTechs[0].name : t("board.allTechs");
  els.techDayMeta.textContent = t("techDay.meta", {
    day: formatDayLabel(day),
    duration,
    travel,
  });
  if (els.techDayAvailableOnly) {
    els.techDayAvailableOnly.classList.toggle("active", state.techDayAvailableOnly);
    els.techDayAvailableOnly.setAttribute(
      "aria-pressed",
      String(state.techDayAvailableOnly)
    );
  }
  if (els.techDayBody) {
    els.techDayBody.classList.remove("is-multi");
    els.techDayBody.innerHTML = `<p class="status">${escapeHtml(t("techDay.loading"))}</p>`;
  }
  if (els.techDayTravelSummary) els.techDayTravelSummary.textContent = t("techDay.loadingRoute");
  if (els.techDayStops) els.techDayStops.innerHTML = "";

  try {
    const slotParams = new URLSearchParams({
      day,
      duration_minutes: String(duration),
      travel_buffer_minutes: String(travel),
    });
    if (selectedTechId != null) {
      slotParams.set("technician_id", String(selectedTechId));
    }
    if (mode === "edit" && state.activeAppointmentId) {
      slotParams.set("ignore_appointment_id", String(state.activeAppointmentId));
    }

    const [dayJobs, slots] = await Promise.all([
      api(`/api/appointments?day=${day}`),
      api(`/api/slots?${slotParams}`),
    ]);

    if (!state.techDay || state.techDay.mode !== mode || state.techDay.day !== day) return;

    state.techDaySlots = slots;
    const openCount = slots.filter((s) => s.available !== false).length;
    if (els.techDayOpenCount) {
      els.techDayOpenCount.textContent =
        openCount === 1 ? t("techDay.openOne") : t("techDay.openMany", { n: openCount });
    }

    const allMulti = visibleTechs.length > 1;
    // Phone: one technician column at a time when browsing “all techs”.
    let boardTechs = visibleTechs;
    let phoneSoloNav = "";
    if (
      PHONE_MQ.matches &&
      allMulti &&
      selectedTechId == null &&
      !state.techDayPhoneShowAll
    ) {
      if (
        state.techDayPhoneIndex == null ||
        state.techDayPhoneIndex < 0 ||
        state.techDayPhoneIndex >= visibleTechs.length
      ) {
        const pref = preferredPhoneSoloTechId(visibleTechs);
        const idx = visibleTechs.findIndex((t) => t.id === pref);
        state.techDayPhoneIndex = idx >= 0 ? idx : 0;
      }
      const solo = visibleTechs[state.techDayPhoneIndex] || visibleTechs[0];
      boardTechs = solo ? [solo] : visibleTechs;
      phoneSoloNav = `
        <nav class="day-tech-switcher tech-day-tech-switcher" role="group" aria-label="${escapeHtml(
          t("board.filterByTech")
        )}">
          <button type="button" class="day-tech-nav icon" data-tech-day-step="-1" aria-label="${escapeHtml(
            t("board.prevTech")
          )}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="day-tech-switcher-mid">
            <span class="day-tech-switcher-label" style="--tech-color:${escapeHtml(
              solo.color
            )}">${escapeHtml(
              t("board.techOf", {
                name: solo.name,
                i: state.techDayPhoneIndex + 1,
                n: visibleTechs.length,
              })
            )}</span>
            <div class="day-tech-switcher-actions">
              <button type="button" class="chip day-tech-mode" data-tech-day-all="1">${escapeHtml(
                t("board.viewAllTechs")
              )}</button>
            </div>
          </div>
          <button type="button" class="day-tech-nav icon" data-tech-day-step="1" aria-label="${escapeHtml(
            t("board.nextTech")
          )}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </nav>`;
    } else if (PHONE_MQ.matches && allMulti && selectedTechId == null && state.techDayPhoneShowAll) {
      phoneSoloNav = `
        <nav class="day-tech-switcher tech-day-tech-switcher" role="group" aria-label="${escapeHtml(
          t("board.filterByTech")
        )}">
          <span class="day-tech-switcher-label">${escapeHtml(t("board.allTechs"))}</span>
          <button type="button" class="chip day-tech-mode" data-tech-day-solo="1">${escapeHtml(
            t("board.showOneTech")
          )}</button>
        </nav>`;
    }

    const multi = boardTechs.length > 1;
    if (els.techDayBody) {
      els.techDayBody.classList.toggle("is-multi", multi);
      els.techDayBody.style.setProperty("--tech-day-cols", String(boardTechs.length));
    }

    const timelineOpts = {
      skipOpenCount: true,
      // Highlight the form's selected tech+time even when Day view shows all techs.
      preferredTechId: selectedTechId ?? (techSelect?.value ? Number(techSelect.value) : null),
    };
    els.techDayBody.innerHTML =
      phoneSoloNav +
      boardTechs
        .map((tech) => {
          const jobs = dayJobs.filter((a) => a.technician_id === tech.id);
          const techSlots = slots.filter((s) => Number(s.technician_id) === tech.id);
          return renderTechDayTimeline(tech, jobs, techSlots, preferred, timelineOpts);
        })
        .join("");

    renderTechDayTravel(
      boardTechs.map((tech) => ({
        tech,
        jobs: dayJobs.filter((a) => a.technician_id === tech.id),
      })),
      travel
    );

    els.techDayBody.querySelectorAll("[data-tech-day-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const n = visibleTechs.length;
        if (!n) return;
        state.techDayPhoneShowAll = false;
        state.techDayPhoneIndex =
          (state.techDayPhoneIndex + Number(btn.dataset.techDayStep) + n) % n;
        void openTechDayPopover(mode, { preserveFilter: true, forceAll: true });
      });
    });
    els.techDayBody.querySelector("[data-tech-day-all]")?.addEventListener("click", () => {
      state.techDayPhoneShowAll = true;
      void openTechDayPopover(mode, { preserveFilter: true, forceAll: true });
    });
    els.techDayBody.querySelector("[data-tech-day-solo]")?.addEventListener("click", () => {
      state.techDayPhoneShowAll = false;
      void openTechDayPopover(mode, { preserveFilter: true, forceAll: true });
    });

    els.techDayBody.querySelectorAll(".slot-mark:not(:disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        const techId = Number(btn.dataset.techId);
        const slot = state.techDaySlots.find(
          (s) =>
            Number(s.technician_id) === techId &&
            sameInstant(s.starts_at, btn.dataset.startsAt)
        );
        applySlotFromTechDay(slot);
      });
    });
  } catch (err) {
    els.techDayBody.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    if (els.techDayTravelSummary) els.techDayTravelSummary.textContent = t("techDay.routeError");
  }
}

async function refreshTechDayPopoverIfOpen(mode) {
  if (!state.techDay || state.techDay.mode !== mode) return;
  if (els.techDayPopover?.hidden) return;
  await openTechDayPopover(mode, { preserveFilter: true });
}

function slotSummaryText(slots, availableOnly) {
  const openSlots = slots.filter((s) => s.available !== false);
  const blockedCount = slots.length - openSlots.length;
  if (!slots.length) return "";
  if (openSlots.length === 0) return t("booking.noOpenTimes");
  if (availableOnly) {
    return t("booking.openShown", {
      n: openSlots.length,
      plural: openSlots.length === 1 ? "" : "s",
      blocked: blockedCount ? t("booking.blockedHidden", { n: blockedCount }) : "",
    });
  }
  return t("booking.openBlocked", {
    open: openSlots.length,
    blocked: blockedCount,
  });
}

/** Square-style morning/afternoon pills for staff New Booking (matches /book). */
function renderStaffSquareSlots(container, slots, preferred, onSelect, opts = {}) {
  container._slots = slots;
  const availableOnly = opts.availableOnly !== false;
  const summaryEl = opts.summaryEl || null;
  const preferredTechId =
    opts.preferredTechId != null && opts.preferredTechId !== ""
      ? Number(opts.preferredTechId)
      : null;
  const openSlots = slots.filter((s) => s.available !== false);
  const visible = availableOnly
    ? openSlots
    : [...openSlots, ...slots.filter((s) => s.available === false)];

  if (summaryEl) {
    const text = slotSummaryText(slots, availableOnly);
    summaryEl.hidden = !text;
    summaryEl.textContent = text;
  }

  if (!slots.length) {
    container.className = "slots";
    container.innerHTML = `<p class="status">${escapeHtml(t("booking.noCandidate"))}</p>`;
    return openSlots.length;
  }
  if (availableOnly && !openSlots.length) {
    container.className = "slots";
    container.innerHTML = `<p class="status">${escapeHtml(t("booking.noOpenAvailableOnly"))}</p>`;
    return 0;
  }

  const buckets = { Morning: [], Afternoon: [], Evening: [] };
  visible.forEach((slot) => {
    const h = new Date(slot.starts_at).getHours();
    if (h < 12) buckets.Morning.push(slot);
    else if (h < 17) buckets.Afternoon.push(slot);
    else buckets.Evening.push(slot);
  });

  container.className = "slots staff-slot-groups";
  container.innerHTML = "";
  Object.entries(buckets).forEach(([label, rows]) => {
    if (!rows.length) return;
    const wrap = document.createElement("div");
    wrap.className = "staff-slot-group";
    wrap.innerHTML = `<h4>${escapeHtml(label)}</h4>`;
    const grid = document.createElement("div");
    grid.className = "staff-slot-grid";
    rows.forEach((slot) => {
      const idx = slots.indexOf(slot);
      const available = slot.available !== false;
      const timeMatch = sameInstant(preferred, slot.starts_at);
      const techMatch =
        preferredTechId == null || Number(slot.technician_id) === preferredTechId;
      const selected = available && timeMatch && techMatch;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "staff-sq-slot" +
        (selected ? " selected active" : "") +
        (available ? "" : " unavailable");
      btn.dataset.idx = String(idx);
      btn.disabled = !available;
      btn.textContent = formatTime(slot.starts_at);
      btn.title = available
        ? t("booking.openTitle", {
            start: formatTime(slot.starts_at),
            end: formatTime(slot.ends_at),
          })
        : t("booking.unavailableTitle", {
            time: formatTime(slot.starts_at),
            reason: slot.reason ? ` · ${slot.reason}` : "",
          });
      if (available) {
        btn.addEventListener("click", () => {
          onSelect(slot, btn);
          container.querySelectorAll(".staff-sq-slot").forEach((b) => {
            b.classList.remove("active", "selected");
          });
          btn.classList.add("active", "selected");
          highlightTechDaySlot(slot.starts_at, slot.technician_id);
        });
      }
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);
    container.appendChild(wrap);
  });
  return openSlots.length;
}

function renderSlotButtons(container, slots, preferred, onSelect, opts = {}) {
  if (opts.square) {
    return renderStaffSquareSlots(container, slots, preferred, onSelect, opts);
  }
  container._slots = slots;
  container.className = "slots";
  const availableOnly = opts.availableOnly !== false;
  const summaryEl = opts.summaryEl || null;
  const preferredTechId =
    opts.preferredTechId != null && opts.preferredTechId !== ""
      ? Number(opts.preferredTechId)
      : null;
  const openSlots = slots.filter((s) => s.available !== false);
  const blockedCount = slots.length - openSlots.length;
  const visible = availableOnly ? openSlots : [...openSlots, ...slots.filter((s) => s.available === false)];
  const showTechName = new Set(slots.map((s) => s.technician_id)).size > 1;

  if (summaryEl) {
    if (!slots.length) {
      summaryEl.hidden = true;
      summaryEl.textContent = "";
    } else {
      summaryEl.hidden = false;
      if (openSlots.length === 0) {
        summaryEl.textContent = t("booking.noOpenTimes");
      } else if (availableOnly) {
        summaryEl.textContent = t("booking.openShown", {
          n: openSlots.length,
          plural: openSlots.length === 1 ? "" : "s",
          blocked: blockedCount ? t("booking.blockedHidden", { n: blockedCount }) : "",
        });
      } else {
        summaryEl.textContent = t("booking.openBlocked", {
          open: openSlots.length,
          blocked: blockedCount,
        });
      }
    }
  }

  if (!slots.length) {
    container.innerHTML = `<p class="status">${escapeHtml(t("booking.noCandidate"))}</p>`;
    return openSlots.length;
  }

  if (availableOnly && !openSlots.length) {
    container.innerHTML = `<p class="status">${escapeHtml(t("booking.noOpenAvailableOnly"))}</p>`;
    return 0;
  }

  container.innerHTML = visible
    .map((slot) => {
      const idx = slots.indexOf(slot);
      const available = slot.available !== false;
      const timeMatch = sameInstant(preferred, slot.starts_at);
      const techMatch =
        preferredTechId == null || Number(slot.technician_id) === preferredTechId;
      const active = available && timeMatch && techMatch ? "active" : "";
      const unavailable = available ? "" : "unavailable";
      const techLabel =
        showTechName && slot.technician_name
          ? `<span class="slot-tech">${escapeHtml(slot.technician_name)}</span>`
          : "";
      const badge = available
        ? `<span class="slot-badge">${escapeHtml(t("booking.open"))}</span>`
        : slot.reason
          ? `<span class="slot-reason">${escapeHtml(slot.reason)}</span>`
          : `<span class="slot-reason">${escapeHtml(t("booking.blocked"))}</span>`;
      const disabled = available ? "" : "disabled";
      const title = available
        ? t("booking.openTitle", {
            start: formatTime(slot.starts_at),
            end: formatTime(slot.ends_at),
          }) + (slot.technician_name && showTechName ? ` · ${slot.technician_name}` : "")
        : t("booking.unavailableTitle", {
            time: formatTime(slot.starts_at),
            reason: slot.reason ? ` · ${slot.reason}` : "",
          });
      return `<button type="button" class="slot-btn ${active} ${unavailable}" data-idx="${idx}" ${disabled} title="${escapeHtml(title)}">
        <span class="slot-time">${formatTime(slot.starts_at)} – ${formatTime(slot.ends_at)}</span>
        ${techLabel}
        ${badge}
      </button>`;
    })
    .join("");

  container.querySelectorAll(".slot-btn:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const slot = slots[idx];
      if (!slot || slot.available === false) return;
      onSelect(slot, btn);
      container.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      highlightTechDaySlot(slot.starts_at, slot.technician_id);
    });
  });
  return openSlots.length;
}

function clearBookingSlot() {
  state.selectedSlot = null;
  els.startsAt.value = "";
  els.selectedSlot.textContent = t("booking.noSlot");
  renderStaffBookSummary();
}

function clearEditSlot() {
  state.editSelectedSlot = null;
  els.editStartsAt.value = "";
  els.editSelectedSlot.textContent = t("booking.noSlot");
}

function toDateInputValue(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Last 30 calendar days inclusive (today and 29 days back). */
function last30DayRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

function ensureHistoryDateDefaults() {
  if (!els.pastStart || !els.pastEnd) return;
  if (els.pastStart.value && els.pastEnd.value) return;
  const range = last30DayRange();
  if (!els.pastStart.value) els.pastStart.value = range.start;
  if (!els.pastEnd.value) els.pastEnd.value = range.end;
}

function ensureInvoiceDateDefaults() {
  if (!els.invoiceStart || !els.invoiceEnd) return;
  if (els.invoiceStart.value && els.invoiceEnd.value) return;
  const range = last30DayRange();
  if (!els.invoiceStart.value) els.invoiceStart.value = range.start;
  if (!els.invoiceEnd.value) els.invoiceEnd.value = range.end;
}

function appendDateRangeParams(params, startEl, endEl) {
  const start = startEl?.value;
  const end = endEl?.value;
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return params;
}

function shiftDay(iso, delta) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toDateInputValue(d);
}

function shiftMonth(iso, delta) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + delta);
  return toDateInputValue(d);
}

/** Monday of the week containing isoDay (Mon–Sun weeks). */
function weekMonday(isoDay) {
  const d = new Date(`${isoDay}T12:00:00`);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toDateInputValue(d);
}

function weekRangeContaining(isoDay) {
  const start = weekMonday(isoDay);
  return { start, end: shiftDay(start, 6) };
}

function monthRangeContaining(isoDay) {
  const d = new Date(`${isoDay}T12:00:00`);
  const start = toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = toDateInputValue(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

/** Full Mon–Sun grid range for the month calendar (includes leading/trailing pad days). */
function monthGridRangeContaining(isoDay) {
  const { start, end } = monthRangeContaining(isoDay);
  const first = new Date(`${start}T12:00:00`);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = Number(end.slice(8, 10));
  const cellsBeforeTrail = startPad + daysInMonth;
  const trail = (7 - (cellsBeforeTrail % 7)) % 7;
  return {
    start: shiftDay(start, -startPad),
    end: shiftDay(end, trail),
  };
}

function appointmentDayKey(job) {
  return String(job?.starts_at || "").slice(0, 10);
}

function isDayScheduleMode() {
  return state.scheduleMode !== "week" && state.scheduleMode !== "month";
}

function syncRouteMapVisibility() {
  // Day route map removed from the barbershop desk.
  document.body.dataset.showMap = "false";
  if (state.mapLayers) {
    try {
      state.mapLayers.clearLayers();
    } catch (_) {
      /* ignore */
    }
  }
}

function syncScheduleModeChips() {
  const mode = isDayScheduleMode() ? "day" : state.scheduleMode;
  const pairs = [
    [els.todayBtn, mode === "day"],
    [els.weeklyBtn, mode === "week"],
    [els.monthlyBtn, mode === "month"],
  ];
  for (const [btn, on] of pairs) {
    if (!btn) continue;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  }
  const prevKey =
    mode === "week" ? "prevWeek" : mode === "month" ? "prevMonth" : "prevDay";
  const nextKey =
    mode === "week" ? "nextWeek" : mode === "month" ? "nextMonth" : "nextDay";
  if (els.prevDay) {
    els.prevDay.setAttribute("aria-label", t(prevKey));
    els.prevDay.setAttribute("title", t(prevKey));
  }
  if (els.nextDay) {
    els.nextDay.setAttribute("aria-label", t(nextKey));
    els.nextDay.setAttribute("title", t(nextKey));
  }
}

async function setScheduleMode(mode, { day } = {}) {
  const next = mode === "week" || mode === "month" ? mode : "day";
  state.scheduleMode = next;
  if (day) state.day = day;
  if (els.dayPicker) els.dayPicker.value = state.day;
  syncScheduleModeChips();
  syncRouteMapVisibility();
  state.mapTechFilterId = null;
  state.phoneDayShowAll = false;
  /* Day home: calendar for linked barber. Week/Month: same scope for non-admins. */
  if (next === "day") {
    persistDayBoardView("focus");
    applyBoardBarberAccessDefaults({ forceSelf: true });
  } else {
    applyBoardBarberAccessDefaults({ forceSelf: !canViewAllBarbersOnBoard() });
  }
  await loadAppointments();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(localeTag(), { hour: "numeric", minute: "2-digit" });
}

function minutesFromDayStart(iso) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() - DAY_START * 60;
}

/**
 * Pack overlapping jobs into adjacent horizontal lanes (classic calendar).
 * Returns Map(jobId -> { lane, laneCount }).
 */
function packOverlapEventLanes(jobs) {
  const items = jobs
    .map((job) => ({
      job,
      start: minutesFromDayStart(job.starts_at),
      end: Math.max(minutesFromDayStart(job.ends_at), minutesFromDayStart(job.starts_at) + 15),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result = new Map();
  if (!items.length) return result;

  let cluster = [];
  let clusterEnd = -Infinity;
  let laneEnds = [];

  const flushCluster = () => {
    const laneCount = Math.max(laneEnds.length, 1);
    for (const item of cluster) {
      result.set(item.job.id, { lane: item.lane, laneCount });
    }
    cluster = [];
    clusterEnd = -Infinity;
    laneEnds = [];
  };

  for (const item of items) {
    if (cluster.length && item.start >= clusterEnd) flushCluster();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    clusterEnd = Math.max(clusterEnd, item.end);
    cluster.push({ ...item, lane });
  }
  flushCluster();
  return result;
}

/**
 * Side-by-side layout for a week day column:
 * - All techs: fixed mini-column per technician
 * - One tech (or overlap within a day): pack concurrent jobs into adjacent lanes
 */
function layoutWeekDayEventLanes(jobs, visibleTechs, filterId) {
  if (filterId == null && visibleTechs.length > 1) {
    const techIndex = new Map(visibleTechs.map((t, i) => [t.id, i]));
    const laneCount = visibleTechs.length;
    const byTech = new Map();
    for (const job of jobs) {
      const list = byTech.get(job.technician_id) || [];
      list.push(job);
      byTech.set(job.technician_id, list);
    }
    const result = new Map();
    for (const [techId, techJobs] of byTech) {
      const baseLane = techIndex.get(techId) ?? 0;
      const packed = packOverlapEventLanes(techJobs);
      for (const job of techJobs) {
        const local = packed.get(job.id) || { lane: 0, laneCount: 1 };
        /* Nest overlap lanes inside the tech’s mini-column */
        const subW = 1 / local.laneCount;
        result.set(job.id, {
          lane: baseLane + local.lane * subW,
          laneCount,
          widthFrac: subW,
        });
      }
    }
    for (const job of jobs) {
      if (!result.has(job.id)) {
        result.set(job.id, { lane: techIndex.get(job.technician_id) ?? 0, laneCount, widthFrac: 1 });
      }
    }
    return result;
  }
  const packed = packOverlapEventLanes(jobs);
  const out = new Map();
  for (const [id, { lane, laneCount }] of packed) {
    out.set(id, { lane, laneCount, widthFrac: 1 });
  }
  for (const job of jobs) {
    if (!out.has(job.id)) out.set(job.id, { lane: 0, laneCount: 1, widthFrac: 1 });
  }
  return out;
}

function weekEventLaneStyle(layout) {
  const { lane, laneCount, widthFrac = 1 } = layout;
  const gap = 0.12; /* rem-ish % gap between lanes */
  const colW = 100 / Math.max(laneCount, 1);
  const left = lane * colW + gap;
  const width = Math.max(colW * widthFrac - gap * 2, 4);
  return `left:${left.toFixed(3)}%;width:${width.toFixed(3)}%`;
}

function localIsoFromDayMinutes(dayIso, minutesFromStart) {
  const total = DAY_START * 60 + minutesFromStart;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${dayIso}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function snapMinutesFromDayStart(rawMinutes) {
  const maxStart = DAY_HOURS * 60 - SLOT_STEP_MINUTES;
  const snapped = Math.round(rawMinutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
  return Math.max(0, Math.min(maxStart, snapped));
}

function timelineMinutesFromEvent(timelineEl, clientY) {
  const rect = timelineEl.getBoundingClientRect();
  const y = clientY - rect.top;
  return (y / hourHeight()) * 60;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sameInstant(a, b) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return null;
  return res.json();
}

function isAdmin() {
  return (state.currentUser?.role || "").toLowerCase() === "admin";
}

/** Admins may toggle All Barbers; other staff only see their own calendar. */
function canViewAllBarbersOnBoard() {
  return isAdmin();
}

/**
 * Booking day board access:
 * - Non-admin with linked tech → always that barber (no All).
 * - Admin with linked tech → default to self; may toggle All.
 * - Admin without link → All allowed.
 */
function applyBoardBarberAccessDefaults({ forceSelf = false } = {}) {
  const techs = state.technicians;
  if (!techs.length) {
    state.mapTechFilterId = null;
    state.phoneDayShowAll = false;
    return;
  }
  const linked = linkedTechnicianId();
  const selfId =
    linked != null && techs.some((t) => t.id === linked) ? linked : null;

  if (!canViewAllBarbersOnBoard()) {
    state.phoneDayShowAll = false;
    state.mapTechFilterId = selfId != null ? selfId : techs[0].id;
    return;
  }

  if (forceSelf && selfId != null) {
    state.phoneDayShowAll = false;
    state.mapTechFilterId = selfId;
    return;
  }

  if (state.phoneDayShowAll) {
    state.mapTechFilterId = null;
    return;
  }

  if (
    state.mapTechFilterId != null &&
    techs.some((t) => t.id === state.mapTechFilterId)
  ) {
    return;
  }

  if (selfId != null) {
    state.phoneDayShowAll = false;
    state.mapTechFilterId = selfId;
  } else {
    state.phoneDayShowAll = true;
    state.mapTechFilterId = null;
  }
}

/** Prefer linked barber display name; fall back to login username. */
function loggedInDisplayName() {
  const u = state.currentUser;
  if (!u) return "";
  const linked = linkedTechnicianId();
  if (linked != null) {
    const pools = [state.technicians, state.allTechnicians];
    for (const list of pools) {
      const tech = Array.isArray(list) ? list.find((t) => t.id === linked) : null;
      if (tech?.name) return tech.name;
    }
  }
  return String(u.username || "").trim();
}

function syncAccountUserLabel() {
  if (!els.accountUsername) return;
  if (!state.currentUser) {
    els.accountUsername.hidden = true;
    els.accountUsername.textContent = "";
    return;
  }
  const name = loggedInDisplayName();
  els.accountUsername.hidden = !name;
  els.accountUsername.textContent = name ? t("auth.loggedInAs", { name }) : "";
  els.accountUsername.title = name;
}

function applyRoleGates() {
  const admin = isAdmin();
  document.body.classList.toggle("role-admin", admin);
  document.body.classList.toggle("role-user", !admin);
  document.body.classList.toggle("board-all-barbers", canViewAllBarbersOnBoard());
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.hidden = !admin;
  });
  syncAccountUserLabel();
  syncSettingsRoleCopy();
}

async function loadCurrentUser() {
  state.currentUser = await api("/api/auth/me");
  applyRoleGates();
  if (state.currentUser?.must_change_password) {
    showAppToast(t("auth.mustChange"));
    if (els.changePasswordDialog?.showModal) {
      try {
        els.changePasswordDialog.showModal();
      } catch (_) {
        /* already open / unsupported */
      }
    }
  }
}

async function loadTechnicians() {
  const [active, all] = await Promise.all([
    api("/api/technicians"),
    api("/api/technicians?include_inactive=true"),
  ]);
  state.technicians = active;
  state.allTechnicians = all;
  if (
    state.mapTechFilterId != null &&
    !state.technicians.some((t) => t.id === state.mapTechFilterId)
  ) {
    state.mapTechFilterId = null;
  }
  applyBoardBarberAccessDefaults();
  syncAccountUserLabel();
  const techOptions = state.technicians
    .map((tech) => `<option value="${tech.id}">${escapeHtml(tech.name)}</option>`)
    .join("");
  const editPlaceholder = `<option value="">${escapeHtml(t("booking.selectTech"))}</option>`;
  const prevBooking = els.techSelect?.value || "";
  const prevEdit = els.editTechSelect?.value || "";
  const stillActive = (id) =>
    id && state.technicians.some((tech) => String(tech.id) === String(id));
  fillBookingTechSelect({ preferredId: stillActive(prevBooking) ? prevBooking : "" });
  if (els.editTechSelect) {
    els.editTechSelect.innerHTML = editPlaceholder + techOptions;
    els.editTechSelect.value = stillActive(prevEdit) ? prevEdit : "";
  }
  fillAvailabilityTechFilter();
  fillAnalyticsTechFilter();
  fillInvoiceTechFilter();
  if (state.page === "settings") {
    loadTeamSettings();
  }
  nextTechColor();
}

/** Technicians the signed-in user may see on the Booking day board. */
function boardScopedTechnicians() {
  const all = state.technicians;
  if (canViewAllBarbersOnBoard()) return all;
  applyBoardBarberAccessDefaults({ forceSelf: true });
  const id = state.mapTechFilterId;
  if (id == null) return all.slice(0, 1);
  return all.filter((t) => t.id === id);
}

/** First load: Focus calendar + linked barber (admin may later toggle All). */
function bootstrapBookingBoardAccess() {
  persistDayBoardView("focus");
  applyBoardBarberAccessDefaults({ forceSelf: true });
  applyRoleGates();
}

/** Normalize to #RRGGBB or null (invalid). */
function parseTechHex(color) {
  let raw = String(color || "").trim();
  if (!raw) return null;
  if (!raw.startsWith("#")) raw = `#${raw}`;
  raw = raw.toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9A-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return null;
}

function normalizeTechColor(color) {
  const hex = parseTechHex(color);
  if (hex) return hex;
  return TECH_COLOR_PALETTE[0].toUpperCase();
}

function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Resolve a tech color for the Settings picker.
 * Prefer an exact palette match; otherwise keep the stored hex so Settings
 * matches the calendar (do not snap near-black greys onto a bright chip).
 */
function nearestPaletteColor(color) {
  const hex = parseTechHex(color);
  if (!hex) return TECH_COLOR_PALETTE[0].toUpperCase();
  const exact = TECH_COLOR_PALETTE.find((c) => c.toUpperCase() === hex);
  if (exact) return exact.toUpperCase();
  return hex;
}

function renderColorSwatches(selected, { namePrefix = "color" } = {}) {
  const current = nearestPaletteColor(selected);
  return `
    <div class="color-swatches" role="radiogroup" aria-label="${escapeHtml(t("common.color"))}">
      ${TECH_COLOR_PALETTE.map((c) => {
        const active = c.toUpperCase() === current;
        const label = TECH_COLOR_NAMES[c] || c;
        return `
        <button type="button" class="color-swatch${active ? " is-selected" : ""}"
          data-color="${c}" role="radio" aria-checked="${active ? "true" : "false"}"
          style="--swatch:${escapeHtml(c)};background:${escapeHtml(c)}"
          title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
        </button>`;
      }).join("")}
      <input type="hidden" data-field="color" name="${escapeHtml(namePrefix)}" value="${escapeHtml(current)}" />
    </div>`;
}

function wireColorSwatches(root, { onChange } = {}) {
  if (!root) return;
  const group = root.matches?.(".color-swatches") ? root : root.querySelector(".color-swatches");
  if (!group) return;
  const hidden = group.querySelector('[data-field="color"]');
  group.querySelectorAll(".color-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = normalizeTechColor(btn.dataset.color);
      group.querySelectorAll(".color-swatch").forEach((b) => {
        const on = b.dataset.color.toUpperCase() === color;
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
      if (hidden) hidden.value = color;
      if (typeof onChange === "function") onChange(color);
    });
  });
}

let colorPickerDocWired = false;

function getColorPopover(picker) {
  if (!picker) return null;
  return picker._colorPopover || picker.querySelector(".color-picker-popover");
}

function resetColorPopoverStyles(pop, picker = null) {
  if (!pop) return;
  pop.hidden = true;
  pop.style.position = "";
  pop.style.left = "";
  pop.style.top = "";
  pop.style.right = "";
  pop.style.bottom = "";
  pop.style.zIndex = "";
  // Return portaled popovers to their picker so Settings re-renders don't orphan them.
  const home = picker || pop._colorPickerHome;
  if (home && pop.parentElement !== home) {
    home.appendChild(pop);
  }
}

function positionColorPopover(chip, pop, picker = null) {
  if (!chip || !pop) return;
  // Portal to body: .panel backdrop-filter creates a fixed containing block, so
  // viewport-based left/top would otherwise place the popover in the wrong spot.
  if (picker) {
    pop._colorPickerHome = picker;
    picker._colorPopover = pop;
  }
  if (pop.parentElement !== document.body) {
    document.body.appendChild(pop);
  }
  pop.hidden = false;
  pop.style.position = "fixed";
  pop.style.zIndex = "5000";
  pop.style.right = "auto";
  pop.style.bottom = "auto";
  // First paint at 0,0 to measure, then place under chip.
  pop.style.left = "0px";
  pop.style.top = "0px";
  const chipRect = chip.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  const gap = 8;
  const margin = 8;
  let left = chipRect.left;
  let top = chipRect.bottom + gap;
  if (top + popRect.height > window.innerHeight - margin) {
    top = Math.max(margin, chipRect.top - popRect.height - gap);
  }
  if (left + popRect.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - popRect.width - margin);
  }
  if (left < margin) left = margin;
  if (top < margin) top = margin;
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

function closeAllColorPickers(except = null) {
  document.querySelectorAll(".color-picker.is-open").forEach((picker) => {
    if (except && picker === except) return;
    picker.classList.remove("is-open");
    const chip = picker.querySelector(".color-picker-chip");
    const pop = getColorPopover(picker);
    if (chip) chip.setAttribute("aria-expanded", "false");
    resetColorPopoverStyles(pop, picker);
  });
}

function ensureColorPickerDocListeners() {
  if (colorPickerDocWired) return;
  colorPickerDocWired = true;
  document.addEventListener("click", (e) => {
    // Popovers are portaled to body, so they are no longer inside .color-picker.
    if (e.target.closest(".color-picker") || e.target.closest(".color-picker-popover")) return;
    closeAllColorPickers();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllColorPickers();
  });
  const repositionOpen = () => {
    document.querySelectorAll(".color-picker.is-open").forEach((picker) => {
      const chip = picker.querySelector(".color-picker-chip");
      const pop = getColorPopover(picker);
      if (chip && pop && !pop.hidden) positionColorPopover(chip, pop, picker);
    });
  };
  window.addEventListener("resize", repositionOpen);
  window.addEventListener("scroll", repositionOpen, true);
}

function renderColorPicker(selected, { namePrefix = "color" } = {}) {
  const current = nearestPaletteColor(selected);
  const label = TECH_COLOR_NAMES[current] || current;
  return `
    <div class="color-picker">
      <button type="button" class="color-picker-chip"
        style="--swatch:${escapeHtml(current)};background:${escapeHtml(current)}"
        aria-haspopup="true" aria-expanded="false"
        title="${escapeHtml(label)}" aria-label="${escapeHtml(t("common.color"))}: ${escapeHtml(label)}">
      </button>
      <div class="color-picker-popover" hidden>
        ${renderColorSwatches(current, { namePrefix })}
      </div>
    </div>`;
}

function wireColorPicker(root, { onChange } = {}) {
  if (!root) return;
  ensureColorPickerDocListeners();
  const picker = root.matches?.(".color-picker") ? root : root.querySelector(".color-picker");
  if (!picker) return;
  const chip = picker.querySelector(".color-picker-chip");
  const pop = picker.querySelector(".color-picker-popover");
  if (!chip || !pop) return;
  picker._colorPopover = pop;
  pop._colorPickerHome = picker;

  chip.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !picker.classList.contains("is-open");
    closeAllColorPickers();
    if (!willOpen) return;
    picker.classList.add("is-open");
    chip.setAttribute("aria-expanded", "true");
    positionColorPopover(chip, pop, picker);
  });

  wireColorSwatches(picker, {
    onChange: (color) => {
      chip.style.setProperty("--swatch", color);
      chip.style.background = color;
      const label = TECH_COLOR_NAMES[color] || color;
      chip.title = label;
      chip.setAttribute("aria-label", `${t("common.color")}: ${label}`);
      closeAllColorPickers();
      if (typeof onChange === "function") onChange(color);
    },
  });
}

function nextTechColor() {
  closeAllColorPickers();
  const used = new Set(
    state.allTechnicians.map((t) => nearestPaletteColor(t.color).toUpperCase())
  );
  const pick =
    TECH_COLOR_PALETTE.find((c) => !used.has(c.toUpperCase())) ||
    TECH_COLOR_PALETTE[state.allTechnicians.length % TECH_COLOR_PALETTE.length];
  if (els.teamAddSwatches) {
    els.teamAddSwatches.innerHTML = renderColorPicker(pick, { namePrefix: "color" });
    if (els.teamAddColor) els.teamAddColor.value = pick;
    wireColorPicker(els.teamAddSwatches, {
      onChange: (color) => {
        if (els.teamAddColor) els.teamAddColor.value = color;
      },
    });
  } else if (els.teamAddColor) {
    els.teamAddColor.value = pick;
  }
}

function phoneDaySoloActive() {
  return PHONE_MQ.matches && isDayScheduleMode();
}

/** Linked technician id from `/api/auth/me` (users.technician_id), or null. */
function linkedTechnicianId() {
  const raw = state.currentUser?.technician_id;
  if (raw == null || raw === "") return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

/** Active barber row for the signed-in user's linked technician, if any. */
function staffBookLinkedBarber() {
  const linked = linkedTechnicianId();
  if (linked == null) return null;
  return state.technicians.find((t) => t.id === linked) || null;
}

/**
 * New Booking barber step: linked staff → lock to themselves;
 * admins / users without a link → full list + Any Barber.
 */
function fillBookingTechSelect({ preferredId } = {}) {
  const locked = staffBookLinkedBarber();
  const lockedEl = document.getElementById("staff-barber-locked");
  const lockedName = document.getElementById("staff-barber-locked-name");
  const picker = document.getElementById("staff-barber-picker");
  if (!els.techSelect) return;

  if (locked) {
    els.techSelect.innerHTML = `<option value="${locked.id}">${escapeHtml(locked.name)}</option>`;
    els.techSelect.value = String(locked.id);
    if (lockedName) lockedName.textContent = locked.name;
    if (lockedEl) lockedEl.hidden = false;
    if (picker) picker.hidden = true;
    return;
  }

  if (lockedEl) lockedEl.hidden = true;
  if (picker) picker.hidden = false;
  const prev =
    preferredId != null && preferredId !== ""
      ? String(preferredId)
      : els.techSelect.value || "";
  const options =
    `<option value="">Any Barber</option>` +
    state.technicians
      .map((tech) => `<option value="${tech.id}">${escapeHtml(tech.name)}</option>`)
      .join("");
  els.techSelect.innerHTML = options;
  const stillActive =
    prev && state.technicians.some((tech) => String(tech.id) === String(prev));
  els.techSelect.value = stillActive ? prev : "";
}

/**
 * Default single-tech focus on phone: current user's linked tech when active,
 * else the first technician (prior behavior).
 */
function preferredPhoneSoloTechId(techs = state.technicians) {
  if (!techs.length) return null;
  const linked = linkedTechnicianId();
  if (linked != null && techs.some((t) => t.id === linked)) return linked;
  return techs[0].id;
}

/** On phone Day view, default to one technician unless the user chose “all”. */
function ensurePhoneDaySoloSelection() {
  if (!phoneDaySoloActive()) return false;
  if (state.phoneDayShowAll) return false;
  const techs = state.technicians;
  if (!techs.length) {
    if (state.mapTechFilterId != null) {
      state.mapTechFilterId = null;
      return true;
    }
    return false;
  }
  if (
    state.mapTechFilterId != null &&
    techs.some((t) => t.id === state.mapTechFilterId)
  ) {
    return false;
  }
  state.mapTechFilterId = preferredPhoneSoloTechId(techs);
  return true;
}

function selectDayTech(techId, { toggleOff = false } = {}) {
  const next = techId == null || techId === "" ? null : Number(techId);
  const keepMapExpanded = touchLocksActive() && state.mapExpanded;
  if (next == null || !Number.isFinite(next)) {
    if (!canViewAllBarbersOnBoard()) {
      applyBoardBarberAccessDefaults({ forceSelf: true });
    } else {
      state.phoneDayShowAll = phoneDaySoloActive();
      state.mapTechFilterId = null;
      /* Leaving Focus via All / deselect → Stacked. Stacked/Columns stay put. */
      if (effectiveDayBoardView() === "focus") persistDayBoardView("stacked");
    }
  } else if (toggleOff && state.mapTechFilterId === next && !phoneDaySoloActive()) {
    if (!canViewAllBarbersOnBoard()) {
      applyBoardBarberAccessDefaults({ forceSelf: true });
    } else {
      state.mapTechFilterId = null;
      state.phoneDayShowAll = false;
      if (effectiveDayBoardView() === "focus") persistDayBoardView("stacked");
    }
  } else if (toggleOff && state.mapTechFilterId === next && phoneDaySoloActive()) {
    // Phone solo: tapping the active tech header keeps them selected (no flip to All).
    state.phoneDayShowAll = false;
    state.mapTechFilterId = next;
  } else {
    if (!canViewAllBarbersOnBoard()) {
      const linked = linkedTechnicianId();
      if (linked != null && next !== linked) {
        applyBoardBarberAccessDefaults({ forceSelf: true });
      } else {
        state.phoneDayShowAll = false;
        state.mapTechFilterId = next;
      }
    } else {
      state.phoneDayShowAll = false;
      state.mapTechFilterId = next;
      /* Stacked/Columns: expand/highlight in place — never auto-switch to Focus. */
      if (effectiveDayBoardView() === "columns") {
        const idx = state.technicians.findIndex((t) => t.id === next);
        if (idx >= 0) {
          state.dayBoardColumnsPage = Math.floor(idx / DAY_BOARD_COLS_PER_PAGE);
        }
      }
    }
  }
  // Tech switch while expanded: stay expanded and refresh that tech’s route in place.
  if (keepMapExpanded) {
    state.mapExpanded = true;
    state.mapTouchUnlocked = true;
  }
  if (isDayScheduleMode()) renderRouteMap();
  renderSchedule();
  syncDayMapTechNav();
  if (keepMapExpanded && state.map && isDayScheduleMode()) {
    syncMapExpandedClass();
    syncMapTouchLock();
    afterMapExpandLayout(state.map, () => fitDayMapToVisibleStops());
  } else if (state.map && isDayScheduleMode()) {
    setTimeout(() => state.map.invalidateSize(), 60);
  }
  // Don’t scroll the board under an expanded map — that fights staying on the route.
  if (
    !keepMapExpanded &&
    state.mapTechFilterId != null &&
    isDayScheduleMode()
  ) {
    const focused = els.board?.querySelector(".tech.is-focused");
    const scroller = focused?.querySelector(".timeline-scroll");
    focused?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (scroller) scroller.scrollTop = 0;
  }
}

function setTechFilter(techId) {
  selectDayTech(techId, { toggleOff: true });
}

/** Cycle mapTechFilterId through technicians (wraps). Syncs map chips via selectDayTech. */
function stepSelectedDayTech(delta) {
  if (!canViewAllBarbersOnBoard()) {
    applyBoardBarberAccessDefaults({ forceSelf: true });
    return;
  }
  const techs = state.technicians;
  if (techs.length < 2) return;
  state.phoneDayShowAll = false;
  let idx = techs.findIndex((t) => t.id === state.mapTechFilterId);
  if (idx < 0) idx = 0;
  idx = (idx + delta + techs.length) % techs.length;
  selectDayTech(techs[idx].id);
}

function stepPhoneDayTech(delta) {
  if (!phoneDaySoloActive()) return;
  stepSelectedDayTech(delta);
}

/** Focus mode header ‹ › — stay in Focus, wrap last↔first. */
function stepFocusDayTech(delta) {
  if (effectiveDayBoardView() !== "focus") return;
  stepSelectedDayTech(delta);
}

function dayTechSwitcherHtml() {
  if (!phoneDaySoloActive()) return "";
  const techs = state.technicians;
  if (!techs.length) return "";

  // Non-admins: name only — no All / browse other barbers.
  if (!canViewAllBarbersOnBoard()) {
    const id = state.mapTechFilterId;
    const current =
      (id != null && techs.find((t) => t.id === id)) ||
      techs.find((t) => t.id === linkedTechnicianId()) ||
      techs[0];
    if (!current) return "";
    return `
    <nav class="day-tech-switcher day-tech-switcher-locked" role="group" aria-label="${escapeHtml(
      t("board.filterByTech")
    )}">
      <div class="day-tech-switcher-mid">
        <span class="day-tech-switcher-label" style="--tech-color:${escapeHtml(
          current.color
        )}">${escapeHtml(current.name)}</span>
      </div>
    </nav>`;
  }

  if (techs.length < 2) return "";
  const showAll = state.phoneDayShowAll || state.mapTechFilterId == null;
  const idx = Math.max(
    0,
    techs.findIndex((t) => t.id === state.mapTechFilterId)
  );
  const current = showAll ? null : techs[idx] || techs[0];
  const labelText = showAll
    ? t("board.allTechs")
    : t("board.techOf", {
        name: current.name,
        i: idx + 1,
        n: techs.length,
      });
  return `
    <nav class="day-tech-switcher" role="group" aria-label="${escapeHtml(t("board.filterByTech"))}">
      <button type="button" class="day-tech-nav icon" data-day-tech-step="-1" aria-label="${escapeHtml(
        t("board.prevTech")
      )}" ${showAll ? "disabled" : ""}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="day-tech-switcher-mid">
        <span class="day-tech-switcher-label"${
          current ? ` style="--tech-color:${escapeHtml(current.color)}"` : ""
        }>${escapeHtml(labelText)}</span>
        <div class="day-tech-switcher-actions">
          ${
            showAll
              ? `<button type="button" class="chip day-tech-mode" data-day-tech-solo="1">${escapeHtml(
                  t("board.showOneTech")
                )}</button>`
              : `<button type="button" class="chip day-tech-mode" data-day-tech-all="1">${escapeHtml(
                  t("board.viewAllTechs")
                )}</button>`
          }
        </div>
      </div>
      <button type="button" class="day-tech-nav icon" data-day-tech-step="1" aria-label="${escapeHtml(
        t("board.nextTech")
      )}" ${showAll ? "disabled" : ""}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </nav>`;
}

function wireDayTechSwitcher(root) {
  root?.querySelectorAll("[data-day-tech-step]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      stepPhoneDayTech(Number(btn.dataset.dayTechStep) || 0);
    });
  });
  root?.querySelector("[data-day-tech-all]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!canViewAllBarbersOnBoard()) return;
    const keepMapExpanded = touchLocksActive() && state.mapExpanded;
    state.phoneDayShowAll = true;
    state.mapTechFilterId = null;
    if (keepMapExpanded) {
      state.mapExpanded = true;
      state.mapTouchUnlocked = true;
    }
    if (isDayScheduleMode()) renderRouteMap();
    renderSchedule();
    syncDayMapTechNav();
    if (keepMapExpanded && state.map && isDayScheduleMode()) {
      syncMapExpandedClass();
      syncMapTouchLock();
      afterMapExpandLayout(state.map, () => fitDayMapToVisibleStops());
    }
  });
  root?.querySelector("[data-day-tech-solo]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const keepMapExpanded = touchLocksActive() && state.mapExpanded;
    state.phoneDayShowAll = false;
    applyBoardBarberAccessDefaults({ forceSelf: true });
    if (keepMapExpanded) {
      state.mapExpanded = true;
      state.mapTouchUnlocked = true;
    }
    if (isDayScheduleMode()) renderRouteMap();
    renderSchedule();
    syncDayMapTechNav();
    if (keepMapExpanded && state.map && isDayScheduleMode()) {
      syncMapExpandedClass();
      syncMapTouchLock();
      afterMapExpandLayout(state.map, () => fitDayMapToVisibleStops());
    }
  });
}

/** Stored view, with Columns falling back to Stacked on phone. */
function effectiveDayBoardView() {
  const view = normalizeDayBoardView(state.prefs?.dayBoardView);
  if (view === "columns" && PHONE_MQ.matches) return "stacked";
  return view;
}

function persistDayBoardView(view) {
  const next = normalizeDayBoardView(view);
  state.prefs = normalizePrefs({ ...state.prefs, dayBoardView: next });
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
  } catch (_) {
    /* ignore quota / private mode */
  }
}

/**
 * Switch Stacked | Columns | Focus.
 * Stacked/Columns clear the named chip (All). Focus ensures one tech is selected.
 * Any → any: drop pin-focus zoom and recenter to the default fit-to-stops overview.
 */
function setDayBoardView(view, { render = true } = {}) {
  let next = normalizeDayBoardView(view);
  if (next === "columns" && PHONE_MQ.matches) next = "stacked";
  persistDayBoardView(next);

  if (next === "stacked" || next === "columns") {
    if (canViewAllBarbersOnBoard()) {
      state.mapTechFilterId = null;
      state.phoneDayShowAll = phoneDaySoloActive();
    } else {
      applyBoardBarberAccessDefaults({ forceSelf: true });
    }
    if (next === "columns") state.dayBoardColumnsPage = 0;
  } else if (next === "focus") {
    state.phoneDayShowAll = false;
    applyBoardBarberAccessDefaults({
      forceSelf: !canViewAllBarbersOnBoard() || state.mapTechFilterId == null,
    });
  }

  if (!render) return;

  /* Cancel Show-on-map / prior pin zoom so this view’s overview framing wins. */
  state.dayMapViewEpoch = (state.dayMapViewEpoch || 0) + 1;
  state.pendingMapFocusId = null;
  setDayMapPinFocused(false);

  if (isDayScheduleMode()) renderRouteMap();
  renderSchedule();
  replayDayBoardEnterAnimation();
  syncDayMapTechNav();

  /* Focus↔Columns can change board chrome; invalidateSize then fit after layout. */
  if (state.map && isDayScheduleMode() && state.prefs.showMap !== false) {
    afterMapExpandLayout(state.map, () => fitDayMapToVisibleStops());
  }
}

/** Re-fire Columns-style rise enter on Stacked rows / Focus (and Columns) after a view switch. */
function replayDayBoardEnterAnimation() {
  const board = els.board;
  if (!board || !isDayScheduleMode()) return;
  const items = board.querySelectorAll(".tech, .day-overview-item");
  if (!items.length) return;
  items.forEach((el) => {
    el.style.animation = "none";
  });
  void board.offsetWidth;
  items.forEach((el) => {
    el.style.animation = "";
  });
}

function dayBoardColumnsPageCount(techCount = state.technicians.length) {
  return Math.max(1, Math.ceil(Math.max(techCount, 0) / DAY_BOARD_COLS_PER_PAGE));
}

function stepDayBoardColumnsPage(delta) {
  if (effectiveDayBoardView() !== "columns") return;
  const pages = dayBoardColumnsPageCount();
  const next = Math.max(0, Math.min(pages - 1, state.dayBoardColumnsPage + delta));
  if (next === state.dayBoardColumnsPage) return;
  state.dayBoardColumnsPage = next;
  renderBoard();
  replayDayBoardEnterAnimation();
}

function closeFocusTechMenu() {
  const menu = els.focusTechMenu;
  const trigger = els.focusTechMenuTrigger;
  if (menu) {
    menu.hidden = true;
    menu.innerHTML = "";
  }
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
    trigger.classList.remove("is-open");
  }
  els.focusTechMenuTrigger = null;
  document.removeEventListener("pointerdown", onFocusTechMenuPointerDown, true);
  document.removeEventListener("keydown", onFocusTechMenuKeydown, true);
}

function onFocusTechMenuPointerDown(e) {
  const menu = els.focusTechMenu;
  const trigger = els.focusTechMenuTrigger;
  if (!menu || menu.hidden) return;
  if (menu.contains(e.target) || trigger?.contains(e.target)) return;
  closeFocusTechMenu();
}

function onFocusTechMenuKeydown(e) {
  const menu = els.focusTechMenu;
  if (e.key === "Escape") {
    e.preventDefault();
    const trigger = els.focusTechMenuTrigger;
    closeFocusTechMenu();
    trigger?.focus?.();
    return;
  }
  if (!menu || menu.hidden) return;
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") {
    return;
  }
  const items = [...menu.querySelectorAll(".focus-tech-menu-item")];
  if (!items.length) return;
  e.preventDefault();
  const idx = items.indexOf(document.activeElement);
  let next = 0;
  if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % items.length;
  else if (e.key === "ArrowUp") next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
  else if (e.key === "End") next = items.length - 1;
  items[next]?.focus?.();
}

function ensureFocusTechMenu() {
  if (els.focusTechMenu) return els.focusTechMenu;
  const menu = document.createElement("div");
  menu.className = "focus-tech-menu";
  menu.id = "focus-tech-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("tabindex", "-1");
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-focus-tech-id]");
    if (!item || !menu.contains(item)) return;
    e.preventDefault();
    e.stopPropagation();
    const id = Number(item.dataset.focusTechId);
    closeFocusTechMenu();
    if (!Number.isFinite(id)) return;
    if (effectiveDayBoardView() !== "focus") persistDayBoardView("focus");
    selectDayTech(id);
  });
  document.body.appendChild(menu);
  els.focusTechMenu = menu;
  return menu;
}

function positionFocusTechMenu(trigger) {
  const menu = els.focusTechMenu;
  if (!menu || !trigger) return;
  const rect = trigger.getBoundingClientRect();
  const pad = 8;
  const menuWidth = Math.max(menu.offsetWidth || 0, 12 * 16);
  let left = rect.left;
  left = Math.min(left, window.innerWidth - menuWidth - pad);
  left = Math.max(pad, left);
  let top = rect.bottom + 6;
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.bottom > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - menuRect.height - 6);
    menu.style.top = `${Math.round(top)}px`;
  }
}

function openFocusTechMenu(trigger) {
  if (!trigger) return;
  if (!canViewAllBarbersOnBoard()) return;
  const techs = state.technicians;
  if (techs.length < 2) return;

  closeFocusTechMenu();
  const menu = ensureFocusTechMenu();
  const currentId =
    state.mapTechFilterId != null && techs.some((t) => t.id === state.mapTechFilterId)
      ? state.mapTechFilterId
      : techs[0]?.id;

  menu.setAttribute("aria-label", t("board.technicianMenu"));
  menu.innerHTML = techs
    .map((tech) => {
      const selected = tech.id === currentId;
      return `<button
          type="button"
          class="focus-tech-menu-item${selected ? " is-selected" : ""}"
          role="menuitemradio"
          aria-checked="${selected ? "true" : "false"}"
          data-focus-tech-id="${tech.id}"
        >
          <span class="focus-tech-menu-dot" style="background:${escapeHtml(tech.color)}" aria-hidden="true"></span>
          <span class="focus-tech-menu-label">${escapeHtml(tech.name)}</span>
          <span class="focus-tech-menu-check" aria-hidden="true">${selected ? "✓" : ""}</span>
        </button>`;
    })
    .join("");

  els.focusTechMenuTrigger = trigger;
  trigger.setAttribute("aria-expanded", "true");
  trigger.classList.add("is-open");
  menu.hidden = false;
  positionFocusTechMenu(trigger);
  document.addEventListener("pointerdown", onFocusTechMenuPointerDown, true);
  document.addEventListener("keydown", onFocusTechMenuKeydown, true);
  const selectedBtn = menu.querySelector(".focus-tech-menu-item.is-selected");
  (selectedBtn || menu.querySelector(".focus-tech-menu-item"))?.focus?.();
}

function toggleFocusTechMenu(trigger) {
  if (!trigger) return;
  if (els.focusTechMenuTrigger === trigger && els.focusTechMenu && !els.focusTechMenu.hidden) {
    closeFocusTechMenu();
    return;
  }
  openFocusTechMenu(trigger);
}

function syncDayBoardToolbar(view, { columnsPage = 0, columnsPages = 1 } = {}) {
  const toolbar = els.dayBoardToolbar;
  if (!toolbar) return;
  const show = isDayScheduleMode() && state.page === "scheduling";
  toolbar.hidden = !show;
  if (!show) {
    closeFocusTechMenu();
    return;
  }

  const active = effectiveDayBoardView();
  els.dayBoardViewToggle?.querySelectorAll("[data-day-board-view]").forEach((btn) => {
    const mode = btn.dataset.dayBoardView;
    const on = mode === active;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  });

  if (active !== "focus") closeFocusTechMenu();

  const pager = els.dayBoardColumnsPager;
  const showPager =
    active === "columns" &&
    state.technicians.length > DAY_BOARD_COLS_PER_PAGE &&
    !PHONE_MQ.matches;
  if (pager) {
    pager.hidden = !showPager;
    if (showPager) {
      if (els.dayBoardColumnsPage) {
        els.dayBoardColumnsPage.textContent = t("board.columnsPage", {
          i: columnsPage + 1,
          n: columnsPages,
        });
      }
      if (els.dayBoardColumnsPrev) els.dayBoardColumnsPrev.disabled = columnsPage <= 0;
      if (els.dayBoardColumnsNext) {
        els.dayBoardColumnsNext.disabled = columnsPage >= columnsPages - 1;
      }
    }
  }
}

function wireDayBoardToolbar() {
  els.dayBoardViewToggle?.querySelectorAll("[data-day-board-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setDayBoardView(btn.dataset.dayBoardView);
    });
  });
  els.dayBoardColumnsPrev?.addEventListener("click", () => stepDayBoardColumnsPage(-1));
  els.dayBoardColumnsNext?.addEventListener("click", () => stepDayBoardColumnsPage(1));
}

/**
 * Explicit Focus entry only (view toggle / deep links).
 * Map chips and overview/column clicks must use selectDayTech — they stay on Stacked/Columns.
 */
function focusDayTech(techId) {
  const id = Number(techId);
  if (!Number.isFinite(id)) return;
  persistDayBoardView("focus");
  state.phoneDayShowAll = false;
  selectDayTech(id);
}

function syncTechFilterLayout(filterId, visibleCount, view = effectiveDayBoardView()) {
  const techCount = state.technicians.length;
  /* Layout follows dayBoardView — selecting a tech must not force Focus (is-single). */
  const overview = view === "stacked" && techCount > 1;
  const columns = view === "columns" && techCount > 1;
  const single = !overview && !columns;
  const cols = columns ? Math.min(DAY_BOARD_COLS_PER_PAGE, Math.max(visibleCount, 1)) : 1;
  if (els.board) {
    els.board.classList.toggle("is-single", single);
    els.board.classList.toggle("is-overview", overview);
    els.board.classList.toggle("is-columns", columns);
    els.board.style.setProperty("--board-cols", String(cols));
  }
  if (els.pageScheduling) {
    els.pageScheduling.classList.toggle("is-tech-filtered", filterId != null);
    els.pageScheduling.classList.toggle("is-day-overview", overview);
    els.pageScheduling.classList.toggle("is-day-columns", columns);
  }
}

async function loadAppointments() {
  if (els.loading) els.loading.hidden = false;
  let url = `/api/appointments?day=${state.day}`;
  if (state.scheduleMode === "week") {
    const { start, end } = weekRangeContaining(state.day);
    url = `/api/appointments?start=${start}&end=${end}`;
  } else if (state.scheduleMode === "month") {
    const { start, end } = monthGridRangeContaining(state.day);
    url = `/api/appointments?start=${start}&end=${end}`;
  }
  state.appointments = await api(url);
  invalidateDayAppointmentsCache(state.day);
  renderSchedule();
  syncRouteMapVisibility();
  if (isDayScheduleMode()) renderRouteMap();
  if (els.loading) els.loading.hidden = true;
}

function renderSchedule() {
  syncScheduleModeChips();
  if (state.scheduleMode === "week") {
    if (els.dayBoardToolbar) els.dayBoardToolbar.hidden = true;
    renderWeekBoard();
  } else if (state.scheduleMode === "month") {
    if (els.dayBoardToolbar) els.dayBoardToolbar.hidden = true;
    renderMonthBoard();
  } else {
    renderBoard();
  }
}

function hashString(value) {
  let h = 0;
  const s = String(value);
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Leaflet divIcon size/anchor for .map-pin — matches CSS at ≤1024 / ≤640. */
function mapPinIconLayout() {
  if (window.matchMedia("(max-width: 640px)").matches) {
    return { iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -17] };
  }
  if (window.matchMedia("(max-width: 1024px)").matches) {
    return { iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16] };
  }
  return { iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] };
}

function coordsForAddress(address) {
  const cityKey = inferCityKey(address);
  const base = cityKey
    ? CITY_COORDS[cityKey]
    : { lat: DEFAULT_MAP_CENTER[0], lng: DEFAULT_MAP_CENTER[1] };
  // Slight per-address jitter so markers in the same city don't stack.
  const h = hashString(address);
  const latJitter = ((h % 100) / 100 - 0.5) * 0.028;
  const lngJitter = (((h >> 7) % 100) / 100 - 0.5) * 0.032;
  return { lat: base.lat + latJitter, lng: base.lng + lngJitter, city: cityKey };
}

/** Day map can place a stop when the appointment has a usable address string. */
function appointmentHasMapGeo(job) {
  return Boolean(String(job?.customer?.address || "").trim());
}

function syncShowOnMapButton(job) {
  const btn = els.showOnMap;
  if (!btn) return;
  const ok = appointmentHasMapGeo(job);
  btn.hidden = !ok;
  btn.disabled = !ok;
}

function setDayMapPinFocused(on) {
  els.dayMapShell?.classList.toggle("is-pin-focused", Boolean(on));
}

/** Highlight the stop pin for an appointment (and bump its Leaflet z-order). */
function highlightDayMapMarker(apptId) {
  const id = Number(apptId);
  if (!state.mapMarkersById) return null;
  let focused = null;
  state.mapMarkersById.forEach((marker, mid) => {
    const pin = marker.getElement?.()?.querySelector?.(".map-pin");
    const isTarget = Number(mid) === id;
    pin?.classList.toggle("is-focused", isTarget);
    marker.setZIndexOffset?.(isTarget ? 1000 : 0);
    if (isTarget) focused = marker;
  });
  return focused;
}

function focusAppointmentOnDayMap(apptId) {
  const id = Number(apptId);
  if (!Number.isFinite(id)) return;
  const map = ensureMap();
  if (!map) return;

  const marker = highlightDayMapMarker(id) || state.mapMarkersById?.get(id);
  if (marker) {
    const ll = marker.getLatLng();
    map.setView(ll, MAP_APPT_FOCUS_ZOOM, { animate: true });
    marker.openPopup();
  } else {
    const job = findAppointment(id);
    if (!job || !appointmentHasMapGeo(job)) return;
    const { lat, lng } = coordsForAddress(job.customer.address);
    map.setView([lat, lng], MAP_APPT_FOCUS_ZOOM, { animate: true });
  }
  setTimeout(() => map.invalidateSize({ animate: false }), 80);
}

/**
 * After Show on map: expand compact map if needed, then zoom to the pin.
 * Does not clear Focus / mapTechFilterId / dayBoardView.
 * Avoids setMapTouchUnlocked → fitDayMapToVisibleStops, which would undo the pin zoom.
 */
function flushPendingMapFocus() {
  const id = state.pendingMapFocusId;
  if (id == null) return;
  state.pendingMapFocusId = null;
  const epoch = state.dayMapViewEpoch;

  const runFocus = () => {
    /* View toggle bumped epoch — don’t re-zoom after overview recenter. */
    if (epoch !== state.dayMapViewEpoch) return;
    setDayMapPinFocused(true);
    focusAppointmentOnDayMap(id);
    if (touchLocksActive()) {
      state.mapTouchUnlocked = true;
      syncMapTouchLock();
    }
  };

  requestAnimationFrame(() => {
    setTimeout(() => {
      els.routeMap?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const map = ensureMap();
      if (touchLocksActive() && !state.mapExpanded) {
        state.mapExpanded = true;
        state.mapTouchUnlocked = true;
        syncMapExpandedClass();
        syncMapTouchLock();
        try {
          els.dayMapShell?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (_) {
          /* ignore */
        }
        afterMapExpandLayout(map, runFocus);
        return;
      }
      // Desktop (or already expanded): grow via is-pin-focused, then zoom after layout.
      setDayMapPinFocused(true);
      afterMapExpandLayout(map, runFocus);
    }, 60);
  });
}

async function showAppointmentOnMap(jobOrId) {
  const job =
    jobOrId && typeof jobOrId === "object"
      ? jobOrId
      : await resolveAppointment(jobOrId ?? state.activeAppointmentId);
  if (!job || !appointmentHasMapGeo(job)) return;

  const day = appointmentDayKey(job);
  if (!day) return;

  dismissDetailDialog();
  if (state.boardTouchUnlocked) setBoardTouchUnlocked(false);

  if (state.page !== "scheduling") navigate("scheduling");

  // Keep Focus / selected tech / dayBoardView — only queue to this stop on the day map.
  state.pendingMapFocusId = job.id;

  const alreadyOnDay = isDayScheduleMode() && state.day === day;
  if (!alreadyOnDay) {
    await setScheduleMode("day", { day });
    return;
  }

  syncRouteMapVisibility();
  renderSchedule();
  renderRouteMap();
  if (state.pendingMapFocusId != null) flushPendingMapFocus();
}

function touchLocksActive() {
  return PHONE_MQ.matches || TABLET_MQ.matches;
}

function setLeafletInteractive(map, enabled) {
  if (!map) return;
  const handlers = [
    "dragging",
    "touchZoom",
    "doubleClickZoom",
    "scrollWheelZoom",
    "boxZoom",
    "keyboard",
  ];
  for (const name of handlers) {
    const handler = map[name];
    if (!handler) continue;
    if (enabled) handler.enable();
    else handler.disable();
  }
  if (map.tap) {
    if (enabled) map.tap.enable();
    else map.tap.disable();
  }
}

/** True when New Booking / Detail / Tech Day (or similar) should cover scheduling locks. */
function schedulingChromeBlocksTouchLocks() {
  if (els.drawer && !els.drawer.hidden) return true;
  if (els.detailDialog?.open) return true;
  if (els.techDayPopover && !els.techDayPopover.hidden) return true;
  return false;
}

function syncTouchLockSuppression() {
  document.body.classList.toggle("touch-locks-suppressed", schedulingChromeBlocksTouchLocks());
  syncMapTouchLock();
  syncBoardTouchLock();
}

function syncMapTouchLock() {
  const shell = els.dayMapShell;
  const unlockBtn = els.dayMapUnlock;
  const doneBtn = els.dayMapDone;
  const active = touchLocksActive();
  const suppressed = schedulingChromeBlocksTouchLocks();
  const unlocked = suppressed || !active || state.mapTouchUnlocked;

  if (shell) shell.classList.toggle("is-unlocked", unlocked);
  if (unlockBtn) {
    // Hide overlay while booking/detail UI is open (CSS also forces hide).
    unlockBtn.hidden = unlocked || suppressed;
    unlockBtn.setAttribute("aria-hidden", unlocked || suppressed ? "true" : "false");
  }
  if (doneBtn) {
    doneBtn.hidden = suppressed || !active || !state.mapTouchUnlocked;
  }

  if (state.map) {
    setLeafletInteractive(state.map, unlocked && !suppressed);
    // Keep wheel zoom off — page/board scroll is preferred; pinch/drag when unlocked.
    state.map.scrollWheelZoom?.disable();
  }
}

function ensureBoardFocusPlaceholder() {
  if (els.boardFocusPlaceholder) return els.boardFocusPlaceholder;
  const ph = document.createElement("div");
  ph.className = "board-focus-placeholder";
  ph.setAttribute("aria-hidden", "true");
  els.boardFocusPlaceholder = ph;
  return ph;
}

/** Move #board into the focus sheet scrollport; leave a spacer in the shell. */
function mountBoardInFocus() {
  const board = els.board;
  const scroll = els.boardFocusScroll;
  const shell = els.boardShell;
  if (!board || !scroll || !shell || board.parentElement === scroll) return;

  const ph = ensureBoardFocusPlaceholder();
  ph.style.minHeight = `${Math.max(board.offsetHeight, 180)}px`;
  if (board.parentElement === shell) {
    shell.insertBefore(ph, board);
  } else if (!ph.parentElement && shell) {
    shell.insertBefore(ph, els.boardUnlock || null);
  }
  scroll.appendChild(board);
}

/** Restore #board to the scheduling shell and remove the spacer. */
function unmountBoardFromFocus() {
  const board = els.board;
  const shell = els.boardShell;
  const ph = els.boardFocusPlaceholder;
  if (!board || !shell) return;
  if (board.parentElement === shell) {
    ph?.remove();
    return;
  }
  if (ph?.parentElement === shell) {
    shell.insertBefore(board, ph);
    ph.remove();
    return;
  }
  const unlock = els.boardUnlock;
  if (unlock && unlock.parentElement === shell) shell.insertBefore(board, unlock);
  else shell.appendChild(board);
  ph?.remove();
}

function showBoardFocusSheet() {
  const focus = els.boardFocus;
  if (!focus) return;
  focus.hidden = false;
  focus.setAttribute("aria-hidden", "false");
  focus.classList.remove("is-closing");
  // Reflow so the enter transition runs from translateY(100%).
  void focus.offsetWidth;
  focus.classList.add("is-open");
  document.body.classList.add("board-focus-on");
}

function hideBoardFocusSheet(immediate = false, onDone) {
  const focus = els.boardFocus;
  const finish = () => {
    if (focus) {
      focus.classList.remove("is-open", "is-closing");
      focus.hidden = true;
      focus.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("board-focus-on");
    onDone?.();
  };

  if (!focus || focus.hidden || immediate) {
    finish();
    return;
  }

  focus.classList.remove("is-open");
  focus.classList.add("is-closing");
  const panel = focus.querySelector(".board-focus-panel");
  let done = false;
  const complete = () => {
    if (done) return;
    done = true;
    panel?.removeEventListener("transitionend", onEnd);
    finish();
  };
  const onEnd = (event) => {
    if (event.target !== panel) return;
    complete();
  };
  panel?.addEventListener("transitionend", onEnd);
  setTimeout(complete, 400);
}

function syncBoardTouchLock() {
  const shell = els.boardShell;
  const unlockBtn = els.boardUnlock;
  // Day board is always interactive in place — no phone tap-to-open lock.
  // Map touch-lock remains separate (syncMapTouchLock).
  if (shell) shell.classList.add("is-unlocked");
  // body.board-focus-on is owned by show/hideBoardFocusSheet (kept through close animation)

  if (unlockBtn) {
    unlockBtn.hidden = true;
    unlockBtn.setAttribute("aria-hidden", "true");
  }
}

function syncMapExpandedClass() {
  const shell = els.dayMapShell;
  if (!shell) return;
  const expanded = touchLocksActive() && state.mapExpanded;
  shell.classList.toggle("is-expanded", expanded);
  document.body.classList.remove("map-fs-open");
  const unlockBtn = els.dayMapUnlock;
  if (unlockBtn) {
    // Overlay is hidden while expanded/unlocked; label stays “expand” for the locked state.
    unlockBtn.setAttribute("aria-label", t("map.tapToExpand"));
    const span = unlockBtn.querySelector(".touch-lock-overlay-label");
    if (span) span.textContent = t("map.tapToExpand");
  }
  const doneBtn = els.dayMapDone;
  if (doneBtn) doneBtn.textContent = t("common.done");
  syncDayMapTechNav();
}

/** Compact prev/next on expanded map chrome (board switcher may be scrolled off-screen). */
function syncDayMapTechNav() {
  const nav = els.dayMapTechNav;
  const labelEl = els.dayMapTechNavLabel;
  if (!nav) return;
  const show =
    touchLocksActive() &&
    state.mapExpanded &&
    phoneDaySoloActive() &&
    canViewAllBarbersOnBoard() &&
    state.technicians.length >= 2;
  nav.hidden = !show;
  nav.setAttribute("aria-hidden", show ? "false" : "true");
  nav.setAttribute("aria-label", t("board.filterByTech"));
  if (!show) return;

  const techs = state.technicians;
  const showAll = state.phoneDayShowAll || state.mapTechFilterId == null;
  const idx = Math.max(
    0,
    techs.findIndex((t) => t.id === state.mapTechFilterId)
  );
  const current = showAll ? null : techs[idx] || techs[0];
  const labelText = showAll
    ? t("board.allTechs")
    : t("board.techOf", {
        name: current.name,
        i: idx + 1,
        n: techs.length,
      });
  if (labelEl) {
    labelEl.textContent = labelText;
    if (current) {
      labelEl.style.setProperty("--tech-color", current.color);
    } else {
      labelEl.style.removeProperty("--tech-color");
    }
  }
  nav.querySelectorAll("[data-day-map-tech-step]").forEach((btn) => {
    btn.disabled = showAll;
    const step = Number(btn.dataset.dayMapTechStep) || 0;
    btn.setAttribute(
      "aria-label",
      step < 0 ? t("board.prevTech") : t("board.nextTech")
    );
  });
}

function setMapExpanded(expanded) {
  const next = Boolean(expanded);
  if (!touchLocksActive()) {
    state.mapExpanded = false;
    state.mapTouchUnlocked = false;
    if (!next) setDayMapPinFocused(false);
    syncMapExpandedClass();
    syncMapTouchLock();
    return;
  }
  state.mapExpanded = next;
  state.mapTouchUnlocked = next;
  if (!next) setDayMapPinFocused(false);
  syncMapExpandedClass();
  syncMapTouchLock();
  if (next) {
    try {
      els.dayMapShell?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (_) {
      /* ignore */
    }
  }
  // After accordion height settles: invalidateSize then fit day’s route.
  afterMapExpandLayout(state.map, next ? () => fitDayMapToVisibleStops() : null);
}

function setMapTouchUnlocked(unlocked) {
  // Expand and unlock travel together on narrow viewports; collapse locks again.
  if (touchLocksActive()) {
    setMapExpanded(Boolean(unlocked));
    return;
  }
  state.mapTouchUnlocked = Boolean(unlocked);
  state.mapExpanded = false;
  syncMapExpandedClass();
  syncMapTouchLock();
}

function setBoardTouchUnlocked(unlocked) {
  const next = Boolean(unlocked);
  if (next === state.boardTouchUnlocked) {
    syncBoardTouchLock();
    return;
  }

  state.boardTouchUnlocked = next;

  if (next) {
    if (!touchLocksActive()) {
      state.boardTouchUnlocked = false;
      syncBoardTouchLock();
      return;
    }
    mountBoardInFocus();
    showBoardFocusSheet();
    syncBoardTouchLock();
    requestAnimationFrame(() => {
      els.boardFocusScroll?.scrollTo?.(0, 0);
      try {
        els.boardFocusDone?.focus({ preventScroll: true });
      } catch (_) {
        els.boardFocusDone?.focus();
      }
    });
  } else {
    hideBoardFocusSheet(false, () => {
      unmountBoardFromFocus();
      syncBoardTouchLock();
    });
    syncBoardTouchLock();
  }

  invalidateMapsSoon();
}

function syncTouchLocks() {
  if (!touchLocksActive()) {
    state.mapTouchUnlocked = false;
    state.mapExpanded = false;
    if (state.boardTouchUnlocked) {
      state.boardTouchUnlocked = false;
      hideBoardFocusSheet(true);
      unmountBoardFromFocus();
    }
  }
  syncMapExpandedClass();
  syncMapTouchLock();
  syncBoardTouchLock();
}

function wireTouchLocks() {
  els.dayMapUnlock?.addEventListener("click", () => {
    if (!touchLocksActive() || schedulingChromeBlocksTouchLocks()) return;
    setBoardTouchUnlocked(false);
    setMapExpanded(true);
  });
  els.dayMapDone?.addEventListener("click", () => setMapExpanded(false));

  els.dayMapTechNav?.querySelectorAll("[data-day-map-tech-step]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      stepPhoneDayTech(Number(btn.dataset.dayMapTechStep) || 0);
    });
  });

  // Board unlock overlay disabled — day calendar is interactive without a focus sheet.
  els.boardFocusDone?.addEventListener("click", () => setBoardTouchUnlocked(false));
  els.boardFocusScrim?.addEventListener("click", () => setBoardTouchUnlocked(false));

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!touchLocksActive() || schedulingChromeBlocksTouchLocks()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Tech filter / map chrome outside the shell must not collapse an expanded map.
      if (
        target.closest(
          "dialog, .drawer, .tech-day-popover, .focus-tech-menu, .focus-tech-name, .touch-lock-done, .touch-lock-overlay, .board-focus-panel, .board-focus-done, .day-tech-switcher, .day-map-tech-nav, .map-legend, .map-recenter-btn, .route-map-controls, .route-map-top"
        )
      ) {
        return;
      }

      if (
        (state.mapTouchUnlocked || state.mapExpanded) &&
        els.dayMapShell &&
        !els.dayMapShell.contains(target)
      ) {
        setMapExpanded(false);
      }
      // Board focus closes via Done / scrim — not by tapping elsewhere under the sheet.
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (els.detailDialog?.open) return;
    if (state.techDayMapExpanded) {
      setTechDayMapExpanded(false);
      return;
    }
    if (state.mapExpanded) {
      setMapExpanded(false);
      return;
    }
    if (!state.boardTouchUnlocked) return;
    if (els.drawer && !els.drawer.hidden) return;
    setBoardTouchUnlocked(false);
  });

  syncTouchLocks();
  syncTouchLockSuppression();
}

function ensureMap() {
  // No #day-map in barbershop desk — never init Leaflet day map.
  if (!els.dayMap) return null;
  if (state.map || typeof L === "undefined") return state.map;
  state.map = L.map(els.dayMap, {
    scrollWheelZoom: false,
    attributionControl: false,
  }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
  attachMapBasemaps(state.map);
  state.mapLayers = L.layerGroup().addTo(state.map);
  syncMapTouchLock();
  return state.map;
}

function setMapTechFilter(techId) {
  setTechFilter(techId);
}

/** LatLngs for stops currently visible on the day map (respects tech filter). */
function visibleDayMapBounds() {
  const filterId = state.mapTechFilterId;
  const jobs = state.appointments.filter(
    (a) => filterId == null || a.technician_id === filterId
  );
  return jobs.map((job) => {
    const { lat, lng } = coordsForAddress(job.customer.address);
    return [lat, lng];
  });
}

/** Fit day map to visible markers, or Central Valley / Bakersfield default if none. */
function fitDayMapToVisibleStops() {
  const map = ensureMap();
  if (!map) return;
  setDayMapPinFocused(false);
  const bounds = visibleDayMapBounds();
  if (!bounds.length) {
    map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
    return;
  }
  if (bounds.length === 1) {
    map.setView(bounds[0], 12, { animate: false });
    return;
  }
  map.fitBounds(bounds, {
    padding: MAP_FIT_PADDING,
    maxZoom: MAP_FIT_MAX_ZOOM,
    animate: false,
  });
}

function renderMapLegend() {
  // Day route map + legend removed.
  if (!els.mapLegend) return;
  const filterId = state.mapTechFilterId;
  const allowAll = canViewAllBarbersOnBoard();
  const techs = allowAll ? state.technicians : boardScopedTechnicians();
  const allActive = allowAll && filterId == null;
  const techChips = techs
    .map((tech) => {
      const active = filterId === tech.id || (!allowAll && techs.length === 1);
      return `
      <button type="button" class="map-legend-item${active ? " is-active" : ""}${
        !allActive && !active ? " is-muted" : ""
      }" data-tech-id="${tech.id}" aria-pressed="${active ? "true" : "false"}" title="${escapeHtml(
        t("board.showTechOnly", { name: tech.name })
      )}" style="--chip-color:${escapeHtml(tech.color)}">
        <span class="map-legend-swatch" style="background:${escapeHtml(tech.color)}"></span>
        ${escapeHtml(tech.name)}
      </button>`;
    })
    .join("");
  const allChip = allowAll
    ? `<button type="button" class="map-legend-item map-legend-all${
        allActive ? " is-active" : ""
      }" data-tech-id="" aria-pressed="${allActive ? "true" : "false"}" title="${escapeHtml(
        t("map.showAll")
      )}">${escapeHtml(label("all"))}</button>`
    : "";
  els.mapLegend.innerHTML = `${allChip}${techChips}`;

  els.mapLegend.querySelectorAll("[data-tech-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.techId;
      if (raw === "") {
        if (!canViewAllBarbersOnBoard()) return;
        const keepMapExpanded = touchLocksActive() && state.mapExpanded;
        /* All chip: leave Focus → Stacked so the day board shows everyone. */
        if (effectiveDayBoardView() === "focus") {
          persistDayBoardView("stacked");
        }
        state.phoneDayShowAll = phoneDaySoloActive();
        state.mapTechFilterId = null;
        if (keepMapExpanded) {
          state.mapExpanded = true;
          state.mapTouchUnlocked = true;
        }
        if (isDayScheduleMode()) renderRouteMap();
        renderSchedule();
        syncDayMapTechNav();
        if (keepMapExpanded && state.map && isDayScheduleMode()) {
          syncMapExpandedClass();
          syncMapTouchLock();
          afterMapExpandLayout(state.map, () => fitDayMapToVisibleStops());
        }
        return;
      }
      /* Named chip: filter/expand in current view — never auto-jump to Focus. */
      selectDayTech(Number(raw));
    });
  });
}

function renderRouteMap() {
  // Day route map removed from staff Booking board.
  syncRouteMapVisibility();
}

function calTechFilterChipsHtml(ariaLabel) {
  const filterAria = ariaLabel || t("board.filterByTech");
  const filterId = state.mapTechFilterId;
  const allowAll = canViewAllBarbersOnBoard();
  const techs = allowAll ? state.technicians : boardScopedTechnicians();
  const allActive = allowAll && filterId == null;
  const techChips = techs
    .map((tech) => {
      const active = filterId === tech.id || (!allowAll && techs.length === 1);
      return `
      <button type="button" class="map-legend-item${active ? " is-active" : ""}${
        !allActive && !active ? " is-muted" : ""
      }" data-tech-id="${tech.id}" aria-pressed="${active ? "true" : "false"}" title="${escapeHtml(
        t("board.showTechOnly", { name: tech.name })
      )}" style="--chip-color:${escapeHtml(tech.color)}">
        <span class="map-legend-swatch" style="background:${escapeHtml(tech.color)}"></span>
        ${escapeHtml(tech.name)}
      </button>`;
    })
    .join("");
  const allChip = allowAll
    ? `<button type="button" class="map-legend-item map-legend-all${
        allActive ? " is-active" : ""
      }" data-tech-id="" aria-pressed="${allActive ? "true" : "false"}" title="${escapeHtml(
        t("map.showAll")
      )}">${escapeHtml(label("all"))}</button>`
    : "";
  return `
    <div class="week-cal-legend cal-tech-legend map-legend" role="group" aria-label="${escapeHtml(
      filterAria
    )}">
      ${allChip}
      ${techChips || `<span class='status'>${escapeHtml(t("board.noTechs"))}</span>`}
    </div>`;
}

function wireCalTechFilterChips(root) {
  root?.querySelectorAll(".cal-tech-legend [data-tech-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const raw = btn.dataset.techId;
      if (raw === "") {
        if (!canViewAllBarbersOnBoard()) return;
        state.phoneDayShowAll = false;
        state.mapTechFilterId = null;
        renderSchedule();
        return;
      }
      state.phoneDayShowAll = false;
      selectDayTech(Number(raw));
    });
  });
}

function renderWeekBoard() {
  if (!els.board) return;
  applyBoardBarberAccessDefaults();
  const filterId = state.mapTechFilterId;
  const scoped = boardScopedTechnicians();
  const visibleTechs =
    filterId == null || !canViewAllBarbersOnBoard()
      ? scoped
      : scoped.filter((t) => t.id === filterId);
  const techIds = new Set(visibleTechs.map((t) => t.id));
  /* Week board is a single full-width calendar — not multi tech columns */
  syncTechFilterLayout(null, 1);
  if (els.board) {
    els.board.classList.add("is-single");
    els.board.style.setProperty("--board-cols", "1");
  }

  const HOUR_H = 52;
  const { start } = weekRangeContaining(state.day);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const today = toDateInputValue(new Date());
  const rangeLabel = `${formatDayLabel(days[0])} – ${formatDayLabel(days[6])}`;
  const filterLabel =
    filterId == null
      ? t("board.allTechs")
      : t("board.techOnly", { name: techById(filterId)?.name || t("board.technician") });

  const head = days
    .map((day) => {
      const count = state.appointments.filter(
        (a) => appointmentDayKey(a) === day && techIds.has(a.technician_id)
      ).length;
      const d = new Date(`${day}T12:00:00`);
      const weekday = d.toLocaleDateString(localeTag(), { weekday: "short" });
      const dateNum = d.toLocaleDateString(localeTag(), { month: "short", day: "numeric" });
      return `<button type="button" class="week-cal-day-head${day === state.day ? " is-selected" : ""}${
        day === today ? " is-today" : ""
      }" data-go-day="${day}" title="${escapeHtml(t("board.openDayView"))}">
        <span class="week-cal-dow">${escapeHtml(weekday)}</span>
        <strong class="week-cal-date">${escapeHtml(dateNum)}</strong>
        <span class="week-cal-count">${escapeHtml(jobsCountLabel(count))}</span>
      </button>`;
    })
    .join("");

  const hourLabels = Array.from({ length: DAY_HOURS + 1 }, (_, i) => {
    const hour = DAY_START + i;
    return `<div class="week-cal-hour" style="top:${i * HOUR_H}px"><span>${escapeHtml(formatHourLabel(hour))}</span></div>`;
  }).join("");

  const useTechLanes = filterId == null && visibleTechs.length > 1;
  const columns = days
    .map((day) => {
      const jobs = state.appointments
        .filter((a) => appointmentDayKey(a) === day && techIds.has(a.technician_id))
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
      const laneMap = layoutWeekDayEventLanes(jobs, visibleTechs, filterId);
      const laneGuides =
        useTechLanes && visibleTechs.length > 1
          ? `<div class="week-cal-tech-lanes" aria-hidden="true">${visibleTechs
              .map(
                (t, i) =>
                  `<span class="week-cal-tech-lane" style="left:${((i / visibleTechs.length) * 100).toFixed(
                    3
                  )}%;width:${(100 / visibleTechs.length).toFixed(3)}%;--lane-color:${escapeHtml(
                    t.color
                  )}"></span>`
              )
              .join("")}</div>`
          : "";
      const events = jobs
        .map((job) => {
          const tech = techById(job.technician_id);
          const color = tech?.color || "#0f766e";
          const startMin = minutesFromDayStart(job.starts_at);
          const endMin = minutesFromDayStart(job.ends_at);
          const top = Math.max(0, (startMin / 60) * HOUR_H);
          const height = Math.max(((endMin - startMin) / 60) * HOUR_H, 28);
          const name = tech?.name || "Barber";
          const layout = laneMap.get(job.id) || { lane: 0, laneCount: 1, widthFrac: 1 };
          return `<button type="button" class="week-cal-event" data-id="${job.id}" data-day="${day}"
            style="top:${top}px;height:${height}px;${weekEventLaneStyle(layout)};--job-color:${escapeHtml(color)}"
            title="${escapeHtml(formatTime(job.starts_at))} · ${escapeHtml(applianceLabel(job.appliance))} · ${escapeHtml(name)}">
            <strong>${escapeHtml(formatTime(job.starts_at))} · ${escapeHtml(applianceLabel(job.appliance))}</strong>
            <span>${escapeHtml(name)} · ${escapeHtml(job.customer?.name || "")}</span>
          </button>`;
        })
        .join("");
      return `<div class="week-cal-day${day === today ? " is-today" : ""}${
        day === state.day ? " is-selected" : ""
      }${useTechLanes ? " has-tech-lanes" : ""}" data-go-day="${day}" style="height:${DAY_HOURS * HOUR_H}px">
        <div class="week-cal-day-grid" aria-hidden="true">${Array.from(
          { length: DAY_HOURS },
          (_, i) => `<div class="week-cal-slot" style="top:${i * HOUR_H}px;height:${HOUR_H}px"></div>`
        ).join("")}</div>
        ${laneGuides}
        ${events}
      </div>`;
    })
    .join("");

  els.board.innerHTML = `
    <div class="week-board week-calendar">
      <div class="week-board-top">
        <div>
          <h2>${escapeHtml(t("board.weekTitle"))}</h2>
          <p>${escapeHtml(rangeLabel)} · ${escapeHtml(filterLabel)}</p>
        </div>
        ${calTechFilterChipsHtml(t("board.filterWeek"))}
      </div>
      <div class="week-cal-scroll">
        <div class="week-cal-head">
          <div class="week-cal-gutter-head" aria-hidden="true"></div>
          ${head}
        </div>
        <div class="week-cal-body">
          <div class="week-cal-gutter" style="height:${DAY_HOURS * HOUR_H}px">${hourLabels}</div>
          <div class="week-cal-days">${columns}</div>
        </div>
      </div>
    </div>`;

  wireCalTechFilterChips(els.board);

  els.board.querySelectorAll("[data-go-day]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".week-cal-event")) return;
      setScheduleMode("day", { day: el.dataset.goDay });
    });
  });
  els.board.querySelectorAll(".week-cal-event").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await openDetail(Number(btn.dataset.id));
    });
  });
}

function renderMonthBoard() {
  if (!els.board) return;
  applyBoardBarberAccessDefaults();
  const filterId = state.mapTechFilterId;
  const scoped = boardScopedTechnicians();
  const visibleTechs =
    filterId == null || !canViewAllBarbersOnBoard()
      ? scoped
      : scoped.filter((t) => t.id === filterId);
  const techIds = new Set(visibleTechs.map((t) => t.id));
  /* Month board is a single full-width calendar — not multi tech columns */
  syncTechFilterLayout(null, 1);
  if (els.board) {
    els.board.classList.add("is-single");
    els.board.style.setProperty("--board-cols", "1");
  }

  const anchor = new Date(`${state.day}T12:00:00`);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const totalDays = last.getDate();
  const today = toDateInputValue(new Date());
  const title = anchor.toLocaleDateString(localeTag(), { month: "long", year: "numeric" });
  const filterLabel =
    filterId == null
      ? t("board.allTechs")
      : t("board.techOnly", { name: techById(filterId)?.name || t("board.technician") });
  const cellOpts = { outside: false, today, selected: state.day, techIds };

  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    .map((d) => `<div class="month-dow">${escapeHtml(dayLabel(d))}</div>`)
    .join("");

  const filled = [];
  for (let i = 0; i < startPad; i += 1) {
    filled.push(
      monthDayCell(shiftDay(toDateInputValue(first), i - startPad), {
        ...cellOpts,
        outside: true,
      })
    );
  }
  for (let n = 1; n <= totalDays; n += 1) {
    filled.push(monthDayCell(toDateInputValue(new Date(year, month, n)), cellOpts));
  }
  let trail = 1;
  while (filled.length % 7 !== 0) {
    filled.push(
      monthDayCell(toDateInputValue(new Date(year, month + 1, trail)), {
        ...cellOpts,
        outside: true,
      })
    );
    trail += 1;
  }

  els.board.innerHTML = `
    <div class="month-board">
      <div class="month-board-top">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(filterLabel)} · ${escapeHtml(t("board.monthHint"))}</p>
        </div>
        ${calTechFilterChipsHtml(t("board.filterMonth"))}
      </div>
      <div class="month-grid">
        ${dow}
        ${filled.join("")}
      </div>
    </div>`;

  wireCalTechFilterChips(els.board);

  els.board.querySelectorAll(".month-day[data-go-day]").forEach((el) => {
    const goDay = () => setScheduleMode("day", { day: el.dataset.goDay });
    el.addEventListener("click", (e) => {
      if (e.target.closest(".month-day-job")) return;
      goDay();
    });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target.closest(".month-day-job")) return;
      e.preventDefault();
      goDay();
    });
  });
  els.board.querySelectorAll(".month-day-job").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await openDetail(Number(btn.dataset.id));
    });
  });
}

function monthDayCell(day, { outside, today, selected, techIds }) {
  const jobs = state.appointments
    .filter((a) => appointmentDayKey(a) === day && (!techIds || techIds.has(a.technician_id)))
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const num = Number(day.slice(8, 10));
  /* Side-by-side pairs in the cell; show more than the old single-column max of 3 */
  const maxShow = 6;
  const shown = jobs.slice(0, maxShow);
  const multi = shown.length > 1;
  const jobBtns = shown
    .map((job) => {
      const tech = techById(job.technician_id);
      const color = tech?.color || "#0f766e";
      const name = tech?.name || "Barber";
      const label = `${formatTime(job.starts_at)} · ${applianceLabel(job.appliance)}`;
      return `<button type="button" class="month-day-job${multi ? " is-paired" : ""}" data-id="${job.id}"
        style="--job-color:${escapeHtml(color)}"
        title="${escapeHtml(label)} · ${escapeHtml(name)} · ${escapeHtml(job.customer?.name || "")}">
        <strong>${escapeHtml(formatTime(job.starts_at))} · ${escapeHtml(applianceLabel(job.appliance))}</strong>
        <span>${escapeHtml(name)}</span>
      </button>`;
    })
    .join("");
  const more =
    jobs.length > maxShow
      ? `<span class="month-day-more">${escapeHtml(t("board.more", { n: jobs.length - maxShow }))}</span>`
      : "";
  return `<div class="month-day${outside ? " is-outside" : ""}${
    day === today ? " is-today" : ""
  }${day === selected ? " is-selected" : ""}${multi ? " has-multi" : ""}" data-go-day="${day}" role="button" tabindex="0" title="${escapeHtml(t("board.openDayView"))}">
    <span class="month-day-num">${num}${
      jobs.length ? `<span class="month-day-count">${jobs.length}</span>` : ""
    }</span>
    <div class="month-day-jobs${multi ? " is-multi" : ""}">${jobBtns}${more}</div>
  </div>`;
}

/** Next (or first) stop label for a tech’s day jobs — used by All overview rows. */
function nextStopSummary(jobs) {
  if (!jobs.length) return t("board.noJobsToday");
  const sorted = [...jobs].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  const today = toDateInputValue(new Date());
  let job = sorted[0];
  if (state.day === today) {
    const now = Date.now();
    const upcoming = sorted.find((j) => new Date(j.ends_at).getTime() > now);
    if (!upcoming) return t("board.nextStopDone");
    job = upcoming;
  }
  return t("board.nextStop", {
    time: formatTime(job.starts_at),
    label: applianceLabel(job.appliance),
  });
}

function renderDayOverview(techs, switcherHtml) {
  const filterId = state.mapTechFilterId;
  const hourHeightPx = hourHeight();
  const items = techs
    .map((tech) => {
      const jobs = state.appointments
        .filter((a) => a.technician_id === tech.id)
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
      const jobsPart = jobsCountLabel(jobs.length);
      const next = nextStopSummary(jobs);
      const expanded = filterId === tech.id;
      const selectHint = expanded
        ? t("map.showAll")
        : t("board.openTechTimeline", { name: tech.name });
      const panel = expanded
        ? `<div class="day-overview-panel">${techDayColumnHtml(tech, {
            filterId,
            hourHeightPx,
            embedded: true,
          })}</div>`
        : "";
      return `
        <div class="day-overview-item${expanded ? " is-expanded" : ""}" role="listitem">
          <button type="button" class="day-overview-row${expanded ? " is-expanded" : ""}" data-tech-select="${tech.id}"
            style="--tech-color:${escapeHtml(tech.color)}"
            aria-expanded="${expanded ? "true" : "false"}"
            title="${escapeHtml(selectHint)}"
            aria-label="${escapeHtml(selectHint)}">
            <span class="day-overview-swatch" aria-hidden="true"></span>
            <span class="day-overview-main">
              <strong class="day-overview-name">${escapeHtml(tech.name)}</strong>
              <span class="day-overview-count">${escapeHtml(jobsPart)}</span>
            </span>
            <span class="day-overview-next">${escapeHtml(next)}</span>
            <span class="day-overview-chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </button>
          ${panel}
        </div>`;
    })
    .join("");

  els.board.innerHTML = `${switcherHtml}
    <div class="day-overview" role="list" aria-label="${escapeHtml(t("board.overviewAria"))}">
      ${items}
    </div>`;

  wireDayTechSwitcher(els.board);
  wireDayBoardInteractions(els.board, { focusOnSelect: false });
  if (filterId != null) {
    const expanded = els.board.querySelector(".day-overview-item.is-expanded");
    expanded?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const scroller = expanded?.querySelector(".timeline-scroll");
    if (scroller) scroller.scrollTop = 0;
  }
}

function techDayColumnHtml(
  tech,
  {
    filterId = null,
    hourHeightPx = hourHeight(),
    showFocusPager = false,
    embedded = false,
  } = {}
) {
  const jobs = state.appointments.filter((a) => a.technician_id === tech.id);
  const hours = Array.from({ length: DAY_HOURS + 1 }, (_, i) => {
    const hour = DAY_START + i;
    return `<div class="hour" style="top:${i * hourHeightPx}px"><span>${escapeHtml(formatHourLabel(hour))}</span></div>`;
  }).join("");

  const blocks = jobs
    .map((job) => {
      const startMin = minutesFromDayStart(job.starts_at);
      const endMin = minutesFromDayStart(job.ends_at);
      const travel = Number(job.travel_buffer_minutes) || 0;
      const travelTop = ((startMin - travel) / 60) * hourHeightPx;
      const travelHeight = (travel / 60) * hourHeightPx;
      const top = (startMin / 60) * hourHeightPx;
      const height = Math.max(((endMin - startMin) / 60) * hourHeightPx, 34);
      return `
            <div class="travel" style="top:${Math.max(travelTop, 0)}px;height:${travelHeight}px">${escapeHtml(t("techDay.travelBand", { n: travel }))}</div>
            <button type="button" class="job" data-id="${job.id}" style="top:${top}px;height:${height}px;background:${tech.color}">
              <strong>${escapeHtml(applianceLabel(job.appliance))} · ${formatTime(job.starts_at)}</strong>
              <span>${escapeHtml(jobTypeLabel(job.job_type))} · ${escapeHtml(job.customer.name)}</span>
              <span>${escapeHtml(job.customer.address)}</span>
            </button>`;
    })
    .join("");

  const timeline = `
          <div class="timeline-scroll" tabindex="-1" aria-label="${escapeHtml(t("board.dayTimelineAria", { name: tech.name }))}">
            <div class="timeline" data-tech-id="${tech.id}" title="${escapeHtml(t("board.clickEmptyToBook"))}">
              <div class="slot-guide" hidden aria-hidden="true"></div>
              ${hours}${blocks}
            </div>
          </div>`;

  /* Stacked accordion panel: timeline only (row already shows the name). */
  if (embedded) {
    return `
        <section class="tech is-embedded" data-tech-id="${tech.id}" style="--tech-color:${escapeHtml(tech.color)}">
          ${timeline}
        </section>`;
  }

  const jobsPart = jobsCountLabel(jobs.length);
  const meta = tech.start_location
    ? t("board.dayMetaShop", { jobs: jobsPart, shop: tech.start_location })
    : jobsPart;
  const focused = filterId != null && tech.id === filterId;
  const selectHint =
    filterId === tech.id
      ? t("map.showAll")
      : t("board.showTechOnlyMap", { name: tech.name });
  const nameHeading = showFocusPager
    ? `<button
            type="button"
            class="focus-tech-name"
            data-focus-tech-picker
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="focus-tech-menu"
            aria-label="${escapeHtml(t("board.chooseTechnician"))}"
          >
            <span class="focus-tech-name-text">${escapeHtml(tech.name)}</span>
            <svg class="focus-tech-name-chevron" width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>`
    : `<h2 style="color:${tech.color}">${escapeHtml(tech.name)}</h2>`;
  const titleBlock = showFocusPager
    ? `<div class="tech-focus-pager" role="group" aria-label="${escapeHtml(t("board.filterByTech"))}">
            <button type="button" class="day-tech-nav icon" data-focus-tech-step="-1" aria-label="${escapeHtml(
              t("board.prevTech")
            )}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            ${nameHeading}
            <button type="button" class="day-tech-nav icon" data-focus-tech-step="1" aria-label="${escapeHtml(
              t("board.nextTech")
            )}">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>`
    : nameHeading;
  const techTopAttrs = showFocusPager
    ? `class="tech-top tech-top--focus"`
    : `class="tech-top" role="button" tabindex="0" data-tech-select="${tech.id}" aria-pressed="${
        focused ? "true" : "false"
      }" title="${escapeHtml(selectHint)}"`;
  return `
        <section class="tech is-selectable${focused ? " is-focused" : ""}" data-tech-id="${tech.id}" style="--tech-color:${escapeHtml(tech.color)}">
          <div ${techTopAttrs}>
            ${titleBlock}
            <span title="${escapeHtml(meta)}">${escapeHtml(meta)}</span>
          </div>
          ${timeline}
        </section>`;
}

function wireDayBoardInteractions(root, { focusOnSelect = false } = {}) {
  root?.querySelectorAll(".job").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openDetail(Number(btn.dataset.id));
    });
  });

  root?.querySelectorAll("[data-focus-tech-step]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeFocusTechMenu();
      stepFocusDayTech(Number(btn.dataset.focusTechStep) || 0);
    });
  });

  root?.querySelectorAll("[data-focus-tech-picker]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleFocusTechMenu(btn);
    });
  });

  root?.querySelectorAll("[data-tech-select]").forEach((el) => {
    const select = () => {
      const id = Number(el.dataset.techSelect);
      if (focusOnSelect) focusDayTech(id);
      else setTechFilter(id);
    };
    el.addEventListener("click", select);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select();
      }
    });
  });

  root?.querySelectorAll(".timeline").forEach((timeline) => {
    const guide = timeline.querySelector(".slot-guide");
    const techId = Number(timeline.dataset.techId);

    const updateGuide = (clientY) => {
      if (!guide) return;
      const mins = snapMinutesFromDayStart(timelineMinutesFromEvent(timeline, clientY));
      guide.style.top = `${(mins / 60) * hourHeight()}px`;
      guide.hidden = false;
    };

    timeline.addEventListener("mousemove", (e) => {
      if (e.target.closest(".job, .travel")) {
        if (guide) guide.hidden = true;
        return;
      }
      updateGuide(e.clientY);
    });
    timeline.addEventListener("mouseleave", () => {
      if (guide) guide.hidden = true;
    });
    timeline.addEventListener("click", (e) => {
      if (e.target.closest(".job, .travel")) return;
      const mins = snapMinutesFromDayStart(timelineMinutesFromEvent(timeline, e.clientY));
      const startsAt = localIsoFromDayMinutes(state.day, mins);
      openDrawer({ technicianId: techId, day: state.day, startsAt });
    });
  });
}

function renderBoard() {
  closeFocusTechMenu();
  ensurePhoneDaySoloSelection();
  applyBoardBarberAccessDefaults();
  const view = effectiveDayBoardView();
  let filterId = state.mapTechFilterId;
  const allTechs = boardScopedTechnicians();
  const canBrowse = canViewAllBarbersOnBoard();

  /* Focus with All: pick first/linked tech so map chips and board stay aligned. */
  if (view === "focus" && filterId == null && allTechs.length) {
    filterId = preferredPhoneSoloTechId(state.technicians);
    state.mapTechFilterId = filterId;
    state.phoneDayShowAll = false;
  }

  let visibleTechs = allTechs;
  let columnsPage = 0;
  let columnsPages = 1;

  if (view === "focus") {
    visibleTechs =
      filterId == null ? allTechs : allTechs.filter((t) => t.id === filterId);
    if (!visibleTechs.length && allTechs.length) visibleTechs = allTechs.slice(0, 1);
  } else if (view === "columns" && allTechs.length > 1) {
    /* Keep multi-column board; selection only highlights (+ map filter). */
    columnsPages = dayBoardColumnsPageCount(allTechs.length);
    state.dayBoardColumnsPage = Math.max(
      0,
      Math.min(columnsPages - 1, state.dayBoardColumnsPage || 0)
    );
    columnsPage = state.dayBoardColumnsPage;
    const start = columnsPage * DAY_BOARD_COLS_PER_PAGE;
    visibleTechs = allTechs.slice(start, start + DAY_BOARD_COLS_PER_PAGE);
  }

  syncTechFilterLayout(filterId, visibleTechs.length, view);
  syncDayBoardToolbar(view, { columnsPage, columnsPages });

  if (!els.board) return;
  if (!allTechs.length) {
    els.board.innerHTML = `<p class="status">${escapeHtml(t("board.noActiveTechs"))}</p>`;
    return;
  }

  /* Focus has ‹ › in the tech header; skip the phone switcher bar to avoid duplicate chrome. */
  const switcher = view === "focus" ? "" : dayTechSwitcherHtml();
  const showFocusPager = view === "focus" && canBrowse && state.technicians.length >= 2;

  /* Stacked + multiple techs → accordion overview (expand in place, stay on Stacked). */
  if (view === "stacked" && allTechs.length > 1) {
    renderDayOverview(allTechs, switcher);
    return;
  }

  const hourHeightPx = hourHeight();
  els.board.innerHTML =
    switcher +
    visibleTechs
      .map((tech) => techDayColumnHtml(tech, { filterId, hourHeightPx, showFocusPager }))
      .join("");

  wireDayTechSwitcher(els.board);
  wireDayBoardInteractions(els.board, { focusOnSelect: false });
}

const STAFF_BOOK_STEPS = ["service", "barber", "time", "customer"];
const STAFF_BOOK_TITLES = {
  service: "Select Service",
  barber: "Select Barber",
  time: "Select A Date And Time",
  customer: "Customer Details",
};
const STAFF_BOOK_MAX_QTY = 10;

function staffBookSelectedLines() {
  const catalog = state.staffBook.services || [];
  return catalog
    .map((svc) => ({ svc, qty: Number(state.staffBook.qtyById[svc.id]) || 0 }))
    .filter((line) => line.qty > 0);
}

function staffBookDurationMinutes() {
  return staffBookSelectedLines().reduce(
    (n, { svc, qty }) => n + Number(svc.duration_minutes || 0) * qty,
    0
  );
}

function staffBookServiceLabels() {
  return staffBookSelectedLines().map(({ svc, qty }) =>
    qty > 1 ? `${svc.name} ×${qty}` : svc.name
  );
}

function syncStaffBookHiddenFields() {
  const form = els.form;
  if (!form) return;
  const lines = staffBookSelectedLines();
  const labels = staffBookServiceLabels();
  const duration = Math.max(15, staffBookDurationMinutes() || 30);
  const first = String(form.customer_first_name?.value || "").trim();
  const last = String(form.customer_last_name?.value || "").trim();
  if (form.customer_name) {
    form.customer_name.value = [first, last].filter(Boolean).join(" ").trim();
  }
  if (form.job_type) form.job_type.value = "Service";
  if (form.travel_miles) form.travel_miles.value = "0";
  if (form.duration_minutes) form.duration_minutes.value = String(duration);
  if (form.appliance) {
    form.appliance.value = (labels.join(", ") || "").slice(0, 80);
  }
  if (form.issue) {
    const primary = lines[0]?.svc;
    const bits = [];
    if (primary) bits.push(primary.description || primary.name);
    if (labels.length > 1) bits.push("Add-ons: " + labels.slice(1).join(", "));
    form.issue.value = (bits.join(" · ") || "Barbershop service").slice(0, 2000);
  }
  if (form.customer_address && !String(form.customer_address.value || "").trim()) {
    form.customer_address.value =
      document.getElementById("staff-customer-address")?.defaultValue || "";
  }
}

function renderStaffBookSummary() {
  const el = document.getElementById("staff-book-summary");
  if (!el) return;
  const labels = staffBookServiceLabels();
  const mins = staffBookDurationMinutes();
  if (!labels.length) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  const techName =
    els.techSelect?.selectedOptions?.[0]?.textContent?.trim() || "Any Barber";
  const day = bookingDayValue();
  const slot = state.selectedSlot;
  const parts = [
    labels.join(", "),
    mins ? `${mins} min` : "",
    techName,
    day ? formatDayHeader(day) : "",
    slot ? formatTime(slot.starts_at) : "",
  ].filter(Boolean);
  el.textContent = parts.join(" · ");
  el.hidden = false;
}

function renderStaffServiceList() {
  const list = document.getElementById("staff-service-list");
  if (!list) return;
  const services = state.staffBook.services || [];
  if (!services.length) {
    list.innerHTML = `<p class="status">Loading services…</p>`;
    return;
  }
  list.innerHTML = "";
  services.forEach((svc) => {
    const qty = Number(state.staffBook.qtyById[svc.id]) || 0;
    const price = ((Number(svc.price_cents) || 0) / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const row = document.createElement("div");
    row.className = "staff-service-row" + (qty > 0 ? " has-qty" : "");
    row.innerHTML = `
      <div class="staff-service-copy">
        <strong>${escapeHtml(svc.name)}</strong>
        <span>${escapeHtml(svc.description || "")}</span>
        <span class="staff-service-meta">${escapeHtml(price)} · ${escapeHtml(
          String(svc.duration_minutes)
        )} min</span>
      </div>
      <div class="staff-qty" role="group" aria-label="Quantity for ${escapeHtml(svc.name)}">
        <button type="button" class="staff-qty-btn" data-act="dec" aria-label="Decrease">−</button>
        <span class="staff-qty-val">${qty}</span>
        <button type="button" class="staff-qty-btn" data-act="inc" aria-label="Increase">+</button>
      </div>`;
    row.querySelectorAll(".staff-qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        const next = act === "inc" ? qty + 1 : qty - 1;
        const clamped = Math.max(0, Math.min(STAFF_BOOK_MAX_QTY, next));
        state.staffBook.qtyById = { ...state.staffBook.qtyById, [svc.id]: clamped };
        if (clamped === 0) {
          const copy = { ...state.staffBook.qtyById };
          delete copy[svc.id];
          state.staffBook.qtyById = copy;
        }
        syncStaffBookHiddenFields();
        renderStaffServiceList();
        renderStaffBookSummary();
        clearBookingSlot();
      });
    });
    list.appendChild(row);
  });
}

async function ensureStaffServices() {
  if (state.staffBook.services?.length) {
    renderStaffServiceList();
    return;
  }
  const list = document.getElementById("staff-service-list");
  if (list) list.innerHTML = `<p class="status">Loading services…</p>`;
  try {
    const rows = await api("/api/services");
    state.staffBook.services = Array.isArray(rows) ? rows : [];
    renderStaffServiceList();
  } catch (err) {
    if (list) {
      list.innerHTML = `<p class="error">${escapeHtml(err.message || "Could not load services")}</p>`;
    }
  }
}

function setStaffBookStep(step, { loadTime } = {}) {
  const next = STAFF_BOOK_STEPS.includes(step) ? step : "service";
  state.staffBook.step = next;
  document.querySelectorAll("[data-staff-panel]").forEach((panel) => {
    panel.hidden = panel.getAttribute("data-staff-panel") !== next;
  });
  document.querySelectorAll("[data-staff-step]").forEach((btn) => {
    const key = btn.getAttribute("data-staff-step");
    const idx = STAFF_BOOK_STEPS.indexOf(key);
    const cur = STAFF_BOOK_STEPS.indexOf(next);
    btn.classList.toggle("is-active", key === next);
    btn.classList.toggle("is-done", idx >= 0 && idx < cur);
  });
  const eyebrow = document.getElementById("drawer-step-eyebrow");
  const title = document.getElementById("drawer-step-title");
  if (eyebrow) eyebrow.textContent = "New Booking";
  if (title) title.textContent = STAFF_BOOK_TITLES[next] || "New Booking";
  const back = document.getElementById("staff-book-back");
  const nextBtn = document.getElementById("staff-book-next");
  const submitBtn = document.getElementById("staff-book-submit");
  const stepIndex = STAFF_BOOK_STEPS.indexOf(next);
  if (back) back.hidden = stepIndex <= 0;
  // Customer step: same CTA becomes "Book" and submits — no separate Book Appointment.
  if (nextBtn) {
    nextBtn.hidden = false;
    nextBtn.textContent = next === "customer" ? "Book" : "Next";
  }
  if (submitBtn) {
    submitBtn.hidden = true;
    submitBtn.setAttribute("aria-hidden", "true");
  }
  if (next === "barber") fillBookingTechSelect({ preferredId: els.techSelect?.value || "" });
  renderStaffBookSummary();
  if (els.formError) els.formError.hidden = true;
  if (next === "time" || loadTime) {
    syncStaffBookHiddenFields();
    void loadSlots();
  }
}

function validateStaffBookStep(step) {
  if (step === "service") {
    if (!staffBookSelectedLines().length) return "Select at least one service.";
    return null;
  }
  if (step === "barber") return null;
  if (step === "time") {
    if (!bookingDayValue()) return "Choose a date.";
    if (!els.startsAt?.value) return "Select a time slot.";
    const techId = els.techSelect?.value || state.selectedSlot?.technician_id;
    if (!techId) return "Select a barber or pick a slot (Any Barber assigns from the slot).";
    return null;
  }
  if (step === "customer") {
    const phone = String(els.form.customer_phone?.value || "").trim();
    const first = String(els.form.customer_first_name?.value || "").trim();
    const last = String(els.form.customer_last_name?.value || "").trim();
    if (!phone) return "Phone is required.";
    if (phone.replace(/\D/g, "").length < 7) return "Enter a valid phone number.";
    if (!first) return "First name is required.";
    if (!last) return "Last name is required.";
    return null;
  }
  return null;
}

function staffBookNext() {
  const cur = state.staffBook.step || "service";
  if (cur === "customer") {
    syncStaffBookHiddenFields();
    if (typeof els.form.requestSubmit === "function") els.form.requestSubmit();
    else els.form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    return;
  }
  const err = validateStaffBookStep(cur);
  if (err) {
    els.formError.hidden = false;
    els.formError.textContent = err;
    return;
  }
  syncStaffBookHiddenFields();
  const idx = STAFF_BOOK_STEPS.indexOf(cur);
  const next = STAFF_BOOK_STEPS[Math.min(STAFF_BOOK_STEPS.length - 1, idx + 1)];
  setStaffBookStep(next);
}

function staffBookBack() {
  const cur = state.staffBook.step || "service";
  const idx = STAFF_BOOK_STEPS.indexOf(cur);
  const prev = STAFF_BOOK_STEPS[Math.max(0, idx - 1)];
  setStaffBookStep(prev);
}

function splitCustomerName(full) {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function capitalizePersonName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function openDrawer(opts = {}) {
  els.form.reset();
  clearScheduleFieldDirt(els.form);
  state.staffBook.qtyById = {};
  state.staffBook.step = "service";
  if (els.form.job_type) els.form.job_type.value = "Service";
  if (els.form.appliance) els.form.appliance.value = "";
  if (els.form.issue) els.form.issue.value = "Barbershop service";
  if (els.form.duration_minutes) els.form.duration_minutes.value = "30";
  const travelInput = travelMilesInput(els.form);
  if (travelInput) {
    travelInput.value = "0";
    setFieldDirty(els.form, "travelDirty", true);
  }
  const addr = document.getElementById("staff-customer-address");
  if (els.form.customer_address && addr) {
    els.form.customer_address.value = addr.defaultValue || addr.value || "";
  }
  const linked = staffBookLinkedBarber();
  const techId = linked
    ? String(linked.id)
    : opts.technicianId != null && opts.technicianId !== ""
      ? String(opts.technicianId)
      : "";
  fillBookingTechSelect({ preferredId: techId });
  els.bookingDay.value = opts.day || state.day;
  syncDrawerDayLabel();
  if (opts.startsAt) {
    const duration = effectiveDurationMinutes(els.form);
    const day = opts.day || state.day;
    const startMins = minutesFromDayStart(opts.startsAt);
    const endLocal = localIsoFromDayMinutes(day, startMins + duration);
    els.startsAt.value = opts.startsAt;
    state.selectedSlot = {
      starts_at: opts.startsAt,
      ends_at: endLocal,
      available: true,
      technician_id: techId ? Number(techId) : undefined,
    };
    els.selectedSlot.textContent = t("booking.selected", {
      start: formatTime(opts.startsAt),
      end: formatTime(endLocal),
    });
  } else {
    els.startsAt.value = "";
    state.selectedSlot = null;
    els.selectedSlot.textContent = t("booking.noSlot");
  }
  els.formError.hidden = true;
  els.customerHit.hidden = true;
  state.slotsAvailableOnly = true;
  if (els.slotsAvailableOnly) {
    els.slotsAvailableOnly.classList.add("active");
    els.slotsAvailableOnly.setAttribute("aria-pressed", "true");
  }
  els.drawer.hidden = false;
  // Dismiss focus immediately so the booking drawer is not covered mid-animation.
  if (state.boardTouchUnlocked) {
    state.boardTouchUnlocked = false;
    hideBoardFocusSheet(true, () => {
      unmountBoardFromFocus();
      syncBoardTouchLock();
    });
    syncBoardTouchLock();
  }
  syncTouchLockSuppression();
  if (PHONE_MQ.matches && els.drawer?.querySelector) {
    const panel = els.drawer.querySelector(".drawer-panel");
    if (panel) panel.scrollTop = 0;
  }
  updateSlotsLabel(els.slotsLabel, els.techSelect, bookingDayValue());
  closeTechDayPopover();
  void (async () => {
    await ensureStaffServices();
    setStaffBookStep("service");
    await refreshTravelEstimate("booking", { force: true });
  })();
}

function closeDrawer() {
  els.drawer.hidden = true;
  closeTechDayPopover();
  syncTouchLockSuppression();
}

function invalidateMapsSoon() {
  setTimeout(() => {
    try {
      state.map?.invalidateSize({ animate: false });
    } catch (_) {
      /* map may be mid-teardown */
    }
    try {
      state.techDayMap?.invalidateSize({ animate: false });
    } catch (_) {
      /* ignore */
    }
  }, 80);
}

function syncNarrowLayout() {
  document.body.classList.toggle("is-phone", PHONE_MQ.matches);
  document.body.classList.toggle("is-tablet", TABLET_MQ.matches);
  document.body.classList.toggle("is-narrow", PHONE_MQ.matches || TABLET_MQ.matches);
  // Phone Day: enforce one-tech default; desktop keeps the current filter as-is.
  if (isDayScheduleMode() && state.page === "scheduling") {
    ensurePhoneDaySoloSelection();
    renderSchedule();
    if (state.prefs.showMap !== false) renderRouteMap();
  }
  syncJobsHubChrome();
  syncTouchLocks();
  invalidateMapsSoon();
}

function wireMq(mq, handler) {
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", handler);
  else if (typeof mq.addListener === "function") mq.addListener(handler);
}

function wireNarrowLayout() {
  syncNarrowLayout();
  wireMq(PHONE_MQ, syncNarrowLayout);
  wireMq(TABLET_MQ, syncNarrowLayout);
  wireMq(NARROW_MQ, syncNarrowLayout);
  window.addEventListener("orientationchange", () => {
    setTimeout(syncNarrowLayout, 150);
  });
}

async function loadSlots(opts = {}) {
  const day = bookingDayValue();
  updateSlotsLabel(els.slotsLabel, els.techSelect, day);
  if (els.slotsSummary) {
    els.slotsSummary.hidden = true;
    els.slotsSummary.textContent = "";
  }
  if (!day) {
    els.slots.innerHTML = `<p class="status">${escapeHtml(t("booking.selectTechDayView"))}</p>`;
    if (!opts.skipTechDayRefresh) await refreshTechDayPopoverIfOpen("booking");
    return;
  }
  const params = new URLSearchParams({
    day,
    duration_minutes: String(effectiveDurationMinutes(els.form)),
    travel_buffer_minutes: String(effectiveTravelMinutes(els.form)),
  });
  const techId = els.techSelect?.value || "";
  if (techId) params.set("technician_id", techId);

  els.slots.innerHTML = `<p class="status">${escapeHtml(t("booking.loadingSlots"))}</p>`;
  try {
    const slots = await api(`/api/slots?${params}`);
    const preferred = els.startsAt.value;
    const preferredTech =
      state.selectedSlot?.technician_id ?? (techId ? Number(techId) : null);
    const openCount = renderSlotButtons(els.slots, slots, preferred, (slot) => {
      setBookingSlot(slot);
    }, {
      availableOnly: state.slotsAvailableOnly,
      summaryEl: els.slotsSummary,
      preferredTechId: preferredTech,
      square: true,
    });
    updateSlotsLabel(els.slotsLabel, els.techSelect, day, openCount);
    // Keep or drop a prior selection after tech/duration/travel/date change.
    if (preferred) {
      const match = slots.find(
        (s) =>
          sameInstant(preferred, s.starts_at) &&
          (preferredTech == null || Number(s.technician_id) === Number(preferredTech))
      );
      if (!match || match.available === false) clearBookingSlot();
      else setBookingSlot(match);
    }
    if (!opts.skipTechDayRefresh) await refreshTechDayPopoverIfOpen("booking");
  } catch (err) {
    els.slots.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function setEditSlot(slot) {
  state.editSelectedSlot = slot;
  els.editStartsAt.value = slot.starts_at;
  els.editSelectedSlot.textContent = t("booking.selected", {
    start: formatTime(slot.starts_at),
    end: formatTime(slot.ends_at),
  });
  highlightSlotButtons(els.editSlots, slot.starts_at);
  highlightTechDaySlot(slot.starts_at, slot.technician_id ?? els.editTechSelect?.value);
  refreshTravelEstimate("edit");
}

async function loadEditSlots(opts = {}) {
  const day = editDayValue();
  updateSlotsLabel(els.editSlotsLabel, els.editTechSelect, day);
  if (els.editSlotsSummary) {
    els.editSlotsSummary.hidden = true;
    els.editSlotsSummary.textContent = "";
  }
  if (!els.editTechSelect?.value) {
    els.editSlots.innerHTML = `<p class="status">${escapeHtml(t("booking.selectTechSlots"))}</p>`;
    if (!opts.skipTechDayRefresh) await refreshTechDayPopoverIfOpen("edit");
    return;
  }
  const params = new URLSearchParams({
    day,
    duration_minutes: String(effectiveDurationMinutes(els.editForm)),
    travel_buffer_minutes: String(effectiveTravelMinutes(els.editForm)),
    technician_id: els.editTechSelect.value,
  });
  if (state.activeAppointmentId) {
    params.set("ignore_appointment_id", String(state.activeAppointmentId));
  }

  const preferred = els.editStartsAt.value;
  els.editSlots.innerHTML = `<p class="status">${escapeHtml(t("booking.loadingSlots"))}</p>`;
  try {
    const slots = await api(`/api/slots?${params}`);
    const openCount = renderSlotButtons(els.editSlots, slots, preferred, (slot) => {
      setEditSlot(slot);
    }, {
      availableOnly: state.editSlotsAvailableOnly,
      summaryEl: els.editSlotsSummary,
    });
    updateSlotsLabel(els.editSlotsLabel, els.editTechSelect, day, openCount);

    if (preferred) {
      const match = slots.find((s) => sameInstant(preferred, s.starts_at));
      if (match && match.available !== false) {
        setEditSlot(match);
      } else if (!match || match.available === false) {
        clearEditSlot();
      }
    }
    if (!opts.skipTechDayRefresh) await refreshTechDayPopoverIfOpen("edit");
  } catch (err) {
    els.editSlots.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

async function lookupCustomer(phone) {
  if (phone.replace(/\D/g, "").length < 7) {
    els.customerHit.hidden = true;
    return;
  }
  try {
    const matches = await api(`/api/customers?q=${encodeURIComponent(phone)}`);
    if (!matches.length) {
      els.customerHit.hidden = true;
      return;
    }
    const c = matches[0];
    els.customerHit.hidden = false;
    els.customerHit.textContent = `Known customer: ${c.name}. Tap to fill.`;
    els.customerHit.onclick = () => {
      const { first, last } = splitCustomerName(c.name);
      if (els.form.customer_first_name) els.form.customer_first_name.value = first;
      if (els.form.customer_last_name) els.form.customer_last_name.value = last;
      if (els.form.customer_name) els.form.customer_name.value = c.name;
      els.form.customer_phone.value =
        typeof formatUsPhone === "function" ? formatUsPhone(c.phone) : c.phone;
      els.form.customer_email.value = c.email || "";
      // Keep shop address for in-shop bookings (do not pull home address).
      const shopAddr = document.getElementById("staff-customer-address");
      if (els.form.customer_address && shopAddr) {
        els.form.customer_address.value = shopAddr.defaultValue || shopAddr.value || "";
      }
      syncStaffBookHiddenFields();
    };
  } catch (_) {
    els.customerHit.hidden = true;
  }
}

function addressReadyForSuggest(address) {
  const text = String(address || "").trim();
  if (!text) return false;
  if (inferCityKey(text)) return true;
  return text.length >= 10;
}

function hideTechSuggest(mode) {
  if (mode === "edit") {
    state.lastEditTechSuggest = null;
    if (els.editTechSuggest) els.editTechSuggest.hidden = true;
    return;
  }
  state.lastTechSuggest = null;
  if (els.techSuggest) els.techSuggest.hidden = true;
}

function showTechSuggest(mode, suggestion) {
  if (!suggestion) {
    hideTechSuggest(mode);
    return;
  }
  if (mode === "edit") {
    state.lastEditTechSuggest = suggestion;
    if (!els.editTechSuggest) return;
    els.editTechSuggestTitle.textContent = t("booking.suggested", { name: suggestion.name });
    els.editTechSuggestReason.textContent = suggestion.reason
      ? `(${suggestion.reason})`
      : "";
    els.editTechSuggest.hidden = false;
    return;
  }
  state.lastTechSuggest = suggestion;
  if (!els.techSuggest) return;
  els.techSuggestTitle.textContent = t("booking.suggested", { name: suggestion.name });
  els.techSuggestReason.textContent = suggestion.reason
    ? `(${suggestion.reason})`
    : "";
  els.techSuggest.hidden = false;
}

function scheduleTechSuggest(mode) {
  const isEdit = mode === "edit";
  const timerKey = isEdit ? "editTechSuggestTimer" : "techSuggestTimer";
  clearTimeout(state[timerKey]);
  state[timerKey] = setTimeout(() => refreshTechSuggest(mode), 280);
}

async function refreshTechSuggest(mode) {
  const isEdit = mode === "edit";
  const form = isEdit ? els.editForm : els.form;
  const day = isEdit ? editDayValue() : bookingDayValue();
  const address = form?.customer_address?.value?.trim() || "";
  if (!addressReadyForSuggest(address) || !day) {
    hideTechSuggest(mode);
    return;
  }
  try {
    const params = new URLSearchParams({ day, address });
    const suggestion = await api(`/api/suggest-tech?${params}`);
    showTechSuggest(mode, suggestion);
  } catch (_) {
    hideTechSuggest(mode);
  }
}

async function applyTechSuggestion(mode) {
  const suggestion = mode === "edit" ? state.lastEditTechSuggest : state.lastTechSuggest;
  if (!suggestion?.technician_id) return;
  const techSelect = mode === "edit" ? els.editTechSelect : els.techSelect;
  if (!techSelect) return;
  const id = String(suggestion.technician_id);
  if (!state.technicians.some((t) => String(t.id) === id)) return;
  techSelect.value = id;
  clearBookingOrEditSlot(mode);
  await refreshTravelEstimate(mode);
  if (mode === "edit") {
    await loadEditSlots();
    await refreshTechDayPopoverIfOpen("edit");
  } else {
    await loadSlots();
    await refreshTechDayPopoverIfOpen("booking");
  }
}

function clearBookingOrEditSlot(mode) {
  if (mode === "edit") clearEditSlot();
  else clearBookingSlot();
}

function validateRequiredBookingFields(form, techSelect, startsAtEl) {
  // Staff New Booking: service → barber → time → customer (no repair fields).
  if (form?.id === "booking-form") {
    for (const step of STAFF_BOOK_STEPS) {
      const err = validateStaffBookStep(step);
      if (err) return err;
    }
    syncStaffBookHiddenFields();
    const techId =
      techSelect?.value ||
      (state.selectedSlot?.technician_id != null
        ? String(state.selectedSlot.technician_id)
        : "");
    if (!techId) return "Select a barber or time slot.";
    if (!startsAtEl?.value) return t("booking.reqSlot");
    return null;
  }
  const phone = form.customer_phone.value.trim();
  const name = form.customer_name.value.trim();
  const address = form.customer_address.value.trim();
  const appliance = form.appliance.value.trim();
  const jobType = form.job_type.value.trim();
  const issue = form.issue.value.trim();
  const techId = techSelect?.value || "";
  const startsAt = startsAtEl?.value || "";

  if (!phone) return t("booking.reqPhone");
  if (phone.replace(/\D/g, "").length < 7) return t("booking.reqPhoneValid");
  if (!name) return t("booking.reqName");
  if (!address) return t("booking.reqAddress");
  if (!appliance) return t("booking.reqAppliance");
  if (!jobType) return t("booking.reqJobType");
  if (!issue) return t("booking.reqIssue");
  if (!techId) return t("booking.reqTech");
  if (!startsAt) return t("booking.reqSlot");
  return null;
}

function showDetailView() {
  restoreInvoiceWorkspace();
  els.detailDialog.dataset.mode = "view";
  els.detailEyebrow.textContent = t("detail.appointment");
  els.detailView.hidden = false;
  els.editForm.hidden = true;
  els.editError.hidden = true;
  if (els.detailInvoice) els.detailInvoice.hidden = true;
}

async function resolveAppointment(id) {
  let job = findAppointment(id);
  if (!job) {
    try {
      job = await api(`/api/appointments/${id}`);
    } catch (_) {
      return null;
    }
  }
  return job;
}

async function openDetail(id) {
  const job = await resolveAppointment(id);
  if (!job) return;
  state.activeAppointmentId = job.id;
  closeTechDayPopover();
  showDetailView();
  els.detailTitle.textContent = `${applianceLabel(job.appliance)} · ${formatTime(job.starts_at)}`;
  syncDetailDayLabel(job.starts_at);
  els.detailBody.innerHTML = `
    <p><strong>${escapeHtml(job.customer.name)}</strong> · ${escapeHtml(job.customer.phone)}</p>
    ${job.customer.email ? `<p>${escapeHtml(job.customer.email)}</p>` : ""}
    <p>${escapeHtml(job.customer.address)}</p>
    <p>${escapeHtml(job.technician.name)} · ${formatDayLong(job.starts_at)} · ${formatTime(job.starts_at)}–${formatTime(job.ends_at)}</p>
    <div class="detail-meta">
      <span class="detail-pill">${escapeHtml(jobTypeLabel(job.job_type))}</span>
      <span class="detail-pill">${escapeHtml(statusLabel(job.status))}</span>
      <span class="detail-pill">${job.duration_minutes} min</span>
      <span class="detail-pill">${escapeHtml(t("detail.travel", { n: job.travel_buffer_minutes }))}</span>
    </div>
    <p>${escapeHtml(job.issue)}</p>
    ${job.notes ? `<p>${escapeHtml(job.notes)}</p>` : ""}
  `;
  syncShowOnMapButton(job);
  els.detailDialog.showModal();
  syncTouchLockSuppression();
}

function enterEditMode() {
  const job = findAppointment(state.activeAppointmentId);
  if (!job) return;

  els.detailDialog.dataset.mode = "edit";
  els.detailEyebrow.textContent = t("detail.edit");
  els.detailTitle.textContent = `${applianceLabel(job.appliance)} · ${formatTime(job.starts_at)}`;
  syncDetailDayLabel(job.starts_at);
  els.detailView.hidden = true;
  els.editForm.hidden = false;
  els.editError.hidden = true;

  els.editForm.customer_name.value = job.customer.name;
  els.editForm.customer_phone.value =
    typeof formatUsPhone === "function" ? formatUsPhone(job.customer.phone) : job.customer.phone;
  els.editForm.customer_email.value = job.customer.email || "";
  els.editForm.customer_address.value = job.customer.address;
  els.editForm.customer_notes.value = job.customer.notes || "";

  const applianceSelect = els.editForm.appliance;
  if (![...applianceSelect.options].some((o) => o.value === job.appliance)) {
    const opt = document.createElement("option");
    opt.value = job.appliance;
    opt.textContent = applianceLabel(job.appliance);
    applianceSelect.appendChild(opt);
  }
  applianceSelect.value = job.appliance;
  const jobTypeSelect = els.editForm.job_type;
  const jobType = job.job_type || "Repair";
  if (jobTypeSelect && ![...jobTypeSelect.options].some((o) => o.value === jobType)) {
    const opt = document.createElement("option");
    opt.value = jobType;
    opt.textContent = JOB_TYPE_DEFAULT_DURATION[jobType]
      ? jobTypeOptionLabel(jobType)
      : jobTypeLabel(jobType);
    jobTypeSelect.appendChild(opt);
  }
  if (jobTypeSelect) jobTypeSelect.value = jobType;
  els.editForm.issue.value = job.issue;
  els.editForm.notes.value = job.notes || "";
  els.editForm.status.value = job.status;
  clearScheduleFieldDirt(els.editForm);
  els.editForm.duration_minutes.value = job.duration_minutes;
  const editTravel = travelMilesInput(els.editForm);
  if (editTravel) {
    // Stored buffer is minutes; Travel input shows miles.
    editTravel.value = travelMinutesToMiles(job.travel_buffer_minutes);
  }
  // Preserve saved duration/travel until the user clears the field or changes inputs that re-estimate.
  setFieldDirty(els.editForm, "durationDirty", true);
  setFieldDirty(els.editForm, "travelDirty", true);
  els.editTechSelect.value = String(job.technician_id);
  els.editDay.value = toDateInputValue(new Date(job.starts_at));
  els.editStartsAt.value = job.starts_at;
  setEditSlot({ starts_at: job.starts_at, ends_at: job.ends_at });
  state.editSlotsAvailableOnly = true;
  if (els.editSlotsAvailableOnly) {
    els.editSlotsAvailableOnly.classList.add("active");
    els.editSlotsAvailableOnly.setAttribute("aria-pressed", "true");
  }
  updateSlotsLabel(els.editSlotsLabel, els.editTechSelect, editDayValue());
  loadEditSlots();
  scheduleTechSuggest("edit");
  // Keep edit as a centered modal — Day View is opt-in via the button.
  closeTechDayPopover();
  if (!els.detailDialog.open) els.detailDialog.showModal();
  syncTouchLockSuppression();
}

async function goToDay(day) {
  state.day = day;
  els.dayPicker.value = state.day;
  state.mapTechFilterId = null;
  await loadAppointments();
}

els.dayPicker.value = state.day;
syncScheduleModeChips();
syncRouteMapVisibility();
els.dayPicker.addEventListener("change", async () => {
  await goToDay(els.dayPicker.value);
});
els.prevDay.addEventListener("click", async () => {
  if (state.scheduleMode === "week") {
    await goToDay(shiftDay(weekMonday(state.day), -7));
    return;
  }
  if (state.scheduleMode === "month") {
    await goToDay(shiftMonth(state.day, -1));
    return;
  }
  await goToDay(shiftDay(state.day, -1));
});
els.nextDay.addEventListener("click", async () => {
  if (state.scheduleMode === "week") {
    await goToDay(shiftDay(weekMonday(state.day), 7));
    return;
  }
  if (state.scheduleMode === "month") {
    await goToDay(shiftMonth(state.day, 1));
    return;
  }
  await goToDay(shiftDay(state.day, 1));
});
els.todayBtn.addEventListener("click", async () => {
  await setScheduleMode("day", { day: toDateInputValue(new Date()) });
});
els.weeklyBtn?.addEventListener("click", async () => {
  await setScheduleMode("week");
});
els.monthlyBtn?.addEventListener("click", async () => {
  await setScheduleMode("month");
});

els.mapRecenter?.addEventListener("click", () => {
  fitDayMapToVisibleStops();
});

els.techDayMapRecenter?.addEventListener("click", () => {
  fitTechDayMapToStops();
});

els.techDayMapToggle?.addEventListener("click", () => {
  setTechDayMapExpanded(!state.techDayMapExpanded);
});

els.newBookingBtn.addEventListener("click", () => openDrawer());
els.closeDrawer.addEventListener("click", closeDrawer);
els.cancelForm.addEventListener("click", closeDrawer);
els.drawerScrim.addEventListener("click", closeDrawer);

document.getElementById("staff-book-next")?.addEventListener("click", () => staffBookNext());
document.getElementById("staff-book-back")?.addEventListener("click", () => staffBookBack());
document.querySelectorAll("[data-staff-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-staff-step");
    const curIdx = STAFF_BOOK_STEPS.indexOf(state.staffBook.step || "service");
    const targetIdx = STAFF_BOOK_STEPS.indexOf(target);
    if (targetIdx < 0) return;
    // Allow going back freely; forward only through completed validation.
    if (targetIdx <= curIdx) {
      setStaffBookStep(target);
      return;
    }
    for (let i = 0; i < targetIdx; i++) {
      const err = validateStaffBookStep(STAFF_BOOK_STEPS[i]);
      if (err) {
        els.formError.hidden = false;
        els.formError.textContent = err;
        setStaffBookStep(STAFF_BOOK_STEPS[i]);
        return;
      }
    }
    setStaffBookStep(target);
  });
});

els.refreshSlots.addEventListener("click", loadSlots);
els.bookingDay.addEventListener("change", async () => {
  syncDrawerDayLabel();
  clearBookingSlot();
  await refreshTravelEstimate("booking");
  await loadSlots();
  renderStaffBookSummary();
  await refreshTechDayPopoverIfOpen("booking");
});
els.techSelect.addEventListener("change", async () => {
  clearBookingSlot();
  await refreshTravelEstimate("booking");
  await loadSlots();
  renderStaffBookSummary();
  await refreshTechDayPopoverIfOpen("booking");
});
els.viewTechDay.addEventListener("click", () => {
  if (!bookingDayValue()) {
    els.formError.hidden = false;
    els.formError.textContent = t("booking.selectTechDayView");
    return;
  }
  openTechDayPopover("booking");
});
els.closeTechDay.addEventListener("click", closeTechDayPopover);
els.form.duration_minutes?.addEventListener("input", () => {
  setFieldDirty(els.form, "durationDirty", true);
});
els.form.duration_minutes?.addEventListener("change", async () => {
  const empty = !String(els.form.duration_minutes.value || "").trim();
  if (empty) {
    setFieldDirty(els.form, "durationDirty", false);
    syncStaffBookHiddenFields();
  }
  await loadSlots();
  await refreshTechDayPopoverIfOpen("booking");
});
els.form.customer_phone?.addEventListener("input", (e) => {
  if (typeof formatUsPhone === "function") {
    const formatted = formatUsPhone(e.target.value);
    if (formatted !== e.target.value) e.target.value = formatted;
  }
  clearTimeout(state.phoneLookupTimer);
  state.phoneLookupTimer = setTimeout(() => lookupCustomer(e.target.value), 250);
});
["customer_first_name", "customer_last_name"].forEach((name) => {
  const input = els.form?.[name];
  if (!input) return;
  input.addEventListener("blur", () => {
    input.value = capitalizePersonName(input.value);
    syncStaffBookHiddenFields();
  });
});
els.slotsAvailableOnly?.addEventListener("click", () => {
  state.slotsAvailableOnly = !state.slotsAvailableOnly;
  els.slotsAvailableOnly.classList.toggle("active", state.slotsAvailableOnly);
  els.slotsAvailableOnly.setAttribute("aria-pressed", String(state.slotsAvailableOnly));
  loadSlots();
});
els.techDayAvailableOnly?.addEventListener("click", async () => {
  state.techDayAvailableOnly = !state.techDayAvailableOnly;
  els.techDayAvailableOnly.classList.toggle("active", state.techDayAvailableOnly);
  els.techDayAvailableOnly.setAttribute("aria-pressed", String(state.techDayAvailableOnly));
  if (state.techDay) await openTechDayPopover(state.techDay.mode, { preserveFilter: true });
});
els.editSlotsAvailableOnly?.addEventListener("click", () => {
  state.editSlotsAvailableOnly = !state.editSlotsAvailableOnly;
  els.editSlotsAvailableOnly.classList.toggle("active", state.editSlotsAvailableOnly);
  els.editSlotsAvailableOnly.setAttribute(
    "aria-pressed",
    String(state.editSlotsAvailableOnly)
  );
  loadEditSlots();
});
els.editTechSuggestUse?.addEventListener("click", () => applyTechSuggestion("edit"));
els.editForm?.customer_address?.addEventListener("input", () => {
  scheduleTechSuggest("edit");
  clearTimeout(state.editTravelEstimateTimer);
  state.editTravelEstimateTimer = setTimeout(() => {
    refreshTravelEstimate("edit").then(() => loadEditSlots());
  }, 350);
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.formError.hidden = true;
  syncStaffBookHiddenFields();
  const validationError = validateRequiredBookingFields(
    els.form,
    els.techSelect,
    els.startsAt
  );
  if (validationError) {
    els.formError.hidden = false;
    els.formError.textContent = validationError;
    if (!staffBookSelectedLines().length) setStaffBookStep("service");
    else if (!els.startsAt.value) setStaffBookStep("time");
    else if (!els.techSelect.value && !state.selectedSlot?.technician_id) {
      setStaffBookStep("barber");
    } else setStaffBookStep("customer");
    return;
  }
  const techId = Number(
    els.techSelect.value || state.selectedSlot?.technician_id || 0
  );
  if (!techId) {
    els.formError.hidden = false;
    els.formError.textContent = "Select a barber or time slot.";
    setStaffBookStep("barber");
    return;
  }
  try {
    await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        customer_name: els.form.customer_name.value.trim(),
        customer_phone: els.form.customer_phone.value.trim(),
        customer_email: els.form.customer_email.value.trim() || null,
        customer_address: els.form.customer_address.value.trim(),
        customer_notes: null,
        technician_id: techId,
        starts_at: els.startsAt.value,
        duration_minutes: effectiveDurationMinutes(els.form),
        travel_buffer_minutes: 0,
        appliance: els.form.appliance.value,
        job_type: "Service",
        issue: els.form.issue.value.trim() || "Barbershop service",
        notes: els.form.notes.value.trim() || null,
        status: "scheduled",
        language: currentLang(),
        business_name: label("brand"),
      }),
    });
    closeDrawer();
    invalidateDayAppointmentsCache();
    await loadAppointments();
    if (state.page === "availability") await loadAvailability();
  } catch (err) {
    els.formError.hidden = false;
    els.formError.textContent = err.message;
  }
});

els.editAppt.addEventListener("click", enterEditMode);
els.cancelEdit.addEventListener("click", () => {
  // Cancel closes edit (and the dialog), same as backdrop / Escape.
  dismissDetailDialog();
});
els.editRefreshSlots.addEventListener("click", loadEditSlots);
els.editViewTechDay.addEventListener("click", () => {
  if (!editDayValue()) {
    els.editError.hidden = false;
    els.editError.textContent = t("booking.selectTechDayView");
    return;
  }
  openTechDayPopover("edit");
});
els.editTechSelect.addEventListener("change", async () => {
  clearEditSlot();
  await refreshTravelEstimate("edit");
  await loadEditSlots();
  await refreshTechDayPopoverIfOpen("edit");
});
els.editDay.addEventListener("change", async () => {
  syncDetailDayLabel(editDayValue());
  clearEditSlot();
  await refreshTravelEstimate("edit");
  await loadEditSlots();
  scheduleTechSuggest("edit");
  await refreshTechDayPopoverIfOpen("edit");
});
els.editForm.duration_minutes.addEventListener("input", () => {
  setFieldDirty(els.editForm, "durationDirty", true);
});
els.editForm.duration_minutes.addEventListener("change", async () => {
  const empty = !String(els.editForm.duration_minutes.value || "").trim();
  if (empty) {
    setFieldDirty(els.editForm, "durationDirty", false);
    applyDurationFromJobType(els.editForm, { force: true });
  }
  await loadEditSlots();
  await refreshTechDayPopoverIfOpen("edit");
});
els.editForm.job_type?.addEventListener("change", async () => {
  applyDurationFromJobType(els.editForm);
  await loadEditSlots();
  await refreshTechDayPopoverIfOpen("edit");
});
travelMilesInput(els.editForm)?.addEventListener("input", () => {
  setFieldDirty(els.editForm, "travelDirty", true);
});
travelMilesInput(els.editForm)?.addEventListener("change", async () => {
  const input = travelMilesInput(els.editForm);
  const empty = !String(input?.value || "").trim();
  if (empty) {
    setFieldDirty(els.editForm, "travelDirty", false);
    await refreshTravelEstimate("edit", { force: true });
  }
  await loadEditSlots();
  await refreshTechDayPopoverIfOpen("edit");
});

els.editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.editError.hidden = true;
  if (!state.activeAppointmentId) return;
  const validationError = validateRequiredBookingFields(
    els.editForm,
    els.editTechSelect,
    els.editStartsAt
  );
  if (validationError) {
    els.editError.hidden = false;
    els.editError.textContent = validationError.replace("before booking", "before saving");
    if (!els.editTechSelect.value) els.editTechSelect.focus();
    return;
  }
  try {
    await api(`/api/appointments/${state.activeAppointmentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        customer_name: els.editForm.customer_name.value.trim(),
        customer_phone: els.editForm.customer_phone.value.trim(),
        customer_email: els.editForm.customer_email.value.trim() || null,
        customer_address: els.editForm.customer_address.value.trim(),
        customer_notes: els.editForm.customer_notes.value.trim() || null,
        technician_id: Number(els.editForm.technician_id.value),
        starts_at: els.editStartsAt.value,
        duration_minutes: effectiveDurationMinutes(els.editForm),
        travel_buffer_minutes: effectiveTravelMinutes(els.editForm),
        appliance: els.editForm.appliance.value,
        job_type: els.editForm.job_type.value,
        issue: els.editForm.issue.value.trim(),
        notes: els.editForm.notes.value.trim() || null,
        status: els.editForm.status.value,
      }),
    });
    closeTechDayPopover();
    els.detailDialog.close();
    showDetailView();
    invalidateDayAppointmentsCache();
    await loadAppointments();
    if (state.page === "history") await loadPastAppointments();
  } catch (err) {
    els.editError.hidden = false;
    els.editError.textContent = err.message;
  }
});

function showAppToast(message, isError = false) {
  if (!els.appToast || !message) return;
  els.appToast.hidden = false;
  els.appToast.textContent = message;
  els.appToast.classList.toggle("is-error", !!isError);
  clearTimeout(showAppToast._timer);
  const ms = isError || String(message).length > 80 ? 7000 : 3200;
  showAppToast._timer = setTimeout(() => {
    els.appToast.hidden = true;
    els.appToast.textContent = "";
    els.appToast.classList.remove("is-error");
  }, ms);
}

async function refreshAfterAppointmentChange() {
  closeTechDayPopover();
  if (els.detailDialog?.open) els.detailDialog.close();
  showDetailView();
  state.activeAppointmentId = null;
  await loadAppointments();
  if (state.page === "history") await loadPastAppointments();
}

els.cancelAppt.addEventListener("click", async () => {
  if (!state.activeAppointmentId) return;
  if (!confirm(t("detail.confirmCancel"))) return;
  try {
    await api(`/api/appointments/${state.activeAppointmentId}`, { method: "DELETE" });
    await refreshAfterAppointmentChange();
    showAppToast(t("detail.cancelled"));
  } catch (err) {
    showAppToast(err.message || t("detail.couldNotCancel"), true);
  }
});

async function deleteActiveAppointment() {
  if (!state.activeAppointmentId) return;
  if (!confirm(t("detail.confirmDelete"))) return;
  try {
    await api(`/api/appointments/${state.activeAppointmentId}?permanent=true`, {
      method: "DELETE",
    });
    await refreshAfterAppointmentChange();
    showAppToast(t("detail.deleted"));
  } catch (err) {
    showAppToast(err.message || t("detail.couldNotDelete"), true);
  }
}

els.deleteAppt?.addEventListener("click", deleteActiveAppointment);
els.deleteApptEdit?.addEventListener("click", deleteActiveAppointment);

function dismissDetailDialog() {
  if (!els.detailDialog?.open) return;
  closeTechDayPopover();
  showDetailView();
  els.detailDialog.close();
}

/** Escape / backdrop while invoice is open: return to appointment detail first. */
function handleDetailDialogDismissRequest(event) {
  if (els.detailDialog?.dataset.mode === "invoice") {
    event?.preventDefault?.();
    exitInvoiceInDetail();
    return true;
  }
  return false;
}

els.closeDetail.addEventListener("click", dismissDetailDialog);

els.showOnMap?.addEventListener("click", async () => {
  const job = await resolveAppointment(state.activeAppointmentId);
  await showAppointmentOnMap(job);
});

/** Backdrop / scrim click closes (same as Close). Clicks inside .detail stay open. */
els.detailDialog.addEventListener("click", (e) => {
  if (e.target !== els.detailDialog) return;
  if (handleDetailDialogDismissRequest(e)) return;
  dismissDetailDialog();
});

els.detailDialog.addEventListener("cancel", (e) => {
  e.stopPropagation();
  if (handleDetailDialogDismissRequest(e)) return;
  // Escape: allow native close; cleanup runs on "close".
});

els.detailDialog.addEventListener("close", () => {
  closeTechDayPopover();
  showDetailView();
  syncTouchLockSuppression();
});

/** Escape closes New Booking drawer when the detail dialog is not open. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (els.detailDialog?.open) return;
  if (els.drawer && !els.drawer.hidden) closeDrawer();
});

/* —— Hash routing —— */
const PAGES = ["scheduling", "availability", "analytics", "invoice", "history", "settings", "jobs"];

function normalizePage(page) {
  const raw = String(page || "")
    .replace(/^#/, "")
    .trim()
    .toLowerCase();
  if (raw === "past") return "history";
  return PAGES.includes(raw) ? raw : "scheduling";
}

/** Resolve #jobs → last hub tab; keep panel hashes for deep links. */
function resolvePage(page) {
  const next = normalizePage(page);
  if (next === "invoice") return "analytics";
  if (next === "jobs") {
    return isJobsHubPage(state.jobsTab) ? state.jobsTab : "analytics";
  }
  return next;
}

function currentHashPage() {
  return resolvePage((location.hash || "#scheduling").replace(/^#/, ""));
}

function syncJobsHubChrome(page = state.page) {
  const show = isNarrowNav() && isJobsHubPage(page);
  if (els.jobsHubChrome) {
    els.jobsHubChrome.hidden = !show;
    const tablist = els.jobsHubChrome.querySelector("[role='tablist']");
    if (tablist) tablist.setAttribute("aria-label", label("jobs"));
  }
  document.querySelectorAll("[data-jobs-tab]").forEach((btn) => {
    const on = btn.dataset.jobsTab === page;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", String(on));
    btn.setAttribute("aria-pressed", String(on));
  });
}

function showPage(page) {
  let next = resolvePage(page);
  state.page = next;
  if (isJobsHubPage(next)) state.jobsTab = next;
  document.body.dataset.page = next;
  document.body.classList.toggle("is-jobs-hub", isJobsHubPage(next));
  document.querySelectorAll(".page").forEach((el) => {
    el.hidden = el.dataset.page !== next;
  });
  document.querySelectorAll(".app-nav-link").forEach((link) => {
    const linkPage = link.dataset.page;
    let active = linkPage === next;
    if (linkPage === "jobs") active = isJobsHubPage(next);
    link.classList.toggle("active", active);
  });
  syncJobsHubChrome(next);
  /* Date / Today·Weekly·Monthly / New Booking: Scheduling only */
  if (els.schedulingActions) els.schedulingActions.hidden = next !== "scheduling";
  if (els.dayBoardToolbar && next !== "scheduling") els.dayBoardToolbar.hidden = true;
  if (next !== "scheduling") closeDrawer();
  updateDocumentTitle();
  if (next === "invoice") {
    restoreInvoiceWorkspace();
    ensureInvoiceDayDefault();
    loadInvoiceDayAppointments();
    loadInvoiceJobs();
    ensureNewInvoiceDefaults();
  }
  if (next === "history") loadPastAppointments();
  if (next === "settings") {
    fillSettingsForm();
  }
  if (next === "analytics") {
    ensureAnalyticsRangeDefaults();
    loadAnalytics();
  }
  if (next === "availability") {
    ensureAvailabilityDay();
    syncAvailabilityChrome();
    loadAvailability();
  }
  if (next === "scheduling" && state.map) {
    setTimeout(() => state.map.invalidateSize(), 100);
  }
}

function navigate(page) {
  const next = resolvePage(page);
  if (location.hash !== `#${next}`) location.hash = next;
  else showPage(next);
}

window.addEventListener("hashchange", () => {
  const raw = (location.hash || "").replace(/^#/, "").trim().toLowerCase();
  if (raw === "past") {
    history.replaceState(null, "", "#history");
    showPage("history");
    return;
  }
  if (raw === "jobs") {
    const tab = isJobsHubPage(state.jobsTab) ? state.jobsTab : "analytics";
    history.replaceState(null, "", `#${tab}`);
    showPage(tab);
    return;
  }
  showPage(currentHashPage());
});

document.querySelectorAll("[data-jobs-tab]").forEach((btn) => {
  btn.addEventListener("click", () => navigate(btn.dataset.jobsTab));
});

/* —— Availability (working hours + day/week/month blocks) —— */
const AVAIL_DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ensureAvailabilityDay() {
  if (!state.availabilityDay) {
    state.availabilityDay = state.day || toDateInputValue(new Date());
  }
  if (els.availabilityDay) els.availabilityDay.value = state.availabilityDay;
}

function setAvailabilityDay(day) {
  if (!day) return;
  state.availabilityDay = day;
  if (els.availabilityDay) els.availabilityDay.value = day;
}

function syncAvailabilityChrome() {
  const mode = state.availabilityMode || "hours";
  const isCal = mode === "week" || mode === "month";
  document.querySelectorAll("[data-avail-mode]").forEach((btn) => {
    const on = btn.dataset.availMode === mode;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
  /* Date picker stays visible in all modes so Add block has a clear focused day */
  if (els.availabilityDayNav) els.availabilityDayNav.hidden = false;
  if (els.availabilitySpanWrap) els.availabilitySpanWrap.hidden = false;
  if (els.availabilityCalHint) els.availabilityCalHint.hidden = !isCal;
  syncAvailabilityCalHourFields();
  fillAvailabilityTechFilter();
}

function syncAvailabilityCalHourFields() {
  const span = els.availabilityBlockSpan?.value || "day";
  const showTimes = span === "hours";
  if (els.availabilityCalFromWrap) els.availabilityCalFromWrap.hidden = !showTimes;
  if (els.availabilityCalToWrap) els.availabilityCalToWrap.hidden = !showTimes;
}

function fillAvailabilityTechFilter() {
  const sel = els.availabilityTechFilter;
  if (!sel) return;
  const wrap = document.getElementById("availability-tech-filter-wrap");
  const techs = state.technicians || [];
  const linked = linkedTechnicianId();
  const linkedTech = linked != null ? techs.find((t) => t.id === linked) : null;
  const admin = isAdmin();

  // Staff: only their linked barber (no All / others).
  if (!admin) {
    if (wrap) wrap.hidden = true;
    if (linkedTech) {
      sel.innerHTML = `<option value="${linkedTech.id}">${escapeHtml(linkedTech.name)}</option>`;
      sel.value = String(linkedTech.id);
      sel.disabled = true;
      state.availabilityTechFilter = String(linkedTech.id);
    } else {
      sel.innerHTML = "";
      sel.disabled = true;
      state.availabilityTechFilter = "";
    }
    return;
  }

  if (wrap) wrap.hidden = false;
  sel.disabled = false;
  const prev = state.availabilityTechFilter || "";
  const opts =
    `<option value="">${escapeHtml(t("label.all"))}</option>` +
    techs
      .map((tech) => `<option value="${tech.id}">${escapeHtml(tech.name)}</option>`)
      .join("");
  sel.innerHTML = opts;
  // Admin: All + full list; keep prior pick if still valid, else default All.
  const still = prev && techs.some((t) => String(t.id) === String(prev));
  sel.value = still ? String(prev) : "";
  state.availabilityTechFilter = sel.value;
}

function fillAnalyticsTechFilter() {
  const sel = els.analyticsTechFilter;
  if (!sel) return;
  const wrap = document.getElementById("analytics-tech-filter-wrap");
  const techs = state.technicians || [];
  const linked = linkedTechnicianId();
  const linkedTech = linked != null ? techs.find((t) => t.id === linked) : null;
  const admin = isAdmin();
  const prev = state.analyticsTechFilter;

  if (!admin) {
    if (wrap) wrap.hidden = !!linkedTech; // single barber — hide picker
    if (linkedTech) {
      sel.innerHTML = `<option value="${linkedTech.id}">${escapeHtml(linkedTech.name)}</option>`;
      sel.value = String(linkedTech.id);
      sel.disabled = true;
      state.analyticsTechFilter = String(linkedTech.id);
    } else {
      sel.innerHTML = "";
      sel.disabled = true;
      state.analyticsTechFilter = "";
    }
    return;
  }

  if (wrap) wrap.hidden = false;
  sel.disabled = false;
  const opts =
    `<option value="">${escapeHtml(t("label.all"))}</option>` +
    techs
      .map((tech) => `<option value="${tech.id}">${escapeHtml(tech.name)}</option>`)
      .join("");
  sel.innerHTML = opts;
  // Admin defaults to self when linked; otherwise All. Keep prior pick if valid.
  let next = prev;
  if (next == null || next === undefined) {
    next = linkedTech ? String(linkedTech.id) : "";
  } else if (next !== "" && !techs.some((t) => String(t.id) === String(next))) {
    next = linkedTech ? String(linkedTech.id) : "";
  }
  sel.value = String(next);
  state.analyticsTechFilter = sel.value;
}

function fillInvoiceTechFilter() {
  const sel = els.invoiceTechFilter;
  if (!sel) return;
  const prev = sel.value || "";
  const opts =
    `<option value="">${escapeHtml(t("label.all"))}</option>` +
    (state.technicians || [])
      .map((tech) => `<option value="${tech.id}">${escapeHtml(tech.name)}</option>`)
      .join("");
  sel.innerHTML = opts;
  const still = prev && (state.technicians || []).some((t) => String(t.id) === String(prev));
  sel.value = still ? String(prev) : "";
}

function invoiceSelectedTechId() {
  const raw = els.invoiceTechFilter?.value;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function filterJobsByInvoiceTech(jobs) {
  const techId = invoiceSelectedTechId();
  if (techId == null) return jobs || [];
  return (jobs || []).filter((j) => Number(j.technician_id) === techId);
}

function availabilityRangeForMode() {
  ensureAvailabilityDay();
  const day = state.availabilityDay;
  if (state.availabilityMode === "week") {
    return weekRangeContaining(day);
  }
  if (state.availabilityMode === "month") {
    return monthRangeContaining(day);
  }
  /* Hours view: show blocks from today−7 through +120 days */
  const today = toDateInputValue(new Date());
  return { start: shiftDay(today, -7), end: shiftDay(today, 120) };
}

function parseWorkDaysCsv(csv) {
  return new Set(
    String(csv || "1,2,3,4,5")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n >= 1 && n <= 7)
  );
}

function formatAvailHours(hhmm) {
  if (!hhmm) return "";
  const [h, m] = String(hhmm).split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return d.toLocaleTimeString(localeTag(), { hour: "numeric", minute: "2-digit" });
}

function blocksOnDay(dayIso, techId) {
  return (state.availabilityBlocks || []).filter((b) => {
    if (techId != null && Number(b.technician_id) !== Number(techId)) return false;
    return b.start_date <= dayIso && b.end_date >= dayIso;
  });
}

function isHourBlock(block) {
  return !!(block?.start_time && block?.end_time);
}

function blockRangeLabel(block) {
  let datePart;
  if (block.start_date === block.end_date) datePart = formatDayLabel(block.start_date);
  else {
    datePart = t("availability.rangeLabel", {
      start: formatDayLabel(block.start_date),
      end: formatDayLabel(block.end_date),
    });
  }
  if (isHourBlock(block)) {
    return `${datePart} · ${t("availability.hoursLabel", {
      start: formatAvailHours(block.start_time),
      end: formatAvailHours(block.end_time),
    })}`;
  }
  return datePart;
}

async function createAvailabilityBlock(techId, startIso, span, reason, times = {}) {
  if (!techId) {
    showAppToast(t("availability.selectTechBlock"), true);
    return false;
  }
  const kind = span || "day";
  const body = {
    start_date: startIso,
    span: kind,
    reason: (reason || "").trim() || null,
  };
  if (kind === "hours") {
    const start_time = times.start_time || "";
    const end_time = times.end_time || "";
    if (!start_time || !end_time) {
      showAppToast(t("availability.needHourTimes"), true);
      return false;
    }
    body.start_time = start_time;
    body.end_time = end_time;
  }
  await api(`/api/technicians/${techId}/blocks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  showAppToast(t("availability.blockAdded"));
  await loadAvailability();
  return true;
}

/** Add block from filter bar: focused date (or today) + Block as + optional From/To. */
async function addAvailabilityBlockFromFilters() {
  ensureAvailabilityDay();
  const techId = state.availabilityTechFilter || els.availabilityTechFilter?.value || "";
  if (!techId) {
    showAppToast(t("availability.selectTechBlock"), true);
    return;
  }
  const startIso =
    state.availabilityDay ||
    els.availabilityDay?.value ||
    toDateInputValue(new Date());
  const span = els.availabilityBlockSpan?.value || "day";
  try {
    await createAvailabilityBlock(techId, startIso, span, "", {
      start_time: els.availabilityCalFrom?.value || "",
      end_time: els.availabilityCalTo?.value || "",
    });
  } catch (err) {
    showAppToast(err.message || t("availability.selectTechBlock"), true);
  }
}

async function removeAvailabilityBlock(techId, blockId) {
  if (!window.confirm(t("availability.confirmRemove"))) return;
  await api(`/api/technicians/${techId}/blocks/${blockId}`, { method: "DELETE" });
  showAppToast(t("availability.blockRemoved"));
  await loadAvailability();
}

function renderAvailabilityHours(techs) {
  const filterId = state.availabilityTechFilter;
  const visible = filterId
    ? techs.filter((t) => String(t.id) === String(filterId))
    : techs;
  if (!visible.length) {
    els.availabilityList.innerHTML = `<p class="status">${escapeHtml(t("availability.noTechs"))}</p>`;
    return;
  }

  els.availabilityList.innerHTML = `<div class="availability-grid">${visible
    .map((tech) => {
      const color = normalizeTechColor(tech.color);
      const days = parseWorkDaysCsv(tech.work_days);
      const dayChecks = AVAIL_DAY_KEYS.map((key, idx) => {
        const iso = idx + 1;
        const checked = days.has(iso) ? "checked" : "";
        return `<label class="availability-day-chip"><input type="checkbox" data-work-day="${iso}" ${checked} /><span>${escapeHtml(t(`day.${key}`))}</span></label>`;
      }).join("");
      const techBlocks = (state.availabilityBlocks || [])
        .filter((b) => Number(b.technician_id) === Number(tech.id))
        .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
      const blocksHtml = techBlocks.length
        ? `<ul class="availability-block-list">${techBlocks
            .map(
              (b) => `<li class="availability-block-item">
                <div>
                  <strong>${escapeHtml(blockRangeLabel(b))}</strong>
                  ${b.reason ? `<span class="availability-block-reason">${escapeHtml(b.reason)}</span>` : ""}
                </div>
                <button type="button" class="chip" data-remove-block="${b.id}" data-tech-id="${tech.id}">${escapeHtml(t("availability.removeBlock"))}</button>
              </li>`
            )
            .join("")}</ul>`
        : `<p class="availability-empty">${escapeHtml(t("availability.noBlocks"))}</p>`;
      const meta = `${escapeHtml(
        AVAIL_DAY_KEYS.filter((_, i) => days.has(i + 1))
          .map((k) => t(`day.${k}`))
          .join(" · ") || t("availability.offDay")
      )} · ${escapeHtml(formatAvailHours(tech.work_start))} – ${escapeHtml(formatAvailHours(tech.work_end))}`;
      return `<article class="availability-tech panel" data-tech-id="${tech.id}">
        <header class="availability-tech-head">
          <span class="availability-tech-swatch" style="--tech-color:${escapeHtml(color)}" aria-hidden="true"></span>
          <div>
            <h2 class="availability-tech-name">${escapeHtml(tech.name)}</h2>
            <p class="availability-tech-meta">${meta}</p>
          </div>
        </header>
        <div class="availability-hours-form" data-hours-form="${tech.id}">
          <p class="availability-section-label">${escapeHtml(t("availability.workDays"))}</p>
          <div class="availability-day-chips">${dayChecks}</div>
          <div class="availability-time-row">
            <label><span>${escapeHtml(t("availability.workStart"))}</span><input type="time" data-work-start value="${escapeHtml(tech.work_start || "08:00")}" /></label>
            <label><span>${escapeHtml(t("availability.workEnd"))}</span><input type="time" data-work-end value="${escapeHtml(tech.work_end || "18:00")}" /></label>
          </div>
          <button type="button" class="chip" data-save-hours="${tech.id}">${escapeHtml(t("availability.saveHours"))}</button>
          <p class="availability-save-msg" data-hours-msg="${tech.id}" hidden></p>
        </div>
        <div class="availability-blocks-section">
          <p class="availability-section-label">${escapeHtml(t("availability.blocks"))}</p>
          ${blocksHtml}
          <div class="availability-add-block" data-add-block="${tech.id}">
            <label><span>${escapeHtml(t("availability.blockAs"))}</span>
              <select data-block-span>
                <option value="hours">${escapeHtml(t("availability.spanHours"))}</option>
                <option value="day">${escapeHtml(t("availability.spanDay"))}</option>
                <option value="week">${escapeHtml(t("availability.spanWeek"))}</option>
                <option value="month">${escapeHtml(t("availability.spanMonth"))}</option>
              </select>
            </label>
            <label><span>${escapeHtml(t("availability.date"))}</span><input type="date" data-block-start value="${escapeHtml(state.availabilityDay || toDateInputValue(new Date()))}" /></label>
            <label class="availability-block-time" data-block-time-wrap hidden><span>${escapeHtml(t("availability.blockStart"))}</span><input type="time" data-block-from value="12:00" /></label>
            <label class="availability-block-time" data-block-time-wrap hidden><span>${escapeHtml(t("availability.blockEnd"))}</span><input type="time" data-block-to value="14:00" /></label>
            <label><span>${escapeHtml(t("availability.reason"))}</span><input type="text" data-block-reason maxlength="200" placeholder="${escapeHtml(t("availability.reasonPh"))}" /></label>
            <button type="button" class="cta" data-add-block-btn="${tech.id}">${escapeHtml(t("availability.addBlock"))}</button>
          </div>
        </div>
      </article>`;
    })
    .join("")}</div>`;

  els.availabilityList.querySelectorAll("[data-save-hours]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const techId = btn.dataset.saveHours;
      const root = els.availabilityList.querySelector(`[data-hours-form="${techId}"]`);
      if (!root) return;
      const days = [...root.querySelectorAll("[data-work-day]:checked")].map((el) => el.dataset.workDay);
      const work_start = root.querySelector("[data-work-start]")?.value || "08:00";
      const work_end = root.querySelector("[data-work-end]")?.value || "18:00";
      const msg = els.availabilityList.querySelector(`[data-hours-msg="${techId}"]`);
      try {
        await api(`/api/technicians/${techId}`, {
          method: "PATCH",
          body: JSON.stringify({
            work_start,
            work_end,
            work_days: days.length ? days.join(",") : "1,2,3,4,5",
          }),
        });
        await loadTechnicians();
        if (msg) {
          msg.hidden = false;
          msg.textContent = t("availability.hoursSaved");
          msg.classList.remove("error");
        }
        await loadAvailability();
      } catch (err) {
        if (msg) {
          msg.hidden = false;
          msg.textContent = err.message;
          msg.classList.add("error");
        }
      }
    });
  });

  els.availabilityList.querySelectorAll("[data-add-block]").forEach((root) => {
    const spanSel = root.querySelector("[data-block-span]");
    const syncTimes = () => {
      const show = spanSel?.value === "hours";
      root.querySelectorAll("[data-block-time-wrap]").forEach((el) => {
        el.hidden = !show;
      });
    };
    spanSel?.addEventListener("change", syncTimes);
    syncTimes();
  });

  els.availabilityList.querySelectorAll("[data-add-block-btn]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const techId = btn.dataset.addBlockBtn;
      const root = els.availabilityList.querySelector(`[data-add-block="${techId}"]`);
      const span = root?.querySelector("[data-block-span]")?.value || "day";
      const start = root?.querySelector("[data-block-start]")?.value;
      const reason = root?.querySelector("[data-block-reason]")?.value || "";
      const start_time = root?.querySelector("[data-block-from]")?.value || "";
      const end_time = root?.querySelector("[data-block-to]")?.value || "";
      if (!start) return;
      try {
        await createAvailabilityBlock(techId, start, span, reason, {
          start_time,
          end_time,
        });
      } catch (err) {
        window.alert(err.message);
      }
    });
  });

  els.availabilityList.querySelectorAll("[data-remove-block]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await removeAvailabilityBlock(btn.dataset.techId, btn.dataset.removeBlock);
      } catch (err) {
        window.alert(err.message);
      }
    });
  });
}

function renderAvailabilityWeek(techs) {
  const { start } = weekRangeContaining(state.availabilityDay);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const filterId = state.availabilityTechFilter;
  const visible = filterId
    ? techs.filter((t) => String(t.id) === String(filterId))
    : techs;
  const rangeLabel = `${formatDayLabel(days[0])} – ${formatDayLabel(days[6])}`;

  const head = days
    .map((day) => {
      const d = new Date(`${day}T12:00:00`);
      const wd = t(`day.${AVAIL_DAY_KEYS[(d.getDay() + 6) % 7]}`);
      return `<div class="avail-cal-head"><span>${escapeHtml(wd)}</span><strong>${escapeHtml(String(d.getDate()))}</strong></div>`;
    })
    .join("");

  const cells = days
    .map((day) => {
      const d = new Date(`${day}T12:00:00`);
      const isoWd = d.getDay() === 0 ? 7 : d.getDay();
      const chips = visible
        .flatMap((tech) => {
          const color = normalizeTechColor(tech.color);
          const blocked = blocksOnDay(day, tech.id);
          const works = parseWorkDaysCsv(tech.work_days).has(isoWd);
          if (blocked.length) {
            return blocked.map((b) => {
              const when = isHourBlock(b)
                ? t("availability.hoursLabel", {
                    start: formatAvailHours(b.start_time),
                    end: formatAvailHours(b.end_time),
                  })
                : t("availability.blocked");
              const reason = b.reason || when;
              const label = isHourBlock(b)
                ? `${tech.name} · ${when}`
                : `${tech.name} · ${reason}`;
              return `<button type="button" class="avail-cal-chip is-blocked" style="--tech-color:${escapeHtml(color)}" data-remove-block="${b.id}" data-tech-id="${tech.id}" title="${escapeHtml(reason)}">${escapeHtml(label)}</button>`;
            });
          }
          if (!works) {
            return [
              `<span class="avail-cal-chip is-off" style="--tech-color:${escapeHtml(color)}">${escapeHtml(tech.name)} · ${escapeHtml(t("availability.offDay"))}</span>`,
            ];
          }
          return [
            `<button type="button" class="avail-cal-chip is-open" style="--tech-color:${escapeHtml(color)}" data-block-day="${day}" data-tech-id="${tech.id}">${escapeHtml(tech.name)} · ${escapeHtml(formatAvailHours(tech.work_start))}–${escapeHtml(formatAvailHours(tech.work_end))}</button>`,
          ];
        })
        .join("");
      return `<div class="avail-cal-cell" data-day="${day}">
        <button type="button" class="avail-cal-day-hit" data-block-day="${day}" aria-label="${escapeHtml(formatDayLabel(day))}"></button>
        <div class="avail-cal-chips">${chips || `<span class="availability-empty">${escapeHtml(t("availability.noTechs"))}</span>`}</div>
      </div>`;
    })
    .join("");

  els.availabilityList.innerHTML = `
    <p class="availability-range-label">${escapeHtml(rangeLabel)}</p>
    <div class="avail-week-grid">
      <div class="avail-week-heads">${head}</div>
      <div class="avail-week-cells">${cells}</div>
    </div>`;
  wireAvailabilityCalendarClicks();
}

function renderAvailabilityMonth(techs) {
  const { start: monthStart, end: monthEnd } = monthRangeContaining(state.availabilityDay);
  const { start: gridStart, end: gridEnd } = monthGridRangeContaining(state.availabilityDay);
  const filterId = state.availabilityTechFilter;
  const visible = filterId
    ? techs.filter((t) => String(t.id) === String(filterId))
    : techs;
  const days = [];
  for (let d = gridStart; d <= gridEnd; d = shiftDay(d, 1)) days.push(d);
  const title = new Date(`${monthStart}T12:00:00`).toLocaleDateString(localeTag(), {
    month: "long",
    year: "numeric",
  });
  const weekHeads = AVAIL_DAY_KEYS.map(
    (k) => `<div class="avail-cal-head"><span>${escapeHtml(t(`day.${k}`))}</span></div>`
  ).join("");

  const cells = days
    .map((day) => {
      const inMonth = day >= monthStart && day <= monthEnd;
      const d = new Date(`${day}T12:00:00`);
      const isoWd = d.getDay() === 0 ? 7 : d.getDay();
      const blockedCount = visible.reduce(
        (n, tech) => n + (blocksOnDay(day, tech.id).length ? 1 : 0),
        0
      );
      const offCount = visible.reduce((n, tech) => {
        if (blocksOnDay(day, tech.id).length) return n;
        return n + (parseWorkDaysCsv(tech.work_days).has(isoWd) ? 0 : 1);
      }, 0);
      let summary = "";
      if (blockedCount) summary = `${blockedCount} ${t("availability.blocked").toLowerCase()}`;
      else if (offCount === visible.length && visible.length) summary = t("availability.offDay");
      else if (visible.length) {
        summary = visible.length === 1
          ? `${formatAvailHours(visible[0].work_start)}–${formatAvailHours(visible[0].work_end)}`
          : `${visible.length - offCount}/${visible.length}`;
      }
      return `<button type="button" class="avail-month-cell${!inMonth ? " is-outside" : ""}${blockedCount ? " is-blocked" : ""}" data-block-day="${day}">
        <span class="avail-month-num">${d.getDate()}</span>
        <span class="avail-month-summary">${escapeHtml(summary)}</span>
      </button>`;
    })
    .join("");

  els.availabilityList.innerHTML = `
    <p class="availability-range-label">${escapeHtml(title)}</p>
    <div class="avail-month-grid">
      <div class="avail-month-heads">${weekHeads}</div>
      <div class="avail-month-cells">${cells}</div>
    </div>`;
  wireAvailabilityCalendarClicks();
}

/** Day tapped on week/month calendar — open sheet to enter From/To (not silent full-span block). */
let availabilityDaySheetCtx = { day: "", techId: "" };

function closeAvailabilityDaySheet() {
  if (els.availabilityDaySheet?.open) els.availabilityDaySheet.close();
}

function renderAvailabilityDaySheetBlocks() {
  const wrap = els.availabilityDaySheetBlocks;
  if (!wrap) return;
  const { day, techId } = availabilityDaySheetCtx;
  const blocked = blocksOnDay(day, techId);
  if (!blocked.length) {
    wrap.hidden = false;
    wrap.innerHTML = `<p class="availability-empty">${escapeHtml(t("availability.daySheetEmpty"))}</p>`;
    return;
  }
  wrap.hidden = false;
  wrap.innerHTML = `
    <p class="availability-section-label">${escapeHtml(t("availability.daySheetExisting"))}</p>
    <ul class="availability-block-list">${blocked
      .map((b) => {
        const when = isHourBlock(b)
          ? t("availability.hoursLabel", {
              start: formatAvailHours(b.start_time),
              end: formatAvailHours(b.end_time),
            })
          : t("availability.blocked");
        return `<li class="availability-block-item">
          <div>
            <strong>${escapeHtml(when)}</strong>
            ${b.reason ? `<span class="availability-block-reason">${escapeHtml(b.reason)}</span>` : ""}
          </div>
          <button type="button" class="chip" data-sheet-remove-block="${b.id}" data-tech-id="${techId}">${escapeHtml(t("availability.removeBlock"))}</button>
        </li>`;
      })
      .join("")}</ul>`;
  wrap.querySelectorAll("[data-sheet-remove-block]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await removeAvailabilityBlock(btn.dataset.techId, btn.dataset.sheetRemoveBlock);
        renderAvailabilityDaySheetBlocks();
      } catch (err) {
        showAppToast(err.message, true);
      }
    });
  });
}

function openAvailabilityDaySheet(day, techId) {
  if (!day) return;
  if (!techId) {
    showAppToast(t("availability.selectTechBlock"), true);
    return;
  }
  const tech = (state.technicians || []).find((t) => String(t.id) === String(techId));
  if (!tech) {
    showAppToast(t("availability.selectTechBlock"), true);
    return;
  }
  availabilityDaySheetCtx = { day, techId: String(techId) };
  setAvailabilityDay(day);
  if (els.availabilityTechFilter && String(els.availabilityTechFilter.value) !== String(techId)) {
    els.availabilityTechFilter.value = String(techId);
    state.availabilityTechFilter = String(techId);
  }
  if (els.availabilityDaySheetTitle) {
    els.availabilityDaySheetTitle.textContent = formatDayLabel(day);
  }
  if (els.availabilityDaySheetTech) {
    els.availabilityDaySheetTech.textContent = t("availability.daySheetTech", { name: tech.name });
  }
  if (els.availabilityDaySheetFrom) {
    els.availabilityDaySheetFrom.value = els.availabilityCalFrom?.value || tech.work_start || "12:00";
  }
  if (els.availabilityDaySheetTo) {
    els.availabilityDaySheetTo.value = els.availabilityCalTo?.value || tech.work_end || "14:00";
  }
  if (els.availabilityDaySheetReason) els.availabilityDaySheetReason.value = "";
  renderAvailabilityDaySheetBlocks();
  if (els.availabilityDaySheet && !els.availabilityDaySheet.open) {
    els.availabilityDaySheet.showModal();
  }
}

function wireAvailabilityCalendarClicks() {
  els.availabilityList.querySelectorAll("[data-remove-block]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await removeAvailabilityBlock(btn.dataset.techId, btn.dataset.removeBlock);
      } catch (err) {
        window.alert(err.message);
      }
    });
  });
  els.availabilityList.querySelectorAll("[data-block-day]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const day = el.dataset.blockDay;
      const techId = el.dataset.techId || state.availabilityTechFilter || els.availabilityTechFilter?.value || "";
      openAvailabilityDaySheet(day, techId);
    });
  });
}

els.availabilityDaySheetClose?.addEventListener("click", () => closeAvailabilityDaySheet());
els.availabilityDaySheetCancel?.addEventListener("click", () => closeAvailabilityDaySheet());
els.availabilityDaySheet?.addEventListener("click", (e) => {
  if (e.target === els.availabilityDaySheet) closeAvailabilityDaySheet();
});
els.availabilityDaySheetForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { day, techId } = availabilityDaySheetCtx;
  if (!day || !techId) {
    showAppToast(t("availability.selectTechBlock"), true);
    return;
  }
  const start_time = els.availabilityDaySheetFrom?.value || "";
  const end_time = els.availabilityDaySheetTo?.value || "";
  const reason = els.availabilityDaySheetReason?.value || "";
  try {
    const ok = await createAvailabilityBlock(techId, day, "hours", reason, {
      start_time,
      end_time,
    });
    if (ok) closeAvailabilityDaySheet();
  } catch (err) {
    showAppToast(err.message || t("availability.needHourTimes"), true);
  }
});

function availabilityScopedTechnicians() {
  const techs = state.technicians || [];
  if (isAdmin()) return techs;
  const linked = linkedTechnicianId();
  if (linked == null) return [];
  return techs.filter((t) => t.id === linked);
}

function renderAvailability() {
  const techs = availabilityScopedTechnicians();
  if (!techs.length) {
    els.availabilityList.innerHTML = `<p class="status">${escapeHtml(t("availability.noTechs"))}</p>`;
    return;
  }
  if (state.availabilityMode === "week") renderAvailabilityWeek(techs);
  else if (state.availabilityMode === "month") renderAvailabilityMonth(techs);
  else renderAvailabilityHours(techs);
}

async function loadAvailability() {
  if (!els.availabilityList) return;
  ensureAvailabilityDay();
  syncAvailabilityChrome();
  els.availabilityList.innerHTML = `<p class="status">${escapeHtml(t("availability.loading"))}</p>`;

  try {
    if (!state.technicians?.length) await loadTechnicians();
    fillAvailabilityTechFilter();
    const techs = state.technicians || [];
    if (!techs.length) {
      renderAvailability();
      return;
    }
    const { start, end } = availabilityRangeForMode();
    const params = new URLSearchParams({ start, end });
    if (state.availabilityTechFilter) {
      params.set("technician_id", state.availabilityTechFilter);
    }
    state.availabilityBlocks = await api(`/api/tech-blocks?${params}`);
    renderAvailability();
  } catch (err) {
    els.availabilityList.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function setAvailabilityMode(mode) {
  state.availabilityMode = mode === "week" || mode === "month" ? mode : "hours";
  syncAvailabilityChrome();
  loadAvailability();
}

function shiftAvailabilityAnchor(dir) {
  ensureAvailabilityDay();
  if (state.availabilityMode === "month") {
    setAvailabilityDay(shiftMonth(state.availabilityDay, dir));
  } else if (state.availabilityMode === "week") {
    setAvailabilityDay(shiftDay(state.availabilityDay, dir * 7));
  } else {
    setAvailabilityDay(shiftDay(state.availabilityDay, dir));
  }
  loadAvailability();
}

els.availabilityModeHours?.addEventListener("click", () => setAvailabilityMode("hours"));
els.availabilityModeWeek?.addEventListener("click", () => setAvailabilityMode("week"));
els.availabilityModeMonth?.addEventListener("click", () => setAvailabilityMode("month"));
els.availabilityPrev?.addEventListener("click", () => shiftAvailabilityAnchor(-1));
els.availabilityNext?.addEventListener("click", () => shiftAvailabilityAnchor(1));
els.availabilityToday?.addEventListener("click", () => {
  setAvailabilityDay(toDateInputValue(new Date()));
  loadAvailability();
});
els.availabilityDay?.addEventListener("change", () => {
  if (!els.availabilityDay.value) return;
  setAvailabilityDay(els.availabilityDay.value);
  loadAvailability();
});
els.availabilityTechFilter?.addEventListener("change", () => {
  state.availabilityTechFilter = els.availabilityTechFilter.value || "";
  loadAvailability();
});
els.availabilityBlockSpan?.addEventListener("change", () => {
  syncAvailabilityCalHourFields();
});
els.availabilityAddBlock?.addEventListener("click", () => {
  void addAvailabilityBlockFromFilters();
});
els.availabilityRefresh?.addEventListener("click", () => loadAvailability());

/* —— Analytics —— */
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}

function parseIsoDay(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function applyAnalyticsPreset(preset) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let start;
  let end;
  switch (preset) {
    case "month":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case "30":
      end = today;
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    case "90":
      end = today;
      start = new Date(today);
      start.setDate(start.getDate() - 89);
      break;
    case "year":
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    case "12m":
      end = today;
      start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      break;
    case "custom":
      return;
    case "week":
    default: {
      start = mondayOf(today);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      break;
    }
  }
  if (els.analyticsStart) els.analyticsStart.value = toDateInputValue(start);
  if (els.analyticsEnd) els.analyticsEnd.value = toDateInputValue(end);
}

function ensureAnalyticsRangeDefaults() {
  if (!els.analyticsStart || !els.analyticsEnd) return;
  if (!els.analyticsStart.value || !els.analyticsEnd.value) {
    const preset = els.analyticsPreset?.value || "week";
    applyAnalyticsPreset(preset);
  }
}

function renderHBarChart(items, { valueKey = "count", colorFromItem = false, status = false } = {}) {
  if (!items?.length) return `<p class="analytics-empty">${escapeHtml(t("analytics.empty"))}</p>`;
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return `<div class="bar-chart">${items
    .map((item) => {
      const value = Number(item[valueKey]) || 0;
      const pct = Math.round((100 * value) / max);
      const colorClass = colorFromItem && item.color ? " tech-colored" : "";
      const styleParts = [`width:${pct}%`];
      if (colorFromItem && item.color) {
        styleParts.push(`--bar-color:${escapeHtml(item.color)}`);
      }
      const pretty = analyticsItemLabel(item.label, { status });
      return `<div class="bar-row">
        <span class="bar-label" title="${escapeHtml(pretty)}">${escapeHtml(pretty)}</span>
        <div class="bar-track"><div class="bar-fill${colorClass}" style="${styleParts.join(";")}"></div></div>
        <span class="bar-count">${value}</span>
      </div>`;
    })
    .join("")}</div>`;
}

function renderDayChart(days) {
  if (!days?.length) return `<p class="analytics-empty">${escapeHtml(t("analytics.empty"))}</p>`;
  const max = Math.max(...days.map((d) => d.count || 0), 1);
  const dense = days.length > 21;
  const cols = days
    .map((d) => {
      const h = d.count ? Math.max(6, Math.round((100 * d.count) / max)) : 0;
      const tip = `${d.date}: ${d.count}`;
      let short =
        days.length > 60
          ? d.date.slice(5)
          : days.length > 14
            ? d.date.slice(8)
            : dayLabel(d.label);
      if (days.length <= 14) short = dayLabel(d.label);
      return `<div class="day-bar-col" title="${escapeHtml(tip)}">
        <span class="day-count">${d.count || ""}</span>
        <div class="day-bar-stack"><div class="day-bar" style="height:${h}%"></div></div>
        <span class="day-label">${escapeHtml(short)}</span>
      </div>`;
    })
    .join("");
  return `<div class="day-bars${dense ? " dense" : ""}">${cols}</div>`;
}

function renderTechTable(techs) {
  if (!techs?.length) return `<p class="analytics-empty">${escapeHtml(t("analytics.noTech"))}</p>`;
  const rows = techs
    .map((row) => {
      const hours = ((row.minutes || 0) / 60).toFixed(1);
      const swatch = row.color
        ? `<span class="swatch" style="--swatch-color:${escapeHtml(row.color)}"></span>`
        : "";
      return `<tr>
        <td>${swatch}${escapeHtml(row.label)}</td>
        <td class="num">${row.count}</td>
        <td class="num">${hours}h</td>
      </tr>`;
    })
    .join("");
  return `<div class="analytics-table-wrap"><table class="analytics-table">
    <thead><tr><th>${escapeHtml(t("analytics.techCol"))}</th><th class="num">${escapeHtml(t("analytics.jobsCol"))}</th><th class="num">${escapeHtml(t("analytics.jobHoursCol"))}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renderAnalytics(data) {
  if (!els.analyticsSummary || !els.analyticsGrid) return;
  const s = data.summary || {};
  els.analyticsSummary.innerHTML = `
    <div class="analytics-stat"><span class="stat-label">${escapeHtml(t("analytics.activeJobs"))}</span><span class="stat-value">${s.active_jobs ?? 0}</span><span class="stat-hint">${escapeHtml(t("analytics.cancelledHint", { n: s.cancelled_jobs ?? 0, t: s.total_jobs ?? 0 }))}</span></div>
    <div class="analytics-stat"><span class="stat-label">${escapeHtml(t("analytics.jobHours"))}</span><span class="stat-value">${s.job_hours ?? 0}</span><span class="stat-hint">${escapeHtml(t("analytics.travelHint", { n: s.travel_hours ?? 0 }))}</span></div>
    <div class="analytics-stat"><span class="stat-label">${escapeHtml(t("analytics.booked"))}</span><span class="stat-value">${s.booked_hours ?? 0}h</span><span class="stat-hint">${escapeHtml(t("analytics.capacityHint", { n: s.available_hours ?? 0 }))}</span></div>
    <div class="analytics-stat"><span class="stat-label">${escapeHtml(t("analytics.utilization"))}</span><span class="stat-value">${s.utilization_pct ?? 0}%</span><span class="stat-hint">${escapeHtml(data.start)} → ${escapeHtml(data.end)}</span></div>
  `;

  const byDay = data.by_day || [];
  let dayVisual = byDay;
  let dayTitle = t("analytics.jobsPerDay");
  if (byDay.length > 45) {
    const months = new Map();
    byDay.forEach((d) => {
      const key = d.date.slice(0, 7);
      if (!months.has(key)) {
        months.set(key, { date: key, label: key, count: 0, job_minutes: 0, travel_minutes: 0 });
      }
      const m = months.get(key);
      m.count += d.count || 0;
      m.job_minutes += d.job_minutes || 0;
      m.travel_minutes += d.travel_minutes || 0;
    });
    dayVisual = [...months.values()];
    dayTitle = t("analytics.jobsPerMonth");
  }

  const statusMix = (data.by_status || []).filter((item) => {
    const key = String(item.label || "").trim().toLowerCase();
    return key === "scheduled" || key === "cancelled" || key === "canceled";
  });

  els.analyticsGrid.innerHTML = `
    <article class="analytics-card span-2">
      <h3>${escapeHtml(dayTitle)}</h3>
      ${renderDayChart(dayVisual)}
    </article>
    <article class="analytics-card">
      <h3>${escapeHtml(t("analytics.byTechnician"))}</h3>
      ${renderHBarChart(data.by_technician || [], { colorFromItem: true })}
      ${renderTechTable(data.by_technician || [])}
    </article>
    <article class="analytics-card">
      <h3>${escapeHtml(t("analytics.statusMix"))}</h3>
      ${renderHBarChart(statusMix, { status: true })}
    </article>
    <article class="analytics-card">
      <h3>${escapeHtml(t("analytics.appliance"))}</h3>
      ${renderHBarChart(data.by_appliance || [])}
    </article>
  `;
}

async function loadAnalytics() {
  if (!els.analyticsGrid) return;
  ensureAnalyticsRangeDefaults();
  if (!state.technicians?.length) {
    try {
      await loadTechnicians();
    } catch (_) {
      /* continue */
    }
  }
  fillAnalyticsTechFilter();
  const start = els.analyticsStart?.value;
  const end = els.analyticsEnd?.value;
  if (!start || !end) return;
  if (parseIsoDay(end) < parseIsoDay(start)) {
    els.analyticsGrid.innerHTML = `<p class="status">${escapeHtml(t("analytics.badRange"))}</p>`;
    return;
  }
  els.analyticsGrid.innerHTML = `<p class="status">${escapeHtml(t("analytics.loading"))}</p>`;
  if (els.analyticsSummary) els.analyticsSummary.innerHTML = "";
  try {
    const params = new URLSearchParams({ start, end });
    const techId = state.analyticsTechFilter || els.analyticsTechFilter?.value || "";
    if (techId) params.set("technician_id", techId);
    state.analytics = await api(`/api/analytics?${params}`);
    renderAnalytics(state.analytics);
  } catch (err) {
    els.analyticsGrid.innerHTML = `<p class="status">${escapeHtml(err.message || "Could not load analytics.")}</p>`;
  }
}

if (els.analyticsPreset) {
  els.analyticsPreset.addEventListener("change", () => {
    const preset = els.analyticsPreset.value;
    if (preset !== "custom") applyAnalyticsPreset(preset);
    loadAnalytics();
  });
}
if (els.analyticsStart) {
  els.analyticsStart.addEventListener("change", () => {
    if (els.analyticsPreset) els.analyticsPreset.value = "custom";
    loadAnalytics();
  });
}
if (els.analyticsEnd) {
  els.analyticsEnd.addEventListener("change", () => {
    if (els.analyticsPreset) els.analyticsPreset.value = "custom";
    loadAnalytics();
  });
}
if (els.analyticsRefresh) {
  els.analyticsRefresh.addEventListener("click", () => loadAnalytics());
}
if (els.analyticsTechFilter) {
  els.analyticsTechFilter.addEventListener("change", () => {
    if (!isAdmin()) return;
    state.analyticsTechFilter = els.analyticsTechFilter.value || "";
    loadAnalytics();
  });
}

/* —— Excel export helpers —— */
async function downloadExcel(url, { method = "GET", body = null, filename = "export.xlsx" } = {}) {
  const options = { method, headers: {} };
  if (body != null) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    let detail = `Export failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  const dispo = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/i.exec(dispo);
  const name = match?.[1] || filename;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function historyExportParams() {
  ensureHistoryDateDefaults();
  const params = new URLSearchParams({ limit: "5000" });
  const q = els.pastSearch?.value?.trim();
  const status = els.pastStatus?.value;
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  appendDateRangeParams(params, els.pastStart, els.pastEnd);
  return params;
}

async function exportHistoryExcel() {
  try {
    await downloadExcel(`/api/export/past.xlsx?${historyExportParams()}`, {
      filename: "exclusive-studio-history.xlsx",
    });
    showAppToast(t("history.export"));
  } catch (err) {
    showAppToast(err.message || t("history.exportFailed"), true);
  }
}

async function importHistorySpreadsheet(file) {
  if (!file) return;
  const body = new FormData();
  body.append("file", file);
  try {
    const res = await fetch("/api/import/history", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.detail;
      throw new Error(
        typeof detail === "string" ? detail : detail?.[0]?.msg || t("history.importFailed")
      );
    }
    const n = Number(data.created) || 0;
    const s = Number(data.skipped) || 0;
    showAppToast(t("history.importOk", { n, s }), Number(data.error_count) > 0);
    await loadPastAppointments();
    if (state.page === "scheduling") await loadAppointments();
  } catch (err) {
    showAppToast(err.message || t("history.importFailed"), true);
  }
}

async function exportInvoicePdf() {
  if (!invoiceHasContent()) {
    showAppToast(t("invoice.needJobOrManual"), true);
    return;
  }
  try {
    const doc = currentInvoiceDocumentPayload();
    const inv = (doc.invoice_number || "invoice").replace(/[^\w.\-]+/g, "_");
    await downloadExcel("/api/export/invoice.pdf", {
      method: "POST",
      body: doc,
      filename: `${inv || "invoice"}.pdf`,
    });
  } catch (err) {
    showAppToast(err.message || t("invoice.exportFailed") || "Could not export PDF.", true);
  }
}

/* —— History appointments (paged; status/date filters apply within pages) —— */
const HISTORY_PAGE_SIZE = 20;

function historyTotalPages() {
  const size = state.historyPageSize || HISTORY_PAGE_SIZE;
  return Math.max(1, Math.ceil((state.historyTotal || 0) / size));
}

function updateHistoryPager() {
  if (!els.pastPager) return;
  const total = state.historyTotal || 0;
  const pages = historyTotalPages();
  const page = Math.min(Math.max(1, state.historyPage || 1), pages);
  state.historyPage = page;
  const show = total > 0;
  els.pastPager.hidden = !show;
  if (els.pastPageLabel) {
    els.pastPageLabel.textContent = t("history.pageOf", { page, pages });
  }
  if (els.pastPrev) els.pastPrev.disabled = page <= 1;
  if (els.pastNext) els.pastNext.disabled = page >= pages;
}

function resetHistoryPageAndLoad() {
  state.historyPage = 1;
  return loadPastAppointments();
}

async function loadPastAppointments() {
  if (!els.pastList) return;
  ensureHistoryDateDefaults();
  const pageSize = state.historyPageSize || HISTORY_PAGE_SIZE;
  const page = Math.max(1, state.historyPage || 1);
  const offset = (page - 1) * pageSize;
  const params = new URLSearchParams({
    mode: "past",
    limit: String(pageSize),
    offset: String(offset),
  });
  const q = els.pastSearch?.value?.trim();
  const status = els.pastStatus?.value;
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  appendDateRangeParams(params, els.pastStart, els.pastEnd);
  els.pastList.innerHTML = `<p class="status">${escapeHtml(t("history.loading"))}</p>`;
  if (els.pastPager) els.pastPager.hidden = true;
  try {
    const data = await api(`/api/appointments/history?${params}`);
    const items = Array.isArray(data) ? data : data?.items || [];
    state.history = items;
    state.historyTotal = Array.isArray(data) ? items.length : Number(data?.total) || 0;
    state.historyPageSize = Array.isArray(data) ? pageSize : Number(data?.limit) || pageSize;
    const maxPage = historyTotalPages();
    if (state.historyTotal > 0 && page > maxPage) {
      state.historyPage = maxPage;
      return loadPastAppointments();
    }
    if (!state.history.length) {
      els.pastList.innerHTML = `<p class="status">${escapeHtml(t("history.empty"))}</p>`;
      updateHistoryPager();
      return;
    }
    els.pastList.innerHTML = state.history
      .map(
        (job) => `
      <button type="button" class="past-row" data-id="${job.id}">
        <div>
          <strong>${escapeHtml(applianceLabel(job.appliance))} · ${escapeHtml(job.customer.name)}</strong>
          <span>${escapeHtml(job.customer.phone)} · ${escapeHtml(job.customer.address)}</span>
        </div>
        <div>
          <strong>${formatDayLong(job.starts_at)}</strong>
          <span>${formatTime(job.starts_at)} · ${escapeHtml(job.technician.name)} · ${escapeHtml(jobTypeLabel(job.job_type))}</span>
        </div>
        <span class="past-badge ${escapeHtml(job.status)}">${escapeHtml(statusLabel(job.status))}</span>
      </button>`
      )
      .join("");
    els.pastList.querySelectorAll(".past-row").forEach((btn) => {
      btn.addEventListener("click", () => openDetail(Number(btn.dataset.id)));
    });
    updateHistoryPager();
  } catch (err) {
    state.history = [];
    state.historyTotal = 0;
    updateHistoryPager();
    els.pastList.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

/** Light custom menus for desk <select>s (avoids tall native iOS pickers). */
function closeDeskSelect(exceptWrap = null) {
  deskSelectRegistry.forEach((api) => {
    if (exceptWrap && api.wrap === exceptWrap) return;
    api.close();
  });
}

function syncDeskSelect(select) {
  const api = deskSelectRegistry.get(select);
  if (api) api.sync();
}

function enhanceDeskSelect(select) {
  if (!select || deskSelectRegistry.has(select)) {
    syncDeskSelect(select);
    return deskSelectRegistry.get(select) || null;
  }

  const wrap = document.createElement("div");
  wrap.className = "desk-select";
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add("desk-select-is-enhanced");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "desk-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  if (select.id) trigger.id = `${select.id}-trigger`;
  const labelledBy = select.getAttribute("aria-label");
  if (labelledBy) trigger.setAttribute("aria-label", labelledBy);

  const menu = document.createElement("div");
  menu.className = "desk-select-menu";
  menu.hidden = true;
  menu.setAttribute("role", "listbox");
  menu.tabIndex = -1;

  wrap.appendChild(trigger);
  wrap.appendChild(menu);

  function selectedLabel() {
    const opt = select.selectedOptions?.[0] || select.options?.[select.selectedIndex];
    return (opt?.textContent || "").trim() || "—";
  }

  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function positionMenu() {
    const rect = trigger.getBoundingClientRect();
    const pad = 8;
    const width = Math.max(rect.width, 10 * 16);
    let left = rect.left;
    left = Math.min(left, window.innerWidth - width - pad);
    left = Math.max(pad, left);
    menu.style.width = `${Math.round(width)}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    menu.hidden = false;
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - pad) {
      const above = Math.max(pad, rect.top - menuRect.height - 6);
      menu.style.top = `${Math.round(above)}px`;
    }
  }

  function open() {
    if (select.disabled) return;
    closeDeskSelect(wrap);
    sync();
    trigger.setAttribute("aria-expanded", "true");
    positionMenu();
    const selected = menu.querySelector(".desk-select-option.is-selected");
    (selected || menu.querySelector(".desk-select-option"))?.focus?.();
  }

  function sync() {
    trigger.textContent = selectedLabel();
    trigger.disabled = !!select.disabled;
    const parts = [];
    const walk = (nodes) => {
      nodes.forEach((node) => {
        if (node.tagName === "OPTGROUP") {
          parts.push(
            `<div class="desk-select-group">${escapeHtml(node.label || "")}</div>`
          );
          walk([...node.children]);
          return;
        }
        if (node.tagName !== "OPTION") return;
        const value = node.value;
        const selected = select.value === value;
        parts.push(
          `<button type="button" class="desk-select-option${selected ? " is-selected" : ""}" role="option" aria-selected="${selected ? "true" : "false"}" data-value="${escapeHtml(value)}">
            <span class="desk-select-option-label">${escapeHtml(node.textContent || "")}</span>
            <span class="desk-select-option-check" aria-hidden="true">${selected ? "✓" : ""}</span>
          </button>`
        );
      });
    };
    walk([...select.children]);
    menu.innerHTML = parts.join("");
  }

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    if (menu.hidden) open();
    else close();
  });

  menu.addEventListener("click", (e) => {
    const btn = e.target.closest(".desk-select-option");
    if (!btn || !menu.contains(btn)) return;
    e.preventDefault();
    const value = btn.getAttribute("data-value") ?? "";
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    sync();
    close();
    trigger.focus();
  });

  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      trigger.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    const items = [...menu.querySelectorAll(".desk-select-option")];
    if (!items.length) return;
    e.preventDefault();
    const idx = items.indexOf(document.activeElement);
    let next = 0;
    if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % items.length;
    else if (e.key === "ArrowUp") next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length;
    else if (e.key === "End") next = items.length - 1;
    items[next]?.focus?.();
  });

  select.addEventListener("change", sync);
  sync();

  const api = { wrap, trigger, menu, sync, close, open };
  deskSelectRegistry.set(select, api);
  return api;
}

document.addEventListener("pointerdown", (e) => {
  let hit = false;
  deskSelectRegistry.forEach((api) => {
    if (api.wrap.contains(e.target)) hit = true;
  });
  if (!hit) closeDeskSelect();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDeskSelect();
});

if (els.pastRefresh) els.pastRefresh.addEventListener("click", () => loadPastAppointments());
if (els.pastExport) els.pastExport.addEventListener("click", exportHistoryExcel);
if (els.pastImport && els.pastImportFile) {
  els.pastImport.addEventListener("click", () => els.pastImportFile.click());
  els.pastImportFile.addEventListener("change", async () => {
    const file = els.pastImportFile.files?.[0];
    els.pastImportFile.value = "";
    await importHistorySpreadsheet(file);
  });
}
if (els.pastStatus) {
  enhanceDeskSelect(els.pastStatus);
  els.pastStatus.addEventListener("change", resetHistoryPageAndLoad);
}
if (els.pastStart) els.pastStart.addEventListener("change", resetHistoryPageAndLoad);
if (els.pastEnd) els.pastEnd.addEventListener("change", resetHistoryPageAndLoad);
if (els.pastSearch) {
  els.pastSearch.addEventListener("input", () => {
    clearTimeout(state.pastSearchTimer);
    state.pastSearchTimer = setTimeout(resetHistoryPageAndLoad, 250);
  });
}
if (els.pastPrev) {
  els.pastPrev.addEventListener("click", () => {
    if (state.historyPage <= 1) return;
    state.historyPage -= 1;
    loadPastAppointments();
  });
}
if (els.pastNext) {
  els.pastNext.addEventListener("click", () => {
    if (state.historyPage >= historyTotalPages()) return;
    state.historyPage += 1;
    loadPastAppointments();
  });
}

/* —— Invoice builder —— */
function setInvoiceField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if ("value" in el) {
    let next = value ?? "";
    if (el.type === "tel" && typeof formatUsPhone === "function") {
      next = formatUsPhone(next);
    }
    el.value = next;
  } else el.textContent = value ?? "";
}

function getInvoiceField(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return ("value" in el ? el.value : el.textContent) || "";
}

/** Long locale date for the invoice header (editable). */
function todayInvoiceDate() {
  return new Date().toLocaleDateString(localeTag(), {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isInvoiceNumberPlaceholder(value) {
  const v = String(value || "").trim();
  return !v || v === "—" || v === "-" || v === "–" || v === "−";
}

async function fetchNextInvoiceNumber() {
  try {
    const data = await api("/api/invoices/next-number");
    const num = String(data?.invoice_number || "").trim();
    return num || "RD-0001";
  } catch (_) {
    return "RD-0001";
  }
}

/**
 * Fill number/date for a new (unsaved) invoice sheet.
 * Never touches fields when a saved invoice is loaded (`state.invoiceId`).
 */
async function ensureNewInvoiceDefaults({ forceNumber = false, forceDate = false } = {}) {
  if (state.invoiceId) return;
  if (forceDate || !getInvoiceField("invoice-date").trim()) {
    setInvoiceField("invoice-date", todayInvoiceDate());
  }
  if (forceNumber || isInvoiceNumberPlaceholder(getInvoiceField("invoice-number"))) {
    const next = await fetchNextInvoiceNumber();
    // Re-check: user may have loaded a saved invoice while the request was in flight.
    if (state.invoiceId) return;
    if (forceNumber || isInvoiceNumberPlaceholder(getInvoiceField("invoice-number"))) {
      setInvoiceField("invoice-number", next);
    }
  }
}

function serializeInvoiceLines() {
  return state.invoiceLines.map((l) => ({
    kind: l.kind === "material" ? "material" : "service",
    description: l.description || "",
    qty: Number(l.qty || 0),
    rate: Number(l.rate || 0),
  }));
}

function invoiceHasContent() {
  const name = getInvoiceField("invoice-customer-name").trim();
  const phone = getInvoiceField("invoice-customer-phone").trim();
  return !!(state.invoiceJobId || name || phone || state.invoiceLines.length);
}

function defaultInvoiceLines(job) {
  const hours = Math.max(1, Math.round(((job.duration_minutes || 90) / 60) * 10) / 10);
  return [
    {
      kind: "service",
      description: `${jobTypeLabel(job.job_type)} — ${applianceLabel(job.appliance)}`,
      qty: hours,
      rate: 125,
    },
    {
      kind: "service",
      description: t("invoice.serviceCall"),
      qty: 1,
      rate: 49,
    },
  ];
}

function setInvoiceMode(mode) {
  state.invoiceMode = mode === "manual" ? "manual" : "job";
  if (els.invoiceSheet) els.invoiceSheet.dataset.mode = state.invoiceMode;
}

function renderInvoiceSection(tbody, kind) {
  if (!tbody) return;
  const rows = state.invoiceLines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => (line.kind || "service") === kind);
  const addLabel = kind === "service" ? t("invoice.addServiceLine") : t("invoice.addMaterialLine");
  const addAction = kind === "material" ? "add-material" : "add-service";

  const lineHtml = rows
    .map(
      ({ line, idx }) => `
    <tr data-idx="${idx}" data-kind="${kind}">
      <td class="invoice-col-desc"><input data-field="description" value="${escapeHtml(line.description || "")}" placeholder="${escapeHtml(kind === "service" ? t("invoice.serviceLinePh") : t("invoice.materialLinePh"))}" /></td>
      <td class="num invoice-col-rate"><input class="num-input" data-field="rate" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(line.rate || 0)}" /></td>
      <td class="num invoice-col-qty"><input class="num-input" data-field="qty" type="number" min="0" step="${kind === "service" ? "0.25" : "1"}" inputmode="decimal" value="${Number(line.qty || 0)}" /></td>
      <td class="num invoice-col-total invoice-line-total">${money(Number(line.qty || 0) * Number(line.rate || 0))}</td>
      <td class="no-print invoice-col-actions"><button type="button" class="chip invoice-remove-btn" data-remove="${idx}">${escapeHtml(t("invoice.remove"))}</button></td>
    </tr>`
    )
    .join("");

  const addRowHtml = `
    <tr class="invoice-add-row no-print" data-add-kind="${kind}">
      <td colspan="5">
        <button type="button" class="invoice-add-line-btn" data-add-action="${addAction}">+ ${escapeHtml(addLabel)}</button>
      </td>
    </tr>`;

  tbody.innerHTML = lineHtml + addRowHtml;

  tbody.querySelectorAll("tr[data-idx] input").forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest("tr");
      const idx = Number(row.dataset.idx);
      const field = input.dataset.field;
      let val = input.value;
      if (field === "qty" || field === "rate") val = Number(val || 0);
      state.invoiceLines[idx][field] = val;
      const totalCell = row.querySelector(".invoice-line-total");
      if (totalCell) {
        totalCell.textContent = money(
          Number(state.invoiceLines[idx].qty || 0) * Number(state.invoiceLines[idx].rate || 0)
        );
      }
      updateInvoiceTotals();
    });
  });
  tbody.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.invoiceLines.splice(Number(btn.dataset.remove), 1);
      renderInvoiceLines();
    });
  });
  tbody.querySelectorAll("[data-add-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleInvoiceEditAction(btn.dataset.addAction));
  });
}

function renderInvoiceLines() {
  renderInvoiceSection(els.invoiceServiceLines, "service");
  renderInvoiceSection(els.invoiceMaterialLines, "material");
  updateInvoiceTotals();
}

function updateInvoiceTotals() {
  const serviceSub = state.invoiceLines
    .filter((l) => (l.kind || "service") === "service")
    .reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.rate || 0), 0);
  const materialsSub = state.invoiceLines
    .filter((l) => l.kind === "material")
    .reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.rate || 0), 0);
  const subtotal = Math.round((serviceSub + materialsSub) * 100) / 100;
  const rate = Number(els.invoiceTaxRate?.value || 0);
  const tax = Math.round(subtotal * (rate / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const setMoney = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = money(value);
  };
  setMoney("invoice-subtotal-service", serviceSub);
  setMoney("invoice-subtotal-materials", materialsSub);
  setMoney("invoice-subtotal", subtotal);
  setMoney("invoice-tax", tax);
  setMoney("invoice-total", total);
  const taxLabel = document.getElementById("invoice-tax-label");
  if (taxLabel) taxLabel.textContent = String(rate);
}

async function fillInvoiceFromJob(job) {
  if (!job) return;
  setInvoiceMode("job");
  state.invoiceId = null;
  state.invoiceJobId = job.id;
  state.invoiceLines = defaultInvoiceLines(job);
  setInvoiceField("invoice-date", todayInvoiceDate());
  setInvoiceField("invoice-number", "—");
  setInvoiceField("invoice-customer-name", job.customer?.name || "");
  setInvoiceField("invoice-customer-phone", job.customer?.phone || "");
  setInvoiceField("invoice-customer-email", job.customer?.email || "");
  setInvoiceField("invoice-customer-address", job.customer?.address || "");
  setInvoiceField(
    "invoice-job-summary",
    `${applianceLabel(job.appliance)} · ${jobTypeLabel(job.job_type)} · ${formatDayLong(job.starts_at)} ${formatTime(job.starts_at)}`
  );
  setInvoiceField("invoice-tech", t("invoice.tech", { name: job.technician?.name || "" }));
  if (els.invoiceNotes) els.invoiceNotes.value = job.notes || t("invoice.notesDefault");
  renderInvoiceLines();
  syncInvoiceDayListActive(job.id);
  document.querySelectorAll(".invoice-job-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.id) === job.id);
  });
  await ensureNewInvoiceDefaults({ forceNumber: true, forceDate: true });
}

async function startManualInvoice() {
  setInvoiceMode("manual");
  state.invoiceId = null;
  state.invoiceJobId = null;
  syncInvoiceDayListActive(null);
  setInvoiceField("invoice-number", "—");
  setInvoiceField("invoice-date", todayInvoiceDate());
  setInvoiceField("invoice-customer-name", "");
  setInvoiceField("invoice-customer-phone", "");
  setInvoiceField("invoice-customer-email", "");
  setInvoiceField("invoice-customer-address", "");
  setInvoiceField("invoice-job-summary", "");
  setInvoiceField("invoice-tech", "");
  if (els.invoiceNotes) els.invoiceNotes.value = t("invoice.notesDefault");
  state.invoiceLines = [
    { kind: "service", description: "", qty: 1, rate: 0 },
    { kind: "material", description: "", qty: 1, rate: 0 },
  ];
  renderInvoiceLines();
  document.querySelectorAll(".invoice-job-btn").forEach((btn) => btn.classList.remove("active"));
  const nameEl = document.getElementById("invoice-customer-name");
  if (nameEl) nameEl.focus();
  await ensureNewInvoiceDefaults({ forceNumber: true, forceDate: true });
}

/** Reset the invoice sheet to a blank new invoice (one-click Clear Form). */
async function clearInvoiceForm() {
  closeInvoiceSendMenu();
  state.invoiceId = null;
  state.invoiceJobId = null;
  setInvoiceMode("job");
  syncInvoiceDayListActive(null);
  setInvoiceField("invoice-number", "—");
  setInvoiceField("invoice-date", todayInvoiceDate());
  setInvoiceField("invoice-customer-name", "");
  setInvoiceField("invoice-customer-phone", "");
  setInvoiceField("invoice-customer-email", "");
  setInvoiceField("invoice-customer-address", "");
  setInvoiceField("invoice-job-summary", "");
  setInvoiceField("invoice-tech", "");
  if (els.invoiceNotes) els.invoiceNotes.value = t("invoice.notesDefault");
  if (els.invoiceTaxRate) els.invoiceTaxRate.value = "8.25";
  state.invoiceLines = [];
  renderInvoiceLines();
  document.querySelectorAll(".invoice-job-btn").forEach((btn) => btn.classList.remove("active"));
  await ensureNewInvoiceDefaults({ forceNumber: true, forceDate: true });
  showAppToast(t("invoice.clearedForm"));
}

function ensureInvoiceDayDefault() {
  if (!els.invoiceDay) return;
  if (!els.invoiceDay.value) els.invoiceDay.value = toDateInputValue(new Date());
}

function syncInvoiceDayListActive(jobId) {
  if (!els.invoiceDayList) return;
  const id = jobId == null ? null : Number(jobId);
  els.invoiceDayList.querySelectorAll(".invoice-day-job-btn").forEach((btn) => {
    const active = id != null && Number(btn.dataset.id) === id;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function renderInvoiceDayList(jobs) {
  if (!els.invoiceDayList) return;
  if (!jobs.length) {
    els.invoiceDayList.innerHTML = "";
    return;
  }
  els.invoiceDayList.innerHTML = jobs
    .map((job) => {
      const active = state.invoiceJobId === job.id;
      const title = `${formatTime(job.starts_at)} · ${job.customer?.name || ""}`;
      const sub = `${applianceLabel(job.appliance)} · ${jobTypeLabel(job.job_type)} · ${job.technician?.name || ""}`;
      return `
      <button type="button" class="invoice-job-btn invoice-day-job-btn ${active ? "active" : ""}" data-id="${job.id}" role="option" aria-selected="${active ? "true" : "false"}">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(sub)}</span>
      </button>`;
    })
    .join("");
  els.invoiceDayList.querySelectorAll(".invoice-day-job-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = jobs.find((j) => j.id === Number(btn.dataset.id));
      if (job) fillInvoiceFromJob(job);
    });
  });
}

async function loadInvoiceDayAppointments() {
  if (!els.invoiceDayList) return;
  ensureInvoiceDayDefault();
  const day = els.invoiceDay.value;
  els.invoiceDayList.innerHTML = `<p class="status">${escapeHtml(t("invoice.loading"))}</p>`;
  if (els.invoiceDayEmpty) {
    els.invoiceDayEmpty.hidden = true;
    els.invoiceDayEmpty.textContent = t("invoice.dayEmpty");
  }
  try {
    const dayJobs = await api(`/api/appointments?day=${encodeURIComponent(day)}`);
    state.invoiceDayJobs = filterJobsByInvoiceTech(dayJobs);
    if (!state.invoiceDayJobs.length) {
      els.invoiceDayList.innerHTML = "";
      if (els.invoiceDayEmpty) els.invoiceDayEmpty.hidden = false;
      return;
    }
    renderInvoiceDayList(state.invoiceDayJobs);
  } catch (err) {
    els.invoiceDayList.innerHTML = "";
    if (els.invoiceDayEmpty) {
      els.invoiceDayEmpty.hidden = false;
      els.invoiceDayEmpty.textContent = err.message || t("invoice.dayEmpty");
    }
  }
}

function renderInvoiceJobList(jobs, { banner } = {}) {
  if (!els.invoiceJobList) return;
  if (!jobs.length) {
    els.invoiceJobList.innerHTML = `<p class="status">${escapeHtml(t("invoice.noJobs"))}</p>`;
    return;
  }
  const bannerHtml = banner
    ? `<p class="invoice-job-list-banner">${escapeHtml(banner)}</p>`
    : "";
  els.invoiceJobList.innerHTML =
    bannerHtml +
    jobs
      .map(
        (job) => `
      <button type="button" class="invoice-job-btn ${state.invoiceJobId === job.id ? "active" : ""}" data-id="${job.id}">
        <strong>${escapeHtml(job.customer?.name || "")} · ${escapeHtml(applianceLabel(job.appliance))}</strong>
        <span>${formatDayLong(job.starts_at)} · ${escapeHtml(statusLabel(job.status))} · ${escapeHtml(job.technician?.name || "")}</span>
      </button>`
      )
      .join("");
  els.invoiceJobList.querySelectorAll(".invoice-job-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = jobs.find((j) => j.id === Number(btn.dataset.id));
      if (job) fillInvoiceFromJob(job);
    });
  });
}

async function loadInvoiceJobs() {
  if (!els.invoiceJobList) return;
  ensureInvoiceDateDefaults();
  const params = new URLSearchParams({ mode: "recent", limit: "60" });
  const q = els.invoiceSearch?.value?.trim();
  if (q) params.set("q", q);
  appendDateRangeParams(params, els.invoiceStart, els.invoiceEnd);
  els.invoiceJobList.innerHTML = `<p class="status">${escapeHtml(t("invoice.loading"))}</p>`;
  try {
    const data = await api(`/api/appointments/history?${params}`);
    const jobs = Array.isArray(data) ? data : data?.items || [];
    state.invoiceJobs = filterJobsByInvoiceTech(jobs);
    renderInvoiceJobList(state.invoiceJobs);
  } catch (err) {
    els.invoiceJobList.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

async function findInvoiceByPhone() {
  const raw = (els.invoicePhone?.value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) {
    showAppToast(t("invoice.phoneNeed"), true);
    return;
  }
  if (!els.invoiceJobList) return;
  const browse = document.getElementById("invoice-browse");
  if (browse) browse.open = true;
  els.invoiceJobList.innerHTML = `<p class="status">${escapeHtml(t("invoice.loading"))}</p>`;
  try {
    const params = new URLSearchParams({
      mode: "recent",
      limit: "40",
      phone: raw,
    });
    const data = await api(`/api/appointments/history?${params}`);
    const jobs = filterJobsByInvoiceTech(Array.isArray(data) ? data : data?.items || []);
    state.invoiceJobs = jobs;
    if (!jobs.length) {
      els.invoiceJobList.innerHTML = `<p class="status">${escapeHtml(t("invoice.phoneNone"))}</p>`;
      showAppToast(t("invoice.phoneNone"), true);
      return;
    }
    renderInvoiceJobList(jobs, { banner: t("invoice.phoneMatches", { phone: raw }) });
    if (jobs.length === 1) fillInvoiceFromJob(jobs[0]);
  } catch (err) {
    els.invoiceJobList.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    showAppToast(err.message || t("invoice.phoneNone"), true);
  }
}

function setInvoiceAccordionExpanded(wrap, panel, btn, open) {
  const expanded = !!open;
  if (wrap) wrap.classList.toggle("is-open", expanded);
  if (panel) panel.setAttribute("aria-hidden", expanded ? "false" : "true");
  if (btn) btn.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function setInvoiceSendExpanded(open) {
  setInvoiceAccordionExpanded(els.invoiceSendWrap, els.invoiceSendPanel, els.invoiceSendBtn, open);
}

function closeInvoiceSendMenu() {
  setInvoiceSendExpanded(false);
}

function toggleInvoiceSendMenu() {
  const open = !(els.invoiceSendWrap?.classList.contains("is-open"));
  setInvoiceSendExpanded(open);
}

function invoiceSavePayload() {
  return {
    id: state.invoiceId || null,
    invoice_number: getInvoiceField("invoice-number").trim() || null,
    invoice_date: getInvoiceField("invoice-date").trim() || null,
    appointment_id: state.invoiceJobId || null,
    customer_name: getInvoiceField("invoice-customer-name").trim() || null,
    customer_phone: getInvoiceField("invoice-customer-phone").trim() || null,
    customer_email: getInvoiceField("invoice-customer-email").trim() || null,
    customer_address: getInvoiceField("invoice-customer-address").trim() || null,
    job_summary: getInvoiceField("invoice-job-summary").trim() || null,
    technician_name: getInvoiceField("invoice-tech").trim() || null,
    notes: els.invoiceNotes?.value?.trim() || null,
    tax_rate: Number(els.invoiceTaxRate?.value || 8.25),
    lines: serializeInvoiceLines(),
    mode: state.invoiceMode === "manual" ? "manual" : "job",
  };
}

async function saveInvoiceDocument() {
  if (!invoiceHasContent()) {
    showAppToast(t("invoice.saveNeedContent"), true);
    return;
  }
  const wasUpdate = !!state.invoiceId;
  try {
    const saved = await api("/api/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceSavePayload()),
    });
    state.invoiceId = saved.id;
    if (saved.invoice_number) setInvoiceField("invoice-number", saved.invoice_number);
    showAppToast(wasUpdate ? t("invoice.savedUpdated") : t("invoice.saved"));
    if (els.invoiceSavedDetails?.open) await loadSavedInvoices();
  } catch (err) {
    showAppToast(err.message || t("invoice.saveFailed"), true);
  }
}

function fillInvoiceFromSaved(inv) {
  if (!inv) return;
  state.invoiceId = inv.id;
  state.invoiceJobId = inv.appointment_id || null;
  setInvoiceMode(inv.mode === "manual" ? "manual" : "job");
  setInvoiceField("invoice-number", inv.invoice_number || "");
  setInvoiceField("invoice-date", inv.invoice_date || "");
  setInvoiceField("invoice-customer-name", inv.customer_name || "");
  setInvoiceField("invoice-customer-phone", inv.customer_phone || "");
  setInvoiceField("invoice-customer-email", inv.customer_email || "");
  setInvoiceField("invoice-customer-address", inv.customer_address || "");
  setInvoiceField("invoice-job-summary", inv.job_summary || "");
  setInvoiceField("invoice-tech", inv.technician_name || "");
  if (els.invoiceNotes) els.invoiceNotes.value = inv.notes || "";
  if (els.invoiceTaxRate) els.invoiceTaxRate.value = String(inv.tax_rate ?? 8.25);
  state.invoiceLines = Array.isArray(inv.lines)
    ? inv.lines.map((l) => ({
        kind: l.kind === "material" ? "material" : "service",
        description: l.description || "",
        qty: Number(l.qty || 0),
        rate: Number(l.rate || 0),
      }))
    : [];
  renderInvoiceLines();
  syncInvoiceDayListActive(state.invoiceJobId);
  document.querySelectorAll(".invoice-job-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.id) === state.invoiceJobId);
  });
  closeInvoiceSendMenu();
}

async function loadSavedInvoices() {
  if (!els.invoiceSavedList) return;
  els.invoiceSavedList.innerHTML = `<p class="status">${escapeHtml(t("invoice.savedLoading"))}</p>`;
  try {
    state.invoiceSaved = await api("/api/invoices?limit=40");
    if (!state.invoiceSaved.length) {
      els.invoiceSavedList.innerHTML = `<p class="status">${escapeHtml(t("invoice.savedEmpty"))}</p>`;
      return;
    }
    els.invoiceSavedList.innerHTML = state.invoiceSaved
      .map((inv) => {
        const name = inv.customer_name || "—";
        const meta = `${name} · ${money(inv.total || 0)}`;
        return `<button type="button" class="invoice-job-btn ${
          state.invoiceId === inv.id ? "active" : ""
        }" data-saved-id="${inv.id}">
          <strong>${escapeHtml(inv.invoice_number || `#${inv.id}`)}</strong>
          <span>${escapeHtml(meta)}</span>
        </button>`;
      })
      .join("");
    els.invoiceSavedList.querySelectorAll("[data-saved-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.savedId);
        const inv = state.invoiceSaved.find((row) => row.id === id);
        if (inv) fillInvoiceFromSaved(inv);
      });
    });
  } catch (err) {
    els.invoiceSavedList.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function handleInvoiceEditAction(action) {
  if (action === "add-service") {
    state.invoiceLines.push({ kind: "service", description: "", qty: 1, rate: 0 });
    renderInvoiceLines();
    focusNewestInvoiceLine("service");
    return;
  }
  if (action === "add-material") {
    state.invoiceLines.push({
      kind: "material",
      description: "",
      qty: 1,
      rate: 0,
    });
    renderInvoiceLines();
    focusNewestInvoiceLine("material");
    return;
  }
  if (action === "remove-line") {
    if (!state.invoiceLines.length) return;
    state.invoiceLines.pop();
    renderInvoiceLines();
    showAppToast(t("invoice.removedLine"));
    return;
  }
  if (action === "clear-lines") {
    state.invoiceLines = [];
    renderInvoiceLines();
    showAppToast(t("invoice.clearedLines"));
    return;
  }
  if (action === "edit-notes") {
    els.invoiceNotes?.focus();
    return;
  }
  if (action === "edit-tax") {
    els.invoiceTaxRate?.focus();
    els.invoiceTaxRate?.select?.();
    return;
  }
  if (action === "manual") {
    startManualInvoice();
  }
}

function focusNewestInvoiceLine(kind) {
  const tbody = kind === "material" ? els.invoiceMaterialLines : els.invoiceServiceLines;
  const input = tbody?.querySelector("tr:last-child input[data-field='description']");
  input?.focus();
}

function currentInvoiceDocumentPayload() {
  return {
    invoice_number: getInvoiceField("invoice-number").trim() || null,
    invoice_date: getInvoiceField("invoice-date").trim() || null,
    customer_name: getInvoiceField("invoice-customer-name").trim() || null,
    customer_phone: getInvoiceField("invoice-customer-phone").trim() || null,
    customer_email: getInvoiceField("invoice-customer-email").trim() || null,
    customer_address: getInvoiceField("invoice-customer-address").trim() || null,
    job_summary: getInvoiceField("invoice-job-summary").trim() || null,
    technician_name: getInvoiceField("invoice-tech").trim() || null,
    notes: els.invoiceNotes?.value?.trim() || null,
    tax_rate: Number(els.invoiceTaxRate?.value || 8.25),
    lines: serializeInvoiceLines(),
    business_name: label("brand"),
    language: currentLang(),
  };
}

function openInvoiceSendDialog(channel) {
  if (!els.invoiceSendDialog) return;
  if (!invoiceHasContent()) {
    showAppToast(t("invoice.needJobOrManual"), true);
    return;
  }
  state.invoiceSendChannel = channel === "email" ? "email" : "sms";
  const isEmail = state.invoiceSendChannel === "email";
  if (els.invoiceSendTitle) {
    els.invoiceSendTitle.textContent = isEmail ? t("invoice.sendEmailTitle") : t("invoice.sendTextTitle");
  }
  if (els.invoiceSendDestLabel) {
    els.invoiceSendDestLabel.textContent = isEmail ? t("invoice.sendToEmail") : t("invoice.sendToPhone");
  }
  if (els.invoiceSendHint) {
    els.invoiceSendHint.textContent = isEmail ? t("invoice.sendHintEmail") : t("invoice.sendHintSms");
  }
  const doc = currentInvoiceDocumentPayload();
  if (els.invoiceSendDest) {
    // Switch type first so any shared phone-format listeners no-op for email.
    els.invoiceSendDest.type = isEmail ? "email" : "tel";
    els.invoiceSendDest.inputMode = isEmail ? "email" : "tel";
    els.invoiceSendDest.autocomplete = isEmail ? "email" : "tel";
    if (isEmail) {
      // Prefill from the invoice currently on screen (Bill to email).
      els.invoiceSendDest.value = (doc.customer_email || "").trim();
      els.invoiceSendDest.placeholder = t("booking.emailPh");
    } else {
      const phone = (doc.customer_phone || "").trim();
      els.invoiceSendDest.value = typeof formatUsPhone === "function" ? formatUsPhone(phone) : phone;
      els.invoiceSendDest.placeholder = "";
      if (typeof attachUsPhoneFormat === "function") attachUsPhoneFormat(els.invoiceSendDest);
    }
  }
  if (els.invoiceSendError) {
    els.invoiceSendError.hidden = true;
    els.invoiceSendError.textContent = "";
  }
  els.invoiceSendDialog.showModal();
  els.invoiceSendDest?.focus();
}

function closeInvoiceSendDialog() {
  if (els.invoiceSendDialog?.open) els.invoiceSendDialog.close();
  state.invoiceSendChannel = null;
}

function invoiceSharePayload(to) {
  return {
    to,
    ...currentInvoiceDocumentPayload(),
  };
}

async function submitInvoiceSend(event) {
  event.preventDefault();
  const to = (els.invoiceSendDest?.value || "").trim();
  if (!to) {
    if (els.invoiceSendError) {
      els.invoiceSendError.hidden = false;
      els.invoiceSendError.textContent = t("invoice.needDest");
    }
    return;
  }
  const channel = state.invoiceSendChannel === "email" ? "email" : "sms";
  const path = channel === "email" ? "/api/invoice/send-email" : "/api/invoice/send-sms";
  try {
    const result = await api(path, {
      method: "POST",
      body: JSON.stringify(invoiceSharePayload(to)),
    });
    if (!result?.configured) {
      showAppToast(
        channel === "email" ? t("invoice.emailNotConfigured") : t("invoice.smsNotConfigured"),
        true
      );
      closeInvoiceSendDialog();
      return;
    }
    if (!result?.ok) {
      // HTTP 200 with ok:false (Twilio reject / undelivered) — never show “sent”.
      showAppToast(result?.detail || t("invoice.sendFailed"), true);
      return;
    }
    if (result?.trial_template && result?.detail) {
      showAppToast(result.detail);
    } else {
      showAppToast(channel === "email" ? t("invoice.emailSent") : t("invoice.smsSent"));
    }
    closeInvoiceSendDialog();
  } catch (err) {
    showAppToast(err.message || t("invoice.sendFailed"), true);
  }
}

if (els.invoiceSearch) {
  els.invoiceSearch.addEventListener("input", () => {
    clearTimeout(state.invoiceSearchTimer);
    state.invoiceSearchTimer = setTimeout(loadInvoiceJobs, 250);
  });
}
if (els.invoiceStart) els.invoiceStart.addEventListener("change", loadInvoiceJobs);
if (els.invoiceEnd) els.invoiceEnd.addEventListener("change", loadInvoiceJobs);
if (els.invoiceDateRefresh) els.invoiceDateRefresh.addEventListener("click", loadInvoiceJobs);
if (els.invoiceDay) {
  els.invoiceDay.addEventListener("change", () => {
    loadInvoiceDayAppointments();
  });
}
if (els.invoiceTechFilter) {
  els.invoiceTechFilter.addEventListener("change", () => {
    loadInvoiceDayAppointments();
    loadInvoiceJobs();
  });
}
if (els.invoiceManualBtn) els.invoiceManualBtn.addEventListener("click", startManualInvoice);
if (els.invoicePhoneFind) els.invoicePhoneFind.addEventListener("click", findInvoiceByPhone);
if (els.invoicePhone) {
  els.invoicePhone.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      findInvoiceByPhone();
    }
  });
}
if (els.invoiceEditBtn) {
  els.invoiceEditBtn.addEventListener("click", () => {
    clearInvoiceForm();
  });
}
if (els.invoiceSendBtn) {
  els.invoiceSendBtn.addEventListener("click", () => {
    toggleInvoiceSendMenu();
  });
}
if (els.invoiceText) {
  els.invoiceText.addEventListener("click", () => {
    closeInvoiceSendMenu();
    openInvoiceSendDialog("sms");
  });
}
if (els.invoiceEmail) {
  els.invoiceEmail.addEventListener("click", () => {
    closeInvoiceSendMenu();
    openInvoiceSendDialog("email");
  });
}
if (els.invoiceSave) els.invoiceSave.addEventListener("click", () => saveInvoiceDocument());
if (els.invoiceSavedDetails) {
  els.invoiceSavedDetails.addEventListener("toggle", () => {
    if (els.invoiceSavedDetails.open) loadSavedInvoices();
  });
}
if (els.invoiceSendForm) els.invoiceSendForm.addEventListener("submit", submitInvoiceSend);
if (els.invoiceSendCancel) els.invoiceSendCancel.addEventListener("click", closeInvoiceSendDialog);
if (els.invoiceSendClose) els.invoiceSendClose.addEventListener("click", closeInvoiceSendDialog);
if (els.invoiceSendDialog) {
  els.invoiceSendDialog.addEventListener("close", () => {
    state.invoiceSendChannel = null;
  });
}
if (els.invoiceTaxRate) els.invoiceTaxRate.addEventListener("input", updateInvoiceTotals);
if (els.invoiceExport) els.invoiceExport.addEventListener("click", exportInvoicePdf);
if (els.invoicePrint) {
  els.invoicePrint.addEventListener("click", () => {
    const notesPrint = document.getElementById("invoice-notes-print");
    if (notesPrint && els.invoiceNotes) {
      notesPrint.textContent = els.invoiceNotes.value.trim();
      notesPrint.hidden = !els.invoiceNotes.value.trim();
    }
    window.print();
  });
}
function rememberInvoiceWorkspaceHome() {
  if (state.invoiceWorkspaceHome) return;
  const toolbar = els.invoiceToolbar;
  const sheetWrap = els.invoiceSheetWrap;
  if (!toolbar || !sheetWrap) return;
  state.invoiceWorkspaceHome = {
    toolbarParent: toolbar.parentNode,
    toolbarNext: toolbar.nextSibling,
    sheetParent: sheetWrap.parentNode,
    sheetNext: sheetWrap.nextSibling,
  };
}

function restoreInvoiceWorkspace() {
  const home = state.invoiceWorkspaceHome;
  const toolbar = els.invoiceToolbar;
  const sheetWrap = els.invoiceSheetWrap;
  if (home && toolbar && sheetWrap && toolbar.parentNode !== home.toolbarParent) {
    home.toolbarParent.insertBefore(toolbar, home.toolbarNext);
    home.sheetParent.insertBefore(sheetWrap, home.sheetNext);
  }
  state.invoiceInDetail = false;
  document.body.classList.remove("invoice-in-detail");
  closeInvoiceSendMenu();
}

function parkInvoiceWorkspaceInDetail() {
  if (!els.detailInvoiceHost || !els.invoiceToolbar || !els.invoiceSheetWrap) return false;
  rememberInvoiceWorkspaceHome();
  els.detailInvoiceHost.appendChild(els.invoiceToolbar);
  els.detailInvoiceHost.appendChild(els.invoiceSheetWrap);
  state.invoiceInDetail = true;
  document.body.classList.add("invoice-in-detail");
  return true;
}

async function findInvoiceForAppointment(appointmentId) {
  if (!appointmentId) return null;
  try {
    const list = await api(`/api/invoices?appointment_id=${appointmentId}&limit=5`);
    return Array.isArray(list) && list.length ? list[0] : null;
  } catch (_) {
    return null;
  }
}

async function openInvoiceInDetail(job) {
  if (!job || !els.detailDialog) return;
  closeTechDayPopover();
  closeInvoiceSendMenu();

  els.detailDialog.dataset.mode = "invoice";
  els.detailEyebrow.textContent = t("detail.invoiceEyebrow");
  els.detailTitle.textContent = `${applianceLabel(job.appliance)} · ${formatTime(job.starts_at)}`;
  syncDetailDayLabel(job.starts_at);
  els.detailView.hidden = true;
  els.editForm.hidden = true;
  if (els.detailInvoice) els.detailInvoice.hidden = false;

  if (!parkInvoiceWorkspaceInDetail()) {
    showDetailView();
    return;
  }

  if (!els.detailDialog.open) els.detailDialog.showModal();
  syncTouchLockSuppression();

  ensureInvoiceDayDefault();
  if (job.starts_at && els.invoiceDay) {
    els.invoiceDay.value = toDateInputValue(new Date(job.starts_at));
  }

  const existing = await findInvoiceForAppointment(job.id);
  if (existing) fillInvoiceFromSaved(existing);
  else await fillInvoiceFromJob(job);

  els.detailInvoiceHost?.scrollTo?.(0, 0);
}

async function exitInvoiceInDetail() {
  const id = state.activeAppointmentId;
  if (id) {
    await openDetail(id);
    return;
  }
  showDetailView();
}

if (els.invoiceFromDetail) {
  els.invoiceFromDetail.addEventListener("click", async () => {
    let job = findAppointment(state.activeAppointmentId);
    if (!job && state.activeAppointmentId) {
      try {
        job = await api(`/api/appointments/${state.activeAppointmentId}`);
      } catch (_) {
        job = null;
      }
    }
    if (!job) return;
    await openInvoiceInDetail(job);
  });
}
if (els.detailInvoiceBack) {
  els.detailInvoiceBack.addEventListener("click", () => exitInvoiceInDetail());
}
if (els.detailInvoiceClose) {
  els.detailInvoiceClose.addEventListener("click", dismissDetailDialog);
}

ensureInvoiceDayDefault();
renderInvoiceLines();
ensureNewInvoiceDefaults();

/* —— Settings (unified Team) —— */
function setTeamSettingsMsg(text, isError = false) {
  if (!els.teamSettingsMsg) return;
  if (!text) {
    els.teamSettingsMsg.hidden = true;
    els.teamSettingsMsg.textContent = "";
    els.teamSettingsMsg.classList.remove("is-error");
    return;
  }
  els.teamSettingsMsg.hidden = false;
  els.teamSettingsMsg.textContent = text;
  els.teamSettingsMsg.classList.toggle("is-error", !!isError);
}

function activeTeamMemberIds(listEl) {
  return [...listEl.querySelectorAll(".team-settings-row[data-active='1']")].map((row) =>
    Number(row.dataset.memberId)
  );
}

async function persistTeamSettingsOrder(listEl, previousIds) {
  const memberIds = activeTeamMemberIds(listEl);
  if (memberIds.length < 2) return;
  if (
    Array.isArray(previousIds) &&
    previousIds.length === memberIds.length &&
    previousIds.every((id, i) => id === memberIds[i])
  ) {
    return;
  }
  try {
    await api("/api/team/reorder", {
      method: "PATCH",
      body: JSON.stringify({ member_ids: memberIds }),
    });
    setTeamSettingsMsg(t("settings.orderUpdated"));
    await refreshTechniciansAndBoard();
    await loadTeamSettings();
  } catch (err) {
    setTeamSettingsMsg(err.message || t("settings.couldNotReorder"), true);
    await loadTeamSettings();
  }
}

async function moveTeamMemberByKeyboard(memberId, direction) {
  try {
    await api(`/api/team/${memberId}/move`, {
      method: "PATCH",
      body: JSON.stringify({ direction }),
    });
    setTeamSettingsMsg(t("settings.orderUpdated"));
    await refreshTechniciansAndBoard();
    await loadTeamSettings();
  } catch (err) {
    setTeamSettingsMsg(err.message || t("settings.couldNotReorder"), true);
  }
}

function wireTeamSettingsDragReorder(listEl) {
  const activeGroup = listEl.querySelector("[data-team-active-list]");
  if (!activeGroup) return;

  const clearDragClasses = () => {
    activeGroup.querySelectorAll(".team-settings-row").forEach((r) => {
      r.classList.remove("is-dragging", "is-drag-over");
      const idEl = r.querySelector(".team-settings-identity");
      if (idEl) idEl.setAttribute("aria-grabbed", "false");
    });
  };

  const rowFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest?.(".team-settings-row[data-active='1']") || null;
  };

  const placeDraggedRow = (fromRow, toRow, clientY) => {
    if (!fromRow || !toRow || fromRow === toRow) return false;
    const rect = toRow.getBoundingClientRect();
    const before = clientY < rect.top + rect.height / 2;
    if (before) {
      if (toRow.previousElementSibling === fromRow) return false;
      toRow.before(fromRow);
    } else {
      if (toRow.nextElementSibling === fromRow) return false;
      toRow.after(fromRow);
    }
    return true;
  };

  activeGroup.querySelectorAll(".team-settings-row[data-active='1']").forEach((row) => {
    const identity = row.querySelector(".team-settings-identity");
    if (!identity) return;
    const nameInput = identity.querySelector('[data-field="name"]');
    const memberId = Number(row.dataset.memberId);

    const beginPointerReorder = (e, { fromName = false } = {}) => {
      if (e.button !== 0) return;
      /* Editing the name: keep normal text selection. */
      if (fromName && document.activeElement === nameInput) return;

      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      const threshold = 5;
      const pointerId = e.pointerId;
      const previousIds = activeTeamMemberIds(activeGroup);

      if (fromName) {
        /* Defer focus so a drag can start from the name without fighting the caret. */
        e.preventDefault();
      }

      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (!dragging && dist > threshold) {
          dragging = true;
          row.classList.add("is-dragging");
          identity.setAttribute("aria-grabbed", "true");
          try {
            identity.setPointerCapture(pointerId);
          } catch (_) {
            /* ignore */
          }
          nameInput?.blur();
        }
        if (!dragging) return;
        ev.preventDefault();
        const over = rowFromPoint(ev.clientX, ev.clientY);
        activeGroup.querySelectorAll(".team-settings-row.is-drag-over").forEach((r) => {
          if (r !== over) r.classList.remove("is-drag-over");
        });
        if (over && over !== row) {
          over.classList.add("is-drag-over");
          placeDraggedRow(row, over, ev.clientY);
        }
      };

      const onUp = async (ev) => {
        if (ev.pointerId !== pointerId) return;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        try {
          identity.releasePointerCapture(pointerId);
        } catch (_) {
          /* ignore */
        }
        const didDrag = dragging;
        clearDragClasses();
        if (didDrag) {
          await persistTeamSettingsOrder(activeGroup, previousIds);
        } else if (fromName) {
          nameInput?.focus();
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    };

    identity.addEventListener("pointerdown", (e) => {
      if (e.target.closest('[data-field="name"]')) {
        beginPointerReorder(e, { fromName: true });
        return;
      }
      if (e.target.closest("input, select, button, a, label")) return;
      beginPointerReorder(e);
    });

    identity.addEventListener("keydown", (e) => {
      if (e.target !== identity) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveTeamMemberByKeyboard(memberId, "up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveTeamMemberByKeyboard(memberId, "down");
      }
    });
  });
}

function renderTeamSettingsRow(member) {
  const admin = isAdmin();
  const active = Number(member.active) !== 0;
  const color = nearestPaletteColor(member.color);
  const roleLabel = member.role === "admin" ? t("users.roleAdmin") : t("users.roleUser");
  const statusLabel = active ? t("users.active") : t("users.inactive");
  const canDrag = admin && active;
  const dragAttrs = canDrag
    ? ` tabindex="0" aria-grabbed="false" aria-label="${escapeHtml(t("settings.dragToReorder"))}" title="${escapeHtml(t("settings.dragToReorder"))}"`
    : "";
  const passwordBlock = active
    ? admin
      ? `<div class="team-settings-password" role="group" aria-label="${escapeHtml(t("users.resetPwGroup"))}">
           <span class="team-settings-password-label">${escapeHtml(t("users.resetPwGroup"))}</span>
           <div class="team-settings-password-actions">
             <button type="button" class="chip" data-action="reset-pw">${escapeHtml(t("users.resetPw"))}</button>
             <button type="button" class="chip" data-action="send-reset">${escapeHtml(t("users.sendReset"))}</button>
           </div>
         </div>`
      : `<div class="team-settings-password" role="group" aria-label="${escapeHtml(t("auth.changePasswordSelf"))}">
           <span class="team-settings-password-label">${escapeHtml(t("auth.changePasswordSelf"))}</span>
           <div class="team-settings-password-actions">
             <button type="button" class="chip" data-action="change-pw">${escapeHtml(t("auth.changePasswordSelf"))}</button>
           </div>
         </div>`
    : "";
  const roleField = admin
    ? `<label class="team-settings-field">
        <span class="visually-hidden">${escapeHtml(t("users.role"))}</span>
        <select data-field="role" title="${escapeHtml(t("users.role"))}" aria-label="${escapeHtml(t("users.role"))}" ${active ? "" : "disabled"}>
          <option value="user"${member.role === "user" ? " selected" : ""}>${escapeHtml(t("users.roleUser"))}</option>
          <option value="admin"${member.role === "admin" ? " selected" : ""}>${escapeHtml(t("users.roleAdmin"))}</option>
        </select>
      </label>`
    : `<label class="team-settings-field">
        <span class="visually-hidden">${escapeHtml(t("users.role"))}</span>
        <input type="text" value="${escapeHtml(roleLabel)}" readonly title="${escapeHtml(t("users.role"))}" />
        <input type="hidden" data-field="role" value="${escapeHtml(member.role || "user")}" />
      </label>`;
  const actions = active
    ? admin
      ? `<button type="button" class="chip" data-action="save">${escapeHtml(t("users.save"))}</button>
         <button type="button" class="danger" data-action="deactivate">${escapeHtml(t("users.deactivate"))}</button>`
      : `<button type="button" class="chip" data-action="save">${escapeHtml(t("users.save"))}</button>`
    : admin
      ? `<button type="button" class="chip" data-action="activate">${escapeHtml(t("users.reactivate"))}</button>
         <button type="button" class="danger" data-action="purge">${escapeHtml(t("settings.techDeleteForever"))}</button>`
      : "";
  return `
    <div class="team-settings-row${active ? "" : " is-inactive"}" data-member-id="${member.id}" data-active="${active ? "1" : "0"}">
      <div class="team-settings-swatches">
        ${renderColorPicker(color, { namePrefix: `color-${member.id}` })}
      </div>
      <div class="team-settings-identity${canDrag ? " is-draggable" : ""}"${dragAttrs}>
        <input type="text" data-field="name" draggable="false" value="${escapeHtml(member.name)}" maxlength="100" aria-label="${escapeHtml(t("common.name"))}" ${active ? "" : "readonly"} />
        <span class="team-settings-meta"><span class="team-settings-login">${escapeHtml(t("settings.loginAs"))}: ${escapeHtml(member.username)}</span> · ${escapeHtml(statusLabel)} · ${escapeHtml(roleLabel)}</span>
        ${passwordBlock}
      </div>
      <label class="team-settings-field">
        <span class="visually-hidden">${escapeHtml(t("users.email"))}</span>
        <input type="email" data-field="email" value="${escapeHtml(member.email || "")}" maxlength="255" placeholder="${escapeHtml(t("users.email"))}" title="${escapeHtml(t("users.email"))}" ${active ? "" : "readonly"} />
      </label>
      <label class="team-settings-field">
        <span class="visually-hidden">${escapeHtml(t("users.phone"))}</span>
        <input type="tel" data-field="phone" value="${escapeHtml(typeof formatUsPhone === "function" ? formatUsPhone(member.phone || "") : member.phone || "")}" maxlength="40" placeholder="${escapeHtml(t("users.phone"))}" title="${escapeHtml(t("users.phone"))}" ${active ? "" : "readonly"} />
      </label>
      ${roleField}
      <label class="team-settings-field">
        <span class="visually-hidden">${escapeHtml(t("settings.startLocation"))}</span>
        <input type="text" data-field="start_location" value="${escapeHtml(member.start_location || "Shop")}" maxlength="255" placeholder="${escapeHtml(t("settings.startLocation"))}" title="${escapeHtml(t("settings.startLocation"))}" ${active ? "" : "readonly"} />
      </label>
      <div class="team-settings-actions">
        ${actions}
      </div>
    </div>`;
}

function renderTeamSettings(members) {
  if (!els.teamSettingsList) return;
  closeAllColorPickers();
  state.teamMembersCache = Array.isArray(members) ? members : [];
  const picker = document.getElementById("team-member-select");
  if (!state.teamMembersCache.length) {
    if (picker) {
      picker.innerHTML = "";
      picker.disabled = true;
      enhanceDeskSelect(picker);
    }
    els.teamSettingsList.innerHTML = `<p class="status">${escapeHtml(t("settings.noMembersYet"))}</p>`;
    return;
  }
  const active = state.teamMembersCache.filter((m) => Number(m.active) !== 0);
  const inactive = state.teamMembersCache.filter((m) => Number(m.active) === 0);
  let selectedId = Number(state.teamSettingsSelectedId);
  if (!state.teamMembersCache.some((m) => Number(m.id) === selectedId)) {
    selectedId = Number((active[0] || inactive[0] || {}).id) || 0;
    state.teamSettingsSelectedId = selectedId;
  }
  if (picker) {
    picker.disabled = false;
    const groups = [];
    if (active.length) {
      groups.push(
        `<optgroup label="${escapeHtml(t("settings.techActive"))}">${active
          .map(
            (m) =>
              `<option value="${m.id}"${Number(m.id) === selectedId ? " selected" : ""}>${escapeHtml(m.name)}</option>`
          )
          .join("")}</optgroup>`
      );
    }
    if (inactive.length) {
      groups.push(
        `<optgroup label="${escapeHtml(t("settings.techInactive"))}">${inactive
          .map(
            (m) =>
              `<option value="${m.id}"${Number(m.id) === selectedId ? " selected" : ""}>${escapeHtml(m.name)}</option>`
          )
          .join("")}</optgroup>`
      );
    }
    picker.innerHTML = groups.join("");
    picker.value = String(selectedId);
    if (picker.dataset.wired !== "1") {
      picker.dataset.wired = "1";
      picker.addEventListener("change", () => {
        state.teamSettingsSelectedId = Number(picker.value) || 0;
        renderTeamSettings(state.teamMembersCache || []);
      });
    }
    enhanceDeskSelect(picker);
  }
  const member = state.teamMembersCache.find((m) => Number(m.id) === selectedId);
  els.teamSettingsList.innerHTML = member
    ? renderTeamSettingsRow(member)
    : `<p class="status">${escapeHtml(t("settings.noMembersYet"))}</p>`;
  if (typeof attachUsPhoneFormatAll === "function") {
    attachUsPhoneFormatAll(els.teamSettingsList);
  }

  els.teamSettingsList.querySelectorAll(".team-settings-row").forEach((row) => {
    const id = Number(row.dataset.memberId);
    const isActive = row.dataset.active === "1";
    if (isActive) {
      wireColorPicker(row, {
        onChange: async (color) => {
          try {
            await api(`/api/team/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ color }),
            });
            setTeamSettingsMsg(t("settings.colorSaved"));
            await refreshTechniciansAndBoard();
            await loadTeamSettings();
          } catch (err) {
            setTeamSettingsMsg(err.message || t("settings.couldNotSaveColor"), true);
          }
        },
      });
    }
    row.querySelector('[data-action="save"]')?.addEventListener("click", async () => {
      const name = row.querySelector('[data-field="name"]')?.value?.trim();
      const color = row.querySelector('[data-field="color"]')?.value;
      const email = row.querySelector('[data-field="email"]')?.value?.trim() || "";
      const phone = row.querySelector('[data-field="phone"]')?.value?.trim() || "";
      const role = row.querySelector('[data-field="role"]')?.value || "user";
      const start_location =
        row.querySelector('[data-field="start_location"]')?.value?.trim() || "Shop";
      if (!name) {
        setTeamSettingsMsg(t("settings.nameRequired"), true);
        return;
      }
      try {
        await api(`/api/team/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            color: normalizeTechColor(color),
            email,
            phone,
            role,
            start_location,
          }),
        });
        setTeamSettingsMsg(t("settings.memberUpdated"));
        await refreshTechniciansAndBoard();
        await loadTeamSettings();
      } catch (err) {
        setTeamSettingsMsg(err.message || t("settings.couldNotUpdate"), true);
      }
    });
    row.querySelector('[data-action="deactivate"]')?.addEventListener("click", async () => {
      if (!confirm(t("settings.confirmDeactivateMember"))) return;
      try {
        await api(`/api/team/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: 0 }),
        });
        setTeamSettingsMsg(t("settings.memberDeactivated"));
        await refreshTechniciansAndBoard();
        await loadTeamSettings();
      } catch (err) {
        setTeamSettingsMsg(err.message || t("settings.couldNotRemove"), true);
      }
    });
    row.querySelector('[data-action="activate"]')?.addEventListener("click", async () => {
      try {
        await api(`/api/team/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: 1 }),
        });
        setTeamSettingsMsg(t("settings.memberReactivated"));
        await refreshTechniciansAndBoard();
        await loadTeamSettings();
      } catch (err) {
        setTeamSettingsMsg(err.message || t("settings.couldNotReactivate"), true);
      }
    });
    row.querySelector('[data-action="purge"]')?.addEventListener("click", async () => {
      if (!confirm(t("settings.confirmPurgeMember"))) return;
      try {
        await api(`/api/team/${id}?permanent=true`, { method: "DELETE" });
        setTeamSettingsMsg(t("settings.memberPurged"));
        await refreshTechniciansAndBoard();
        await loadTeamSettings();
      } catch (err) {
        setTeamSettingsMsg(err.message || t("settings.couldNotDelete"), true);
      }
    });
    row.querySelector('[data-action="change-pw"]')?.addEventListener("click", () => {
      openChangePasswordDialog();
    });
    row.querySelector('[data-action="reset-pw"]')?.addEventListener("click", async () => {
      if (!isAdmin()) return;
      const temp = window.prompt(t("users.promptTempPw"), "");
      if (temp == null) return;
      if (String(temp).trim().length < 6) {
        setTeamSettingsMsg(t("users.promptTempPw"), true);
        return;
      }
      const sendEmail = window.confirm(t("users.alsoEmail"));
      try {
        const result = await api(`/api/users/${id}/reset-password`, {
          method: "POST",
          body: JSON.stringify({
            new_password: String(temp).trim(),
            send_email: !!sendEmail,
          }),
        });
        let msg = t("users.resetOk");
        if (sendEmail) {
          msg += result.email_sent
            ? ` ${t("users.emailSent")}`
            : result.email_detail
              ? ` (${result.email_detail})`
              : "";
        }
        setTeamSettingsMsg(msg, sendEmail && !result.email_sent);
      } catch (err) {
        setTeamSettingsMsg(err.message || t("users.resetOk"), true);
      }
    });
    row.querySelector('[data-action="send-reset"]')?.addEventListener("click", async () => {
      if (!isAdmin()) return;
      try {
        await api(`/api/users/${id}/send-reset-email`, { method: "POST", body: "{}" });
        setTeamSettingsMsg(t("users.emailSent"));
      } catch (err) {
        setTeamSettingsMsg(err.message || t("users.emailSent"), true);
      }
    });
  });
}

async function loadTeamSettings() {
  if (!els.teamSettingsList) return;
  try {
    const members = await api("/api/team");
    renderTeamSettings(members);
  } catch (err) {
    setTeamSettingsMsg(err.message || t("settings.couldNotLoadTeam"), true);
  }
}

function openChangePasswordDialog() {
  if (!els.changePasswordDialog?.showModal) return;
  if (els.changePwError) {
    els.changePwError.hidden = true;
    els.changePwError.textContent = "";
  }
  if (els.changePasswordForm) els.changePasswordForm.reset();
  try {
    els.changePasswordDialog.showModal();
  } catch (_) {
    /* already open */
  }
}

function setServicesSettingsMsg(text, isError) {
  const el = document.getElementById("services-settings-msg");
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("is-error");
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.classList.toggle("is-error", !!isError);
}

function moneyFromCents(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2);
}

function centsFromMoney(raw) {
  const n = Number(String(raw || "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function renderServiceSettingsRow(svc) {
  const active = Number(svc.active) !== 0;
  return `
    <div class="service-settings-row${active ? "" : " is-inactive"}" data-service-id="${svc.id}">
      <label class="service-settings-field grow">
        <span>Name</span>
        <input type="text" data-field="name" value="${escapeHtml(svc.name)}" maxlength="120" ${active ? "" : "readonly"} />
      </label>
      <label class="service-settings-field grow">
        <span>Description</span>
        <input type="text" data-field="description" value="${escapeHtml(svc.description || "")}" maxlength="255" ${active ? "" : "readonly"} />
      </label>
      <label class="service-settings-field">
        <span>Duration</span>
        <input type="number" data-field="duration_minutes" min="5" max="480" step="5" value="${Number(svc.duration_minutes) || 30}" ${active ? "" : "readonly"} />
      </label>
      <label class="service-settings-field">
        <span>Price ($)</span>
        <input type="number" data-field="price" min="0" step="0.01" value="${escapeHtml(moneyFromCents(svc.price_cents))}" ${active ? "" : "readonly"} />
      </label>
      <label class="service-settings-field">
        <span>Order</span>
        <input type="number" data-field="sort_order" min="0" step="1" value="${Number(svc.sort_order) || 0}" ${active ? "" : "readonly"} />
      </label>
      <div class="service-settings-actions">
        ${
          active
            ? `<button type="button" class="chip" data-action="save-service">Save</button>
               <button type="button" class="danger" data-action="deactivate-service">Deactivate</button>`
            : `<button type="button" class="chip" data-action="activate-service">Reactivate</button>
               <button type="button" class="danger" data-action="purge-service">Delete</button>`
        }
      </div>
    </div>`;
}

function renderServicesSettings(services) {
  const list = document.getElementById("services-settings-list");
  if (!list) return;
  state.servicesSettingsCache = Array.isArray(services) ? services : [];
  if (!state.servicesSettingsCache.length) {
    list.innerHTML = `<p class="status">No services yet. Add one below.</p>`;
    return;
  }
  const active = state.servicesSettingsCache.filter((s) => Number(s.active) !== 0);
  const inactive = state.servicesSettingsCache.filter((s) => Number(s.active) === 0);
  list.innerHTML = [
    active.length
      ? `<div class="services-settings-group"><h4 class="team-settings-group-title">Active</h4>${active
          .map(renderServiceSettingsRow)
          .join("")}</div>`
      : "",
    inactive.length
      ? `<div class="services-settings-group"><h4 class="team-settings-group-title">Inactive</h4>${inactive
          .map(renderServiceSettingsRow)
          .join("")}</div>`
      : "",
  ].join("");

  list.querySelectorAll(".service-settings-row").forEach((row) => {
    const id = Number(row.dataset.serviceId);
    row.querySelector('[data-action="save-service"]')?.addEventListener("click", async () => {
      const name = row.querySelector('[data-field="name"]')?.value?.trim();
      const description = row.querySelector('[data-field="description"]')?.value?.trim() || null;
      const duration_minutes = Number(row.querySelector('[data-field="duration_minutes"]')?.value || 30);
      const price_cents = centsFromMoney(row.querySelector('[data-field="price"]')?.value);
      const sort_order = Number(row.querySelector('[data-field="sort_order"]')?.value || 0);
      if (!name) {
        setServicesSettingsMsg("Name is required.", true);
        return;
      }
      try {
        await api(`/api/services/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            description,
            duration_minutes,
            price_cents,
            sort_order,
          }),
        });
        setServicesSettingsMsg("Service updated.");
        state.staffBook.services = [];
        await loadServicesSettings();
      } catch (err) {
        setServicesSettingsMsg(err.message || "Could not update service.", true);
      }
    });
    row.querySelector('[data-action="deactivate-service"]')?.addEventListener("click", async () => {
      try {
        await api(`/api/services/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: 0 }),
        });
        setServicesSettingsMsg("Service deactivated.");
        state.staffBook.services = [];
        await loadServicesSettings();
      } catch (err) {
        setServicesSettingsMsg(err.message || "Could not deactivate.", true);
      }
    });
    row.querySelector('[data-action="activate-service"]')?.addEventListener("click", async () => {
      try {
        await api(`/api/services/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: 1 }),
        });
        setServicesSettingsMsg("Service reactivated.");
        state.staffBook.services = [];
        await loadServicesSettings();
      } catch (err) {
        setServicesSettingsMsg(err.message || "Could not reactivate.", true);
      }
    });
    row.querySelector('[data-action="purge-service"]')?.addEventListener("click", async () => {
      if (!confirm("Permanently delete this service?")) return;
      try {
        await api(`/api/services/${id}?permanent=true`, { method: "DELETE" });
        setServicesSettingsMsg("Service deleted.");
        state.staffBook.services = [];
        await loadServicesSettings();
      } catch (err) {
        setServicesSettingsMsg(err.message || "Could not delete.", true);
      }
    });
  });
}

async function loadServicesSettings() {
  if (!isAdmin()) return;
  const list = document.getElementById("services-settings-list");
  if (!list) return;
  try {
    const rows = await api("/api/services?include_inactive=true");
    renderServicesSettings(rows);
  } catch (err) {
    setServicesSettingsMsg(err.message || "Could not load services.", true);
  }
}

async function refreshTechniciansAndBoard() {
  await loadTechnicians();
  // Always refresh the day board/map so Scheduling reflects tech changes immediately.
  await loadAppointments();
  if (state.page === "analytics") await loadAnalytics();
  if (state.page === "invoice") await loadInvoiceJobs();
  if (state.page === "history") await loadPastAppointments();
}

async function loadShopSettingsIntoForm() {
  const hold = document.getElementById("pref-booking-hold");
  if (!hold) return;
  try {
    const data = await api("/api/shop-settings");
    const n = Number(data?.booking_hold_minutes);
    if (Number.isFinite(n) && n >= 1) hold.value = String(Math.min(60, Math.round(n)));
  } catch (_) {
    /* keep current input value */
  }
}

async function saveBookingHoldSetting() {
  const hold = document.getElementById("pref-booking-hold");
  if (!hold) return;
  let minutes = Number(hold.value);
  if (!Number.isFinite(minutes)) minutes = 10;
  minutes = Math.max(1, Math.min(60, Math.round(minutes)));
  hold.value = String(minutes);
  await api("/api/shop-settings", {
    method: "PATCH",
    body: JSON.stringify({ booking_hold_minutes: minutes }),
  });
}

function syncSettingsRoleCopy() {
  const lead = document.getElementById("settings-page-lead");
  if (lead) {
    const key = isAdmin() ? "settings.lead" : "settings.leadStaff";
    lead.setAttribute("data-i18n", key);
    lead.textContent = t(key);
  }
  const hint = document.getElementById("team-settings-hint");
  if (hint) {
    const key = isAdmin() ? "settings.teamHint" : "settings.teamHintSelf";
    hint.setAttribute("data-i18n", key);
    hint.textContent = t(key);
  }
}

function fillSettingsForm() {
  const p = state.prefs;
  const dur = document.getElementById("pref-duration");
  const travel = document.getElementById("pref-travel");
  const density = document.getElementById("pref-density");
  const accent = document.getElementById("pref-accent");
  const fontPairing = document.getElementById("pref-font-pairing");
  const fontSize = document.getElementById("pref-font-size");
  const language = document.getElementById("pref-language");
  if (dur) dur.value = p.defaultDuration;
  if (travel) travel.value = p.defaultTravel;
  if (density) density.value = p.density || "comfortable";
  if (accent) accent.value = normalizeAccent(p.accent);
  if (fontPairing) fontPairing.value = FONT_PAIRINGS[p.fontPairing] ? p.fontPairing : "workshop";
  if (fontSize) fontSize.value = FONT_SIZE_SCALE[p.fontSize] ? p.fontSize : "M";
  if (language) language.value = p.language === "es" ? "es" : "en";
  if (els.settingsSaved) els.settingsSaved.hidden = true;
  setTeamSettingsMsg("");
  setServicesSettingsMsg("");
  syncSettingsRoleCopy();
  loadTeamSettings();
  if (isAdmin()) {
    loadServicesSettings();
    loadShopSettingsIntoForm();
  }
  nextTechColor();
}

function readSettingsForm() {
  const pairingRaw = document.getElementById("pref-font-pairing")?.value || "workshop";
  const sizeRaw = document.getElementById("pref-font-size")?.value || "M";
  const langRaw = document.getElementById("pref-language")?.value || "en";
  return {
    /* Schedule defaults removed from UI — keep last prefs / app defaults. */
    defaultDuration: Number(state.prefs?.defaultDuration || 90),
    defaultTravel: Number(state.prefs?.defaultTravel || 30),
    showMap: false,
    density: document.getElementById("pref-density")?.value || "comfortable",
    accent: normalizeAccent(document.getElementById("pref-accent")?.value),
    fontPairing: FONT_PAIRINGS[pairingRaw] ? pairingRaw : "workshop",
    fontSize: FONT_SIZE_SCALE[sizeRaw] ? sizeRaw : "M",
    language: langRaw === "es" ? "es" : "en",
    /* Preserve day-board view (not on the settings form). */
    dayBoardView: normalizeDayBoardView(state.prefs?.dayBoardView),
  };
}

function flashSettingsSaved() {
  if (!els.settingsSaved) return;
  els.settingsSaved.hidden = false;
  els.settingsSaved.textContent = t("settings.saved");
  clearTimeout(flashSettingsSaved._timer);
  flashSettingsSaved._timer = setTimeout(() => {
    if (els.settingsSaved) els.settingsSaved.hidden = true;
  }, 1800);
}

if (els.settingsForm) {
  els.settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    savePrefs(readSettingsForm());
    try {
      await saveBookingHoldSetting();
      flashSettingsSaved();
    } catch (err) {
      if (els.settingsSaved) {
        els.settingsSaved.hidden = false;
        els.settingsSaved.textContent = err.message || "Could not save booking hold";
      }
      return;
    }
    if (state.page === "analytics" && state.analytics) renderAnalytics(state.analytics);
  });
  [
    "pref-density",
    "pref-accent",
    "pref-font-pairing",
    "pref-font-size",
    "pref-language",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      savePrefs(readSettingsForm());
      flashSettingsSaved();
      if (state.page === "analytics" && state.analytics) renderAnalytics(state.analytics);
      if (state.page === "scheduling") {
        syncRouteMapVisibility();
        if (isDayScheduleMode()) renderRouteMap();
        renderSchedule();
      }
    });
  });
  const holdEl = document.getElementById("pref-booking-hold");
  if (holdEl) {
    holdEl.addEventListener("change", async () => {
      try {
        await saveBookingHoldSetting();
        flashSettingsSaved();
      } catch (err) {
        if (els.settingsSaved) {
          els.settingsSaved.hidden = false;
          els.settingsSaved.textContent = err.message || "Could not save booking hold";
        }
      }
    });
  }
}
if (els.settingsReset) {
  els.settingsReset.addEventListener("click", () => {
    savePrefs({ ...DEFAULT_PREFS });
    fillSettingsForm();
    flashSettingsSaved();
    if (state.page === "analytics" && state.analytics) renderAnalytics(state.analytics);
  });
}

if (els.teamAddForm) {
  els.teamAddForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    const username = (els.teamAddUsername?.value || "").trim();
    const name = (els.teamAddName?.value || "").trim();
    const email = (els.teamAddEmail?.value || "").trim();
    const phone = (els.teamAddPhone?.value || "").trim();
    const password = (els.teamAddPassword?.value || "").trim();
    const role = els.teamAddRole?.value || "user";
    const color = normalizeTechColor(
      els.teamAddSwatches?.querySelector('[data-field="color"]')?.value ||
        els.teamAddColor?.value ||
        TECH_COLOR_PALETTE[0]
    );
    const start_location = (els.teamAddLocation?.value || "Shop").trim() || "Shop";
    if (!username || !name || !email || !phone || password.length < 6) {
      setTeamSettingsMsg(t("settings.nameRequired"), true);
      return;
    }
    try {
      const created = await api("/api/team", {
        method: "POST",
        body: JSON.stringify({
          username,
          name,
          email,
          phone,
          password,
          role,
          color,
          start_location,
        }),
      });
      if (created?.id) state.teamSettingsSelectedId = Number(created.id);
      if (els.teamAddUsername) els.teamAddUsername.value = "";
      if (els.teamAddName) els.teamAddName.value = "";
      if (els.teamAddEmail) els.teamAddEmail.value = "";
      if (els.teamAddPhone) els.teamAddPhone.value = "";
      if (els.teamAddPassword) els.teamAddPassword.value = "";
      if (els.teamAddRole) els.teamAddRole.value = "user";
      if (els.teamAddLocation) els.teamAddLocation.value = "Shop";
      const addDetails = document.querySelector(".team-settings .team-add-details");
      if (addDetails) addDetails.open = false;
      setTeamSettingsMsg(t("settings.memberAdded"));
      await refreshTechniciansAndBoard();
      await loadTeamSettings();
      nextTechColor();
    } catch (err) {
      setTeamSettingsMsg(err.message || t("settings.memberAdded"), true);
    }
  });
}

document.getElementById("service-add-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isAdmin()) return;
  const name = (document.getElementById("service-add-name")?.value || "").trim();
  const description =
    (document.getElementById("service-add-description")?.value || "").trim() || null;
  const duration_minutes = Number(
    document.getElementById("service-add-duration")?.value || 30
  );
  const price_cents = centsFromMoney(document.getElementById("service-add-price")?.value);
  if (!name) {
    setServicesSettingsMsg("Name is required.", true);
    return;
  }
  try {
    await api("/api/services", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        duration_minutes,
        price_cents,
        sort_order: (state.servicesSettingsCache || []).length,
        active: 1,
      }),
    });
    const nameEl = document.getElementById("service-add-name");
    const descEl = document.getElementById("service-add-description");
    const durEl = document.getElementById("service-add-duration");
    const priceEl = document.getElementById("service-add-price");
    if (nameEl) nameEl.value = "";
    if (descEl) descEl.value = "";
    if (durEl) durEl.value = "30";
    if (priceEl) priceEl.value = "0";
    const details = document.querySelector(".services-settings .team-add-details");
    if (details) details.open = false;
    setServicesSettingsMsg("Service added.");
    state.staffBook.services = [];
    await loadServicesSettings();
  } catch (err) {
    setServicesSettingsMsg(err.message || "Could not add service.", true);
  }
});

if (els.logoutBtn) {
  els.logoutBtn.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
    } catch (_) {
      /* still leave */
    }
    window.location.href = "/login";
  });
}

if (els.changePasswordBtn && els.changePasswordDialog) {
  els.changePasswordBtn.addEventListener("click", () => {
    if (els.changePwError) {
      els.changePwError.hidden = true;
      els.changePwError.textContent = "";
    }
    if (els.changePwCurrent) els.changePwCurrent.value = "";
    if (els.changePwNew) els.changePwNew.value = "";
    els.changePasswordDialog.showModal();
  });
}
if (els.changePwCancel && els.changePasswordDialog) {
  els.changePwCancel.addEventListener("click", () => els.changePasswordDialog.close());
}
if (els.changePasswordForm) {
  els.changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (els.changePwError) {
      els.changePwError.hidden = true;
      els.changePwError.textContent = "";
    }
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: els.changePwCurrent?.value || "",
          new_password: els.changePwNew?.value || "",
        }),
      });
      els.changePasswordDialog?.close();
      if (state.currentUser) state.currentUser.must_change_password = false;
      showAppToast(t("auth.passwordChanged"));
    } catch (err) {
      if (els.changePwError) {
        els.changePwError.textContent = err.message || t("auth.passwordChanged");
        els.changePwError.hidden = false;
      }
    }
  });
}

(async function init() {
  const bootHash = (location.hash || "").replace(/^#/, "").trim().toLowerCase();
  if (bootHash === "past") {
    history.replaceState(null, "", "#history");
  } else if (bootHash === "jobs") {
    history.replaceState(null, "", `#${isJobsHubPage(state.jobsTab) ? state.jobsTab : "analytics"}`);
  }
  if (typeof attachUsPhoneFormatAll === "function") attachUsPhoneFormatAll(document);
  wireNarrowLayout();
  wireTouchLocks();
  wireDayBoardToolbar();
  state.prefs = loadPrefs();
  applyPrefs();
  try {
    await loadCurrentUser();
  } catch (_) {
    window.location.href = "/login";
    return;
  }
  showPage(currentHashPage());
  await loadTechnicians();
  bootstrapBookingBoardAccess();
  if (state.page === "settings") fillSettingsForm();
  await loadAppointments();
})();

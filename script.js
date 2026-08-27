/* ------------------------------------------------------------------------
   Kindleworth dashboard
   ------------------------------------------------------------------------
   Data currently loads from data/poll-results.json. That file is shaped
   the way a backend fed by Twilio WhatsApp poll responses would eventually
   produce it (see README.md for the integration plan) — so once a real
   API exists, `loadData()` below just needs its fetch URL swapped from
   the static file to something like `/api/poll-results`.

   If this page is opened directly (file://) instead of through a local
   server, browsers block fetch() of local files — loadData() falls back
   to an embedded copy of the same data so the dashboard still works.
   ------------------------------------------------------------------------ */

const FALLBACK_DATA = {
  "currentUserId": "charlie",
  "members": [
    { "id": "charlie", "name": "Charlie", "initials": "CS", "color": "#7c5cff", "phone": "+447700900001" },
    { "id": "jasper",  "name": "Jasper",  "initials": "JB", "color": "#3b82f6", "phone": "+447700900002" },
    { "id": "jack",    "name": "Jack",    "initials": "JT", "color": "#22c55e", "phone": "+447700900003" },
    { "id": "zav",     "name": "Zav",     "initials": "ZK", "color": "#f59e0b", "phone": "+447700900004" },
    { "id": "oldman",  "name": "Old Man", "initials": "OM", "color": "#6366f1", "phone": "+447700900005" }
  ],
  "weeks": [
    {
      "weekStart": "2025-04-28", "weekEnd": "2025-05-02",
      "days": ["Mon 28 Apr", "Tue 29 Apr", "Wed 30 Apr", "Thu 1 May", "Fri 2 May"],
      "responses": {
        "charlie": [3, 3, 2, 3, 2], "jasper": [2, 2, 1, 2, 3],
        "jack": [4, 3, 3, 4, 3], "zav": [2, 3, 2, 3, 2], "oldman": [3, 4, 3, 3, 4]
      }
    },
    {
      "weekStart": "2025-05-05", "weekEnd": "2025-05-09",
      "days": ["Mon 5 May", "Tue 6 May", "Wed 7 May", "Thu 8 May", "Fri 9 May"],
      "responses": {
        "charlie": [2, 3, 3, 4, 2], "jasper": [1, 2, 2, 3, 2],
        "jack": [3, 3, 4, 4, 3], "oldman": [4, 4, 3, 3, 3]
      }
    },
    {
      "weekStart": "2025-05-12", "weekEnd": "2025-05-16",
      "days": ["Mon 12 May", "Tue 13 May", "Wed 14 May", "Thu 15 May", "Fri 16 May"],
      "responses": {}
    }
  ],
  "activeWeekIndex": 1,
  "busyness": {
    "week":  { "charlie": 2.8, "jasper": 2.0, "jack": 3.4, "oldman": 3.4 },
    "month": { "charlie": 2.6, "jasper": 2.0, "jack": 2.9, "zav": 2.3, "oldman": 3.1 },
    "year":  { "charlie": 2.7, "jasper": 2.1, "jack": 3.0, "zav": 2.5, "oldman": 3.2 }
  },
  "upcomingWeeks": [
    { "label": "12 May – 16 May", "opensIn": "Poll opens in 2 days", "weekStart": "2025-05-12", "weekEnd": "2025-05-16" },
    { "label": "19 May – 23 May", "opensIn": "Poll opens in 9 days", "weekStart": "2025-05-19", "weekEnd": "2025-05-23" },
    { "label": "26 May – 30 May", "opensIn": "Poll opens in 16 days", "weekStart": "2025-05-26", "weekEnd": "2025-05-30" }
  ],
  "scoreLabels": { "1": "Very Busy", "2": "Busy", "3": "Moderate", "4": "Free", "5": "Very Free" }
};

let DATA = null;
let weekIndex = 0;
let busyPeriod = "month";
let currentView = "overview";
let calendarYear = 2025;
let calendarMonth = 4; // 0-indexed, overwritten in init() from the active week

async function loadData() {
  try {
    const res = await fetch("data/poll-results.json", { cache: "no-store" });
    if (!res.ok) throw new Error("bad response " + res.status);
    return await res.json();
  } catch (e) {
    console.warn(
      "Live data fetch failed (expected if this page was opened as a local file). " +
      "Using embedded sample data instead. Serve this folder through a local server " +
      "to load data/poll-results.json live.",
      e
    );
    return FALLBACK_DATA;
  }
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function scoreLabel(score) {
  const rounded = Math.max(1, Math.min(5, Math.round(score)));
  return DATA.scoreLabels[String(rounded)] || "";
}

function member(id) {
  return DATA.members.find(m => m.id === id);
}

/* ---------------- Poll results table ---------------- */

function renderPollTable() {
  const week = DATA.weeks[weekIndex];
  const head = document.getElementById("pollTableHead");
  const body = document.getElementById("pollTableBody");

  head.innerHTML =
    `<th>Member</th>` +
    week.days.map(d => {
      const [dow, ...rest] = d.split(" ");
      return `<th class="center">${dow}<br><span style="font-weight:400;text-transform:none;color:var(--text-faint)">${rest.join(" ")}</span></th>`;
    }).join("") +
    `<th class="center">Average</th>`;

  body.innerHTML = DATA.members.map(m => {
    const scores = week.responses[m.id];
    const cells = week.days.map((_, i) => {
      const s = scores ? scores[i] : null;
      return s
        ? `<td class="center"><span class="score-pill score-${s}">${s}</span></td>`
        : `<td class="center"><span class="score-pill empty">–</span></td>`;
    }).join("");
    const a = scores ? avg(scores) : null;
    return `<tr>
      <td><div class="member-cell"><span class="avatar" style="background:${m.color}">${m.initials}</span>${m.name}</div></td>
      ${cells}
      <td class="avg-score">${a !== null ? a.toFixed(1) : "—"}</td>
    </tr>`;
  }).join("");

  document.getElementById("weekLabel").textContent = formatWeekLabel(week);
  document.getElementById("prevWeek").disabled = weekIndex === 0;
  document.getElementById("nextWeek").disabled = weekIndex === DATA.weeks.length - 1;
}

function formatWeekLabel(week) {
  const start = new Date(week.weekStart);
  const end = new Date(week.weekEnd);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)} ${end.getFullYear()}`;
}

/* ---------------- Your availability ---------------- */

function renderAvailability() {
  const week = DATA.weeks[weekIndex];
  const list = document.getElementById("availList");
  const userId = DATA.currentUserId;
  let scores = week.responses[userId];

  if (!scores) {
    // poll not open / no responses yet for this week
    scores = week.days.map(() => 3);
    week.responses[userId] = scores;
  }

  list.innerHTML = week.days.map((d, i) => {
    const s = scores[i];
    return `<li class="avail-row" data-index="${i}">
      <span class="avail-day">${d}</span>
      <button class="avail-badge" data-index="${i}">
        <span class="score-pill score-${s}">${s}</span>
        <span class="avail-label">${scoreLabel(s)}</span>
        <svg class="icon chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="avail-menu" data-index="${i}">
        ${[1, 2, 3, 4, 5].map(v => `
          <div class="avail-option" data-index="${i}" data-value="${v}">
            <span class="score-pill score-${v}">${v}</span>${DATA.scoreLabels[v]}
          </div>`).join("")}
      </div>
    </li>`;
  }).join("");

  updateAvailAverage();

  list.querySelectorAll(".avail-badge").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = btn.dataset.index;
      closeAllMenus(idx);
      list.querySelector(`.avail-menu[data-index="${idx}"]`).classList.toggle("open");
    });
  });

  list.querySelectorAll(".avail-option").forEach(opt => {
    opt.addEventListener("click", () => {
      const idx = Number(opt.dataset.index);
      const value = Number(opt.dataset.value);
      DATA.weeks[weekIndex].responses[DATA.currentUserId][idx] = value;
      renderAvailability();
      renderPollTable(); // reflect the change live in the team table
    });
  });
}

function closeAllMenus(exceptIndex) {
  document.querySelectorAll(".avail-menu").forEach(m => {
    if (m.dataset.index !== String(exceptIndex)) m.classList.remove("open");
  });
}

document.addEventListener("click", () => closeAllMenus(null));

function updateAvailAverage() {
  const scores = DATA.weeks[weekIndex].responses[DATA.currentUserId];
  const a = avg(scores);
  document.getElementById("availAverage").textContent = `${a.toFixed(1)} (${scoreLabel(a)})`;
}

/* ---------------- Busiest team members ---------------- */

function renderBusyness() {
  const list = document.getElementById("busyList");
  const stats = DATA.busyness[busyPeriod];

  const ranked = DATA.members
    .map(m => ({ member: m, score: stats[m.id] }))
    .filter(r => typeof r.score === "number")
    .sort((a, b) => a.score - b.score); // lowest average = busiest, shown first

  list.innerHTML = ranked.map((r, i) => {
    const m = r.member;
    const bucket = Math.max(1, Math.min(5, Math.round(r.score)));
    const widthPct = (r.score / 5) * 100;
    const tag = i === 0
      ? `<span class="busy-tag busiest">Busiest</span>`
      : i === ranked.length - 1
        ? `<span class="busy-tag freest">Most Available</span>`
        : "";
    return `<li class="busy-item">
      <span class="busy-rank">${i + 1}</span>
      <span class="busy-member"><span class="avatar" style="background:${m.color}">${m.initials}</span>${m.name}</span>
      <span class="busy-bar-track"><span class="busy-bar-fill score-${bucket}" style="width:${widthPct}%;background:var(--score-${bucket})"></span></span>
      <span class="busy-score">${r.score.toFixed(1)}</span>
      ${tag}
    </li>`;
  }).join("");
}

document.getElementById("busyTabs").addEventListener("click", e => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll("#busyTabs .tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  busyPeriod = tab.dataset.period;
  renderBusyness();
});

/* ---------------- Awaiting responses ---------------- */

function getAwaitingMembers(week) {
  return DATA.members.filter(m => !week.responses[m.id]);
}

function renderAwaiting() {
  const week = DATA.weeks[DATA.activeWeekIndex];
  const list = document.getElementById("awaitingList");
  const subtitle = document.getElementById("awaitingSubtitle");
  const awaiting = getAwaitingMembers(week);

  subtitle.textContent = awaiting.length
    ? "Haven't submitted this week's poll yet"
    : "Everyone has submitted this week's poll";

  if (awaiting.length === 0) {
    list.innerHTML = `<li class="awaiting-empty">
      <svg class="icon small" viewBox="0 0 24 24"><path d="M4 12.5 9 17l11-11"/></svg>
      All caught up
    </li>`;
    return;
  }

  list.innerHTML = awaiting.map(m => `
    <li class="awaiting-item">
      <span class="avatar" style="background:${m.color}">${m.initials}</span>
      <div class="awaiting-info">
        <span class="awaiting-name">${m.name}</span>
        <span class="awaiting-phone">${m.phone}</span>
      </div>
      <button class="awaiting-remind" data-id="${m.id}">Remind</button>
    </li>`).join("");

  list.querySelectorAll(".awaiting-remind").forEach(btn => {
    btn.addEventListener("click", () => {
      const m = member(btn.dataset.id);
      showToast(`WhatsApp reminder to ${m.name} — coming soon once Twilio is wired up.`);
    });
  });
}

/* ---------------- Upcoming weeks ---------------- */

function renderUpcoming() {
  const list = document.getElementById("upcomingList");
  list.innerHTML = DATA.upcomingWeeks.map(w => `
    <li class="upcoming-item">
      <span class="upcoming-label">${w.label}</span>
      <span class="upcoming-sub">${w.opensIn}</span>
    </li>`).join("");
}

/* ---------------- Views ---------------- */

const VIEW_COPY = {
  overview: ["Welcome back, Charlie", "Here's your team availability overview."],
  polls: ["All Polls", "Every weekly poll — past, current and upcoming."],
  calendar: ["Calendar", "Poll weeks at a glance."],
  members: ["Team Members", "Everyone included in the weekly poll."]
};

function switchView(view) {
  currentView = view;
  document.querySelectorAll("#mainNav .nav-item").forEach(a => {
    a.classList.toggle("active", a.dataset.nav === view);
  });
  document.querySelectorAll(".view").forEach(v => {
    v.classList.toggle("active", v.dataset.view === view);
  });
  document.getElementById("weekPicker").style.display = view === "overview" ? "flex" : "none";

  const [title, subtitle] = VIEW_COPY[view] || VIEW_COPY.overview;
  document.getElementById("topbarTitle").textContent = title;
  document.getElementById("topbarSubtitle").textContent = subtitle;

  if (view === "polls") renderPolls();
  if (view === "calendar") renderCalendar();
  if (view === "members") renderMembers();
}

document.getElementById("mainNav").addEventListener("click", e => {
  const a = e.target.closest(".nav-item");
  if (!a) return;
  e.preventDefault();
  switchView(a.dataset.nav);
});

function jumpToWeek(index) {
  weekIndex = index;
  renderPollTable();
  renderAvailability();
  switchView("overview");
}

/* ---------------- Polls view ---------------- */

function pollStatus(index) {
  if (index < DATA.activeWeekIndex) return "closed";
  if (index === DATA.activeWeekIndex) return "open";
  return "upcoming";
}

const POLL_BADGE = {
  open: ["badge-open", "Open"],
  closed: ["badge-closed", "Closed"],
  upcoming: ["badge-upcoming", "Upcoming"]
};

function renderPolls() {
  const list = document.getElementById("pollsList");
  const total = DATA.members.length;

  const rows = DATA.weeks.map((w, i) => {
    const status = pollStatus(i);
    const [badgeClass, badgeLabel] = POLL_BADGE[status];
    const responded = Object.keys(w.responses || {}).length;
    const allScores = Object.values(w.responses || {}).flat();
    const avgAll = allScores.length ? avg(allScores) : null;
    const awaiting = status === "open" ? getAwaitingMembers(w) : [];

    return `<li class="poll-row">
      <span class="poll-dates">${formatWeekLabel(w)}</span>
      <span class="badge ${badgeClass}">${badgeLabel}</span>
      <span class="poll-meta">
        <span>${responded}/${total} responded</span>
        <span class="avg">${avgAll !== null ? "Avg " + avgAll.toFixed(1) : "No responses yet"}</span>
        ${awaiting.length ? `<span>Awaiting: ${awaiting.map(m => m.name).join(", ")}</span>` : ""}
      </span>
      ${responded > 0 ? `<button class="btn-secondary" data-week-index="${i}">View results</button>` : ""}
    </li>`;
  }).join("");

  const scheduledRows = DATA.upcomingWeeks.map(w => `
    <li class="poll-row">
      <span class="poll-dates">${w.label}</span>
      <span class="badge badge-scheduled">Scheduled</span>
      <span class="poll-meta"><span>${w.opensIn}</span></span>
    </li>`).join("");

  list.innerHTML = rows + scheduledRows;

  list.querySelectorAll("button[data-week-index]").forEach(btn => {
    btn.addEventListener("click", () => jumpToWeek(Number(btn.dataset.weekIndex)));
  });
}

/* ---------------- Calendar view ---------------- */

function dateInRange(d, startStr, endStr) {
  const t = d.getTime();
  return t >= new Date(startStr).getTime() && t <= new Date(endStr).getTime();
}

function getDateInfo(d) {
  const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { status: "weekend", weekIndex: null, avgScore: null };
  }

  for (let i = 0; i < DATA.weeks.length; i++) {
    const w = DATA.weeks[i];
    if (dateInRange(d, w.weekStart, w.weekEnd)) {
      // which day of this poll week does `d` fall on, so we can average
      // every member's score for that specific day (not the whole week)
      const dayIndex = Math.round((d - new Date(w.weekStart)) / 86400000);
      const dayScores = DATA.members
        .map(m => w.responses[m.id] ? w.responses[m.id][dayIndex] : undefined)
        .filter(s => typeof s === "number");
      const avgScore = dayScores.length ? avg(dayScores) : null;
      return { status: pollStatus(i), weekIndex: i, avgScore };
    }
  }
  for (const w of DATA.upcomingWeeks) {
    if (w.weekStart && dateInRange(d, w.weekStart, w.weekEnd)) {
      return { status: "scheduled", weekIndex: null, avgScore: null };
    }
  }
  return null;
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const label = document.getElementById("calendarMonthLabel");
  const first = new Date(calendarYear, calendarMonth, 1);
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday-start

  label.textContent = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  let cells = "";
  for (let i = 0; i < offset; i++) cells += `<div class="calendar-cell blank"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const info = getDateInfo(new Date(calendarYear, calendarMonth, day));
    const statusClass = info ? info.status : "";
    const clickable = info && info.weekIndex !== null && info.weekIndex !== undefined;
    const bucket = info && info.avgScore !== null ? Math.max(1, Math.min(5, Math.round(info.avgScore))) : null;
    const marker = bucket !== null
      ? `<span class="score-pill score-${bucket}" title="Team average this day">${info.avgScore.toFixed(1)}</span>`
      : info && info.status === "weekend"
        ? `<span class="cal-weekend-label">Closed</span>`
        : info ? `<span class="cal-dot"></span>` : "";
    cells += `<div class="calendar-cell ${statusClass}" ${clickable ? `data-week-index="${info.weekIndex}"` : ""}>
      <span class="cal-day-num">${day}</span>
      ${marker}
    </div>`;
  }
  grid.innerHTML = cells;

  grid.querySelectorAll(".calendar-cell[data-week-index]").forEach(cell => {
    cell.addEventListener("click", () => jumpToWeek(Number(cell.dataset.weekIndex)));
  });
}

document.getElementById("prevMonth").addEventListener("click", () => {
  calendarMonth--;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  calendarMonth++;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderCalendar();
});

document.getElementById("viewCalendarBtn").addEventListener("click", () => switchView("calendar"));

/* ---------------- Members view ---------------- */

function renderMembers() {
  const grid = document.getElementById("membersGrid");
  const currentWeek = DATA.weeks[DATA.activeWeekIndex];

  grid.innerHTML = DATA.members.map(m => {
    const scores = currentWeek.responses[m.id];
    const a = scores ? avg(scores) : null;
    const bucket = a !== null ? Math.max(1, Math.min(5, Math.round(a))) : null;
    return `<div class="member-card">
      <div class="member-card-top">
        <span class="avatar" style="background:${m.color}">${m.initials}</span>
        <div>
          <div class="member-card-name">${m.name}</div>
          <div class="member-card-phone">${m.phone}</div>
        </div>
      </div>
      <div class="member-card-status">
        <span>This week</span>
        ${a !== null
          ? `<span class="score-pill score-${bucket}" style="margin:0;">${a.toFixed(1)}</span>`
          : `<span class="score-pill empty" style="margin:0;">–</span>`}
      </div>
    </div>`;
  }).join("");
}

/* ---------------- Week navigation + misc ---------------- */

document.getElementById("prevWeek").addEventListener("click", () => {
  if (weekIndex > 0) { weekIndex--; renderPollTable(); renderAvailability(); }
});
document.getElementById("nextWeek").addEventListener("click", () => {
  if (weekIndex < DATA.weeks.length - 1) { weekIndex++; renderPollTable(); renderAvailability(); }
});

document.getElementById("newPollBtn").addEventListener("click", () => {
  showToast("Poll creation + WhatsApp delivery via Twilio is coming soon.");
});

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

/* ---------------- Init ---------------- */

(async function init() {
  DATA = await loadData();
  weekIndex = DATA.activeWeekIndex ?? 1;

  const anchor = new Date(DATA.weeks[DATA.activeWeekIndex].weekStart);
  calendarYear = anchor.getFullYear();
  calendarMonth = anchor.getMonth();

  renderPollTable();
  renderAvailability();
  renderBusyness();
  renderAwaiting();
  renderUpcoming();
})();

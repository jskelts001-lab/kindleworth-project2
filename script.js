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
      "weekStart": "2025-04-28", "weekEnd": "2025-05-04",
      "days": ["Mon 28 Apr", "Tue 29 Apr", "Wed 30 Apr", "Thu 1 May", "Fri 2 May", "Sat 3 May", "Sun 4 May"],
      "responses": {
        "charlie": [3, 3, 2, 3, 2, 2, 3], "jasper": [2, 2, 1, 2, 3, 2, 2],
        "jack": [4, 3, 3, 4, 3, 3, 3], "zav": [2, 3, 2, 3, 2, 2, 3], "oldman": [3, 4, 3, 3, 4, 3, 3]
      }
    },
    {
      "weekStart": "2025-05-05", "weekEnd": "2025-05-11",
      "days": ["Mon 5 May", "Tue 6 May", "Wed 7 May", "Thu 8 May", "Fri 9 May", "Sat 10 May", "Sun 11 May"],
      "responses": {
        "charlie": [2, 3, 3, 4, 2, 1, 2], "jasper": [1, 2, 2, 3, 2, 2, 1],
        "jack": [3, 3, 4, 4, 3, 2, 2], "zav": [2, 2, 3, 3, 2, 1, 2], "oldman": [4, 4, 3, 3, 3, 2, 2]
      }
    },
    {
      "weekStart": "2025-05-12", "weekEnd": "2025-05-18",
      "days": ["Mon 12 May", "Tue 13 May", "Wed 14 May", "Thu 15 May", "Fri 16 May", "Sat 17 May", "Sun 18 May"],
      "responses": {}
    }
  ],
  "activeWeekIndex": 1,
  "tasks": [
    { "id": 1, "title": "Research for history project", "status": "In Progress", "due": "6 May" },
    { "id": 2, "title": "Maths homework", "status": "To Do", "due": "7 May" },
    { "id": 3, "title": "Plan weekend meet-up", "status": "To Do", "due": "8 May" },
    { "id": 4, "title": "Drama script rehearsal", "status": "In Progress", "due": "9 May" },
    { "id": 5, "title": "Buy props", "status": "To Do", "due": "10 May" },
    { "id": 6, "title": "Script final edits", "status": "To Do", "due": "11 May" }
  ],
  "upcomingWeeks": [
    { "label": "12 May – 18 May", "opensIn": "Poll opens in 2 days" },
    { "label": "19 May – 25 May", "opensIn": "Poll opens in 9 days" },
    { "label": "26 May – 1 June", "opensIn": "Poll opens in 16 days" }
  ],
  "scoreLabels": { "1": "Very Busy", "2": "Busy", "3": "Moderate", "4": "Free", "5": "Very Free" }
};

let DATA = null;
let weekIndex = 0;
let taskFilter = "All";

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

/* ---------------- Tasks ---------------- */

function renderTasks() {
  const list = document.getElementById("taskList");
  const filtered = DATA.tasks.filter(t => taskFilter === "All" || t.status === taskFilter);

  list.innerHTML = filtered.map(t => {
    const badgeClass = t.status === "Done" ? "done" : t.status === "In Progress" ? "progress" : "todo";
    return `<li class="task-item">
      <button class="task-check" data-id="${t.id}" title="Mark done"></button>
      <span class="task-title">${t.title}</span>
      <span class="task-badge ${badgeClass}">${t.status}</span>
      <span class="task-due">${t.due}</span>
      <button class="task-menu" title="More">
        <svg class="icon small" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>
      </button>
    </li>`;
  }).join("");

  if (filtered.length === 0) {
    list.innerHTML = `<li class="task-item" style="color:var(--text-faint);justify-content:center;">No tasks in this view</li>`;
  }

  list.querySelectorAll(".task-check").forEach(btn => {
    btn.addEventListener("click", () => {
      const task = DATA.tasks.find(t => t.id === Number(btn.dataset.id));
      task.status = task.status === "Done" ? "To Do" : "Done";
      renderTasks();
    });
  });
}

document.getElementById("taskTabs").addEventListener("click", e => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll("#taskTabs .tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  taskFilter = tab.dataset.filter;
  renderTasks();
});

/* ---------------- Upcoming weeks ---------------- */

function renderUpcoming() {
  const list = document.getElementById("upcomingList");
  list.innerHTML = DATA.upcomingWeeks.map(w => `
    <li class="upcoming-item">
      <span class="upcoming-label">${w.label}</span>
      <span class="upcoming-sub">${w.opensIn}</span>
    </li>`).join("");
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
  renderPollTable();
  renderAvailability();
  renderTasks();
  renderUpcoming();
})();

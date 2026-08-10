(() => {
  let DATA = null;
  let counted = false;

  const $ = (id) => document.getElementById(id);

  const fmtDate = (d) => {
    if (!d) return "undated";
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const SEGMENTS = [
    { key: "relevance", label: "Relevance", color: "#1d8fa0" },
    { key: "magnitude", label: "Magnitude", color: "#0f5f74" },
    { key: "urgency", label: "Urgency", color: "#e8b64c" },
    { key: "evidence", label: "Evidence", color: "#4fb3a8" },
    { key: "access", label: "Access", color: "#7cc8d6" },
  ];

  function metrics() {
    const m = DATA.metrics;
    $("k-watchlist").textContent = m.watchlist + " on watchlist";
    $("k-monitor").textContent = m.monitor + " monitor · " + m.verify_first + " verify first";
    $("k-avg-note").textContent = "across " + m.companies + " companies";
    const days = Math.max(0, Math.round((Date.now() - new Date(m.generated + "T00:00:00")) / 864e5));
    $("updated-label").textContent = "Data " + fmtDate(m.generated) + " · " + (days ? days + " days ago" : "today");
    $("gen-date").textContent = fmtDate(m.generated);
    document.title = "LOOPS — " + m.top_score + "/100 top lead";
    if (!counted) {
      counted = true;
      countUpAll();
    }
  }

  function countUp(el, target, dec) {
    const t0 = performance.now(), dur = 950;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function countUpAll() {
    const m = DATA.metrics;
    countUp($("k-companies"), m.companies, 0);
    countUp($("k-signal"), m.with_signal, 0);
    countUp($("k-ready"), m.ready, 0);
    countUp($("k-named"), m.named_contacts, 0);
    countUp($("k-top"), m.top_score, 0);
    countUp($("k-avg"), m.avg_score, 1);
  }

  function pulse() {
    const m = DATA.metrics;
    const opps = DATA.opportunities;
    const act = opps.filter((r) => !r.watchlist);
    const gen = new Date(m.generated + "T00:00:00");
    const DAY = 864e5;
    const signals = DATA.signals.filter((s) => s.Date && s.Date.split("-").length === 3);
    const undated = DATA.signals.length - signals.length;
    const fresh = signals.filter((s) => (gen - new Date(s.Date + "T00:00:00")) / DAY <= 90).length;

    const avg = (k) => Math.round(act.reduce((a, r) => a + r[k], 0) / act.length);
    const pct = (n, d) => Math.round((n / (d || 1)) * 100);

    const rings = [
      {
        centerBig: m.avg_score.toFixed(1), centerSub: "avg /100", caption: "Score DNA",
        note: "average of " + SEGMENTS.length + " weighted components across " + act.length + " active leads",
        segments: SEGMENTS.map((s) => ({ v: avg(s.key), color: s.color, label: s.label })),
      },
      {
        centerBig: String(fresh), centerSub: "≤ 90d", caption: "Urgency wave",
        note: fresh + " fresh signals of " + signals.length + " dated" + (undated ? " · " + undated + " undated" : "") + " — 3-month window",
        progress: pct(fresh, signals.length), color: "#46c98a",
      },
      {
        centerBig: pct(m.ready, m.with_signal) + "%", centerSub: "of signalled", caption: "Reach",
        note: m.ready + " ready to contact of " + m.with_signal + " with real signals",
        progress: pct(m.ready, m.with_signal), color: "#2fa8b5",
      },
      {
        centerBig: pct(m.ready, m.companies) + "%", centerSub: "overall yield", caption: "Yield",
        note: m.ready + " ready of " + m.companies + " tracked — " + m.watchlist + " on watchlist",
        progress: pct(m.ready, m.companies), color: "#e8b64c",
      },
    ];

    const el = $("rings");
    el.innerHTML = "";
    rings.forEach((r) => {
      const ring = document.createElement("div");
      ring.className = "ring";
      ring.innerHTML = '<svg viewBox="0 0 100 100"></svg>' +
        '<div class="ring-center"><span class="big"></span><span class="sub"></span></div>' +
        '<div class="ring-cap"></div><div class="ring-note"></div>';
      const svgEl = ring.querySelector("svg");
      const R = 40, C = Math.PI * 2 * R;

      if (r.segments) {
        svgEl.innerHTML = '<g transform="rotate(-90 50 50)"></g>';
        const g = svgEl.querySelector("g");
        let cum = 0;
        r.segments.forEach((s, i) => {
          const len = Math.max(C * (s.v / 100) - C * 0.012, 1);
          const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", 50); c.setAttribute("cy", 50); c.setAttribute("r", R);
          c.setAttribute("fill", "none"); c.setAttribute("stroke", s.color);
          c.setAttribute("stroke-width", "11"); c.setAttribute("stroke-linecap", "butt");
          c.setAttribute("stroke-dasharray", len + " " + (C - len));
          c.setAttribute("stroke-dashoffset", -(cum + len));
          c.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1) " + (i * 90) + "ms";
          const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
          t.textContent = s.label + ": " + s.v + "/100";
          c.appendChild(t);
          g.appendChild(c);
          cum += len;
        });
        ring.querySelector(".big").textContent = r.centerBig;
        ring.querySelector(".sub").textContent = r.centerSub;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          g.querySelectorAll("circle").forEach((c) => {
            const len = parseFloat(c.getAttribute("stroke-dasharray").split(" ")[0]);
            c.setAttribute("stroke-dashoffset", parseFloat(c.getAttribute("stroke-dashoffset")) + len);
          });
        }));
      } else {
        const color = r.color || "#2fa8b5";
        svgEl.innerHTML =
          '<circle class="ring-track" cx="50" cy="50" r="' + R + '" fill="none" stroke-width="11"/>' +
          '<circle class="arc-progress" cx="50" cy="50" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="11" stroke-linecap="round" transform="rotate(-90 50 50)"/>';
        const prog = svgEl.querySelector(".arc-progress");
        const final = C * (1 - r.progress / 100);
        prog.setAttribute("stroke-dasharray", C);
        prog.setAttribute("stroke-dashoffset", C);
        prog.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1) .15s";
        ring.querySelector(".big").textContent = r.centerBig;
        ring.querySelector(".sub").textContent = r.centerSub;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          prog.setAttribute("stroke-dashoffset", final);
        }));
      }
      ring.querySelector(".ring-cap").textContent = r.caption;
      ring.querySelector(".ring-note").textContent = r.note;
      el.appendChild(ring);
    });

    const bands = [
      { label: "80+ hot", color: "#e8b64c", n: opps.filter((r) => r.score >= 80).length },
      { label: "66–79 strong", color: "#2fa8b5", n: opps.filter((r) => r.score >= 66 && r.score < 80).length },
      { label: "50–65 warm", color: "#1d8fa0", n: opps.filter((r) => r.score >= 50 && r.score < 66).length },
      { label: "< 50 cool", color: "#7c9093", n: opps.filter((r) => r.score < 50).length },
    ];
    const total = Math.max(opps.length, 1);
    const bar = $("band-bar");
    bar.innerHTML = "";
    $("band-legend").innerHTML = "";
    bands.forEach((b) => {
      const seg = document.createElement("div");
      seg.className = "band-seg";
      seg.style.background = b.color;
      seg.style.setProperty("--w", (b.n / total) * 100 + "%");
      const t = document.createElement("span");
      t.textContent = b.label + ": " + b.n + " leads";
      seg.appendChild(t);
      bar.appendChild(seg);
      const it = document.createElement("span");
      it.innerHTML = "<i style='background:" + b.color + "'></i>" + b.label + " · " + b.n + " of " + opps.length;
      $("band-legend").appendChild(it);
    });
  }

  function reveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("section.reveal").forEach((s) => io.observe(s));
  }

  function funnel() {
    const m = DATA.metrics;
    const steps = [
      { label: "Companies in database", n: m.companies, hot: false },
      { label: "With real signals", n: m.with_signal, hot: false },
      { label: "Ready to contact", n: m.ready, hot: true },
      { label: "Named decision makers", n: m.named_contacts, hot: false },
      { label: "Outreach emails drafted", n: 3, hot: false },
    ];
    const max = steps[0].n;
    const el = $("funnel");
    el.innerHTML = "";
    steps.forEach((s) => {
      const pct = Math.max((s.n / max) * 100, 4);
      const row = document.createElement("div");
      row.className = "stage";
      row.innerHTML =
        '<div class="stage-name">' + s.label + "</div>" +
        '<div class="bar-wrap"><div class="bar' + (s.hot ? " hot" : "") + '" style="--w:' + pct + '%">' +
        (pct > 14 ? '<span style="font-size:11px;font-weight:700;color:#eef">' + s.n + "</span>" : "") +
        "</div></div>" +
        '<div class="count">' + s.n + "</div>";
      el.appendChild(row);
    });
  }

  function stackedChart() {
    const top = DATA.opportunities.filter((r) => !r.watchlist).slice(0, 10);
    const W = 900, H = 420;
    const mL = 120, mR = 26, mT = 26, mB = 92;
    const cw = W - mL - mR, ch = H - mT - mB;
    const maxScore = 100;
    const barW = Math.min(cw / top.length * 0.62, 46);
    const step = cw / top.length;

    let rows = "";
    top.forEach((r, i) => {
      const x = mL + i * step + (step - barW) / 2;
      let y = mT + ch;
      let segs = "";
      SEGMENTS.forEach((s) => {
        const v = r[s.key];
        if (!v) return;
        const h = (v / maxScore) * ch;
        y -= h;
        segs += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + (h - 1.5) + '" rx="2" fill="' + s.color + '"><title>' + r.company + " · " + s.label + " " + v + "</title></rect>";
      });
      const rank = '<text x="' + (x + barW / 2) + '" y="' + (mT + ch - (r.score / maxScore) * ch - 9) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + (r.score >= 80 ? "#e8b64c" : "#e7efef") + '">' + r.score + "</text>";
      const label = r.company.length > 13 ? r.company.slice(0, 12) + "…" : r.company;
      rows += segs + rank +
        '<text x="' + (x + barW / 2) + '" y="' + (H - mB + 18) + '" text-anchor="middle" font-size="11" fill="#9ab3b5">' + label + "</text>";
    });

    for (let t = 0; t <= 100; t += 20) {
      const y = mT + ch - (t / maxScore) * ch;
      rows += '<line x1="' + mL + '" y1="' + y + '" x2="' + (W - mR) + '" y2="' + y + '" stroke="#2a4347" stroke-width="1" stroke-dasharray="3 5"/>';
      rows += '<text x="' + (mL - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10.5" fill="#7c9093">' + t + "</text>";
    }

    $("stacked-chart").innerHTML += rows;
    $("legend").innerHTML = SEGMENTS.map((s) => "<span><i style='background:" + s.color + "'></i>" + s.label + "</span>").join("");
  }

  function leadsTable() {
    const search = $("search"), sort = $("sort");
    let watchFilter = "all";
    let rows = DATA.opportunities;

    function render() {
      const q = search.value.trim().toLowerCase();
      let list = rows.filter((r) =>
        (watchFilter === "all" || (watchFilter === "watch" ? r.watchlist : !r.watchlist)) &&
        (r.company + r.city + r.industry + r.opportunity + r.why).toLowerCase().includes(q));
      if (sort.value === "urgency") list.sort((a, b) => b.urgency - a.urgency || b.score - a.score);
      else if (sort.value === "name") list.sort((a, b) => a.company.localeCompare(b.company));
      else if (sort.value === "city") list.sort((a, b) => a.city.localeCompare(b.city));
      else list.sort((a, b) => b.score - a.score);

      const tb = document.querySelector("#leads-table tbody");
      tb.innerHTML = "";
      list.forEach((r, i) => {
        const warm = r.score >= 80;
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td style='color:#7c9094'>" + (i + 1) + "</td>" +
          "<td class='co'><strong>" + r.company + "</strong>" +
          (r.watchlist ? " <span class='tag tag-watch'>Watch</span>" : "") +
          "<td>" + r.city + "</td>" +
          "<td>" + r.industry + "</td>" +
          "<td class='date'>" + fmtDate(r.latest_signal) + "</td>" +
          "<td>" + r.why + "</td>" +
          "<td class='num'><span class='score" + (warm ? " hot" : "") + "'>" + r.score +
          "<span class='cap'><i style='width:" + r.score + "%'></i></span></span></td>" +
          "<td>" + r.opportunity + "</td>";
        tb.appendChild(tr);
      });
    }

    search.addEventListener("input", render);
    sort.addEventListener("change", render);
    document.querySelectorAll(".chip[data-watch]").forEach((b) =>
      b.addEventListener("click", () => {
        document.querySelectorAll(".chip[data-watch]").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        watchFilter = b.dataset.watch;
        render();
      }));
    render();
  }

  function signalsTable() {
    const tb = $("signals-table").querySelector("tbody");
    DATA.signals.forEach((s) => {
      const tr = document.createElement("tr");
      const d = s.Date ? fmtDate(s.Date) : "undated";
      tr.innerHTML =
        "<td class='co'><strong>" + s.Company + "</strong></td>" +
        "<td>" + s.Signal + "</td>" +
        "<td class='num date" + (s.Date ? "" : "'>" + d) + "'>" + (s.Date ? d : '<span style="color:#e0a23c">' + d + "</span>") + "</td>" +
        "<td><a class='ev' href='" + s.Evidence + "' target='_blank' rel='noopener'>" + s.Evidence + "</a></td>";
      tb.appendChild(tr);
    });
  }

  function outreachTable() {
    const tb = $("outreach-table").querySelector("tbody");
    DATA.outreach.forEach((o) => {
      const tr = document.createElement("tr");
      const cls = o.Status === "Ready to contact" ? "r" : o.Status === "Verify first" ? "v" : "m";
      tr.innerHTML =
        "<td class='co'><strong>" + o.Company + "</strong><span class='sub'>" + o.Contact + "</span></td>" +
        "<td>" + o.Contact + "</td>" +
        "<td><span class='pill " + cls + "'>" + o.Status + "</span></td>" +
        "<td>" + o["Recommended action"] + "</td>";
      tb.appendChild(tr);
    });
  }

  function contactsList() {
    const el = $("contacts-list");
    DATA.contacts.forEach((c) => {
      if (!c.Person || c.Person === "TBD") return;
      const div = document.createElement("div");
      div.className = "contact";
      const emailTxt = c.Email.startsWith("http") ? "LinkedIn profile" : c.Email;
      const hot = c.Email.includes("@") && !c.Email.startsWith("TBD") && !c.Email.startsWith("+");
      div.innerHTML =
        '<div class="who">' + c.Person + "</div>" +
        '<div class="role">' + c.Position + " · " + c.Company + "</div>" +
        "<div class='email" + (hot ? " te" : "") + "'>" + emailTxt + "</div>";
      if (c.Email.startsWith("http")) div.querySelector(".email").innerHTML = "<a class='ev' href='" + c.Email + "' target='_blank'>" + c.Email + "</a>";
      el.appendChild(div);
    });
  }

  fetch("data.json")
    .then((r) => r.json())
    .then((d) => {
      DATA = d;
      metrics();
      pulse();
      funnel();
      stackedChart();
      leadsTable();
      signalsTable();
      outreachTable();
      contactsList();
      reveal();
    })
    .catch((e) => {
      document.body.innerHTML = "<div style='padding:60px;text-align:center'><h2>Failed to load dashboard data</h2><p>" + e.message + "</p></div>";
    });
})();
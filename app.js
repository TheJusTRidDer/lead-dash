(() => {
  let DATA = null;

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
    $("k-companies").textContent = m.companies;
    $("k-watchlist").textContent = m.watchlist + " on watchlist";
    $("k-signal").textContent = m.with_signal;
    $("k-ready").textContent = m.ready;
    $("k-monitor").textContent = m.monitor + " monitor · " + m.verify_first + " verify first";
    $("k-named").textContent = m.named_contacts;
    $("k-top").textContent = m.top_score;
    $("k-avg").textContent = m.avg_score;
    $("k-avg-note").textContent = "across " + m.companies + " companies";
    $("updated-label").textContent = "Data " + fmtDate(m.generated);
    $("gen-date").textContent = fmtDate(m.generated);
    document.title = "LOOPS — " + m.top_score + "/100 top lead";
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
        '<div class="bar-wrap"><div class="bar' + (s.hot ? " hot" : "") + '" style="width:' + pct + '%">' +
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
      funnel();
      stackedChart();
      leadsTable();
      signalsTable();
      outreachTable();
      contactsList();
    })
    .catch((e) => {
      document.body.innerHTML = "<div style='padding:60px;text-align:center'><h2>Failed to load dashboard data</h2><p>" + e.message + "</p></div>";
    });
})();
/* Decodable, Not Transferable — page interactions. No dependencies. */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SVG = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const css = getComputedStyle(document.documentElement);
  const C = {
    ada: css.getPropertyValue("--ada").trim() || "#2a78d6",
    olaf: css.getPropertyValue("--olaf").trim() || "#eb6834",
    vft: css.getPropertyValue("--vft").trim() || "#1baf7a",
    null: "#bdbac4",
  };
  const ENC = [
    { key: "ada", name: "AdaWorld" },
    { key: "olaf", name: "Olaf-World" },
    { key: "vft", name: "VideoFlexTok" },
  ];

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(SVG, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function tint(hex, amt) {
    const h = hex.replace("#", "");
    const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    const m = v.map((c) => Math.round(c + (255 - c) * amt));
    return "#" + m.map((c) => c.toString(16).padStart(2, "0")).join("");
  }
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  /* Run fn(t) from 0→1 once the element scrolls into view. */
  function animateOnView(node, fn, dur = 900) {
    if (reduceMotion || !("IntersectionObserver" in window)) { fn(1); return; }
    fn(0);
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        fn(ease(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.35 });
    io.observe(node);
  }

  /* ───────────── Tooltip ───────────── */
  const tip = $("#tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  }
  function hideTip() { tip.hidden = true; }
  const row = (k, v) => `<div class="tt-row"><span>${k}</span><b>${v}</b></div>`;
  const head = (color, name) => `<div class="tt-head"><span class="swatch" style="background:${color}"></span>${name}</div>`;

  // Hover hints (the little "?" in tables)
  $$(".hint").forEach((h) => {
    h.tabIndex = 0;
    const show = (e) => {
      const r = h.getBoundingClientRect();
      showTip(`<div>${h.dataset.tip}</div>`, e.clientX || r.right, e.clientY || r.bottom);
    };
    h.addEventListener("mouseenter", show);
    h.addEventListener("mousemove", show);
    h.addEventListener("focus", show);
    h.addEventListener("mouseleave", hideTip);
    h.addEventListener("blur", hideTip);
  });

  function legend(container, items) {
    if (!container) return;
    container.innerHTML = items
      .map((i) => `<span class="legend-item"><span class="swatch${i.round ? " round" : ""}" style="background:${i.color}"></span>${i.label}</span>`)
      .join("");
  }

  /* ───────────── Figure 1: Q1 / Q2 / Q3 ladder ───────────── */
  const LADDER = [
    {
      id: "Q1", title: "Action presence", sub: ["null transition", "real latent"],
      light: "null", note: "Linear probe. Null transition = two identical frames (no action).",
      a: [30.3, 30.4, 30.4], b: [45.3, 49.5, 66.5],
    },
    {
      id: "Q2", title: "Seen environments", sub: ["linear", "MLP-2"],
      light: "tint", note: "Held-back 20% of samples from the 154 training games.",
      a: [45.3, 49.5, 66.5], b: [71.1, 74.5, 82.6],
    },
    {
      id: "Q3", title: "Unseen environments", sub: ["linear", "MLP-2"],
      light: "tint", note: "Same fitted probes as Q2, scored on 39 games held out entirely.",
      a: [42.2, 45.0, 53.2], b: [40.8, 41.3, 50.9],
    },
  ];

  function drawLadder() {
    const host = $("#ladder");
    if (!host) return;
    legend($("#ladder-legend"), ENC.map((e) => ({ color: C[e.key], label: e.name })).concat([{ color: "rgba(155,152,163,.35)", label: "majority baseline" }]));

    const W = 320, H = 270, m = { t: 22, r: 6, b: 34, l: 30 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const yMax = 90;
    const y = (v) => m.t + ih - (v / yMax) * ih;
    const updaters = [];

    LADDER.forEach((panel, pi) => {
      const wrap = document.createElement("div");
      wrap.className = "chart";
      const lightSw = panel.light === "null" ? C.null : tint("#55535c", 0.55);
      wrap.innerHTML = `
        <p class="chart-panel-title"><span class="pixel">${panel.id}</span>${panel.title}</p>
        <p class="chart-panel-sub">
          <span class="legend-item"><span class="swatch" style="background:${lightSw}"></span>${panel.sub[0]}</span>
          &nbsp;·&nbsp;
          <span class="legend-item"><span class="swatch" style="background:#55535c"></span>${panel.sub[1]}</span>
        </p>`;
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });
      wrap.appendChild(svg);
      host.appendChild(wrap);

      // grid + axis
      const g = el("g", { class: "grid" }, svg);
      const ax = el("g", { class: "axis" }, svg);
      [0, 20, 40, 60, 80].forEach((v) => {
        el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, g);
        const t = el("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, ax);
        t.textContent = v;
      });
      // baseline band
      el("rect", { class: "baseline-band", x: m.l, width: iw, y: y(31.0), height: y(29.5) - y(31.0) }, svg);

      const gw = iw / 3, bw = Math.min(30, gw * 0.34), gap = 3;
      const bars = [];
      ENC.forEach((e, i) => {
        const cx = m.l + gw * i + gw / 2;
        const colA = panel.light === "null" ? C.null : tint(C[e.key], 0.6);
        const colB = C[e.key];
        [["a", colA, cx - bw - gap / 2], ["b", colB, cx + gap / 2]].forEach(([k, col, x]) => {
          const v = panel[k][i];
          const r = el("rect", { class: "bar", x, width: bw, rx: 3, fill: col }, svg);
          const lbl = el("text", { class: "val", x: x + bw / 2, "text-anchor": "middle" }, svg);
          lbl.textContent = Math.round(v);
          bars.push({ r, lbl, v });
        });
        const nm = el("text", { class: "lbl", x: cx, y: H - m.b + 16, "text-anchor": "middle" }, ax);
        nm.textContent = e.name;

        // hover target covering the group
        const hit = el("rect", { class: "hit", x: cx - gw / 2, width: gw, y: m.t, height: ih }, svg);
        const hot = bars.slice(-2);
        hit.addEventListener("mousemove", (ev) => {
          wrap.classList.add("is-hovering");
          hot.forEach((b) => b.r.classList.add("is-hot"));
          showTip(
            head(colB, e.name) +
            row(panel.sub[0], panel.a[i].toFixed(1) + "%") +
            row(panel.sub[1], panel.b[i].toFixed(1) + "%") +
            `<div class="tt-note">${panel.note}</div>`,
            ev.clientX, ev.clientY
          );
        });
        hit.addEventListener("mouseleave", () => {
          wrap.classList.remove("is-hovering");
          hot.forEach((b) => b.r.classList.remove("is-hot"));
          hideTip();
        });
      });
      // baseline axis line
      el("line", { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: "#b9b5aa", "stroke-width": 1 }, svg);

      updaters.push((t) => bars.forEach(({ r, lbl, v }) => {
        const vv = v * t;
        r.setAttribute("y", y(vv));
        r.setAttribute("height", Math.max(0, y(0) - y(vv)));
        lbl.setAttribute("y", y(vv) - 5);
        lbl.style.opacity = t > 0.85 ? 1 : 0;
      }));
    });
    animateOnView(host, (t) => updaters.forEach((u) => u(t)));
  }

  /* ───────────── Q3: slope chart (within → cross) ───────────── */
  const SLOPES = [
    { title: "Linear probe", within: [45.3, 49.5, 66.5], cross: [42.2, 45.0, 53.2], delta: [-3.0, -4.5, -13.3] },
    { title: "MLP-2 probe", within: [71.1, 74.5, 82.6], cross: [40.8, 41.3, 50.9], delta: [-30.3, -33.1, -31.7] },
  ];

  // Spread label y-positions so none are closer than `gap` px.
  function dodge(ys, gap) {
    const idx = ys.map((v, i) => i).sort((a, b) => ys[a] - ys[b]);
    const out = ys.slice();
    for (let k = 1; k < idx.length; k++) {
      const prev = out[idx[k - 1]], cur = idx[k];
      if (out[cur] - prev < gap) out[cur] = prev + gap;
    }
    // re-centre the cluster around its original mean
    const shift = (ys.reduce((a, b) => a + b) - out.reduce((a, b) => a + b)) / ys.length;
    return out.map((v) => v + shift);
  }

  function drawSlopes() {
    const host = $("#slopes");
    if (!host) return;
    legend($("#slope-legend"), ENC.map((e) => ({ color: C[e.key], label: e.name, round: true })));

    const W = 460, H = 330, m = { t: 34, r: 104, b: 16, l: 104 };
    const lo = 20, hi = 90;
    const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - lo) / (hi - lo));
    const xA = m.l, xB = W - m.r;
    const updaters = [];

    SLOPES.forEach((p) => {
      const wrap = document.createElement("div");
      wrap.className = "chart";
      wrap.innerHTML = `<p class="chart-panel-title">${p.title}</p>`;
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });
      wrap.appendChild(svg);
      host.appendChild(wrap);

      const g = el("g", { class: "grid" }, svg);
      const ax = el("g", { class: "axis" }, svg);
      [20, 40, 60, 80].forEach((v) => {
        el("line", { x1: xA, x2: xB, y1: y(v), y2: y(v) }, g);
        const t = el("text", { x: (xA + xB) / 2, y: y(v) - 4, "text-anchor": "middle" }, ax);
        t.textContent = v + "%";
      });
      el("rect", { class: "baseline-band", x: xA, width: xB - xA, y: y(31.1), height: y(29.4) - y(31.1) }, svg);
      const bl = el("text", { class: "baseline-lbl", x: (xA + xB) / 2, y: y(29.4) + 13, "text-anchor": "middle" }, svg);
      bl.textContent = "majority baseline";
      [xA, xB].forEach((x) => el("line", { x1: x, x2: x, y1: m.t - 6, y2: H - m.b, stroke: "#cfcbc0", "stroke-width": 1 }, svg));
      const c1 = el("text", { class: "col-lbl", x: xA, y: 14, "text-anchor": "middle" }, svg);
      c1.textContent = "Seen games";
      const c2 = el("text", { class: "col-lbl", x: xB, y: 14, "text-anchor": "middle" }, svg);
      c2.textContent = "Unseen games";

      const ly = dodge(p.within.map(y), 19);
      const ry = dodge(p.cross.map(y), 19);
      const items = ENC.map((e, i) => {
        const col = C[e.key];
        const line = el("line", { class: "slope-line", stroke: col, x1: xA, x2: xB }, svg);
        const d1 = el("circle", { class: "slope-dot", r: 5.5, fill: col, cx: xA }, svg);
        const d2 = el("circle", { class: "slope-dot", r: 5.5, fill: col, cx: xB }, svg);
        const L = el("text", { class: "end-lbl", x: xA - 12, y: ly[i] + 4, "text-anchor": "end" }, svg);
        L.innerHTML = `<tspan class="muted">${e.name}</tspan> ${p.within[i].toFixed(1)}`;
        const R = el("text", { class: "end-lbl", x: xB + 12, y: ry[i] + 4, "text-anchor": "start" }, svg);
        const delta = p.delta[i]; // as reported in Table 3 
        R.innerHTML = `${p.cross[i].toFixed(1)} <tspan class="delta-lbl">${delta.toFixed(1).replace("-", "−")}</tspan>`;
        // generous hover target
        const hit = el("line", { x1: xA, x2: xB, y1: y(p.within[i]), y2: y(p.cross[i]), stroke: "transparent", "stroke-width": 18 }, svg);
        hit.addEventListener("mousemove", (ev) => {
          wrap.classList.add("is-hovering");
          [line, d1, d2].forEach((n) => n.classList.add("is-hot"));
          showTip(
            head(col, `${e.name} · ${p.title.toLowerCase()}`) +
            row("Seen (154 games)", p.within[i].toFixed(1) + "%") +
            row("Unseen (39 games)", p.cross[i].toFixed(1) + "%") +
            row("∆", delta.toFixed(1).replace("-", "−") + " pts"),
            ev.clientX, ev.clientY
          );
        });
        hit.addEventListener("mouseleave", () => {
          wrap.classList.remove("is-hovering");
          [line, d1, d2].forEach((n) => n.classList.remove("is-hot"));
          hideTip();
        });
        [line, d1, d2].forEach((n) => n.classList.add("bar")); // share the dim-on-hover rule
        return { line, d1, d2, R, i };
      });

      updaters.push((t) => items.forEach(({ line, d1, d2, R, i }) => {
        const a = y(p.within[i]);
        const b = y(p.within[i] + (p.cross[i] - p.within[i]) * t);
        line.setAttribute("y1", a); line.setAttribute("y2", b);
        d1.setAttribute("cy", a); d2.setAttribute("cy", b);
        R.style.opacity = t > 0.9 ? 1 : 0;
      }));
    });
    animateOnView(host, (t) => updaters.forEach((u) => u(t)), 1100);
  }

  /* Table in-cell bars */
  $$(".data-table.bars td[data-v]").forEach((td) => td.style.setProperty("--p", (+td.dataset.v / 100).toFixed(3)));

  /* ───────────── UMAP explorer ───────────── */
  const GAMES = [
    ["Alfred Chicken", "NES", "#1f77b4"],
    ["Amagon", "NES", "#ff7f0e"],
    ["Bugs Bunny Birthday Blowout", "NES", "#2ca02c"],
    ["The Jetsons: Invasion of the Planet Pirates", "SNES", "#d62728"],
    ["Joe & Mac", "NES", "#9467bd"],
    ["Pitfall: The Mayan Adventure", "SNES", "#c49c94"],
    ["Road Runner's Death Valley Rally", "SNES", "#f7b6d2"],
    ["Shatterhand", "NES", "#c7c7c7"],
    ["Super Turrican", "SNES", "#dbdb8d"],
    ["Youkai Club", "NES", "#9edae5"],
  ];
  const ACTIONS = [
    ["crouch", "#1f77b4"], ["jump", "#d62728"], ["left", "#f7b6d2"], ["right", "#9edae5"],
  ];
  const NOTES = {
    adaworld: {
      games: "AdaWorld's latent is close to one-dimensional here: the games sit in runs along a single curve. It has the weakest game clustering of the three encoders, but the runs are still grouped by game.",
      actions: "Along the same curve, the four action colours are thoroughly interleaved. No action has a stretch of its own.",
    },
    olafworld: {
      games: "Olaf-World breaks the data into separate strands, and most of them belong to a single game.",
      actions: "Each strand contains all four actions, and no colour has a strand to itself.",
    },
    videoflextok: {
      games: "VideoFlexTok gives ten compact islands, one per game. This is the sharpest game clustering of the three.",
      actions: "Every island contains all four actions. Some islands show local structure, but across games no action has a region of its own.",
    },
  };
  const ENC_NAMES = { adaworld: "AdaWorld", olafworld: "Olaf-World", videoflextok: "VideoFlexTok" };

  function initExplorer() {
    const root = $("#umap-explorer");
    if (!root) return;
    const img = $(".umap-img", root);
    const legendEl = $("#umap-legend");
    const note = $("#umap-note");
    const state = { enc: "adaworld", color: "games" };

    // preload every view so toggling is instant
    Object.keys(ENC_NAMES).forEach((e) => ["games", "actions"].forEach((c) => { const i = new Image(); i.src = `static/images/umap/${e}_${c}.webp`; }));

    function renderLegend() {
      if (state.color === "games") {
        legendEl.innerHTML = `<h5>10 Retro games</h5><ul>${GAMES.map(([n, s, c]) =>
          `<li><span class="swatch round" style="background:${c}"></span>${n}<span class="sys">${s}</span></li>`).join("")}</ul>`;
      } else {
        legendEl.innerHTML = `<h5>4 actions</h5><ul>${ACTIONS.map(([n, c]) =>
          `<li><span class="swatch round" style="background:${c}"></span>${n}</li>`).join("")}</ul>`;
      }
    }
    function render() {
      img.src = `static/images/umap/${state.enc}_${state.color}.webp`;
      img.alt = `UMAP of ${ENC_NAMES[state.enc]} Retro latents, coloured by ${state.color === "games" ? "game" : "action"}.`;
      renderLegend();
      note.textContent = NOTES[state.enc][state.color];
    }
    function bind(attr, key) {
      const btns = $$(`[data-${attr}]`, root);
      btns.forEach((b) => b.addEventListener("click", () => {
        if (state[key] === b.dataset[attr]) return;
        state[key] = b.dataset[attr];
        btns.forEach((o) => o.setAttribute("aria-checked", String(o === b)));
        render();
      }));
      // arrow-key navigation inside the radiogroup
      btns.forEach((b, i) => b.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const n = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
        n.focus(); n.click();
      }));
    }
    bind("enc", "enc");
    bind("color", "color");
    render();

  }

  /* ───────────── BibTeX copy ───────────── */
  const copyBtn = $("#copy-bib");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    const text = $("#bibtex-text").innerText;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const r = document.createRange(); r.selectNodeContents($("#bibtex-text"));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      document.execCommand("copy"); s.removeAllRanges();
    }
    copyBtn.classList.add("is-done");
    copyBtn.querySelector("span").textContent = "Copied";
    setTimeout(() => { copyBtn.classList.remove("is-done"); copyBtn.querySelector("span").textContent = "Copy"; }, 1800);
  });

  /* ───────────── Nav: reveal, progress, scroll-spy ───────────── */
  const nav = $("#topnav"), progress = $("#progress"), hero = $(".hero");
  const links = $$(".topnav-links a");
  const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  function onScroll() {
    const sy = window.scrollY;
    nav.classList.toggle("is-visible", sy > hero.offsetHeight - 80);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (sy / max) * 100 : 0) + "%";
    let active = null;
    targets.forEach((t) => { if (t.getBoundingClientRect().top < 140) active = t.id; });
    links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + active));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // disabled "soon" buttons
  $$(".btn.is-soon").forEach((b) => b.addEventListener("click", (e) => e.preventDefault()));


  /* ───────────── Lightbox for figure images ───────────── */
  (function lightbox() {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.innerHTML = '<button class="lightbox-close" aria-label="Close">×</button><img alt="">';
    document.body.appendChild(box);
    const img = box.querySelector("img");
    const close = () => { box.hidden = true; document.body.style.overflow = ""; };
    $$(".figure img").forEach((im) => {
      im.classList.add("zoomable");
      im.tabIndex = 0;
      const open = () => { img.src = im.currentSrc || im.src; img.alt = im.alt; box.hidden = false; document.body.style.overflow = "hidden"; };
      im.addEventListener("click", open);
      im.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
    });
    box.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.hidden) close(); });
  })();

  drawLadder();
  drawSlopes();
  initExplorer();
})();

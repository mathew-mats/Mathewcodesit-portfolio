/* ============================================================
   1. MOBILE MENU
   ============================================================ */
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

function closeMenu() {
    navLinks.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
}

menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("active");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu");
});

navLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));

window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
});

/* ============================================================
   2. HEADER + SCROLL PROGRESS + BACK TO TOP
   ============================================================ */
const header   = document.getElementById("site-header");
const progress = document.querySelector(".scroll-progress");
const toTop    = document.querySelector(".to-top");

function onScroll() {
    const y   = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    header.classList.toggle("scrolled", y > 20);
    toTop.classList.toggle("show", y > 600);
    progress.style.width = max > 0 ? `${(y / max) * 100}%` : "0%";
}

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ============================================================
   3. REVEAL ON SCROLL (staggered)
   ============================================================ */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
    });
}, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

document.querySelectorAll(".reveal").forEach(el => {
    const parent   = el.parentElement;
    const siblings = parent ? [...parent.children].filter(c => c.classList.contains("reveal")) : [];
    const index    = siblings.indexOf(el);
    if (index > 0) el.style.transitionDelay = `${index * 0.09}s`;
    revealObserver.observe(el);
});

/* ============================================================
   4. ACTIVE NAV LINK
   ============================================================ */
const sections   = document.querySelectorAll("main section[id]");
const navAnchors = document.querySelectorAll(".nav-links a");

const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navAnchors.forEach(a => {
            a.classList.toggle("active", a.getAttribute("href") === `#${id}`);
        });
    });
}, { rootMargin: "-45% 0px -50% 0px" });

sections.forEach(s => activeObserver.observe(s));

/* ============================================================
   5. DYNAMIC YEAR
   ============================================================ */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ============================================================
   6. CURSOR GLOW (desktop only, with lerp smoothing)
   ============================================================ */
const glow = document.querySelector(".cursor-glow");
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch        = window.matchMedia("(hover: none), (pointer: coarse)").matches;

if (glow && !prefersReduced && !isTouch) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX   = mouseX;
    let curY   = mouseY;

    window.addEventListener("mousemove", e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        glow.classList.add("on");
    });

    document.addEventListener("mouseleave", () => glow.classList.remove("on"));

    (function loop() {
        curX += (mouseX - curX) * 0.11;
        curY += (mouseY - curY) * 0.11;
        glow.style.transform =
            `translate(${curX}px, ${curY}px) translate(-50%, -50%)`;
        requestAnimationFrame(loop);
    })();
}

/* ============================================================
   7. TERMINAL TYPEWRITER
   ============================================================ */
const typedEl = document.querySelector(".typed");

if (typedEl) {
    const text = typedEl.dataset.text || "";

    if (prefersReduced) {
        typedEl.textContent = text;
    } else {
        let i = 0;
        const type = () => {
            if (i <= text.length) {
                typedEl.textContent = text.slice(0, i);
                i++;
                setTimeout(type, 55 + Math.random() * 45);
            }
        };
        setTimeout(type, 350);
    }
}

/* ============================================================
   8. NOW WIDGET — live GitHub activity
   ============================================================ */
const nowItemEl  = document.getElementById("now-item");
const nowLabelEl = document.getElementById("now-label");

const GITHUB_USER    = "mathew-mats";
const CACHE_KEY      = "gh-last-push";
const CACHE_TTL_MS   = 5 * 60 * 1000; // 5 minutes — plenty for a portfolio

/* Fallback list used if the API call fails or rate-limits */
const fallbackItems = [
    "Django REST Framework",
    "PostgreSQL indexing",
    "WaveSurfer.js",
    "System design basics",
    "Authentication flows"
];

/* --- Helpers ------------------------------------------------ */

function setNowState({ label, text, href, loading = false }) {
    if (nowLabelEl) nowLabelEl.textContent = label;
    if (!nowItemEl) return;

    nowItemEl.classList.remove("loading");
    nowItemEl.textContent = text;
    if (href) {
        nowItemEl.href = href;
    }
}

function getCached() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
        return parsed.v;
    } catch {
        return null;
    }
}

function setCache(value) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            t: Date.now(),
            v: value
        }));
    } catch { /* private mode etc — silently ignore */ }
}

/* --- GitHub fetch ------------------------------------------- */

async function fetchLastPush() {
    const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=30`,
        { headers: { Accept: "application/vnd.github+json" } }
    );

    if (!res.ok) throw new Error(`GitHub ${res.status}`);

    const events = await res.json();
    if (!Array.isArray(events) || events.length === 0) {
        throw new Error("No public activity");
    }

    // Most recent PushEvent — falls back to any event if none are pushes
    const push = events.find(e => e.type === "PushEvent") || events[0];

    if (push.type === "PushEvent") {
        const repo = push.repo.name;                 // "mathew-mats/hanz-logic"
        const short = repo.split("/")[1];            // "hanz-logic"
        return {
            label: "Last pushed to",
            text: short,
            href: `https://github.com/${repo}`
        };
    }

    // Non-push event — show what they did instead
    const repo = push.repo?.name || GITHUB_USER;
    const short = repo.split("/")[1] || repo;
    return {
        label: push.type.replace("Event", "") + " ·",
        text: short,
        href: `https://github.com/${repo}`
    };
}

/* --- Rotating fallback (when offline / rate-limited) -------- */

let fallbackTimer = null;

function startFallbackRotation() {
    if (!nowItemEl || fallbackItems.length < 2 || prefersReduced) return;

    setNowState({
        label: "Currently learning",
        text: fallbackItems[0],
        href: `https://github.com/${GITHUB_USER}`
    });

    let idx = 0;
    fallbackTimer = setInterval(() => {
        nowItemEl.classList.add("swap");
        setTimeout(() => {
            idx = (idx + 1) % fallbackItems.length;
            nowItemEl.textContent = fallbackItems[idx];
            nowItemEl.classList.remove("swap");
        }, 350);
    }, 3400);
}

/* --- Init --------------------------------------------------- */

async function initNowWidget() {
    if (!nowItemEl) return;

    // Show shimmer immediately
    nowItemEl.classList.add("loading");

    const cached = getCached();
    if (cached) {
        setNowState(cached);
        return;
    }

    try {
        const data = await fetchLastPush();
        setNowState(data);
        setCache(data);
    } catch (err) {
        console.warn("[now-widget] Falling back:", err.message);
        startFallbackRotation();
    }
}

initNowWidget();

/* Pause the fallback timer if the tab is hidden (saves CPU) */
document.addEventListener("visibilitychange", () => {
    if (!fallbackTimer) return;
    if (document.hidden) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
    } else if (!nowItemEl?.dataset.live) {
        startFallbackRotation();
    }
});

/* ============================================================
   9. PROJECT FILTER TABS
   ============================================================ */
const filterBtns  = document.querySelectorAll(".filter-btn");
const projectCards = document.querySelectorAll(".project-card");

filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => {
            b.classList.remove("active");
            b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const filter = btn.dataset.filter;

        projectCards.forEach(card => {
            const matches = filter === "all" || card.dataset.category === filter;

            card.classList.remove("shown");

            if (matches) {
                card.classList.remove("hidden");
                // re-trigger the entrance animation
                void card.offsetWidth;
                card.classList.add("shown");
            } else {
                card.classList.add("hidden");
            }
        });
    });
});

/* ============================================================
   10. THEME TOGGLE
   ============================================================ */
const themeToggle = document.getElementById("theme-toggle");
const root = document.documentElement;

function applyTheme(theme) {
    root.setAttribute("data-theme", theme);

    if (themeToggle) {
        const isLight = theme === "light";
        themeToggle.setAttribute("aria-pressed", String(isLight));
        themeToggle.setAttribute(
            "aria-label",
            isLight ? "Switch to dark mode" : "Switch to light mode"
        );
    }

    // Update meta theme-color so mobile browser chrome matches
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute("content", theme === "light" ? "#f7f9fc" : "#0a0e14");
    }
}

// Init: read what the inline head script already set
const currentTheme = root.getAttribute("data-theme") || "dark";
applyTheme(currentTheme);

// Toggle on click
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        applyTheme(next);
        try { localStorage.setItem("theme", next); } catch (e) {}
    });
}

// React to OS-level changes ONLY if user hasn't picked manually
const systemLight = window.matchMedia("(prefers-color-scheme: light)");
systemLight.addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch (err) {}
    if (saved) return; // user has a preference, respect it
    applyTheme(e.matches ? "light" : "dark");
});


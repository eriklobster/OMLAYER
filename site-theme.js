/* Shared OMLAYER theme control: opt-in, accessible and persistent across case pages. */
(() => {
  const root = document.documentElement;
  const key = "omlayer-theme";
  const meta = document.querySelector('meta[name="theme-color"]');
  const toggles = [...document.querySelectorAll("[data-theme-toggle]")];
  const getTheme = () => root.dataset.theme === "light" ? "light" : "dark";
  const update = () => {
    const light = getTheme() === "light";
    root.style.colorScheme = light ? "light" : "dark";
    if (meta) meta.setAttribute("content", light ? "#f6f8f7" : "#080a0d");
    toggles.forEach(button => {
      button.hidden = false;
      button.setAttribute("aria-pressed", String(light));
      button.setAttribute("aria-label", light ? "Use dark theme" : "Use light theme");
      button.title = light ? "Dark theme" : "Light theme";
    });
  };
  toggles.forEach(button => button.addEventListener("click", () => {
    const next = getTheme() === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem(key, next); } catch (_) { /* private mode */ }
    update();
  }));

  // Progressive enhancement: the native menu works without scripts.
  // Close the panel after section navigation, outside taps, or Escape.
  const mobileNav = document.querySelector("[data-mobile-nav]");
  if (mobileNav) {
    mobileNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => { mobileNav.open = false; });
    });
    document.addEventListener("pointerdown", event => {
      if (mobileNav.open && !mobileNav.contains(event.target)) mobileNav.open = false;
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && mobileNav.open) {
        mobileNav.open = false;
        mobileNav.querySelector("summary")?.focus();
      }
    });
  }
  update();
})();

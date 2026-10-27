const themeButtons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
const themeRoot = document.documentElement;

function applyTheme(theme) {
  themeRoot.setAttribute("data-theme", theme);
  localStorage.setItem("cg_theme", theme);
  themeButtons.forEach(button => {
    const label = button.querySelector(".theme-toggle__label, [data-theme-label]");
    if (label) label.textContent = theme === "light" ? "Dark mode" : "Light mode";
  });
}

themeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const current = themeRoot.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
  });
});

applyTheme(themeRoot.getAttribute("data-theme") || "light");

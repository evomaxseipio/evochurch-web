(function () {
  try {
    var t = localStorage.getItem("evochurch-theme");
    var d =
      t === "dark" ||
      (!t && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", d ? "dark" : "light");
    document.documentElement.classList.toggle("dark", d);
  } catch (e) {}
})();

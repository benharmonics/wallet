import { enterCredentials, bindWalletEvents } from "./accounts";

const app = document.getElementById("app");

const pages: Record<string, () => string> = {
  home: enterCredentials,
  about: () => "<h1>About</h1><p>This is a static page</p>",
  contact: () => "<h1>Contact Us</h1><p>Contact us at...</p>",
};

document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const page = (e.target as HTMLElement).getAttribute("data-page");
    renderPage(page);
  });
});

function renderPage(page: string | null) {
  if (!page || !pages[page]) {
    app!.innerHTML = "<h1>Page not found</h1>";
    return;
  }
  app!.innerHTML = pages[page]();
  switch (page) {
    case "home":
      bindWalletEvents();
      return;
    default:
      return;
  }
}

// initial load
renderPage("home");

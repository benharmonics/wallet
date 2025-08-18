import { walletPage, bindWalletEvents } from "./accounts";
import { hideModal } from "./modal";

const app = document.getElementById("app");

const pages: Record<string, () => string> = {
  home: walletPage,
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

const modalOverlay = document.getElementById("modal-overlay");
modalOverlay!.addEventListener("click", (e) => {
  if (e.target === modalOverlay) hideModal();
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

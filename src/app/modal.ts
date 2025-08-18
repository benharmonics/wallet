export function showModal() {
  const modalOverlay = document.getElementById("modal-overlay");
  modalOverlay!.classList.remove("hidden");
}

export function hideModal() {
  const modalOverlay = document.getElementById("modal-overlay");
  modalOverlay!.classList.add("hidden");
}

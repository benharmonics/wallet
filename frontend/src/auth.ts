import { ref } from "vue";

export const isLoggedIn = ref<boolean | null>(null);

export async function checkAuth(): Promise<void> {
  try {
    const res = await fetch("/api/whoami", { credentials: "include" });
    const json = await res.json();
    isLoggedIn.value = Boolean(json.data.loggedIn);
  } catch (e) {
    isLoggedIn.value = false;
  }
}

export async function login(password: string): Promise<{ ok: boolean, error?: string}> {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.status == 401) {
      const msg = "Login failed - invalid password.";
      return { ok: false, error: msg };
    }
  } catch (e) {
    return { ok: false, error: (e as any)?.message || "Network error." };
  }
  await checkAuth();
  return { ok: Boolean(isLoggedIn.value) }
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  })
  await checkAuth();
}

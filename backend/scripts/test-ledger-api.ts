
import axios from "axios";

const API_URL = "http://localhost:4000";

async function main() {
  try {
    // 1. Login
    console.log("Logging in...");
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: "admin@financehub.local",
      password: "admin123",
    });
    const token = loginRes.data.token;
    console.log("Token obtained.");

    // 2. Get Ledger
    console.log("Fetching ledger...");
    const res = await axios.get(`${API_URL}/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        dateFrom: "2025-08-01",
        dateTo: "2026-02-28",
        withSplits: true,
      },
    });

    console.log("Status:", res.status);
    console.log("Data length:", res.data.length);
    if (res.data.length > 0) {
      console.log("First item:", JSON.stringify(res.data[0], null, 2));
    } else {
      console.log("No data found.");
    }
  } catch (e: unknown) {
    const message =
      typeof e === "object" && e && "response" in e
        ? (e as { response?: { data?: unknown } }).response?.data ?? (e as { message?: string }).message
        : e instanceof Error
          ? e.message
          : String(e)
    console.error("Error:", message);
  }
}

main();

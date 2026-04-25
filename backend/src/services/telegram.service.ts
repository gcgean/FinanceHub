import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory link codes: code -> { userId, expiresAt }
const linkCodes = new Map<string, { userId: string; expiresAt: number }>();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createLinkCode(userId: string): string {
  // Remove any existing codes for this user
  for (const [code, data] of linkCodes.entries()) {
    if (data.userId === userId) {
      linkCodes.delete(code);
    }
  }

  // Generate new code
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }

  linkCodes.set(code, { userId, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

export async function sendMessage(
  chatId: string | number,
  text: string
): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendToUser(
  userId: string,
  text: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });
  if (!user?.telegramChatId) return false;
  return sendMessage(user.telegramChatId, text);
}

export async function handleUpdate(update: unknown): Promise<void> {
  const upd = update as Record<string, unknown>;
  const message = upd?.message as Record<string, unknown> | undefined;
  if (!message) return;

  const rawText = (message.text as string | undefined) ?? "";
  const chat = message.chat as Record<string, unknown> | undefined;
  if (!chat) return;
  const chatId = String(chat.id);

  const text = rawText.trim().toUpperCase();

  // Extract code from /START CODE or bare code
  let code: string | null = null;
  if (text.startsWith("/START")) {
    const parts = rawText.trim().split(/\s+/);
    if (parts.length >= 2) {
      code = parts[1].toUpperCase();
    } else {
      // /start with no code — send welcome
      await sendMessage(
        chatId,
        "Olá! 👋 Bem-vindo ao <b>@GestorFacilBot</b>.\n\nPara vincular sua conta, vá em <b>Configurações → Telegram</b> no FinanceHub, gere um código e envie-o aqui."
      );
      return;
    }
  } else if (/^[A-Z0-9]{6}$/.test(text)) {
    code = text;
  } else {
    // Unknown command or message
    await sendMessage(
      chatId,
      "Para vincular sua conta, acesse <b>Configurações → Telegram</b> no FinanceHub e envie o código gerado."
    );
    return;
  }

  // Look up the code
  const entry = linkCodes.get(code);
  if (!entry || entry.expiresAt < Date.now()) {
    linkCodes.delete(code ?? "");
    await sendMessage(
      chatId,
      "❌ Código inválido ou expirado. Gere um novo código em <b>Configurações → Telegram</b> no FinanceHub."
    );
    return;
  }

  // Link the account
  try {
    await prisma.user.update({
      where: { id: entry.userId },
      data: { telegramChatId: chatId },
    });
    linkCodes.delete(code);
    await sendMessage(
      chatId,
      "✅ <b>Conta vinculada com sucesso!</b>\n\nVocê receberá notificações e relatórios do FinanceHub aqui."
    );
  } catch (err) {
    console.error("[Telegram] Failed to link account:", err);
    await sendMessage(
      chatId,
      "❌ Erro ao vincular conta. Tente novamente mais tarde."
    );
  }
}

let lastUpdateId = 0;

export async function startPolling(): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — polling disabled.");
    return;
  }

  async function poll(): Promise<void> {
    try {
      const url = `${API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=${encodeURIComponent(JSON.stringify(["message"]))}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(35000),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          result: Array<{ update_id: number; [k: string]: unknown }>;
        };

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = update.update_id;
            try {
              await handleUpdate(update);
            } catch (err) {
              console.error("[Telegram] Error handling update:", err);
            }
          }
        }
      }
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") {
        // Normal long-poll timeout — no warning needed
      } else {
        console.error("[Telegram] Polling error:", err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    setTimeout(poll, 100);
  }

  poll();
}

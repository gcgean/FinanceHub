import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const API_BASE  = `https://api.telegram.org/bot${BOT_TOKEN}`;

const CODE_CHARS  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem chars ambíguos (0/O, 1/I)
const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos

// ── geração/lookup de código ──────────────────────────────────────────────────

export async function createLinkCode(userId: string): Promise<string> {
  // Remove códigos antigos do mesmo usuário
  await prisma.telegramLinkCode.deleteMany({ where: { userId } });

  // Limpa também códigos expirados de outros usuários (housekeeping passivo)
  await prisma.telegramLinkCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  // Gera código único
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }

  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.telegramLinkCode.create({ data: { code, userId, expiresAt } });

  return code;
}

// ── envio de mensagens ────────────────────────────────────────────────────────

/**
 * Envia mensagem usando um token explícito — permite múltiplos bots por empresa.
 */
export async function sendMessageWithToken(
  token: string,
  chatId: string | number,
  text: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const apiBase = `https://api.telegram.org/bot${token}`;
    const res = await fetch(`${apiBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { description?: string; error_code?: number };
      console.error(`[Telegram] ❌ Falha ao enviar para chatId=${chatId}: ${body.description ?? res.status} (code ${body.error_code ?? res.status})`);
    }
    return res.ok;
  } catch (err) {
    console.error(`[Telegram] ❌ Erro de rede ao enviar para chatId=${chatId}:`, err);
    return false;
  }
}

export async function sendMessage(
  chatId: string | number,
  text: string
): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  return sendMessageWithToken(BOT_TOKEN, chatId, text);
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

// ── processamento de updates ──────────────────────────────────────────────────

export async function handleUpdate(update: unknown): Promise<void> {
  const upd     = update as Record<string, unknown>;
  const message = upd?.message as Record<string, unknown> | undefined;
  if (!message) return;

  const rawText = (message.text as string | undefined) ?? "";
  const chat    = message.chat as Record<string, unknown> | undefined;
  if (!chat) return;
  const chatId = String(chat.id);

  const text = rawText.trim().toUpperCase();

  // Extrai o código de /START CÓDIGO ou código bare
  let code: string | null = null;
  if (text.startsWith("/START")) {
    const parts = rawText.trim().split(/\s+/);
    if (parts.length >= 2) {
      code = parts[1].toUpperCase();
    } else {
      // /start sem código — mensagem de boas-vindas
      await sendMessage(
        chatId,
        "Olá! 👋 Bem-vindo ao <b>@GestorFacilBot</b>.\n\n" +
        "Para vincular sua conta, acesse <b>Configurações → Telegram</b> no FinanceHub, " +
        "gere um código e envie-o aqui."
      );
      return;
    }
  } else if (/^[A-Z0-9]{6}$/.test(text)) {
    code = text;
  } else {
    await sendMessage(
      chatId,
      "Para vincular sua conta, acesse <b>Configurações → Telegram</b> no FinanceHub e envie o código gerado."
    );
    return;
  }

  // Busca o código no banco
  const entry = await prisma.telegramLinkCode.findUnique({
    where: { code },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!entry || entry.expiresAt < new Date()) {
    if (entry) await prisma.telegramLinkCode.delete({ where: { code } });
    await sendMessage(
      chatId,
      "❌ Código inválido ou expirado.\n\nGere um novo código em <b>Configurações → Telegram</b> no FinanceHub."
    );
    return;
  }

  // Vincula a conta
  try {
    await prisma.user.update({
      where: { id: entry.userId },
      data: { telegramChatId: chatId },
    });
    await prisma.telegramLinkCode.delete({ where: { code } });
    await sendMessage(
      chatId,
      `✅ <b>Conta vinculada com sucesso!</b>\n\n` +
      `Olá, ${entry.user.name}! Você receberá notificações e relatórios do FinanceHub aqui. 🎉`
    );
  } catch (err) {
    console.error("[Telegram] Erro ao vincular conta:", err);
    await sendMessage(
      chatId,
      "❌ Erro ao vincular conta. Tente novamente mais tarde."
    );
  }
}

// ── polling ───────────────────────────────────────────────────────────────────

let lastUpdateId = 0;

/**
 * Remove qualquer webhook configurado — necessário para o polling funcionar.
 * Se um webhook estiver ativo, o Telegram não entrega updates via getUpdates.
 */
async function clearWebhookIfSet(): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    const infoRes  = await fetch(`${API_BASE}/getWebhookInfo`);
    const infoData = await infoRes.json() as { ok: boolean; result: { url: string } };

    if (infoData.ok && infoData.result.url) {
      console.log(`[Telegram] Webhook ativo detectado (${infoData.result.url}) — removendo para habilitar polling...`);
      const delRes  = await fetch(`${API_BASE}/deleteWebhook`, { method: "POST" });
      const delData = await delRes.json() as { ok: boolean };
      if (delData.ok) {
        console.log("[Telegram] ✅ Webhook removido — polling ativo.");
      } else {
        console.error("[Telegram] ❌ Falha ao remover webhook:", delData);
      }
    } else {
      console.log("[Telegram] Nenhum webhook ativo — polling pronto.");
    }
  } catch (err) {
    console.error("[Telegram] Erro ao verificar webhook:", err);
  }
}

export async function startPolling(): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN não configurado — polling desativado.");
    return;
  }

  // Garante que não há webhook conflitando com o polling
  await clearWebhookIfSet();

  async function poll(): Promise<void> {
    try {
      const url = `${API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=${encodeURIComponent(JSON.stringify(["message"]))}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(35000) });

      if (res.ok) {
        const data = await res.json() as {
          ok: boolean;
          result: Array<{ update_id: number; [k: string]: unknown }>;
        };

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = update.update_id;
            try {
              await handleUpdate(update);
            } catch (err) {
              console.error("[Telegram] Erro ao processar update:", err);
            }
          }
        }
      }
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") {
        // Timeout normal do long-poll — não é erro
      } else {
        console.error("[Telegram] Erro no polling:", err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    setTimeout(poll, 100);
  }

  poll();
}

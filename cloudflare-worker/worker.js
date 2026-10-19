/* ════════════════════════════════════════════
   ПВДГранула — приём заявок с сайта и отправка в Telegram-бот
   Код для Cloudflare Workers. Секреты здесь не хранятся:
   BOT_TOKEN и CHAT_ID задаются в настройках воркера.
   ════════════════════════════════════════════ */

// С каких сайтов принимаем заявки
const ALLOWED_ORIGINS = [
  "https://vikaenokyan-source.github.io",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    // Помощник при настройке: показывает ID чатов, где писали боту.
    // Работает только пока CHAT_ID не задан.
    if (request.method === "GET" && url.pathname === "/chats") {
      return listChats(env);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "method" }, 405, cors);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ ok: false, error: "origin" }, 403, cors);
    }
    if (!env.BOT_TOKEN || !env.CHAT_ID) {
      return json({ ok: false, error: "config" }, 500, cors);
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return json({ ok: false, error: "body" }, 400, cors);
    }

    // Ловушка для спам-ботов: это поле на сайте скрыто, человек его не заполнит
    if (data.website) {
      return json({ ok: true }, 200, cors);
    }

    const phone = clean(data.phone, 30);
    if (phone.replace(/\D/g, "").length < 11) {
      return json({ ok: false, error: "phone" }, 400, cors);
    }

    const text =
      "🟠 Новая заявка с сайта\n\n" +
      "Телефон: " + phone + "\n" +
      "Город: " + (clean(data.city, 100) || "—") + "\n" +
      "Объём: " + (clean(data.volume, 50) || "—") + "\n" +
      "Комментарий: " + (clean(data.message, 2000) || "—");

    let tg;
    try {
      tg = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: env.CHAT_ID, text: text }),
      });
    } catch (e) {
      tg = null;
    }

    if (!tg || !tg.ok) {
      return json({ ok: false, error: "telegram" }, 502, cors);
    }
    return json({ ok: true }, 200, cors);
  },
};

async function listChats(env) {
  if (env.CHAT_ID) {
    return text("CHAT_ID уже задан — эта страница отключена.", 404);
  }
  if (!env.BOT_TOKEN) {
    return text("Сначала добавьте секрет BOT_TOKEN в настройках воркера.", 500);
  }

  const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/getUpdates");
  const body = await res.json();
  if (!body.ok) {
    return text("Telegram не принял токен. Проверьте BOT_TOKEN.", 500);
  }

  const chats = new Map();
  for (const update of body.result) {
    const msg = update.message || update.my_chat_member || update.channel_post;
    if (msg && msg.chat) chats.set(msg.chat.id, msg.chat);
  }
  if (!chats.size) {
    return text("Чатов пока нет. Напишите боту /start (или в группе, куда его добавили) и обновите страницу.", 200);
  }

  const lines = [...chats.values()].map(function (chat) {
    const name = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username;
    const kind = chat.type === "private" ? "личка" : "группа";
    return "CHAT_ID = " + chat.id + "   (" + kind + ": " + name + ")";
  });
  return text(lines.join("\n"), 200);
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, headers),
  });
}

function text(body, status) {
  return new Response(body, {
    status: status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

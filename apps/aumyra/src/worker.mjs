// AUMYRA: owner-only Telegram assistant on Cloudflare Workers.
// No credentials, user history, or imported finance data belong in source control.
const MENU = "Aumyra is ready.\n\nAssistant: send a message, or /ask your question.\nFinance: /expense 12.50 USDT food lunch\n         /income 20 USD teaching lesson\n         /summary, /history, /undo, /banks\nNotes: /note buy coffee beans, /notes\nOther: /help, /status";
const BUTTONS = {keyboard:[[{text:"/summary"},{text:"/history"}],[{text:"/notes"},{text:"/banks"}],[{text:"/help"}]],resize_keyboard:true,is_persistent:true};
const MONEY = /^\/(income|expense)(?:@\w+)?\s+(\d+(?:\.\d{1,2})?)\s+(USDT|USD|THB)\s+([a-z][a-z0-9_-]{0,30})(?:\s+(.{1,250}))?$/i;
const HELP = MENU + "\n\nMoney requires a currency and category. /undo voids the last new entry (audit retained). Existing imported history is not included until separately migrated.";
const MAX_TEXT = 3900;

function reply(text, markup) { return {text: String(text || "").slice(0, MAX_TEXT), ...(markup ? {reply_markup:markup} : {})}; }
function monthThailand(now = new Date()) { return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0,7); }
function amountText(cents, currency) { return (Number(cents)/100).toFixed(2) + " " + currency; }
function normalizeCommand(text) { return (text.trim().split(/\s+/)[0] || "").split("@")[0].toLowerCase(); }
function available(env) { return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET && env.TELEGRAM_OWNER_ID && env.DB); }

export async function aiAnswer(text, env, transport = fetch) {
  const messages = [
    {role:"system",content:"You are Aumyra, a concise, practical personal AI assistant. Do not invent bank balances, transactions, dates, completed actions or tool access. This chat message does not include the user's private data. Ask before irreversible operations. You cannot execute actions from this chat. Reply in the user's language."},
    {role:"user",content:text.slice(0,3000)}
  ];
  if (env.AI) {
    const data = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
      messages, chat_template_kwargs:{enable_thinking:false}, max_completion_tokens:600
    });
    return String(data?.response || data?.choices?.[0]?.message?.content || "No assistant response was returned.").trim();
  }
  if (!env.OPENAI_API_KEY) return "AI chat is not configured yet. Finance, notes and the Telegram menu are available. Enable an AI binding or add OPENAI_API_KEY as a Worker secret.";
  const response = await transport("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{"content-type":"application/json","authorization":"Bearer " + env.OPENAI_API_KEY},
    body:JSON.stringify({model:env.OPENAI_MODEL || "gpt-4o-mini",max_completion_tokens:600,messages})
  });
  if (!response.ok) throw new Error("AI provider error: " + response.status);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "No assistant response was returned.";
}

export async function respondToText(message, env, transport = fetch, updateId = null) {
  const text = String(message || "").trim().slice(0,4000);
  const command = normalizeCommand(text);
  if (command === "/start" || command === "/menu") return reply(MENU,BUTTONS);
  if (command === "/help") return reply(HELP);
  if (command === "/status") return reply("Aumyra core: online\nFinance database: connected\nAI chat: " + (env.AI || env.OPENAI_API_KEY ? "configured" : "not configured") + "\nImported finance archive: not yet attached");
  if (command === "/banks") {
    if (!env.BANK_PLAN_JSON) return reply("Savings targets are not configured yet. Store owner targets privately using the BANK_PLAN_JSON Worker secret. /summary shows only recorded transactions.");
    let plan;
    try { plan=JSON.parse(env.BANK_PLAN_JSON); } catch { return reply("Savings target configuration is invalid; use a JSON object."); }
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) return reply("Savings targets must be a JSON object.");
    const rows=Object.entries(plan).slice(0,12).map(([name,goal])=>name.slice(0,40)+": "+String(goal).slice(0,120));
    return reply("Savings targets (not actual balances):\n"+(rows.length?rows.join("\n"):"No targets entered.")+"\nOnly the owner can read these private settings.");
  }
  if (command === "/income" || command === "/expense") {
    const match = MONEY.exec(text);
    if (!match) return reply("Format: /expense 12.50 USDT food lunch\nOr: /income 20 USD teaching lesson");
    const [,kind,amount,currency,category,note=""] = match;
    const cents = Math.round(Number(amount)*100);
    if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 1e11) return reply("Enter a positive amount smaller than 1 billion.");
    await env.DB.prepare("INSERT OR IGNORE INTO aumyra_entries(kind,amount_cents,currency,category,note,created_at,update_id) VALUES(?,?,?,?,?,?,?)")
      .bind(kind.toLowerCase(),cents,currency.toUpperCase(),category.toLowerCase(),note,new Date().toISOString(),updateId).run();
    return reply("Saved " + kind.toLowerCase() + ": " + amountText(cents,currency.toUpperCase()) + " · " + category.toLowerCase() + (note ? "\n" + note : "") + "\nOnly new Aumyra entries are counted.");
  }
  if (command === "/summary") {
    const month = monthThailand();
    const data = await env.DB.prepare("SELECT kind,currency,SUM(amount_cents) AS cents,COUNT(*) AS n FROM aumyra_entries WHERE voided_at IS NULL AND substr(datetime(created_at,'+7 hours'),1,7)=? GROUP BY kind,currency ORDER BY currency,kind").bind(month).all();
    const lines = (data.results || []).map(r => r.kind + ": " + amountText(r.cents,r.currency) + " (" + r.n + ")");
    return reply("Aumyra ledger · " + month + " (Thailand)\n" + (lines.length ? lines.join("\n") : "No new entries yet.") + "\nCurrencies remain separate. Archived/imported data is not included.");
  }
  if (command === "/history") {
    const data = await env.DB.prepare("SELECT kind,amount_cents,currency,category,note,created_at FROM aumyra_entries WHERE voided_at IS NULL ORDER BY id DESC LIMIT 10").all();
    const lines = (data.results || []).map(r => r.created_at.slice(0,10) + " " + r.kind + " " + amountText(r.amount_cents,r.currency) + " · " + r.category + (r.note ? " (" + r.note + ")" : ""));
    return reply(lines.length ? "Recent Aumyra entries:\n" + lines.join("\n") : "No new entries yet.");
  }
  if (command === "/undo") {
    let targetId;
    if (updateId != null) {
      // Journal the target before the mutation; Telegram may redeliver after Worker termination.
      // Replaying the same update must not void a different entry.
      const candidate = await env.DB.prepare("SELECT id FROM aumyra_entries WHERE voided_at IS NULL ORDER BY id DESC LIMIT 1").first();
      await env.DB.prepare("INSERT OR IGNORE INTO aumyra_undo_ops(update_id,entry_id,created_at) VALUES(?,?,?)")
        .bind(updateId,candidate?.id ?? 0,new Date().toISOString()).run();
      const journal = await env.DB.prepare("SELECT entry_id FROM aumyra_undo_ops WHERE update_id=?").bind(updateId).first();
      targetId = journal?.entry_id ?? 0;
    } else {
      const last = await env.DB.prepare("SELECT id FROM aumyra_entries WHERE voided_at IS NULL ORDER BY id DESC LIMIT 1").first();
      targetId = last?.id ?? 0;
    }
    if (!targetId) return reply("Nothing to undo.");
    await env.DB.prepare("UPDATE aumyra_entries SET voided_at=? WHERE id=? AND voided_at IS NULL").bind(new Date().toISOString(),targetId).run();
    return reply("Last entry voided. Audit record preserved (ID " + targetId + ").");
  }
  if (command === "/note") {
    const note = text.replace(/^\/note(?:@\w+)?\s*/i,"").trim();
    if (!note || note === "/note") return reply("Format: /note buy coffee beans");
    if (note.length > 2000) return reply("Keep notes below 2,000 characters.");
    await env.DB.prepare("INSERT OR IGNORE INTO aumyra_notes(body,created_at,update_id) VALUES(?,?,?)").bind(note,new Date().toISOString(),updateId).run();
    return reply("Note saved.");
  }
  if (command === "/notes") {
    const data = await env.DB.prepare("SELECT body,created_at FROM aumyra_notes ORDER BY id DESC LIMIT 10").all();
    const lines = (data.results || []).map((r,i) => (i+1) + ". " + r.body);
    return reply(lines.length ? "Recent notes:\n" + lines.join("\n") : "No notes saved.");
  }
  if (command.startsWith("/") && command !== "/ask") return reply("Unknown command. Use /help.");
  const question = command === "/ask" ? text.replace(/^\/ask(?:@\w+)?\s*/i,"").trim() : text;
  if (!question) return reply("Ask a question after /ask.");
  try { return reply(await aiAnswer(question,env,transport)); }
  catch { return reply("AI chat is unavailable right now. Finance and notes commands still work."); }
}

export async function handleRequest(request,env,transport = fetch) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    const ok = available(env);
    return Response.json({service:"aumyra",ready:ok}, {status:ok?200:503});
  }
  if (request.method !== "POST" || url.pathname !== "/telegram/webhook") return new Response("Not found",{status:404});
  if (!available(env)) return new Response("Not configured",{status:503});
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("Unauthorized",{status:401});
  const body = await request.text();
  if (body.length > 32768) return new Response("Too large",{status:413});
  let update;
  try { update = JSON.parse(body); } catch { return new Response("Bad JSON",{status:400}); }
  const msg = update?.message;
  if (!msg || msg.chat?.type !== "private" || String(msg.chat?.id) !== String(env.TELEGRAM_OWNER_ID) || String(msg.from?.id) !== String(env.TELEGRAM_OWNER_ID) || !Number.isSafeInteger(update.update_id)) return new Response("ok");
  let saved = await env.DB.prepare("SELECT created_at,reply_text,reply_markup_json,delivered_at FROM aumyra_processed_updates WHERE update_id=?").bind(update.update_id).first();
  if (saved?.delivered_at) return new Response("ok");
  if (saved && !saved.reply_text && Date.now()-Date.parse(saved.created_at)<10000) return new Response("In progress",{status:503});
  if (!saved) await env.DB.prepare("INSERT OR IGNORE INTO aumyra_processed_updates(update_id,created_at) VALUES(?,?)").bind(update.update_id,new Date().toISOString()).run();
  let answer;
  try {
    if (saved?.reply_text) {
      answer = {text:saved.reply_text,reply_markup:saved.reply_markup_json ? JSON.parse(saved.reply_markup_json) : null};
    } else {
      answer = await respondToText(msg.text || "/help",env,transport,update.update_id);
      await env.DB.prepare("UPDATE aumyra_processed_updates SET reply_text=?,reply_markup_json=? WHERE update_id=?")
        .bind(answer.text,answer.reply_markup ? JSON.stringify(answer.reply_markup) : null,update.update_id).run();
    }
  } catch {
    // A failed database operation or assistant call can be safely retried.
    await env.DB.prepare("DELETE FROM aumyra_processed_updates WHERE update_id=? AND reply_text IS NULL").bind(update.update_id).run();
    return new Response("Retry later",{status:503});
  }
  try {
    const response = await transport("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({chat_id:msg.chat.id,text:answer.text,...(answer.reply_markup?{reply_markup:answer.reply_markup}:{})})
    });
    if (!response.ok) throw new Error("Telegram status " + response.status);
    const result = await response.json();
    if (!result.ok) throw new Error("Telegram send failed");
    await env.DB.prepare("UPDATE aumyra_processed_updates SET delivered_at=? WHERE update_id=?").bind(new Date().toISOString(),update.update_id).run();
    return new Response("ok");
  } catch {
    // Keep the cached answer: retry delivery without repeating financial writes.
    return new Response("Retry later",{status:503});
  }
}
export default {fetch:handleRequest};

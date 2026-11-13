// AUMYRA: owner-only Telegram assistant on Cloudflare Workers.
// No credentials, user history, or imported finance data belong in source control.
const MENU = "AUMYRA · personal command center\n\nChat — talk to your assistant\nExpense / Income — record money\nSummary / History — review your ledger\nNotes — save and read notes\nGoals — private savings targets\n\nType a message for AI, or choose a button below. /help for examples.";
const BUTTONS = {keyboard:[[{text:"Chat"},{text:"Menu"}],[{text:"Expense"},{text:"Income"}],[{text:"Summary"},{text:"History"}],[{text:"Notes"},{text:"Goals"}]],resize_keyboard:true,is_persistent:true};
const MONEY = /^\/(income|expense)(?:@\w+)?\s+(\d+(?:\.\d{1,2})?)\s+(USDT|USD|THB)\s+([a-z][a-z0-9_-]{0,30})(?:\s+(.{1,250}))?$/i;
const HELP = MENU + "\n\nTap Expense or Income, then send an amount like 12.50 USDT food coffee (no slash needed). /cancel exits a prompt. /note opens a note composer.\n/forget clears AI chat only.\n\nExamples:\n/expense 12.50 USDT food lunch\n/income 20 USD teaching lesson\n/note buy coffee beans\n/summary · /history · /undo · /banks\nMoney requires a currency and category. /undo voids the last new entry (audit retained). Existing imported history is not included until separately migrated.";
const MAX_TEXT = 3900;

function reply(text, markup) { return {text: String(text || "").slice(0, MAX_TEXT), ...(markup ? {reply_markup:markup} : {})}; }
function monthThailand(now = new Date()) { return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0,7); }
function amountText(cents, currency) { return (Number(cents)/100).toFixed(2) + " " + currency; }
function normalizeCommand(text) { return (text.trim().split(/\s+/)[0] || "").split("@")[0].toLowerCase(); }
function available(env) { return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET && env.TELEGRAM_OWNER_ID && env.DB); }

export async function aiAnswer(text, env, transport = fetch, history = []) {
  const messages = [
    {role:"system",content:"You are Aumyra, a concise, practical personal AI assistant. Do not invent bank balances, transactions, dates, completed actions or tool access. This chat message does not include the user's private data. Ask before irreversible operations. You cannot execute actions from this chat. Reply in the user's language."},
    ...history.filter(row => (row.role === "user" || row.role === "assistant") && typeof row.content === "string").slice(-12),
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
  let text = String(message || "").trim().slice(0,4000);
  const shortcuts = {Menu:"/menu",Chat:"/chat",Expense:"/expense",Income:"/income",Summary:"/summary",History:"/history",Notes:"/notes",Goals:"/banks"};
  // Telegram reply keyboard sends ordinary text; only exact labels are commands.
  let command = normalizeCommand(shortcuts[text] || text);
  const ownerId = String(env.TELEGRAM_OWNER_ID || "");
  const hasUpdateId = Number.isSafeInteger(updateId);
  if (command === "/cancel" || text === "Cancel") {
    if (hasUpdateId) await env.DB.prepare("DELETE FROM aumyra_compose_modes WHERE owner_id=? AND update_id<?").bind(ownerId,updateId).run();
    return reply("Input cancelled. Your records were not changed.",BUTTONS);
  }
  const pendingKind = (command === "/expense" || command === "/income" || command === "/note")
    && (text === command || shortcuts[text] === command) ? command.slice(1) : null;
  if (pendingKind) {
    if (hasUpdateId) await env.DB.prepare("INSERT INTO aumyra_compose_modes(owner_id,kind,update_id,started_at) VALUES(?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET kind=excluded.kind,update_id=excluded.update_id,started_at=excluded.started_at WHERE excluded.update_id>=aumyra_compose_modes.update_id")
      .bind(ownerId,pendingKind,updateId,new Date().toISOString()).run();
    if (pendingKind === "note") return reply("Send the note text now. /cancel to exit.",BUTTONS);
    return reply("Send " + pendingKind + " as: 12.50 USDT food lunch\nCurrencies: USD, USDT, THB. /cancel to exit.",BUTTONS);
  }
  let composing = null;
  if (hasUpdateId && text && !text.startsWith("/") && !shortcuts[text]) {
    const pending=await env.DB.prepare("SELECT kind,update_id,started_at FROM aumyra_compose_modes WHERE owner_id=?").bind(ownerId).first();
    const age=pending ? Date.now()-Date.parse(pending.started_at) : Infinity;
    if (pending && updateId>pending.update_id && Number.isFinite(age) && age>=0 && age<15*60*1000) {
      composing=pending;
      text="/" + pending.kind + " " + text;
      command=normalizeCommand(text);
    }
  }
  if (hasUpdateId && !composing && (shortcuts[text] || text.startsWith("/"))) {
    // Older Telegram retries must never cancel a newer prompt.
    await env.DB.prepare("DELETE FROM aumyra_compose_modes WHERE owner_id=? AND update_id<?").bind(ownerId,updateId).run();
  }
  if (command === "/start" || command === "/menu") return reply(MENU,BUTTONS);
  if (command === "/chat") return reply(env.AI || env.OPENAI_API_KEY
    ? "Chat is ready. Type any question; /menu returns to your controls."
    : "Chat button is ready, but AI is not configured. Finance and notes work without AI. Configure a provider to get replies to questions.", BUTTONS);
  if (command === "/forget") {
    if (updateId != null) {
      const last = await env.DB.prepare("SELECT MAX(id) AS id FROM aumyra_ai_turns").first();
      await env.DB.prepare("INSERT OR IGNORE INTO aumyra_chat_resets(update_id,last_turn_id,created_at) VALUES(?,?,?)")
        .bind(updateId,last?.id ?? 0,new Date().toISOString()).run();
      const reset = await env.DB.prepare("SELECT last_turn_id FROM aumyra_chat_resets WHERE update_id=?").bind(updateId).first();
      await env.DB.prepare("DELETE FROM aumyra_ai_turns WHERE id<=?").bind(reset?.last_turn_id ?? 0).run();
    } else {
      await env.DB.prepare("DELETE FROM aumyra_ai_turns").run();
    }
    return reply("AI conversation cleared. Finance and notes were not changed.",BUTTONS);
  }
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
    if (!match) return reply(composing ? "Invalid amount. Send: 12.50 USDT food lunch, or /cancel." : "Format: /expense 12.50 USDT food lunch\nOr: /income 20 USD teaching lesson");
    const [,kind,amount,currency,category,note=""] = match;
    const cents = Math.round(Number(amount)*100);
    if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 1e11) return reply("Enter a positive amount smaller than 1 billion.");
    await env.DB.prepare("INSERT OR IGNORE INTO aumyra_entries(kind,amount_cents,currency,category,note,created_at,update_id) VALUES(?,?,?,?,?,?,?)")
      .bind(kind.toLowerCase(),cents,currency.toUpperCase(),category.toLowerCase(),note,new Date().toISOString(),updateId).run();
    if (composing && hasUpdateId) await env.DB.prepare("DELETE FROM aumyra_compose_modes WHERE owner_id=? AND update_id=?").bind(ownerId,composing.update_id).run();
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
    if (composing && hasUpdateId) await env.DB.prepare("DELETE FROM aumyra_compose_modes WHERE owner_id=? AND update_id=?").bind(ownerId,composing.update_id).run();
    return reply("Note saved.");
  }
  if (command === "/notes") {
    const data = await env.DB.prepare("SELECT body,created_at FROM aumyra_notes ORDER BY id DESC LIMIT 10").all();
    const lines = (data.results || []).map((r,i) => (i+1) + ". " + r.body);
    return reply((lines.length ? "Recent notes:\n" + lines.join("\n") : "No notes saved.") + "\n\nTap /note to add a note, then send its text.");
  }
  if (command.startsWith("/") && command !== "/ask") return reply("Unknown command. Use /help.");
  const question = command === "/ask" ? text.replace(/^\/ask(?:@\w+)?\s*/i,"").trim() : text;
  if (!question) return reply("Ask a question after /ask.");
  try {
    if (!env.AI && !env.OPENAI_API_KEY) return reply(await aiAnswer(question,env,transport));
    let history=[];
    if (updateId != null) {
      // Read the completed turn first: webhook retries must not call the AI twice.
      const previous = await env.DB.prepare("SELECT reply FROM aumyra_ai_turns WHERE update_id=?").bind(updateId).first();
      if (previous?.reply) return reply(previous.reply);
      const turns = await env.DB.prepare("SELECT prompt,reply FROM aumyra_ai_turns ORDER BY id DESC LIMIT 6").all();
      history=(turns.results || []).reverse().flatMap(turn=>[
        {role:"user",content:String(turn.prompt).slice(0,1500)},
        {role:"assistant",content:String(turn.reply).slice(0,1500)}
      ]);
    }
    const answer=await aiAnswer(question,env,transport,history);
    if (updateId != null) {
      await env.DB.prepare("INSERT OR IGNORE INTO aumyra_ai_turns(update_id,prompt,reply,created_at) VALUES(?,?,?,?)")
        .bind(updateId,question.slice(0,1500),answer.slice(0,1500),new Date().toISOString()).run();
    }
    return reply(answer);
  }
  catch { return reply("AI chat is unavailable right now. Finance and notes commands still work."); }
}

export async function handleRequest(request,env,transport = fetch) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    let ok = available(env);
    if (ok) {
      try {
        // Live readiness requires every table used by Telegram, not just a D1 binding.
        for (const name of [
          "aumyra_processed_updates","aumyra_entries","aumyra_notes",
          "aumyra_undo_ops","aumyra_ai_turns","aumyra_chat_resets","aumyra_compose_modes"
        ]) {
          const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
            .bind(name).first();
          if (table?.name!==name) {ok=false;break;}
        }
      } catch { ok = false; }
    }
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
  let ownsReply = false;
  let claimTime = null;
  if (!saved) {
    claimTime = new Date().toISOString();
    // A read-then-write alone is not a lock. Only the INSERT winner may infer AI
    // or save an expense; concurrent webhook retries must wait for a cached reply.
    const inserted=await env.DB.prepare("INSERT OR IGNORE INTO aumyra_processed_updates(update_id,created_at) VALUES(?,?)")
      .bind(update.update_id,claimTime).run();
    ownsReply = inserted?.meta?.changes === 1;
    if (!ownsReply) saved=await env.DB.prepare("SELECT created_at,reply_text,reply_markup_json,delivered_at FROM aumyra_processed_updates WHERE update_id=?")
      .bind(update.update_id).first();
  }
  if (saved?.delivered_at) return new Response("ok");
  if (saved && !saved.reply_text) {
    // A crashed Worker may leave an unfinished reply. A conditional timestamp swap
    // lets exactly one later retry resume processing after the lease expires.
    const age=Date.now()-Date.parse(saved.created_at);
    if (!Number.isFinite(age) || age<60000) return new Response("In progress",{status:503});
    claimTime=new Date().toISOString();
    const recovered=await env.DB.prepare("UPDATE aumyra_processed_updates SET created_at=? WHERE update_id=? AND created_at=? AND reply_text IS NULL")
      .bind(claimTime,update.update_id,saved.created_at).run();
    if (recovered?.meta?.changes!==1) return new Response("In progress",{status:503});
    ownsReply=true;
  }
  let answer;
  try {
    if (saved?.reply_text) {
      answer = {text:saved.reply_text,reply_markup:saved.reply_markup_json ? JSON.parse(saved.reply_markup_json) : null};
    } else if (ownsReply) {
      answer = typeof msg.text==="string"
        ? await respondToText(msg.text,env,transport,update.update_id)
        : reply("AUMYRA currently accepts text messages only. Send a text question, or tap Chat, Expense, Income, Notes or Menu. Voice and image input are not enabled yet.",BUTTONS);
      const stored=await env.DB.prepare("UPDATE aumyra_processed_updates SET reply_text=?,reply_markup_json=? WHERE update_id=? AND created_at=? AND reply_text IS NULL")
        .bind(answer.text,answer.reply_markup ? JSON.stringify(answer.reply_markup) : null,update.update_id,claimTime).run();
      if (stored?.meta?.changes!==1) return new Response("Reply lease expired",{status:503});
    } else {
      return new Response("In progress",{status:503});
    }
  } catch {
    // Only the current claimant may remove an unfinished update. A stale retry
    // must not erase another concurrent request or a later claimant's lease.
    if (ownsReply && claimTime) await env.DB.prepare("DELETE FROM aumyra_processed_updates WHERE update_id=? AND reply_text IS NULL AND created_at=?")
      .bind(update.update_id,claimTime).run();
    return new Response("Retry later",{status:503});
  }
  // A cached answer may be retried concurrently after a failed request. Claim a
  // separate delivery lease so two Workers never send it at the same instant.
  // A lost network acknowledgement still prevents exactly-once guarantees.
  const deliveryLease=new Date().toISOString();
  let claimed=false;
  try {
    const expired=new Date(Date.now()-60000).toISOString();
    const acquired=await env.DB.prepare("UPDATE aumyra_processed_updates SET delivery_claimed_at=? WHERE update_id=? AND delivered_at IS NULL AND (delivery_claimed_at IS NULL OR delivery_claimed_at<?)")
      .bind(deliveryLease,update.update_id,expired).run();
    claimed=acquired?.meta?.changes===1;
  } catch { return new Response("Retry later",{status:503}); }
  if (!claimed) return new Response("Delivery in progress",{status:503});

  let definitelyRejected=false;
  try {
    const response = await transport("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({chat_id:msg.chat.id,text:answer.text,...(answer.reply_markup?{reply_markup}:{})})
    });
    if (!response.ok) { definitelyRejected=true; throw new Error("Telegram status " + response.status); }
    const result = await response.json();
    if (!result.ok) { definitelyRejected=true; throw new Error("Telegram send failed"); }
    await env.DB.prepare("UPDATE aumyra_processed_updates SET delivered_at=?,delivery_claimed_at=NULL WHERE update_id=? AND delivery_claimed_at=?")
      .bind(new Date().toISOString(),update.update_id,deliveryLease).run();
    return new Response("ok");
  } catch {
    if (definitelyRejected) {
      // A definite Telegram rejection can be retried immediately; an uncertain
      // network outcome holds the lease for 60 seconds to avoid rapid duplicates.
      try {
        await env.DB.prepare("UPDATE aumyra_processed_updates SET delivery_claimed_at=NULL WHERE update_id=? AND delivery_claimed_at=? AND delivered_at IS NULL")
          .bind(update.update_id,deliveryLease).run();
      } catch { /* Leave the lease to expire; no ledger mutation. */ }
    }
    return new Response("Retry later",{status:503});
  }
}
export default {fetch:handleRequest};

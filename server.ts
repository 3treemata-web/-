import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Lazy initialization of Gemini API client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI functionality will be limited.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY", // fallback to prevent SDK crash
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Robust fallback and retry mechanism for GenAI model calls to prevent 429 quota/503 temporary service errors
async function generateWithFallback(
  client: GoogleGenAI,
  params: {
    contents: string;
    config?: {
      systemInstruction?: string;
      temperature?: number;
    };
  }
) {
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[AI] Attempting generation using model: ${model}`);
      const response = await client.models.generateContent({
        model: model,
        contents: params.contents,
        config: params.config,
      });
      console.log(`[AI] Generation succeeded using model: ${model}`);
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || "unknown";
      const errMsg = err?.message || String(err);
      console.warn(`[AI] Model ${model} failed (Status: ${status}). Attempting next fallback... Detail:`, errMsg);
      // Wait 200ms before trying the next model just to allow transient network jitter to settle
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // If all failed, throw the last error
  throw lastError || new Error("All fallback models failed to generate content.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parsing middleware
  app.use(express.json());

  // API Route for healthy health checks
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", time: new Date().toISOString() });
  });

  // API Route for AI analysis / pregnancy advice
  app.post("/api/advice", async (req, res) => {
    try {
      const { context } = req.body;
      if (!context) {
        res.status(400).json({ error: "Missing pregnancy context for advice generation." });
        return;
      }

      // Safeguard check for API key
      if (!process.env.GEMINI_API_KEY) {
        res.json({
          advice: "【お知らせ】GEMINI_API_KEYが設定されていません。アプリのSettingsからAPIキーを設定してください。\n\n（デモ用のメッセージ）現在の週数は " + (context.現在週数 || "未定義") + " です。体重管理やバランスの良い栄養摂取を意識しましょう。体調の変化についてはかかりつけの医師にご相談ください。"
        });
        return;
      }

      const client = getGeminiClient();

      const systemInstruction = `あなたは妊娠中の女性をサポートする優しい産婦人科専門の栄養・健康アドバイザー（助産師・管理栄養士）です。
ユーザーから提供された最新の日誌記録データ（食事メニュー、食事の時間、運動内容、運動時間、体重等）を細かく分析し、380文字〜500文字程度で、具体的かつ心温まる個別お手紙（レター）を日本語で作成してください。

【必須の回答・分析判定ルール】
1. 食事メニューと時間の個別分析：
   - 単に「バランスよく摂られています」のように一般化してまとめるのではなく、記録データにある食事の時間帯や、具体的なメニュー名（例：「鶏肉」「お野菜」「バナナ」など記録されているもの）を【必ず直接引用・名指し】して言及してください。
   - 食事を摂った「時間（何時頃か、朝・昼・夕・間食のタイミング）」について触れ、その時間帯の適切さや、食事の間隔、胃腸への負担を科学的・栄養学的な観点から細やかに褒めたり、アドバイスしたりしてください。

2. 運動内容と時間の個別分析：
   - 記録されている具体的な運動名と「運動時間（◯分）」を必ず直接引用し、その運動メニューの妊娠週数における安全性・メリット、取り組んだことへの称賛を述べてください。（例：「15分間のストレッチは、血流を良くしてお腹の張りを和らげますよ」など）
   - 運動の記録がない場合は、「今は体調を最優先に、無理せずゆったり過ごすのが一番の正解ですよ🌸 体調が良い時に軽いストレッチなどから始めると良いですね」のように優しく寄り添ってください。

3. 体重のフィードバック：
   - 現在の週数、体重、現在の増加量、推奨範囲を分析し、適切にコントロールできている点を賞賛したうえで、食事のメニュー・時間や運動量と関連付けたプロフェッショナルな言葉をかけてください。

4. トーンと書式：
   - 絵文字を適度に交え、妊婦さんに寄り添う非常に柔らかく、優しく包み込むようなトーン（助産師さんの手紙）で語りかけてください。
   - 前置き（「以下はアドバイスです」等）や見出し（「【食事アドバイス】」等）は一切付けず、語りかけるアドバイスの本文のみを出力してください。
   - 医療的な判断は医師に相談するよう促す言葉（例：「心配な点や体調に変化がある場合は、お気軽に主治医の先生にご相談くださいね」など）を優しく最後に1文、必ず添えてください。`;

      const contents = `【最新の記録データ】\n${JSON.stringify(context, null, 2)}`;

      let response;
      try {
        response = await generateWithFallback(client, {
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (err: any) {
        console.error("All fallback models failed for /api/advice:", err);
        throw err;
      }

      const text = response.text || "アドバイスを生成できませんでした。もう一度お試しください。";
      res.json({ advice: text });
    } catch (error: any) {
      console.error("Gemini API Error in /api/advice:", error);
      res.status(500).json({
        error: "AIアドバイスの生成中にエラーが発生しました。",
        details: error.message || error,
      });
    }
  });

  // API Route for maternal interactive Chat / Consultation
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, context } = req.body;
      if (!message || !history) {
        res.status(400).json({ error: "Missing message or history." });
        return;
      }

      // Safeguard check for API key
      if (!process.env.GEMINI_API_KEY) {
        res.json({
          reply: "【お知らせ】現在、GEMINI_API_KEYが設定されていないため、AI回答を仮の内容でお返事しています。お気軽にご質問くださいね。どのようなことでお悩みでしょうか？（14週頃は体調が変わりやすいので無理せずお過ごしくださいね。お腹の張りや不安があれば医師に相談してくださいね🌸）"
        });
        return;
      }

      const client = getGeminiClient();

      const contextStr = context
        ? `【妊婦さんの現在の情報】
・週数表記: ${context.weekLabel || "不明"}
・妊娠前体重: ${context.prePregnancyWeight || "不明"}kg
・現在体重: ${context.currentWeight || "不明"}kg (妊娠前比: +${context.currentGain || "0"}kg)
・本日の食事数: ${context.mealsCount || 0}件
・本日の運動数: ${context.exercisesCount || 0}件`
        : "【妊婦さんの情報】情報がありません。";

      const formattedHistory = history
        ? history.map((msg: any) => `${msg.sender === "user" ? "妊婦さん" : "アドバイザー"}: ${msg.text}`).join("\n")
        : "";

      const systemPrompt = `あなたは妊娠中の女性の健康・栄養・メンタル面を優しく言葉をかけて全力でサポートする、助産師兼管理栄養士の資格を持つ、温かみのある経験豊富な女性専門アドバイザーです。

${contextStr}

【妊婦さんとの最近の会話履歴】
${formattedHistory}
妊婦さん: ${message}

【回答のガイドライン】
- 常に妊婦さんの気持ちに共感し、否定せず「大変ですね」「いつもがんばっていますね🌸」と温かく包み込むような言葉から始めてください。
- カリウムやカルシウム、鉄分、塩分控えめなどの具体的な食事提案や、安全で無理のない運動・セルフケアなど、役立つ知識を優しく、わかりやすくお答えください。
- 医療上の強い異変（出血や激しい痛みなど）がありそうな場合は、「我慢なさらず、ぜひ早めに主治医の産婦人科医にご相談くださいね」と最後に優しく忠告してください。
- 150〜250文字程度で、分かりやすく読みやすい適度な改行を入れてください。余計なタイトルや見出し、プロンプト指示の返答（例：「分かりました」など）は含めず、アドバイザーの返答セリフのみを出力してください。`;

      let response;
      try {
        response = await generateWithFallback(client, {
          contents: systemPrompt,
          config: {
            temperature: 0.7,
          },
        });
      } catch (err: any) {
        console.error("All fallback models failed for /api/chat:", err);
        throw err;
      }

      const reply = response.text || "お役に立てる答えを生成できませんでした。もう一度お話ししてみてください。";
      res.json({ reply });
    } catch (error: any) {
      console.error("Gemini API Error in /api/chat:", error);
      res.status(500).json({
        error: "AIによる応答の生成中にエラーが発生しました。",
        details: error.message || error,
      });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

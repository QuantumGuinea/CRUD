import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// JSON 요청을 처리하는 미들웨어 추가
// ✅ PATCH 메서드 추가
app.use(
  cors({
    origin: "http://127.0.0.1:5500", // ✅ 클라이언트 URL 허용
    credentials: true, // ✅ 인증 요청 허용
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // ✅ PATCH 포함
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ Authorization 추가
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 📌 소셜 로그인 요청을 처리하는 엔드포인트 추가 (GitHub, Google 지원)
app.get("/auth/:provider", async (req, res) => {
  const provider = req.params.provider; // ✅ URL에서 provider 가져오기

  // ✅ 지원하지 않는 provider 요청 시 오류 반환
  const validProviders = ["github", "google"];
  if (!validProviders.includes(provider)) {
    return res
      .status(400)
      .json({ error: "유효하지 않은 로그인 제공자입니다." });
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: "http://127.0.0.1:5500/tmp/index.html", // ✅ 로그인 후 돌아올 URL
    },
  });

  if (error) {
    console.error(`🛑 ${provider} 로그인 오류:`, error.message);
    return res.status(500).json({ error: error.message });
  }

  // 선택한 provider 로그인 창으로 리디렉트
  res.redirect(data.url); // ✅ Supabase가 제공하는 로그인 URL로 이동
});

// 📌 강제 로그아웃
app.get("/auth/logout", async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(500).json({ error: "로그아웃 실패" });
  }

  res.json({ message: "로그아웃 성공" });
});

// 📌 모든 게시글 가져오기
app.get("/posts", async (req, res) => {
  const { data, error } = await supabase
    .from("board")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 📌 새 게시글 추가
app.post("/posts", async (req, res) => {
  const { title, content, image_url, user_id } = req.body;

  if (!title || !content)
    return res.status(400).json({ error: "제목과 내용을 입력하세요." });

  if (!user_id) return res.status(401).json({ error: "로그인이 필요합니다." });

  // ✅ Supabase 요청 시 user_id 포함
  const { data, error } = await supabase
    .from("board")
    .insert([{ title, content, image_url, user_id }]);

  if (error) {
    console.error("🛑 Supabase INSERT 오류:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// 📌 게시글 수정 (PATCH /posts/:id)
app.put("/posts/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, image_url } = req.body;

  const { error } = await supabase
    .from("board")
    .update({ title, content, image_url }) // ✅ Base64 URL을 DB에 저장
    .eq("id", id);

  if (error) {
    console.error("🛑 게시글 수정 오류:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: "게시글 수정 완료!" });
});

// 📌 이미지 삭제
app.delete("/posts/:id/image", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("board")
    .update({ image_url: null }) // 이미지 URL을 NULL로 설정하여 삭제
    .eq("id", id);

  if (error) {
    console.error("🛑 이미지 삭제 오류:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: "이미지 삭제 완료!" });
});

// 📌 게시글 삭제 (DELETE /posts/:id)
app.delete("/posts/:id", async (req, res) => {
  const { id } = req.params;

  // 게시글 삭제
  const { error } = await supabase.from("board").delete().eq("id", id);

  if (error) {
    console.error("🛑 게시글 삭제 오류:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: "게시글 삭제 완료!" });
});

// 📌 게시글별 댓글 불러오기 (GET /comments?board_id=게시글ID)
app.get("/comments", async (req, res) => {
  const { board_id } = req.query;
  if (!board_id)
    return res.status(400).json({ error: "board_id가 필요합니다." });

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("board_id", board_id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 📌 댓글 추가하기 (POST /comments)
app.post("/comments", async (req, res) => {
  const { board_id, content } = req.body;
  if (!board_id || !content)
    return res.status(400).json({ error: "board_id와 content가 필요합니다." });

  const { data, error } = await supabase
    .from("comments")
    .insert([{ board_id, content }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 📌 댓글 수정 (PATCH /comments/:id)
app.patch("/comments/:id", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "댓글 내용을 입력하세요." });
  }

  const { data, error } = await supabase
    .from("comments")
    .update({ content }) // `updated_at`은 Supabase 트리거에서 자동 변경됨
    .eq("id", id)
    .select("id, content, created_at, updated_at");

  if (error) {
    console.error("🛑 댓글 수정 오류:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// 📌 댓글 삭제하기 (DELETE /comments/:id)
app.delete("/comments/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("comments").delete().eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "댓글 삭제 완료!" });
});

// 📌 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});

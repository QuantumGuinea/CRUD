// 📌 Supabase 클라이언트 생성 (환경 변수 대신 직접 입력)
const supabase = window.supabase.createClient(
  "https://kjlypjubepptwtfjxxpy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqbHlwanViZXBwdHd0Zmp4eHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NDQyNTEsImV4cCI6MjA1NTAyMDI1MX0.f5GXW2J7c2bFItWRNgJtEA9tUEGANoLtyGSflyHqHsk",
  {
    auth: { persistSession: true }, // ✅ 세션 유지
  }
);

// ✅ Supabase 객체가 정상적으로 생성되었는지 확인
console.log("✅ Supabase 객체:", supabase);

const API_URL = "http://127.0.0.1:3000"; // 백엔드 서버 주소

const postList = document.getElementById("postList");
const postForm = document.getElementById("postForm");

// 📌 소셜 로그인 함수 (GitHub, Google 지원)
async function signInWithProvider(provider) {
  console.log(`🔹 기존 세션 초기화 중...`);
  await supabase.auth.signOut(); // ✅ 기존 세션 삭제 후 로그인 진행

  const redirectUrl = "https://quantumguinea.github.io/CRUD/"; // ✅ 로그인 후 돌아올 경로

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: redirectUrl,
      prompt: "select_account", // ✅ 항상 계정 선택 창 띄우기
    },
  });

  if (error) {
    console.error(`🛑 ${provider} 로그인 오류:`, error.message);
  } else {
    console.log(`✅ ${provider} 로그인 요청 보냄:`, data);
  }
  // ✅ 로그인 후 2초 뒤에 세션 강제 업데이트 (Supabase 세션 반영 속도 문제 해결)
  setTimeout(async () => {
    await supabase.auth.getSession();
    checkLogin();
  }, 2000);
}

// 📌 로그인 버튼 이벤트 추가 (각 버튼 클릭 시 provider 설정)
document
  .querySelector("#login-github")
  .addEventListener("click", () => signInWithProvider("github"));
document
  .querySelector("#login-google")
  .addEventListener("click", () => signInWithProvider("google"));

// 📌 로그인 상태 확인
async function checkLogin() {
  try {
    const { data: sessionData, error } = await supabase.auth.getSession();
    console.log("🔹 Supabase 세션 데이터:", sessionData);

    const loginGit = document.querySelector("#login-github");
    const loginGoogle = document.querySelector("#login-google");
    const logoutButton = document.querySelector("#logout");

    if (error || !sessionData?.session) {
      console.warn("🔹 세션 없음, 로그아웃 상태 유지");
      loginGit.style.display = "inline";
      loginGoogle.style.display = "inline";
      logoutButton.style.display = "none";
      return;
    }

    // ✅ 현재 로그인한 사용자 정보 가져오기
    const { data: userCheck, error: userCheckError } =
      await supabase.auth.getUser();

    // 🛑 Supabase에서 사용자가 삭제된 경우 (user 정보가 없음)
    if (userCheckError || !userCheck?.user) {
      console.warn("🛑 사용자 계정이 삭제됨! 강제 로그아웃 실행...");
      await supabase.auth.signOut();
      window.location.reload(); // ✅ 강제 새로고침하여 세션 초기화
      return;
    }

    loginGit.style.display = "none";
    loginGoogle.style.display = "none";
    logoutButton.style.display = "inline";
  } catch (err) {
    console.error("🛑 checkLogin() 실행 중 오류 발생:", err);
  }
}

// 📌 로그인 상태 자동 감지
supabase.auth.onAuthStateChange((event, session) => {
  console.log("🔹 인증 상태 변경:", event, session);
  checkLogin(); // ✅ 로그인 상태 자동 업데이트
});

// 📌 페이지 로드 시 로그인 상태 확인
document.addEventListener("DOMContentLoaded", checkLogin);

//📌 로그아웃
async function signOutAndClearSession() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("🛑 로그아웃 실패:", error.message);
  } else {
    console.log("✅ 로그아웃 성공");

    // ✅ Supabase 인증 정보 삭제
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });

    // ✅ 현재 화면을 강제로 새로고침하여 로그인 상태 초기화
    window.location.reload();
  }
}

// 📌 로그아웃 버튼 이벤트 추가
document
  .querySelector("#logout")
  .addEventListener("click", signOutAndClearSession);

async function checkAuth() {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData?.session) {
    alert("로그인이 필요합니다!");
    return null;
  }
  return sessionData.session.user.id;
}

// 📌 서버에서 게시글 불러오기
async function loadPosts() {
  const response = await fetch(`${API_URL}/posts`);
  const posts = await response.json();

  postList.innerHTML = ""; // 기존 게시글 초기화
  posts.forEach((post) => createPostElement(post));
}

// 📌 클라이언트에서 base64 변환 및 업로드
async function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      console.log("✅ Base64 변환 성공:", reader.result.substring(0, 100)); // Base64 앞 100자 확인
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      console.error("🛑 Base64 변환 오류:", error);
      reject(error);
    };
  });
}

// 📌 게시글 저장 (이미지 base64 변환 후 Supabase DB 저장)
async function savePost(title, content, imageFile) {
  let imageUrl = null;

  // ✅ 현재 로그인된 사용자 정보 가져오기
  const { data: sessionData, error } = await supabase.auth.getSession();

  if (error || !sessionData?.session) {
    alert("로그인이 필요합니다!");
    return;
  }

  const access_token = sessionData.session.access_token;
  const user_id = sessionData.session.user.id; // ✅ user_id 가져오기

  if (imageFile) {
    imageUrl = await convertToBase64(imageFile);
  }

  const response = await fetch(`${API_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`, // ✅ Authorization 헤더 추가
    },
    body: JSON.stringify({ title, content, image_url: imageUrl, user_id }),
  });

  const responseData = await response.json();
  console.log("📌 API 응답:", responseData); // ✅ API 응답 확인

  if (response.ok) {
    loadPosts();
  } else {
    alert(`게시글 저장 실패! 오류: ${responseData.error}`);
  }
}

// 📌 서버에서 게시글 수정하기 (updated_at 반영)
async function updatePost(postId) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const title = document.getElementById(`edit-title-${postId}`).value;
  const content = document.getElementById(`edit-content-${postId}`).value;
  const imageFile = document.getElementById(`edit-image-${postId}`).files[0];

  let imageUrl =
    document.getElementById(`current-image-${postId}`)?.src || null;
  if (imageFile) {
    imageUrl = await convertToBase64(imageFile);
  }

  const response = await fetch(`${API_URL}/posts/${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, image_url: imageUrl }),
  });

  if (response.ok) {
    loadPosts();
  } else {
    alert("게시글 수정 실패!");
  }
}

async function deleteImage(postId) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const confirmDelete = confirm("이미지를 삭제하시겠습니까?");
  if (!confirmDelete) return;

  const response = await fetch(`${API_URL}/posts/${postId}/image`, {
    method: "DELETE",
  });

  if (response.ok) {
    loadPosts();
  } else {
    alert("이미지 삭제 실패!");
  }
}

// 📌 서버에서 게시글 삭제하기
async function deletePost(postId) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const confirmDelete = confirm("정말로 삭제하시겠습니까?");
  if (!confirmDelete) return;

  const response = await fetch(`${API_URL}/posts/${postId}`, {
    method: "DELETE",
  });

  if (response.ok) {
    loadPosts();
  } else {
    alert("게시글 삭제 실패!");
  }
}

// 📌 특정 게시글의 댓글 불러오기
async function loadComments(board_id) {
  const response = await fetch(`${API_URL}/comments?board_id=${board_id}`);
  const comments = await response.json();

  const commentsDiv = document.getElementById(`comments-${board_id}`);
  commentsDiv.innerHTML = ""; // 기존 댓글 초기화

  comments.forEach((comment) => {
    const commentElement = document.createElement("div");
    commentElement.classList.add("comment");
    commentElement.innerHTML = `
            <div class="comment-content">${comment.content}</div>
            <button onclick="deleteComment('${comment.id}', '${board_id}')">삭제</button>
        `;
    commentsDiv.appendChild(commentElement);
  });
}

// 📌 댓글 추가하기
async function addComment(board_id) {
  const user_id = await checkAuth(); // ✅ 로그인 체크
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const commentInput = document.getElementById(`comment-input-${board_id}`);
  const content = commentInput.value.trim();
  if (!content) return;

  const response = await fetch(`${API_URL}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ board_id, content }),
  });

  const responseData = await response.json();
  console.log("📌 API 응답:", responseData); // ✅ API 응답 확인

  if (response.ok) {
    loadComments(board_id);
  } else {
    alert(`댓글 작성 실패! 오류: ${responseData.error}`);
  }
}

// 📌 서버에서 댓글 수정하기
async function updateComment(commentId, board_id) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료
  const contentInput = document.getElementById(`edit-comment-${commentId}`);

  const newContent = contentInput.value.trim();
  if (!newContent) return alert("댓글 내용을 입력하세요.");

  await fetch(`${API_URL}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: newContent }),
  });

  loadComments(board_id); // 수정 후 해당 게시글의 댓글 다시 불러오기
}

// 📌 댓글 삭제하기
async function deleteComment(commentId, board_id) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료
  await fetch(`${API_URL}/comments/${commentId}`, { method: "DELETE" });
  loadComments(board_id); // 다시 불러오기
}

// 📌 글 작성 이벤트 (이미지 업로드 추가)
postForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const imageFile = document.getElementById("image").files[0]; // 파일 선택

  if (!title || !content) return;

  await savePost(title, content, imageFile);

  // 입력 필드 초기화
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
  document.getElementById("image").value = "";
});

// 📌 글 작성 HTML 추가
function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.classList.add("post");

  const createdDate = new Date(post.created_at).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const updatedDate = post.updated_at
    ? new Date(post.updated_at).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      })
    : null;

  // 📌 `updated_at`이 `created_at`과 같으면 수정되지 않은 것으로 간주
  const isUpdated = post.updated_at && post.updated_at !== post.created_at;

  let dateText = "";
  if (isUpdated) {
    // 수정된 경우 → 수정 날짜만 표시
    dateText = `<div class="post-updated">✏ 수정: ${updatedDate}</div>`;
  } else {
    // 처음 작성된 경우 → 작성 날짜만 표시
    dateText = `<div class="post-date">📅 작성: ${createdDate}</div>`;
  }

  let imageTag = post.image_url
    ? `<div class="post-image"><img src="${post.image_url}" id="current-image-${post.id}" style="max-width:100%;"></div>`
    : "";

  let imageUploadInput = `
  <input type="file" id="edit-image-${post.id}" accept="image/*">
`;

  let deleteImageButton = post.image_url
    ? `<button onclick="deleteImage('${post.id}')">🗑 이미지 삭제</button>`
    : "";

  postDiv.innerHTML = `
  <div id="view-mode-${post.id}">
      <div class="post-title">${post.title}</div>
      ${dateText}
      ${imageTag}
      <div class="post-content">${post.content}</div>
      <button onclick="enableEditMode('${post.id}', '${post.title}', '${post.content}')">✏ 수정</button>
      <button onclick="deletePost('${post.id}')">🗑 삭제</button>
  </div>

  <div id="edit-mode-${post.id}" style="display: none;">
      <input type="text" id="edit-title-${post.id}" value="${post.title}">
      <textarea id="edit-content-${post.id}">${post.content}</textarea>
      ${imageTag}  <!-- 기존 이미지 표시 -->
      ${imageUploadInput}  <!-- 새 이미지 업로드 -->
      ${deleteImageButton}  <!-- 이미지 삭제 버튼 -->
      <button onclick="updatePost('${post.id}')">💾 저장</button>
      <button onclick="disableEditMode('${post.id}')">❌ 취소</button>
  </div>

  <div class="comments" id="comments-${post.id}"></div>
  <input type="text" id="comment-input-${post.id}" placeholder="댓글 입력..." />
  <button onclick="addComment('${post.id}')">댓글 작성</button>
`;
  postList.appendChild(postDiv);

  // 📌 댓글 불러오기
  loadComments(post.id);
}

// 📌 특정 게시글의 댓글 불러오기 (작성 & 수정 날짜 포함)
async function loadComments(board_id) {
  const response = await fetch(`${API_URL}/comments?board_id=${board_id}`);
  const comments = await response.json();

  const commentsDiv = document.getElementById(`comments-${board_id}`);
  commentsDiv.innerHTML = ""; // 기존 댓글 초기화

  comments.forEach((comment) => {
    const createdDate = new Date(comment.created_at).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
    const updatedDate = comment.updated_at
      ? new Date(comment.updated_at).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        })
      : null;

    // 📌 `updated_at`이 `created_at`과 같으면 수정되지 않은 것으로 간주
    const isUpdated =
      comment.updated_at && comment.updated_at !== comment.created_at;

    let dateText = "";
    if (isUpdated) {
      // 수정된 경우 → 수정 날짜만 표시
      dateText = `<div class="comment-updated">✏ 수정: ${updatedDate}</div>`;
    } else {
      // 처음 작성된 경우 → 작성 날짜만 표시
      dateText = `<div class="comment-date">📅 작성: ${createdDate}</div>`;
    }

    const commentElement = document.createElement("div");
    commentElement.classList.add("comment");
    commentElement.innerHTML = `
            <div id="view-comment-${comment.id}">
                <div class="comment-content">${comment.content}</div>
                ${dateText}
                <button onclick="enableCommentEditMode('${comment.id}', '${comment.content}')">✏ 수정</button>
                <button onclick="deleteComment('${comment.id}', '${board_id}')">🗑 삭제</button>
            </div>

            <div id="edit-comment-mode-${comment.id}" style="display: none;">
                <input type="text" id="edit-comment-${comment.id}" value="${comment.content}">
                <button onclick="updateComment('${comment.id}', '${board_id}')">💾 저장</button>
                <button onclick="disableCommentEditMode('${comment.id}')">❌ 취소</button>
            </div>
        `;
    commentsDiv.appendChild(commentElement);
  });
}

// 📌 수정 모드 활성화
function enableEditMode(postId, title, content) {
  document.getElementById(`view-mode-${postId}`).style.display = "none";
  document.getElementById(`edit-mode-${postId}`).style.display = "block";
}

// 📌 수정 모드 취소
function disableEditMode(postId) {
  document.getElementById(`view-mode-${postId}`).style.display = "block";
  document.getElementById(`edit-mode-${postId}`).style.display = "none";
}

// 📌 댓글 수정 모드 활성화
function enableCommentEditMode(commentId, content) {
  document.getElementById(`view-comment-${commentId}`).style.display = "none";
  document.getElementById(`edit-comment-mode-${commentId}`).style.display =
    "block";
}

// 📌 댓글 수정 모드 취소
function disableCommentEditMode(commentId) {
  document.getElementById(`view-comment-${commentId}`).style.display = "block";
  document.getElementById(`edit-comment-mode-${commentId}`).style.display =
    "none";
}

// 📌 페이지 로드 시 게시글 불러오기
window.onload = loadPosts;

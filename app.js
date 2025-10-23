const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser'); // cookie-parser 불러오기
const verifyToken = require('./authMiddleware'); // 방금 만든 미들웨어 불러오기

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(cookieParser()); // cookie-parser를 사용하도록 설정

// --- 누구나 접근 가능한 페이지 (미들웨어 없음) ---
app.get('/v1/auth/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/v1/auth/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});


// --- 로그인이 필요한 페이지 (verifyToken 미들웨어 적용) ---
// 전체 게시물 조회
app.get('/v1/posts', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'posts.html'));
});

// 게시물 작성
app.get('/v1/posts/new', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'createpost.html'));
});

// 게시물 상세 조회 
app.get('/v1/posts/:postId', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'getpost.html'));
});

// 회원정보수정 
app.get('/v1/users/me', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'user.html'));
});

// 비밀번호 수정
app.get('/v1/users/me/password', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'userpassword.html'));
});

// 인기글 게시판
app.get('/v1/postranking', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'popularpost.html'));
});


// 게시물 수정 페이지
app.get('/v1/posts/:postId/update', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'updatepost.html'));
});


app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
// 로그인, 회원가입 페이지 외의 페이지에 접속할 시 쿠키에 있는 refresh 토큰을 통해 검증 후 페이지 이동

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. 요청에 동봉된 쿠키에서 access, refresh 토큰을 가져옴.
    const token = req.cookies.refresh;

    // 2. 토큰이 없으면 로그인 페이지로 리디렉션
    if (!token) {
        return res.redirect('/v1/auth/login');
    }

    try {
        // 3. 토큰이 유효한지 검증 (refresh만 검증)
        jwt.verify(token, 'vmfhaltmskdlstkfkdgodyroqkfwkdbalroqkfwkdbalaaaaaaaaaaaaaaaabbbbb');
        
        // 4. 검증 성공하면 원래 요청 페이지로 이동
        next();
    } catch (error) {
        // 5. 토큰이 만료되었거나 위조된 경우, 로그인 페이지로 리디렉션
        console.error("토큰 검증 실패:", error.message);
        return res.redirect('/v1/auth/login');
    }
};

module.exports = verifyToken;

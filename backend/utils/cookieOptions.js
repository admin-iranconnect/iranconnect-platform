//backend/utils/cookieOptions.js
export function getSafeCookieOptions(req) {
  const isProduction =
    process.env.NODE_ENV === "production" &&
    req.hostname.includes("iranconnect.org");

  if (!isProduction) {
    // 🔹 برای localhost یا dev یا vercel
    return {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  // 🔹 برای پروداکشن
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: ".iranconnect.org",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

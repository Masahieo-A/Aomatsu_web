import type { NextConfig } from "next";

const securityHeaders = [
  // クリックジャッキング防止
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // MIME タイプ詮索の防止
  { key: "X-Content-Type-Options", value: "nosniff" },
  // リファラ漏洩の抑制
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 不要なブラウザ機能の無効化
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HTTPS 強制
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // コンテンツソース制限（同一オリジン中心）
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

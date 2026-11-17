import { NextResponse, type NextRequest } from "next/server";

/**
 * Verificação otimista: sem cookie de sessão, a área /app redireciona para /entrar.
 * A verificação real (sessão válida no banco) acontece no layout de /app e em cada ação.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sv_session")) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/app"],
};

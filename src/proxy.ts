import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HOME_BY_ROLE, toAppUser, type Role } from "@/lib/auth";

const ROLE_PREFIXES: [string, Role][] = [
  ["/nex", "nex"],
  ["/se", "se"],
  ["/client", "client"],
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const appUser = user ? toAppUser(user) : null;

  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/auth") || path === "/no-access";

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (!user) return isPublic ? response : redirectTo("/login");

  // Signed in but no role assigned yet (e.g. invited but not set up).
  if (!appUser) return path === "/no-access" || path.startsWith("/auth") ? response : redirectTo("/no-access");

  if (path === "/" || path.startsWith("/login") || path === "/no-access") {
    return redirectTo(HOME_BY_ROLE[appUser.role]);
  }

  const area = ROLE_PREFIXES.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"));
  if (area && area[1] !== appUser.role) return redirectTo(HOME_BY_ROLE[appUser.role]);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

export const dynamic = "force-dynamic";

const CHALLENGE_TOKEN = "yrxJzOgqHvTM91Z9ftEBkZf41nDHH2uVHJYZ2lA4RxY";

export async function GET() {
  return new Response(CHALLENGE_TOKEN, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
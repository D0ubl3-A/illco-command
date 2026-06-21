import { thinkForMeSkillMarkdown } from "@/lib/think-for-me-skill";

export function GET() {
  return new Response(thinkForMeSkillMarkdown, {
    headers: {
      "Content-Disposition": 'attachment; filename="SKILL.md"',
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}


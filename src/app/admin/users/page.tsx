import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { setUserRoleAction } from "@/app/actions/admin";
import { date } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUser(["admin"]);
  const users = await query<{ id: string; full_name: string; email: string; company: string | null; role: string; created_at: string; apps: number }>(
    `SELECT u.id, u.full_name, u.email, u.company, u.role, u.created_at,
            (SELECT count(*)::int FROM applications a WHERE a.applicant_id = u.id) AS apps
       FROM users u ORDER BY u.created_at DESC LIMIT 500`,
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Users &amp; Roles</h1>
        <p className="mt-1 text-sm text-navy-900/60">Promote team members to underwriter or admin. New sign-ups are borrowers by default.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Company</th><th>Applications</th><th>Joined</th><th>Role</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.company ?? "—"}</td>
                <td>{u.apps}</td>
                <td>{date(u.created_at)}</td>
                <td>
                  {u.id === me.id ? (
                    <span className="text-xs font-semibold uppercase">{u.role} (you)</span>
                  ) : (
                    <div className="flex gap-1">
                      {(["applicant", "underwriter", "admin"] as const).map((r) => (
                        <form key={r} action={setUserRoleAction.bind(null, u.id, r)}>
                          <button className={`rounded px-2 py-1 text-[11px] font-semibold capitalize ${u.role === r ? "bg-navy-900 text-white" : "border border-navy-900/15 hover:bg-navy-900/5"}`}>
                            {r === "applicant" ? "Borrower" : r}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const getInvitationToken = (params, search) => {
  const query = new URLSearchParams(search);
  return (
    params.invitationToken ||
    params.token ||
    query.get("invite") ||
    query.get("token")
  );
};

export function InvitationAcceptancePage({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const invitationToken = getInvitationToken(params, location.search);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const acceptInvitation = useCallback(async () => {
    if (!invitationToken) {
      setError("This invitation link is missing its token.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api(`/projects/invitations/${invitationToken}/accept`, {
        method: "POST",
      });
      localStorage.removeItem("orbit_invitation_token");
      setAccepted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [invitationToken]);

  useEffect(() => {
    if (user && invitationToken && !accepted && !loading) acceptInvitation();
  }, [user, invitationToken, accepted, loading, acceptInvitation]);

  return (
    <AppLayout user={user}>
      <section className="mx-auto max-w-xl rounded-xl border border-indigo-100 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-500">Project invitation</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-800">
          Join this project
        </h2>

        {accepted ? (
          <>
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              Invitation accepted. You now have access to the project.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Go to dashboard
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Accept this invitation using the account that received the
              invitation email.
            </p>
            {error && (
              <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              disabled={loading || !invitationToken}
              onClick={acceptInvitation}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Accepting invitation…" : "Accept invitation"}
            </button>
          </>
        )}

        {!user && (
          <p className="mt-5 text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-indigo-600">
              Sign in first
            </Link>
            .
          </p>
        )}
      </section>
    </AppLayout>
  );
}

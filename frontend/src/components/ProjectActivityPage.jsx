import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { api } from "../lib/api";

const formatActivityDate = (date) => {
  if (!date) return "Just now";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
};

export function ProjectActivityPage({ user }) {
  const { projectId } = useParams();
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setError("Project ID is missing.");
      setLoading(false);
      return undefined;
    }

    let isCurrent = true;
    setLoading(true);
    setError("");

    api(`/projects/${projectId}/activity`)
      .then((data) => {
        if (!isCurrent) return;
        setActivities(Array.isArray(data) ? data : data.activities || []);
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [projectId]);

  return (
    <AppLayout user={user}>
      <Link
        to={`/projects/${projectId}/tasks`}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← Back to project board
      </Link>
      <div className="mt-3">
        <p className="text-sm text-slate-500">Project history</p>
        <h2 className="text-2xl font-bold text-slate-800">Activity</h2>
      </div>

      {loading && (
        <p className="mt-6 text-sm text-slate-500">Loading activity…</p>
      )}

      {!loading && error && (
        <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && activities.length === 0 && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-[#fffdf9] p-6 text-sm text-slate-500 shadow-sm">
          No project activity yet.
        </p>
      )}

      {!loading && !error && activities.length > 0 && (
        <ol className="mt-6 space-y-4 border-l-2 border-indigo-100 pl-5">
          {activities.map((activity) => {
            const actor = activity.user || activity.createdBy || activity.actor;
            const description =
              activity.description ||
              activity.message ||
              activity.action ||
              "Updated the project";

            return (
              <li
                key={activity._id}
                className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="absolute -left-[1.84rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                <p className="font-medium text-slate-800">
                  {actor?.fullName || actor?.username || "A project member"}{" "}
                  <span className="font-normal text-slate-600">
                    {description}
                  </span>
                </p>
                <time
                  className="mt-1 block text-xs text-slate-500"
                  dateTime={activity.createdAt}
                >
                  {formatActivityDate(activity.createdAt)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </AppLayout>
  );
}

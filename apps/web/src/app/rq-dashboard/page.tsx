"use client";

import { useState, useEffect } from "react";
import "./rq-dashboard.css";

type Submission = {
  id: string;
  submitted_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  organization: string | null;
  role: string | null;
  industry: string | null;
  website: string | null;
  participant_type: string | null;
  rq_code: string | null;
  rq_name: string | null;
  signal_clarity_label: string | null;
  signal_clarity_note: string | null;
  profile_json: {
    values?: string;
    authenticity?: string;
    horizon?: string;
  } | null;
};

type ExpandedRow = string | null;

export default function RQDashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const response = await fetch("/api/rq-submissions/list");
        const data = await response.json();

        if (!response.ok || !data.ok) {
          setError(data.error || "Failed to fetch submissions");
          return;
        }

        setSubmissions(data.submissions);
      } catch {
        setError("Failed to connect to the server");
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter((sub) => {
    const search = searchTerm.toLowerCase();
    return (
      sub.first_name?.toLowerCase().includes(search) ||
      sub.last_name?.toLowerCase().includes(search) ||
      sub.email?.toLowerCase().includes(search) ||
      sub.organization?.toLowerCase().includes(search) ||
      sub.rq_code?.toLowerCase().includes(search) ||
      sub.rq_name?.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (loading) {
    return (
      <div className="rq-dash-page">
        <div className="rq-dash-container">
          <div className="rq-dash-loading">
            <div className="rq-dash-spinner" />
            <p>Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rq-dash-page">
        <div className="rq-dash-container">
          <div className="rq-dash-error">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rq-dash-page">
      <div className="rq-dash-container">
        <header className="rq-dash-header">
          <div className="rq-dash-title-row">
            <h1>RQ Submissions Dashboard</h1>
            <span className="rq-dash-count">{filteredSubmissions.length} submissions</span>
          </div>
          <div className="rq-dash-search">
            <input
              type="text"
              placeholder="Search by name, email, organization, or RQ code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rq-dash-search-input"
            />
          </div>
        </header>

        {filteredSubmissions.length === 0 ? (
          <div className="rq-dash-empty">
            <p>No submissions found.</p>
          </div>
        ) : (
          <div className="rq-dash-table-wrapper">
            <table className="rq-dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>RQ Code</th>
                  <th>Clarity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => (
                  <>
                    <tr
                      key={sub.id}
                      className={`rq-dash-row ${expandedRow === sub.id ? "expanded" : ""}`}
                      onClick={() => toggleRow(sub.id)}
                    >
                      <td className="rq-dash-date">{formatDate(sub.submitted_at)}</td>
                      <td className="rq-dash-name">
                        {sub.first_name} {sub.last_name}
                      </td>
                      <td className="rq-dash-email">
                        <a href={`mailto:${sub.email}`} onClick={(e) => e.stopPropagation()}>
                          {sub.email}
                        </a>
                      </td>
                      <td className="rq-dash-org">{sub.organization || "—"}</td>
                      <td className="rq-dash-type">
                        <span className={`rq-dash-type-badge ${sub.participant_type?.toLowerCase()}`}>
                          {sub.participant_type || "—"}
                        </span>
                      </td>
                      <td className="rq-dash-code">{sub.rq_code || "—"}</td>
                      <td className="rq-dash-clarity">
                        <span
                          className={`rq-dash-clarity-badge ${sub.signal_clarity_label?.toLowerCase()}`}
                        >
                          {sub.signal_clarity_label || "—"}
                        </span>
                      </td>
                      <td className="rq-dash-expand">
                        {expandedRow === sub.id ? "−" : "+"}
                      </td>
                    </tr>
                    {expandedRow === sub.id && (
                      <tr key={`${sub.id}-details`} className="rq-dash-details-row">
                        <td colSpan={8}>
                          <div className="rq-dash-details">
                            <div className="rq-dash-details-grid">
                              <div className="rq-dash-detail-section">
                                <h4>Contact Information</h4>
                                <p><strong>Role:</strong> {sub.role || "—"}</p>
                                <p><strong>Industry:</strong> {sub.industry || "—"}</p>
                                <p>
                                  <strong>Website:</strong>{" "}
                                  {sub.website ? (
                                    <a href={sub.website} target="_blank" rel="noopener noreferrer">
                                      {sub.website}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </p>
                              </div>
                              <div className="rq-dash-detail-section">
                                <h4>RQ Results</h4>
                                <p><strong>RQ Name:</strong> {sub.rq_name || "—"}</p>
                                <p><strong>Clarity Note:</strong> {sub.signal_clarity_note || "—"}</p>
                              </div>
                            </div>
                            {sub.profile_json && (
                              <div className="rq-dash-profile">
                                <h4>Profile Analysis</h4>
                                <div className="rq-dash-profile-grid">
                                  {sub.profile_json.values && (
                                    <div className="rq-dash-profile-item">
                                      <h5>Values</h5>
                                      <p>{sub.profile_json.values}</p>
                                    </div>
                                  )}
                                  {sub.profile_json.authenticity && (
                                    <div className="rq-dash-profile-item">
                                      <h5>Authenticity</h5>
                                      <p>{sub.profile_json.authenticity}</p>
                                    </div>
                                  )}
                                  {sub.profile_json.horizon && (
                                    <div className="rq-dash-profile-item">
                                      <h5>Horizon</h5>
                                      <p>{sub.profile_json.horizon}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Skeleton of the client dashboard while the subscription is read from the database and Stripe. */
export default function ClientDashboardLoading() {
  return (
    <main className="cs-page" aria-busy="true" aria-label="Chargement de votre espace client">
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <span className="cs-skel" style={{ width: 260, height: 44 }} />
        <span className="cs-skel" style={{ width: "min(540px, 100%)", height: 16, marginTop: 14 }} />
      </header>
      <div className="cs-grid">
        <div className="cs-offer cs-skel-offer" />
        <div className="cs-card">
          <span className="cs-skel" style={{ width: 200, height: 26 }} />
          <span className="cs-skel" style={{ height: 48, marginTop: 20 }} />
          <span className="cs-skel" style={{ height: 48, marginTop: 12 }} />
          <span className="cs-skel" style={{ height: 48, marginTop: 12 }} />
        </div>
        <div className="cs-card">
          <span className="cs-skel" style={{ width: 220, height: 26 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="cs-skel" style={{ height: 44, marginTop: 18 }} />
          ))}
        </div>
        <div className="cs-stack">
          <div className="cs-card">
            <span className="cs-skel" style={{ width: 200, height: 24 }} />
            <span className="cs-skel" style={{ height: 120, marginTop: 18 }} />
          </div>
          <div className="cs-card">
            <span className="cs-skel" style={{ width: 200, height: 24 }} />
            <span className="cs-skel" style={{ height: 80, marginTop: 18 }} />
          </div>
        </div>
      </div>
    </main>
  );
}

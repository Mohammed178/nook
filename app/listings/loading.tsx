// Instant skeleton for /listings while the server fetches listings + filters.
// Mirrors the real page's frame (filter strip, heading, list/map split) so the
// content swap doesn't jump. Purely visual; screen readers get common.loading
// via the aria-label (locale comes from the layout's <html lang>, but this file
// is sync and static, so the label uses the canonical English string).
export default function ListingsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading…">
      <div className="skel-filterbar">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="skel skel-pill" />
        ))}
      </div>
      <div className="listings-h1">
        <div>
          <span className="skel skel-h1" />
          <span className="skel skel-meta" />
        </div>
      </div>
      <div className="body-split">
        <div className="list-pane">
          <div className="list-stack">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skel skel-card" />
            ))}
          </div>
        </div>
        <div className="map-pane">
          <div className="skel skel-map" />
        </div>
      </div>
    </div>
  );
}

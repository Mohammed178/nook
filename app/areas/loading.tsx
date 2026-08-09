// Instant skeleton for /areas and /areas/[slug]. Mirrors the index frame
// (head + mosaic grid, same span pattern as page.tsx SPANS) so the content swap
// doesn't jump. Purely visual; the aria-label uses the canonical English string.
const SPANS = [4, 2, 3, 3, 2, 2];

export default function AreasLoading() {
  return (
    <div aria-busy="true" aria-label="Loading…">
      <div className="container uni-index">
        <div className="uni-index-head">
          <div>
            <span className="skel skel-meta" />
            <span className="skel skel-h1" />
          </div>
        </div>
        <div className="uni-mosaic">
          {SPANS.map((span, i) => (
            <div key={i} className={`u-span-${span}`}>
              <span className="skel skel-card" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

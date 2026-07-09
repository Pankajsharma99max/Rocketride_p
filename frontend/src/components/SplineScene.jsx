import { Suspense, lazy } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

/** Interactive 3D scene embed (via Spline). This loads a scene hosted on
 * Spline's own CDN -- see LandingPage.jsx for which one and why. */
export function SplineScene({ scene, className }) {
  return (
    <Suspense
      fallback={
        <div className="spline-fallback">
          <span className="spline-loader" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}

import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "SmileDesk";
const ORIGIN = import.meta.env.VITE_PUBLIC_ORIGIN || "http://localhost:5173";

/** Per-page meta + Open Graph + optional JSON-LD structured data. */
export default function Seo({ title, description, jsonLd }) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — AI Dental Receptionist`;
  const url = `${ORIGIN}${pathname}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

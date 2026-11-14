// Original, owner-supplied artwork. Keep the geometric C, question mark,
// shield/lock and wordmark together; no CSS or text replacement is rendered.
export function Logo({
  assetUrl = import.meta.env.VITE_APPROVED_LOGO_URL ||
    '/brand/cipherquiz-approved.png',
}: {
  assetUrl?: string;
}) {
  return (
    <img
      className="brand-image"
      src={assetUrl}
      width="2172"
      height="724"
      alt="CipherQuiz"
      decoding="async"
    />
  );
}

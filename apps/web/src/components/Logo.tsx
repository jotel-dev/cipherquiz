// The approved geometric C / question mark / shield artwork is not in the repo.
// Supply its asset URL here when provided. Do not substitute an invented mark.
export function Logo({
  assetUrl = import.meta.env.VITE_APPROVED_LOGO_URL || undefined,
}: {
  assetUrl?: string;
}) {
  return (
    <span className="brand">
      {assetUrl && <img src={assetUrl} width="32" height="32" alt="" />}Cipher
      <span>Quiz</span>
      <span className="brand-period" aria-hidden="true">
        .
      </span>
    </span>
  );
}

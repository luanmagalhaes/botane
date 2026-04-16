export function FlowerIcon({
  size = 28,
  spinning = false,
}: {
  size?: number;
  spinning?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      style={
        spinning
          ? { animation: "spin 4s linear infinite" }
          : undefined
      }
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="16"
          cy="10"
          rx="3.5"
          ry="6"
          fill="#3D6B4F"
          opacity="0.85"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="4" fill="#5a9e73" />
    </svg>
  );
}

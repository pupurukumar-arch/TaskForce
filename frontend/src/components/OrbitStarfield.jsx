const starPaths = [
  { x: "5%", y: "8%", delay: "-1.2s", duration: "7.6s", length: "42px" },
  { x: "28%", y: "25%", delay: "-5.4s", duration: "9.1s", length: "56px" },
  { x: "49%", y: "6%", delay: "-3.1s", duration: "8.4s", length: "38px" },
  { x: "72%", y: "23%", delay: "-7.3s", duration: "10.2s", length: "62px" },
  { x: "91%", y: "7%", delay: "-2.4s", duration: "8.8s", length: "48px" },
  { x: "11%", y: "66%", delay: "-6.7s", duration: "9.8s", length: "35px" },
  { x: "43%", y: "76%", delay: "-8.1s", duration: "10.6s", length: "52px" },
  { x: "79%", y: "61%", delay: "-4.6s", duration: "9.5s", length: "44px" },
];

export function OrbitStarfield({ variant = "dark" }) {
  return (
    <div className={`orbit-starfield orbit-starfield--${variant}`} aria-hidden="true">
      <div className="orbit-starfield__dust" />
      {starPaths.map((star, index) => (
        <span
          className="orbit-shooting-star"
          key={`${star.x}-${star.y}`}
          style={{
            "--star-x": star.x,
            "--star-y": star.y,
            "--star-delay": star.delay,
            "--star-duration": star.duration,
            "--star-length": star.length,
            "--star-opacity": index % 3 === 0 ? 0.88 : 0.66,
          }}
        />
      ))}
    </div>
  );
}

export function AuthShell({ children }) {
  return (
    <main className="orbit-auth-shell relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5">
      <OrbitStarfield />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-violet-500/18 blur-3xl" />
      {children}
    </main>
  );
}

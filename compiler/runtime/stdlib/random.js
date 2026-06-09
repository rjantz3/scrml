// scrml:random — runtime shim
//
// Hand-written ES module mirroring stdlib/random/index.scrml. This is the ONE
// sanctioned, centralized touch of the host `Math.random()` surface — scrml's
// own stdlib routes its randomness through here (closing the stdlib-ouroboros)
// and adopters reach these instead of raw `Math.random()`.
//
// Every member is NON-DETERMINISTIC (class-C IO — the same capability class as
// the wall clock `scrml:time.now()`). The compiler rejects calling them from a
// pure `fn` body (E-FN-004, §48.3.4); call them from a `function` /
// `server function` and pass the result into pure code as a parameter.
//
// Surface (must match stdlib/random/index.scrml exports):
//   - random()             → number, a float in [0, 1)            (Math.random())
//   - randomInt(min, max)  → integer in [min, max] INCLUSIVE

// A pseudo-random float in [0, 1). NON-DETERMINISTIC — the sanctioned,
// centralized Math.random() touch (the one place the host RNG is read).
export function random() {
  return Math.random();
}

// A pseudo-random integer uniformly in [min, max] INCLUSIVE of both bounds.
// NON-DETERMINISTIC. Bounds are floored/ceiled so fractional inputs still
// produce an integer in the closed interval; if min > max the bounds are
// swapped so the call never returns NaN.
export function randomInt(min, max) {
  let lo = Math.ceil(min);
  let hi = Math.floor(max);
  if (lo > hi) {
    const t = lo;
    lo = hi;
    hi = t;
  }
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

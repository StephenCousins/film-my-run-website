/**
 * Joint angles for the cursor runner, in degrees, for a point in the stride.
 *
 * phase: radians around the stride; the far leg is half a stride behind.
 * amount: 0 standing still, 1 running flat out; it scales the swing so the
 * runner eases from a stand into a run and back.
 *
 * Signs: thigh and upper arm positive = swung forward; knee and elbow
 * positive = bent. Leg A is thighForward = sin(phase): back at -π/2 (toe-off),
 * forward at π/2 (landing). The knee folds most just after toe-off (heel
 * kicking up behind) and is nearly straight by landing and through stance.
 */
export interface Limb { thigh: number; knee: number; arm: number; elbow: number }
export interface Pose { near: Limb; far: Limb; bob: number }

function limb(phase: number, amount: number): Limb {
  const swing = Math.max(0, Math.cos(phase + Math.PI / 4));
  return {
    thigh: 4 + amount * 32 * Math.sin(phase),
    knee: 8 + amount * (8 + 85 * swing * swing),
    // Arms swing against the legs, bent near a right angle, a touch more on the forward swing.
    arm: amount * -34 * Math.sin(phase) + 0, // + 0: no "-0" when standing
    elbow: 70 + amount * (18 + 12 * Math.sin(phase + Math.PI)),
  };
}

export function runnerPose(phase: number, amount: number): Pose {
  const a = Math.max(0, Math.min(1, amount));
  return {
    near: limb(phase, a),
    far: limb(phase + Math.PI, a),
    // Up at mid-flight, twice a stride.
    bob: -a * 0.9 * Math.abs(Math.sin(phase)),
  };
}

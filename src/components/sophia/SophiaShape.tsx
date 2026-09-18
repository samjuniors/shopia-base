function applyToGlow(u: any) {
  if (!u) return;
  u.uTime.value = useSophiaStore.getState().elapsedTime || 0; // Simplified, usually handled by clock in frame
  u.uBend.value.set(0, 0, 0); // Glow usually doesn't bend same way
  u.uGlow.value = useSophiaStore.getState().glow;
  u.uColorA.value.copy(new Color("#00E5FF")); // Simplified for now, should lerp
  u.uColorB.value.copy(new Color("#2E7BFF"));
  u.uColorC.value.copy(new Color("#8B5CF6"));
  u.uColorD.value.copy(new Color("#FF2BD6"));
  u.uColorSpeed.value = useSophiaStore.getState().colorSpeed;
  u.uStreakOn.value = useSophiaStore.getState().streakOn ? 1 : 0;
  u.uStreakSpeed.value = useSophiaStore.getState().streakSpeed;
  u.uStreakIntensity.value = useSophiaStore.getState().streakIntensity;
  u.uHighlight.value = useSophiaStore.getState().highlightAmount;
  u.uFlowDir.value = useSophiaStore.getState().colorFlowDir;
}
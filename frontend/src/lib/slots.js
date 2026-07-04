// 30-minute slots 9:00 AM – 6:30 PM (matches the backend's internal availability).
export const ALL_SLOTS = (() => {
  const out = [];
  for (let h = 9; h < 19; h++) {
    for (const m of [0, 30]) {
      if (h === 18 && m === 30) continue;
      const ampm = h < 12 ? "AM" : "PM";
      const hh = h % 12 === 0 ? 12 : h % 12;
      out.push(`${hh}:${m === 0 ? "00" : "30"} ${ampm}`);
    }
  }
  return out;
})();

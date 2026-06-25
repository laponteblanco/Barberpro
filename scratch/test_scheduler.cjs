const appointmentInterval = 15;
const blockedMinutes = new Set();
// Example: block 10:00 to 12:00
for (let t = 10 * 60; t < 12 * 60; t++) {
  blockedMinutes.add(t);
}

const startHour = 8;
const endHour = 14;
const services = [
  { id: 's1', name: 'Corte', duration_minutes: 30 },
  { id: 's2', name: 'Barba', duration_minutes: 20 },
  { id: 's3', name: 'Cejas', duration_minutes: 15 },
];

function fits(startMin, duration) {
  if (startMin + duration > endHour * 60) return false;
  for (let t = startMin; t < startMin + duration; t++) {
    if (blockedMinutes.has(t)) return false;
  }
  return true;
}

const totalDuration = services.reduce((acc, s) => acc + s.duration_minutes, 0);
const continuousSlots = [];
for (let hour = startHour; hour < endHour; hour++) {
  for (let min = 0; min < 60; min += appointmentInterval) {
    const slotMin = hour * 60 + min;
    if (fits(slotMin, totalDuration)) {
      continuousSlots.push(slotMin);
    }
  }
}

console.log("Continuous Slots:", continuousSlots.map(m => `${Math.floor(m/60)}:${String(m%60).padStart(2, '0')}`));

const fragmentedOptions = [];
function findCombinations(serviceIndex, currentMin, currentCombo) {
  if (serviceIndex === services.length) {
    let waitTime = 0;
    for (let i = 1; i < currentCombo.length; i++) {
      const prev = currentCombo[i - 1];
      const curr = currentCombo[i];
      waitTime += curr.startMin - (prev.startMin + prev.duration);
    }
    fragmentedOptions.push({ combo: [...currentCombo], waitTime });
    return;
  }

  const s = services[serviceIndex];
  for (let min = currentMin; min <= endHour * 60 - s.duration_minutes; min += appointmentInterval) {
    if (fits(min, s.duration_minutes)) {
      currentCombo.push({ serviceId: s.id, name: s.name, startMin: min, duration: s.duration_minutes });
      findCombinations(serviceIndex + 1, min + s.duration_minutes, currentCombo);
      currentCombo.pop();
    }
  }
}

if (continuousSlots.length === 0 && services.length > 1) {
  findCombinations(0, startHour * 60, []);
  
  fragmentedOptions.sort((a, b) => {
    if (a.waitTime !== b.waitTime) return a.waitTime - b.waitTime;
    return a.combo[0].startMin - b.combo[0].startMin;
  });

  const topOptions = fragmentedOptions.slice(0, 5);
  console.log("Fragmented Options:");
  topOptions.forEach((opt, idx) => {
    console.log(`Option ${idx + 1} (Wait time: ${opt.waitTime}m):`);
    opt.combo.forEach(c => {
      console.log(`  - ${c.name} at ${Math.floor(c.startMin/60)}:${String(c.startMin%60).padStart(2, '0')}`);
    });
  });
}

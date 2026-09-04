const scanModal = document.getElementById('scanModal');
const cameraFeed = document.getElementById('cameraFeed');
const cameraFallback = document.getElementById('cameraFallback');
const uploadedPreview = document.getElementById('uploadedPreview');
const resultCard = document.getElementById('resultCard');
const scanHint = document.getElementById('scanHint');
const detectingBadge = document.getElementById('detectingBadge');
const title = document.getElementById('scanTitle');
let stream;
let facingMode = 'environment';

function chooseResult() {
  const samples = [
    { name: 'Rice straw', confidence: '94%', quality: 'Grade A', moisture: '14.2%', fit: 'Biochar' },
    { name: 'Rice husk', confidence: '91%', quality: 'Grade A', moisture: '11.8%', fit: 'Silica products' },
    { name: 'Sugarcane bagasse', confidence: '89%', quality: 'Grade B', moisture: '18.4%', fit: 'Eco packaging' }
  ];
  return samples[Math.floor(Math.random() * 2)];
}

function setResult(data) {
  title.textContent = data.name;
  document.querySelector('.confidence b').textContent = data.confidence;
  document.querySelector('.confidence-bar i').style.width = data.confidence;
  const details = document.querySelectorAll('.result-details b');
  details[0].textContent = data.quality;
  details[1].textContent = data.moisture;
  details[2].textContent = data.fit;
}

async function startCamera() {
  stopCamera();
  uploadedPreview.classList.remove('visible');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    cameraFeed.srcObject = stream;
    cameraFeed.classList.add('visible');
    cameraFallback.style.display = 'none';
  } catch (error) {
    cameraFeed.classList.remove('visible');
    cameraFallback.style.display = 'block';
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  cameraFeed.srcObject = null;
}

function resetScan() {
  resultCard.classList.remove('show');
  scanHint.style.opacity = '1';
  detectingBadge.style.opacity = '1';
}

async function openScanner() {
  scanModal.classList.add('open');
  scanModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  resetScan();
  await startCamera();
}

function closeScanner() {
  scanModal.classList.remove('open');
  scanModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  stopCamera();
  uploadedPreview.classList.remove('visible');
}

function analyseImage() {
  scanHint.textContent = 'Analysing material characteristics…';
  detectingBadge.textContent = '● Analysing sample';
  detectingBadge.style.color = '#fff1b2';
  setTimeout(() => {
    setResult(chooseResult());
    resultCard.classList.add('show');
    scanHint.style.opacity = '0';
    detectingBadge.style.opacity = '0';
  }, 1050);
}

document.getElementById('startScan').addEventListener('click', openScanner);
document.getElementById('newListing').addEventListener('click', openScanner);
document.getElementById('closeScan').addEventListener('click', closeScanner);
document.getElementById('captureButton').addEventListener('click', analyseImage);
document.getElementById('retake').addEventListener('click', resetScan);
document.getElementById('useScan').addEventListener('click', closeScanner);
document.getElementById('listingToast').querySelector('button').addEventListener('click', e => e.currentTarget.parentElement.classList.remove('show'));

document.getElementById('imageUpload').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  stopCamera();
  uploadedPreview.src = URL.createObjectURL(file);
  uploadedPreview.classList.add('visible');
  cameraFallback.style.display = 'none';
  resetScan();
  scanHint.textContent = 'Photo ready — tap the capture button to scan';
});

document.getElementById('switchCamera').addEventListener('click', async () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  await startCamera();
});

document.getElementById('flashButton').addEventListener('click', async () => {
  const track = stream?.getVideoTracks?.()[0];
  if (!track) return;
  try {
    const capabilities = track.getCapabilities();
    if (capabilities.torch) await track.applyConstraints({ advanced: [{ torch: true }] });
  } catch (_) { /* Camera flash support differs across devices. */ }
});

document.querySelector('.mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  document.querySelector('.nav-item.active').classList.remove('active');
  button.classList.add('active');
  document.querySelector('.sidebar').classList.remove('open');
}));

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeScanner(); });

// NovaTerra's Decision Lab demonstrates the data signals considered by the
// Biomass Intelligence Engine before a farmer sees an offer.
const dashboardView = document.getElementById('dashboardView');
const simulatorView = document.getElementById('simulatorView');
const biomassView = document.getElementById('biomassView');
const collectionsView = document.getElementById('collectionsView');
const impactView = document.getElementById('impactView');
const biomassType = document.getElementById('biomassType');
const province = document.getElementById('province');
const volume = document.getElementById('volume');
const moisture = document.getElementById('moisture');
let contamination = 'low';
let decisionTimer;

const materialProfiles = {
  straw: {
    baseRate: 720, emissions: 1.42, targetMoisture: 13, demand: 93,
    gradeName: 'Prime fibre', route: 'Moulded fibre packaging',
    description: 'A strong match for trays, foodware and agricultural packaging.', destination: 'Fibre mill',
    partners: { 'Khon Kaen': ['Korat Fibre Collective', 'Moulded-fibre packaging · 19 km catchment'], 'Ubon Ratchathani': ['Mekong GreenForm', 'Compostable foodware · 24 km catchment'], 'Nakhon Ratchasima': ['Korat Fibre Collective', 'Moulded-fibre packaging · 16 km catchment'], 'Suphan Buri': ['Chao Phraya Pulpworks', 'Agricultural fibre products · 21 km catchment'] }
  },
  husk: {
    baseRate: 650, emissions: 1.08, targetMoisture: 11, demand: 89,
    gradeName: 'Clean silica feedstock', route: 'Rice-husk silica recovery',
    description: 'A high-value input for silica, insulation and composite products.', destination: 'Materials plant',
    partners: { 'Khon Kaen': ['Isan Bio-Minerals', 'Rice husk silica materials · 27 km catchment'], 'Ubon Ratchathani': ['Mekong Biochar Lab', 'Circular soil products · 16 km catchment'], 'Nakhon Ratchasima': ['Korat Ash & Silica', 'Low-carbon composites · 21 km catchment'], 'Suphan Buri': ['Central Silica Works', 'Rice husk mineral recovery · 17 km catchment'] }
  },
  bagasse: {
    baseRate: 680, emissions: 1.26, targetMoisture: 16, demand: 91,
    gradeName: 'Refined fibre', route: 'Compostable serviceware',
    description: 'A reliable pathway for strong, plant-based food-service fibre.', destination: 'Fibre moulding',
    partners: { 'Khon Kaen': ['Northeast Plantware', 'Bagasse food-service fibre · 31 km catchment'], 'Ubon Ratchathani': ['Mekong Plantware', 'Compostable packaging · 28 km catchment'], 'Nakhon Ratchasima': ['Korat Cane Fibre', 'Plant-fibre tableware · 19 km catchment'], 'Suphan Buri': ['Central Cane Circular', 'Moulded bagasse products · 12 km catchment'] }
  }
};

const provinceLogistics = { 'Khon Kaen': 91, 'Ubon Ratchathani': 88, 'Nakhon Ratchasima': 94, 'Suphan Buri': 96 };
const contaminationPenalty = { low: 0, medium: 15, high: 32 };

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function showView(view) {
  const views = { dashboard: dashboardView, simulator: simulatorView, biomass: biomassView, collections: collectionsView, impact: impactView };
  Object.entries(views).forEach(([name, element]) => { element.hidden = name !== view; });
  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  if (view === 'simulator') {
    updateDecision();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateDecision() {
  const profile = materialProfiles[biomassType.value];
  const tonnes = Number(volume.value);
  const moistureValue = Number(moisture.value);
  const moistureGap = Math.abs(moistureValue - profile.targetMoisture);
  const quality = Math.max(37, Math.round(100 - moistureGap * 2.7 - contaminationPenalty[contamination]));
  const logistics = Math.max(48, provinceLogistics[province.value] - (tonnes > 45 ? 5 : tonnes > 30 ? 2 : 0));
  const demand = Math.max(63, profile.demand - (contamination === 'high' ? 14 : contamination === 'medium' ? 5 : 0) - (moistureGap > 9 ? 7 : 0));
  const overall = Math.round(quality * 0.45 + logistics * 0.25 + demand * 0.30);
  const grade = overall >= 88 ? 'A' : overall >= 72 ? 'B' : 'C';
  const gradeName = grade === 'A' ? profile.gradeName : grade === 'B' ? 'Standard circular grade' : 'Conditioning required';
  const multiplier = grade === 'A' ? 1.05 : grade === 'B' ? 0.82 : 0.58;
  const rate = Math.round((profile.baseRate * multiplier) / 10) * 10;
  const offer = rate * tonnes;
  const avoided = (tonnes * profile.emissions).toFixed(1);
  const partner = profile.partners[province.value];
  const compatibility = Math.min(99.1, overall + 4.3).toFixed(1);
  const moistureHint = document.getElementById('moistureHint');
  const fallbackRoute = moistureValue > profile.targetMoisture + 8 || contamination === 'high';
  const routeName = fallbackRoute ? 'Biochar & soil carbon' : profile.route;
  const routeDescription = fallbackRoute ? 'Conditioning and carbon conversion protect value in a lower-grade stream.' : profile.description;
  const routeDestination = fallbackRoute ? 'Biochar kiln' : profile.destination;

  setText('volumeOutput', `${tonnes} tonnes`);
  setText('moistureOutput', `${moistureValue}%`);
  if (moistureGap <= 3 && contamination === 'low') {
    moistureHint.className = 'moisture-hint good';
    moistureHint.textContent = 'Excellent condition for a high-value conversion route.';
  } else if (moistureGap <= 8) {
    moistureHint.className = 'moisture-hint warn';
    moistureHint.textContent = 'Usable condition — drying or sorting affects the offer.';
  } else {
    moistureHint.className = 'moisture-hint risk';
    moistureHint.textContent = 'Conditioning is likely required before processing.';
  }

  setText('gradeLetter', grade);
  setText('gradeName', gradeName);
  setText('gradeSubline', grade === 'A' ? 'High-potential source material' : grade === 'B' ? 'Suitable with standard handling' : 'Pre-processing improves value');
  setText('routeName', routeName);
  setText('routeDescription', routeDescription);
  setText('routeDestination', routeDestination);
  setText('payout', `฿${offer.toLocaleString('en-US')}`);
  setText('rate', `฿${rate.toLocaleString('en-US')} / tonne`);
  setText('co2', avoided);
  setText('circularValue', overall >= 88 ? 'High' : overall >= 72 ? 'Medium' : 'Emerging');
  setText('valueHint', fallbackRoute ? 'Carbon recovery route' : 'Local conversion match');
  setText('partnerName', fallbackRoute ? 'TerraCarbon Network' : partner[0]);
  setText('partnerDetail', fallbackRoute ? 'Regional carbon conversion · capacity available' : partner[1]);
  setText('compatibilityScore', `${compatibility}%`);
  document.getElementById('compatibilityBar').style.width = `${compatibility}%`;
  setText('totalScore', `${overall} / 100`);
  [['qualityScore', 'qualityScoreLabel', quality], ['logisticsScore', 'logisticsScoreLabel', logistics], ['demandScore', 'demandScoreLabel', demand]].forEach(([bar, label, score]) => {
    document.getElementById(bar).style.width = `${score}%`;
    setText(label, `${score}%`);
  });
}

function queueDecisionUpdate() {
  const status = document.getElementById('evaluationStatus');
  status.classList.remove('ready');
  status.innerHTML = '<i></i> Recalculating';
  clearTimeout(decisionTimer);
  decisionTimer = setTimeout(() => {
    updateDecision();
    status.classList.add('ready');
    status.innerHTML = '<i></i> Decision ready';
  }, 180);
}

[biomassType, province, volume, moisture].forEach(input => input.addEventListener('input', queueDecisionUpdate));
document.querySelectorAll('.contamination-choice').forEach(choice => choice.addEventListener('click', () => {
  contamination = choice.dataset.contamination;
  document.querySelectorAll('.contamination-choice').forEach(item => {
    const active = item === choice;
    item.classList.toggle('active', active);
    item.setAttribute('aria-checked', active ? 'true' : 'false');
  });
  queueDecisionUpdate();
}));

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.getElementById('scanFromLab').addEventListener('click', openScanner);
document.getElementById('useScan').addEventListener('click', () => {
  const scanType = title.textContent.toLowerCase();
  const material = scanType.includes('husk') ? 'husk' : scanType.includes('bagasse') ? 'bagasse' : 'straw';
  openListing(material);
});

const listingModal = document.getElementById('listingModal');
const listingMaterial = document.getElementById('listingMaterial');
const listingVolume = document.getElementById('listingVolume');
const listingDate = document.getElementById('listingDate');
const materialNames = { straw: 'Rice straw', husk: 'Rice husk', bagasse: 'Sugarcane bagasse' };

function showToast(titleText, detailText) {
  const toast = document.getElementById('listingToast');
  toast.querySelector('strong').textContent = titleText;
  toast.querySelector('small').textContent = detailText;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function updateListingOffer() {
  const profile = materialProfiles[listingMaterial.value];
  const tonnes = Math.max(1, Number(listingVolume.value) || 1);
  const rate = Math.round(profile.baseRate / 10) * 10;
  document.getElementById('listingOffer').textContent = `฿${(rate * tonnes).toLocaleString('en-US')}`;
  document.getElementById('listingRate').textContent = `฿${rate.toLocaleString('en-US')} / tonne · subject to hub check`;
  document.getElementById('listingScanName').textContent = materialNames[listingMaterial.value];
  document.getElementById('listingScanDescription').textContent = `${profile.gradeName} · matched to ${profile.route.toLowerCase()}`;
}

function openListing(material = 'straw') {
  listingMaterial.value = material;
  listingModal.classList.add('open');
  listingModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.getElementById('listingFeedback').textContent = '';
  if (!listingDate.value) {
    const availableDate = new Date();
    availableDate.setDate(availableDate.getDate() + 3);
    listingDate.value = availableDate.toISOString().split('T')[0];
  }
  updateListingOffer();
}

function closeListing() {
  listingModal.classList.remove('open');
  listingModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function addListingToFeed(material, tonnes, amount) {
  const materialClass = material;
  const feed = document.getElementById('listingFeed');
  const entry = document.createElement('div');
  entry.className = 'listing-entry';
  entry.innerHTML = `<span class="listing-photo ${materialClass}"></span><div class="listing-material"><strong>${materialNames[material]} · new field listing</strong><small>${tonnes.toFixed(1)} t · submitted today · AI reviewed</small><span class="trace-tag">◎ Traceable sample</span></div><div class="listing-stage progress"><i></i><span>Collection requested</span><small>Route being assigned</small></div><div class="listing-value"><strong>฿${amount.toLocaleString('en-US')}</strong><small>Estimated value</small></div><button class="listing-more" aria-label="View new listing">→</button>`;
  feed.prepend(entry);
}

document.getElementById('closeListing').addEventListener('click', closeListing);
listingModal.addEventListener('click', event => { if (event.target === listingModal) closeListing(); });
[listingMaterial, listingVolume].forEach(input => input.addEventListener('input', updateListingOffer));
document.getElementById('createListing').addEventListener('click', openScanner);
document.getElementById('adviceScan').addEventListener('click', openScanner);
document.getElementById('openLabFromListing').addEventListener('click', () => {
  biomassType.value = listingMaterial.value;
  volume.value = listingVolume.value;
  closeListing();
  showView('simulator');
  queueDecisionUpdate();
});
document.getElementById('submitListing').addEventListener('click', () => {
  const feedback = document.getElementById('listingFeedback');
  if (!document.getElementById('materialReady').checked) {
    feedback.textContent = 'Please confirm that the material is ready for collection.';
    return;
  }
  const tonnes = Math.max(1, Number(listingVolume.value) || 1);
  const rate = Math.round(materialProfiles[listingMaterial.value].baseRate / 10) * 10;
  const amount = rate * tonnes;
  addListingToFeed(listingMaterial.value, tonnes, amount);
  document.getElementById('readyTonnes').innerHTML = `${(12.8 + tonnes).toFixed(1)} <small>t</small>`;
  document.getElementById('offerValue').textContent = `฿${(8040 + amount).toLocaleString('en-US')}`;
  feedback.textContent = 'Collection request created — we are assigning the best route.';
  setTimeout(() => {
    closeListing();
    showView('biomass');
    showToast('Collection request created', `${materialNames[listingMaterial.value]} is now being matched to a route.`);
  }, 550);
});

document.getElementById('confirmPickup').addEventListener('click', event => {
  event.currentTarget.textContent = 'Material marked ready ✓';
  event.currentTarget.disabled = true;
  document.getElementById('pickupConfirmation').textContent = 'Khun Chai has been notified. We will keep you updated as the route begins.';
});
document.getElementById('shareImpact').addEventListener('click', () => showToast('Impact summary prepared', 'Your verified NovaTerra record is ready to share.'));
document.getElementById('showCertificate').addEventListener('click', () => showToast('Trace record found', 'Rice husk · Khong Chiam hub · partner delivery verified.'));
document.querySelectorAll('.filter').forEach(filter => filter.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === filter));
}));

updateDecision();

/* ===== Theme (dark / light) ===== */
const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  if (themeToggle) themeToggle.textContent = isDark ? '☀' : '☾';
  localStorage.setItem('novaterra-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = isDark ? '#0f1c18' : '#153e35';
}
const savedTheme = localStorage.getItem('novaterra-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  });
}

/* ===== i18n: English / Thai / Chinese ===== */
const translations = {
  en: {
    'nav.overview': 'Overview',
    'nav.biomass': 'My biomass',
    'nav.lab': 'Decision lab',
    'nav.collections': 'Collections',
    'nav.impact': 'My impact',
    'nav.help': ' Help centre',
    'dash.date': 'SUNDAY, 30 AUGUST',
    'dash.greeting': 'Good morning, <em>Nicha.</em>',
    'dash.intro': 'Your fields have more to give. Let’s put every residue to its best use.',
    'dash.list': 'List biomass',
    'dash.scanEyebrow': 'AI MOBILE CAMERA SCAN',
    'dash.new': 'NEW',
    'dash.scanTitle': 'What’s in<br />your field?',
    'dash.scanCopy': 'Scan a sample for an instant type and quality check.',
    'dash.scanBtn': 'Scan biomass',
    'dash.scanFooter': 'Supports rice straw, husk & bagasse',
    'dash.impactEyebrow': 'YOUR IMPACT',
    'dash.impactTitle': 'This season',
    'dash.co2Label': 'tCO₂e<br />avoided',
    'dash.residue': 'Residue recovered',
    'dash.impactNote': 'That’s like keeping 5 cars off the road for a year.',
    'dash.available': 'Available to list',
    'dash.nextCol': 'Next collection',
    'dash.earnings': 'Estimated earnings',
    'dash.activity': 'ACTIVITY',
    'dash.recent': 'Recent biomass',
    'dash.viewAll': 'View all',
    'dash.nextUp': 'NEXT UP',
    'dash.route': 'Collection route',
    'lab.eyebrow': 'NOVATERRA AI SYSTEM',
    'lab.title': 'Biomass <em>Decision Lab.</em>',
    'lab.intro': 'Explore how the intelligence engine evaluates crop residue and finds the highest-value, lowest-impact pathway.',
    'lab.scan': 'Start with a scan',
    'bio.eyebrow': 'MY FIELD INVENTORY',
    'bio.title': 'My <em>biomass.</em>',
    'bio.intro': 'Every listed residue is quality-assessed, traceable and ready for a verified collection route.',
    'col.eyebrow': 'COLLECTION NETWORK',
    'col.title': 'Your next <em>pickup.</em>',
    'col.intro': 'NovaTerra groups nearby farms to make each collection route efficient, reliable and lower-carbon.',
    'imp.eyebrow': 'YOUR CIRCULAR CONTRIBUTION',
    'imp.title': 'Value beyond <em>the field.</em>',
    'imp.intro': 'Your collections are helping turn agricultural residues into useful products instead of smoke and waste.',
    'imp.share': 'Share impact summary',
    langLabel: 'EN'
  },
  th: {
    'nav.overview': 'ภาพรวม',
    'nav.biomass': 'ชีวมวลของฉัน',
    'nav.lab': 'ห้องทดลองตัดสินใจ',
    'nav.collections': 'การเก็บเกี่ยว',
    'nav.impact': 'ผลกระทบของฉัน',
    'nav.help': ' ศูนย์ช่วยเหลือ',
    'dash.date': 'วันอาทิตย์ 30 สิงหาคม',
    'dash.greeting': 'สวัสดีตอนเช้า <em>นิชา</em>',
    'dash.intro': 'ทุ่งนาของคุณยังมีสิ่งให้ใช้ได้อีก มาเปลี่ยนเศษวัสดุทุกชิ้นให้เกิดประโยชน์สูงสุด',
    'dash.list': 'ลงรายการชีวมวล',
    'dash.scanEyebrow': 'สแกนด้วยกล้อง AI',
    'dash.new': 'ใหม่',
    'dash.scanTitle': 'ในทุ่งนา<br />ของคุณมีอะไร?',
    'dash.scanCopy': 'สแกนตัวอย่างเพื่อตรวจสอบชนิดและคุณภาพทันที',
    'dash.scanBtn': 'สแกนชีวมวล',
    'dash.scanFooter': 'รองรับฟางข้าว แกลบ และชานอ้อย',
    'dash.impactEyebrow': 'ผลกระทบของคุณ',
    'dash.impactTitle': 'ฤดูกาลนี้',
    'dash.co2Label': 'ตัน CO₂e<br />ที่หลีกเลี่ยง',
    'dash.residue': 'เศษวัสดุที่เก็บได้',
    'dash.impactNote': 'เทียบเท่ากับการลดรถยนต์ 5 คันออกจากถนนเป็นเวลา 1 ปี',
    'dash.available': 'พร้อมลงรายการ',
    'dash.nextCol': 'การเก็บครั้งถัดไป',
    'dash.earnings': 'รายได้โดยประมาณ',
    'dash.activity': 'กิจกรรม',
    'dash.recent': 'ชีวมวลล่าสุด',
    'dash.viewAll': 'ดูทั้งหมด',
    'dash.nextUp': 'ถัดไป',
    'dash.route': 'เส้นทางการเก็บ',
    'lab.eyebrow': 'ระบบ AI โนวาเทอร์รา',
    'lab.title': 'ห้องทดลอง<br /><em>ตัดสินใจชีวมวล</em>',
    'lab.intro': 'สำรวจว่าเครื่องมืออัจฉริยะประเมินเศษวัสดุพืชผลและหาเส้นทางที่มีมูลค่าสูงสุดและผลกระทบต่ำสุดอย่างไร',
    'lab.scan': 'เริ่มด้วยการสแกน',
    'bio.eyebrow': 'คลังสินค้าในทุ่ง',
    'bio.title': 'ชีวมวล<br /><em>ของฉัน</em>',
    'bio.intro': 'เศษวัสดุทุกรายการได้รับการประเมินคุณภาพ ติดตามได้ และพร้อมสำหรับเส้นทางการเก็บที่ตรวจสอบแล้ว',
    'col.eyebrow': 'เครือข่ายการเก็บ',
    'col.title': 'การรับครั้ง<br /><em>ถัดไปของคุณ</em>',
    'col.intro': 'โนวาเทอร์รากลุ่มฟาร์มใกล้เคียงเพื่อให้แต่ละเส้นทางการเก็บมีประสิทธิภาพ เชื่อถือได้ และคาร์บอนต่ำ',
    'imp.eyebrow': 'การมีส่วนร่วมแบบหมุนเวียน',
    'imp.title': 'มูลค่าที่เกิน<br /><em>จากทุ่งนา</em>',
    'imp.intro': 'การเก็บของคุณช่วยเปลี่ยนเศษวัสดุการเกษตรให้เป็นผลิตภัณฑ์ที่มีประโยชน์ แทนควันและขยะ',
    'imp.share': 'แชร์สรุปผลกระทบ',
    langLabel: 'TH'
  },
  zh: {
    'nav.overview': '总览',
    'nav.biomass': '我的生物质',
    'nav.lab': '决策实验室',
    'nav.collections': '收运',
    'nav.impact': '我的影响',
    'nav.help': ' 帮助中心',
    'dash.date': '周日，8月30日',
    'dash.greeting': '早上好，<em>Nicha。</em>',
    'dash.intro': '您的田地还有更多价值。让我们把每一份残留物用到最合适的地方。',
    'dash.list': '登记生物质',
    'dash.scanEyebrow': 'AI 手机相机扫描',
    'dash.new': '新',
    'dash.scanTitle': '田里有什么？',
    'dash.scanCopy': '扫描样本，立即获得类型与质量评估。',
    'dash.scanBtn': '扫描生物质',
    'dash.scanFooter': '支持稻草、稻壳与甘蔗渣',
    'dash.impactEyebrow': '您的影响',
    'dash.impactTitle': '本季',
    'dash.co2Label': '吨 CO₂e<br />已避免',
    'dash.residue': '已回收残留物',
    'dash.impactNote': '相当于一年少开 5 辆车。',
    'dash.available': '可登记',
    'dash.nextCol': '下次收运',
    'dash.earnings': '预估收益',
    'dash.activity': '动态',
    'dash.recent': '近期生物质',
    'dash.viewAll': '查看全部',
    'dash.nextUp': '接下来',
    'dash.route': '收运路线',
    'lab.eyebrow': 'NOVATERRA AI 系统',
    'lab.title': '生物质 <em>决策实验室。</em>',
    'lab.intro': '了解智能引擎如何评估作物残留物，并找到价值最高、影响最低的路径。',
    'lab.scan': '从扫描开始',
    'bio.eyebrow': '田间库存',
    'bio.title': '我的 <em>生物质。</em>',
    'bio.intro': '每一批登记的残留物都经过质量评估、可追溯，并已准备好进入经核实的收运路线。',
    'col.eyebrow': '收运网络',
    'col.title': '您的下一次 <em>取件。</em>',
    'col.intro': 'NovaTerra 将附近农场分组，使每条收运路线更高效、可靠且低碳。',
    'imp.eyebrow': '您的循环贡献',
    'imp.title': '田野之外的 <em>价值。</em>',
    'imp.intro': '您的收运正帮助把农业残留物变成有用产品，而不是烟雾和废弃物。',
    'imp.share': '分享影响摘要',
    langLabel: 'ZH'
  }
};

let currentLang = localStorage.getItem('novaterra-lang') || 'en';

function applyLanguage(lang) {
  if (!translations[lang]) lang = 'en';
  currentLang = lang;
  localStorage.setItem('novaterra-lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = translations[lang][key];
    if (value != null) el.textContent = value;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const value = translations[lang][key];
    if (value != null) el.innerHTML = value;
  });

  const label = document.getElementById('langToggle');
  if (label) label.innerHTML = `${translations[lang].langLabel} <span>⌄</span>`;

  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

const langToggle = document.getElementById('langToggle');
const langMenu = document.getElementById('langMenu');
if (langToggle && langMenu) {
  langToggle.addEventListener('click', e => {
    e.stopPropagation();
    const open = langMenu.classList.toggle('open');
    langToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      applyLanguage(btn.dataset.lang);
      langMenu.classList.remove('open');
      langToggle.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', () => {
    langMenu.classList.remove('open');
    langToggle.setAttribute('aria-expanded', 'false');
  });
}

applyLanguage(currentLang);

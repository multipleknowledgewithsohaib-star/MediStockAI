// Additional medicines to reach 500+
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const extraMedicines = [
  // More Pain Relief
  ["Synflex 550mg", "Roche", "Pain Relief", 70, 90, 10],
  ["Aceclofenac 100mg", "Getz", "Pain Relief", 30, 40, 10],
  ["Etoricoxib 60mg", "Getz", "Pain Relief", 60, 75, 10],
  ["Etoricoxib 90mg", "Getz", "Pain Relief", 85, 105, 10],
  ["Flurbiprofen 100mg", "Abbott", "Pain Relief", 25, 35, 20],
  // More Antibiotics
  ["Moxifloxacin 400mg", "Bayer", "Antibiotics", 150, 185, 5],
  ["Linezolid 600mg", "Pfizer", "Antibiotics", 400, 495, 10],
  ["Doxycycline 100mg", "Hilton", "Antibiotics", 25, 35, 10],
  ["Fosfomycin 3g", "Zambon", "Antibiotics", 300, 370, 1],
  ["Nitrofurantoin 100mg", "Hilton", "Antibiotics", 30, 40, 30],
  ["Colistin 1MIU Inj", "Sami", "Antibiotics", 500, 620, 1],
  ["Erythromycin 250mg", "Abbott", "Antibiotics", 40, 55, 12],
  ["Erythromycin 500mg", "Abbott", "Antibiotics", 70, 90, 12],
  // More Cardiac
  ["Amlodipine 5mg", "Getz", "Cardiac", 25, 35, 30],
  ["Amlodipine 10mg", "Getz", "Cardiac", 40, 55, 30],
  ["Atenolol 50mg", "Hilton", "Cardiac", 15, 25, 28],
  ["Atenolol 100mg", "Hilton", "Cardiac", 25, 35, 28],
  ["Ramipril 2.5mg", "Sanofi", "Cardiac", 40, 55, 28],
  ["Ramipril 5mg", "Sanofi", "Cardiac", 65, 80, 28],
  ["Telmisartan 40mg", "Boehringer", "Cardiac", 70, 90, 30],
  ["Telmisartan 80mg", "Boehringer", "Cardiac", 120, 150, 30],
  ["Atorvastatin 10mg", "Getz", "Cardiac", 40, 55, 30],
  ["Atorvastatin 20mg", "Getz", "Cardiac", 65, 80, 30],
  ["Atorvastatin 40mg", "Getz", "Cardiac", 95, 120, 30],
  ["Rosuvastatin 5mg", "AstraZeneca", "Cardiac", 60, 75, 28],
  ["Rosuvastatin 10mg", "AstraZeneca", "Cardiac", 100, 125, 28],
  ["Rosuvastatin 20mg", "AstraZeneca", "Cardiac", 160, 200, 28],
  ["Clopidogrel 75mg", "Sanofi", "Cardiac", 60, 75, 28],
  ["Nitroglycerin 2.6mg", "Merck", "Cardiac", 40, 55, 60],
  ["Isosorbide 10mg", "Hilton", "Cardiac", 20, 30, 20],
  // More Gastro
  ["Esomeprazole 20mg", "AstraZeneca", "Gastro", 80, 100, 14],
  ["Esomeprazole 40mg", "AstraZeneca", "Gastro", 140, 175, 14],
  ["Lansoprazole 15mg", "Sami", "Gastro", 35, 45, 14],
  ["Lansoprazole 30mg", "Sami", "Gastro", 55, 70, 14],
  ["Ranitidine 150mg", "Hilton", "Gastro", 15, 25, 20],
  ["Famotidine 20mg", "Hilton", "Gastro", 20, 30, 20],
  ["Famotidine 40mg", "Hilton", "Gastro", 35, 45, 20],
  // More Diabetes
  ["Metformin 500mg", "Hilton", "Diabetes", 15, 25, 30],
  ["Metformin 850mg", "Hilton", "Diabetes", 25, 35, 30],
  ["Metformin 1000mg", "Hilton", "Diabetes", 35, 45, 30],
  ["Glimepiride 1mg", "Sanofi", "Diabetes", 30, 40, 30],
  ["Glimepiride 2mg", "Sanofi", "Diabetes", 50, 65, 30],
  ["Glimepiride 4mg", "Sanofi", "Diabetes", 80, 100, 30],
  ["Dapagliflozin 10mg", "AstraZeneca", "Diabetes", 350, 430, 28],
  ["Empagliflozin 10mg", "Boehringer", "Diabetes", 380, 470, 30],
  ["Sitagliptin 50mg", "MSD", "Diabetes", 300, 370, 14],
  ["Sitagliptin 100mg", "MSD", "Diabetes", 450, 560, 14],
  // More Vitamins
  ["Magnesium 250mg", "Hilton", "Vitamins & Supplements", 30, 40, 30],
  ["Potassium Tab", "Hilton", "Vitamins & Supplements", 20, 30, 30],
  ["Iron + Folic Acid Tab", "Sami", "Vitamins & Supplements", 25, 35, 30],
  ["Vitamin A 50000IU", "Hilton", "Vitamins & Supplements", 20, 30, 20],
  ["Vitamin K 10mg Tab", "Hilton", "Vitamins & Supplements", 15, 25, 10],
];

async function main() {
  const existingCount = await prisma.product.count();
  console.log(`Existing products: ${existingCount}`);
  
  let counter = existingCount + 1;
  const data = extraMedicines.map(([name, brand, category, purchasePrice, salePrice, unitsPerPack]) => ({
    item_code: `ITEM${String(counter++).padStart(4, '0')}`,
    name, brand, category, purchasePrice, salePrice, stock: 0, unitsPerPack,
  }));
  
  await prisma.product.createMany({ data });
  
  const finalCount = await prisma.product.count();
  console.log(`✅ Added ${extraMedicines.length} more products`);
  console.log(`🎉 Total products now: ${finalCount}`);
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

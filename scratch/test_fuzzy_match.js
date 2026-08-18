const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('d:\\Tool\\AutoThi\\contests_manifest.json', 'utf8'));
const questions = manifest.contests[0].questions;

// Simulate messy DOM questions from cuocthi.vn
const testDomQuestions = [
  "Câu 1: Câu hỏi: Giải pháp đào tạo kỹ năng số cho học sinh, sinh viên theo chương trình “Học từ làm việc thực tế” được quy định triển khai như thế nào?",
  "Câu 2. Kế hoạch triển khai Phong trào \"Bình dân học vụ số\" của tỉnh Lâm Đồng có ký hiệu là gì và ban hành vào ngày nào?",
  "Câu 3: Dấu hiệu nào có thể cho thấy một đường link là không an toàn ?",
  "Câu hỏi 18: Theo Kế hoạch số 3450/KH-UBND ngày 18/3/2026 của UBND tỉnh Lâm Đồng triển khai thực hiện Nghị quyết số 57-NQ/TW ngày 22/12/2024 của Bộ Chính trị về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia trên địa bàn tỉnh Lâm Đồng năm 2026, chỉ số chuyển đổi số cấp tỉnh năm 2026 có chỉ tiêu đạt mức nào?",
  "Câu 20: Kế hoạch 5567/KH-UBND ngày 23/4/2026 của UBND tỉnh triển khai hoạt động của Tổ Công nghệ số cộng đồng trên địa bàn tỉnh Lâm Đồng năm 2026, nhấn mạnh nâng cao nhận thức về vai trò, trách nhiệm của lực lượng nào trong hoạt động chuyển đổi số cộng đồng dân cư?"
];

function cleanString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/^(câu\s*\d+[\s:.-]*|bài\s*\d+[\s:.-]*|question\s*\d+[\s:.-]*)/gi, "")
    .replace(/^(câu\s*hỏi\s*[\d]*[\s:.-]*)/gi, "")
    .replace(/[“”"''`.,:;?!–—\-\(\)\[\]\/\\_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestMatch(domQ, bank) {
  const cleanDom = cleanString(domQ);
  const domWords = new Set(cleanDom.split(" ").filter(w => w.length > 1));

  let bestEntry = null;
  let maxScore = 0;

  for (const [key, entry] of Object.entries(bank)) {
    const cleanBank = cleanString(entry.question || key);
    
    // Direct match
    if (cleanDom === cleanBank || cleanDom.includes(cleanBank) || cleanBank.includes(cleanDom)) {
      return { entry, score: 1.0, method: "exact/contains" };
    }

    // Token overlap
    const bankWords = cleanBank.split(" ").filter(w => w.length > 1);
    if (bankWords.length === 0) continue;

    let overlap = 0;
    for (const w of bankWords) {
      if (domWords.has(w)) overlap++;
    }

    const score = overlap / bankWords.length;
    if (score > maxScore && score >= 0.6) {
      maxScore = score;
      bestEntry = entry;
    }
  }

  return bestEntry ? { entry: bestEntry, score: maxScore, method: "fuzzy" } : null;
}

console.log("TESTING FUZZY QUESTION MATCHER:");
testDomQuestions.forEach((q, i) => {
  const res = findBestMatch(q, questions);
  console.log(`[Q${i+1}] Match:`, res ? `SUCCESS (${res.method}, score: ${res.score}) -> Answer: "${res.entry.correctAnswer.slice(0, 35)}..."` : "FAILED");
});

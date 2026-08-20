import CryptoJS from 'crypto-js';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using standard CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const getFileHash = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
            const hash = CryptoJS.MD5(wordArray).toString();
            resolve(hash);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file); // Note: For very large files (e.g., >500MB), reading entire file to ArrayBuffer might crash browser. But for docs it's fine.
    });
};

const extractText = async (file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    try {
        if (ext === '.txt' || ext === '.md' || ext === '.csv') {
            return await file.text();
        } else if (ext === '.docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } else if (ext === '.xlsx' || ext === '.xls') {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = xlsx.read(arrayBuffer, { type: 'array' });
            let text = '';
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const csv = xlsx.utils.sheet_to_csv(sheet);
                text += csv + '\n';
            }
            return text;
        } else if (ext === '.pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map(item => item.str).join(' ');
                text += pageText + '\n';
            }
            return text;
        }
    } catch (e) {
        console.error(`Error extracting text from ${file.name}:`, e);
    }
    return null;
};

export const scanFiles = async (filesArray, onProgress) => {
    const allFiles = filesArray.map(f => ({
        name: f.name,
        path: f.webkitRelativePath || f.name,
        size: f.size,
        fileRef: f // store the native File object
    }));

    const nameMap = new Map();
    const duplicateNames = [];
    
    onProgress(0, allFiles.length, 'กำลังเปรียบเทียบชื่อไฟล์...');
    // Add artificial delay to allow UI to render smoothly
    await new Promise(r => setTimeout(r, 10));
    
    for (const file of allFiles) {
        if (nameMap.has(file.name)) {
            nameMap.get(file.name).push(file);
        } else {
            nameMap.set(file.name, [file]);
        }
    }
    
    for (const [name, files] of nameMap.entries()) {
        if (files.length > 1) {
            duplicateNames.push({ name, files: files.map(f => ({ path: f.path, size: f.size })) });
        }
    }
    
    const sizeMap = new Map();
    for (const file of allFiles) {
        if (sizeMap.has(file.size)) {
            sizeMap.get(file.size).push(file);
        } else {
            sizeMap.set(file.size, [file]);
        }
    }
    
    const potentialDuplicates = [];
    for (const files of sizeMap.values()) {
        if (files.length > 1) {
            potentialDuplicates.push(...files);
        }
    }
    
    const hashMap = new Map();
    const duplicateContents = [];
    
    let hashedCount = 0;
    for (const file of potentialDuplicates) {
        try {
            const hash = await getFileHash(file.fileRef);
            file.hash = hash;
            if (hashMap.has(hash)) {
                hashMap.get(hash).push(file);
            } else {
                hashMap.set(hash, [file]);
            }
        } catch (err) {
            console.error(`Error hashing file ${file.path}:`, err);
        }
        hashedCount++;
        if (hashedCount % 5 === 0 || hashedCount === potentialDuplicates.length) {
            onProgress(hashedCount, potentialDuplicates.length, `กำลังตรวจสอบระดับ 100% (คำนวณ Hash ไฟล์ ${hashedCount}/${potentialDuplicates.length})`);
            await new Promise(r => setTimeout(r, 5));
        }
    }
    
    for (const [hash, files] of hashMap.entries()) {
        if (files.length > 1) {
            duplicateContents.push({ 
                hash, 
                files: files.map(f => ({ path: f.path, size: f.size })) 
            });
        }
    }

    const similarContents = [];
    const supportedExts = ['.txt', '.md', '.csv', '.pdf', '.docx', '.xlsx', '.xls'];
    const textFiles = allFiles.filter(file => {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        return supportedExts.includes(ext) && file.size < 5 * 1024 * 1024; // Limit to 5MB
    });

    const extractedTexts = [];
    let extractCount = 0;
    for (const file of textFiles) {
        extractCount++;
        onProgress(extractCount, textFiles.length, `กำลังอ่านเนื้อหาไฟล์สำหรับ AI Partial Match (${extractCount}/${textFiles.length})`);
        await new Promise(r => setTimeout(r, 5));
        
        const text = await extractText(file.fileRef);
        if (text && text.trim().length > 50) { 
            extractedTexts.push({ file, text: text.trim() });
        }
    }

    const totalPairs = (extractedTexts.length * (extractedTexts.length - 1)) / 2;
    let comparedPairs = 0;
    
    if (totalPairs > 0) {
        onProgress(0, totalPairs, `เริ่มประเมินความคล้ายคลึงด้วย AI...`);
    }

    for (let i = 0; i < extractedTexts.length; i++) {
        for (let j = i + 1; j < extractedTexts.length; j++) {
            const doc1 = extractedTexts[i];
            const doc2 = extractedTexts[j];
            
            if (doc1.file.hash && doc2.file.hash && doc1.file.hash === doc2.file.hash) {
                comparedPairs++;
                continue;
            }

            const similarity = stringSimilarity.compareTwoStrings(doc1.text, doc2.text);
            
            if (similarity >= 0.70) {
                similarContents.push({
                    similarity: (similarity * 100).toFixed(2),
                    files: [
                        { name: doc1.file.name, path: doc1.file.path, text: doc1.text }, 
                        { name: doc2.file.name, path: doc2.file.path, text: doc2.text }
                    ]
                });
            }
            
            comparedPairs++;
            if (comparedPairs % 10 === 0 || comparedPairs === totalPairs) {
                onProgress(comparedPairs, totalPairs, `AI กำลังประเมินคู่ไฟล์ที่คล้ายกัน (${comparedPairs}/${totalPairs} คู่)`);
                // Yield to main thread so UI updates
                if (comparedPairs % 100 === 0) await new Promise(r => setTimeout(r, 0));
            }
        }
    }
    
    return {
        totalFiles: allFiles.length,
        duplicateNames,
        duplicateContents,
        similarContents
    };
};

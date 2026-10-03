#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Get PDF.js version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const pdfjsVersion = packageJson.dependencies['pdfjs-dist'];
const version = pdfjsVersion.replace(/[^0-9.]/g, ''); // Remove ^ or ~ prefixes

const publicDir = path.join(__dirname, '../public');
const zipPath = path.join(publicDir, 'pdfjs-dist.zip');
const downloadUrl = `https://github.com/mozilla/pdf.js/releases/download/v${version}/pdfjs-${version}-dist.zip`;

console.log(`📦 Setting up PDF.js viewer v${version}...`);

// Check if files already exist
const webDir = path.join(publicDir, 'web');
const buildDir = path.join(publicDir, 'build');

if (fs.existsSync(webDir) && fs.existsSync(buildDir)) {
    console.log('✅ PDF.js viewer files already exist, skipping download.');
    process.exit(0);
}

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Download the PDF.js distribution
console.log(`📥 Downloading PDF.js from ${downloadUrl}...`);

function downloadFile(url, filePath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        
        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                if (maxRedirects === 0) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                file.close();
                fs.unlinkSync(filePath);
                downloadFile(response.headers.location, filePath, maxRedirects - 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (error) => {
                fs.unlinkSync(filePath);
                reject(error);
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

function extractZip(zipFile, destDir) {
    const attempts = [
        () => execSync(`unzip -q "${zipFile}" -d "${destDir}"`, { stdio: 'inherit' }),
        () => execSync(`python3 -m zipfile -e "${zipFile}" "${destDir}"`, { stdio: 'inherit' }),
        () => execSync(
            `powershell -NoProfile -Command "Expand-Archive -Path '${zipFile.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`,
            { stdio: 'inherit' }
        ),
    ];

    let lastError;
    for (const attempt of attempts) {
        try {
            attempt();
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('No supported zip extractor found (unzip, python3, or powershell)');
}

downloadFile(downloadUrl, zipPath)
    .then(() => {
        console.log('📦 Download complete, extracting...');

        try {
            extractZip(zipPath, publicDir);
            fs.unlinkSync(zipPath);
            console.log('✅ PDF.js viewer setup complete!');
            console.log(`   📁 Files extracted to: ${webDir}`);
            console.log(`   📁 Build files at: ${buildDir}`);
        } catch (error) {
            console.error('❌ Failed to extract PDF.js files:', error.message);
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Download failed:', error.message);
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }
        process.exit(1);
    });

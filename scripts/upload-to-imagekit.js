const fs = require('fs');
const path = require('path');
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: 'public_QpvUc6JUwUyndDfGjuUt2ADRsYM=',
  privateKey: 'private_nEZtFOz/nPnStlvmm5Dr//WSUY0=',
  urlEndpoint: 'https://ik.imagekit.io/6dbhhctcf'
});

const IMAGE_DIR = path.join(__dirname, '../public/assets/images/players');

async function uploadImages() {
  if (!fs.existsSync(IMAGE_DIR)) {
    console.error(`Directory not found: ${IMAGE_DIR}`);
    return;
  }

  const files = fs.readdirSync(IMAGE_DIR);
  // Filter for only png and jpg files
  const imageFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp'));
  
  console.log(`Local images found: ${imageFiles.length}`);
  console.log(`Fetching list of existing files from ImageKit folder '/players'...`);

  const existingFiles = new Set();
  let skip = 0;
  const limit = 1000;
  
  while (true) {
    try {
      const list = await new Promise((resolve, reject) => {
        imagekit.listFiles({
          path: '/players',
          limit: limit,
          skip: skip
        }, function(error, result) {
          if (error) reject(error);
          else resolve(result);
        });
      });

      if (!list || list.length === 0) break;
      for (const item of list) {
        existingFiles.add(item.name);
      }
      if (list.length < limit) break;
      skip += limit;
    } catch (err) {
      console.warn("⚠️ Could not retrieve full file list from ImageKit:", err.message);
      break;
    }
  }

  console.log(`Found ${existingFiles.size} existing files already uploaded to ImageKit.`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const fileName = imageFiles[i];

    if (existingFiles.has(fileName)) {
      console.log(`[${i + 1}/${imageFiles.length}] ⏭️ Skipping ${fileName} (already exists)`);
      skippedCount++;
      continue;
    }

    const filePath = path.join(IMAGE_DIR, fileName);
    const fileData = fs.readFileSync(filePath);

    console.log(`[${i + 1}/${imageFiles.length}] ⬆️ Uploading ${fileName}...`);

    try {
      await new Promise((resolve, reject) => {
        imagekit.upload({
          file: fileData, 
          fileName: fileName,
          folder: '/players', // Will create a "players" folder in ImageKit
          useUniqueFileName: false // Overwrite if it exists with same name
        }, function(error, result) {
          if (error) {
            console.error(`  -> Failed to upload ${fileName}:`, error.message);
            failCount++;
            reject(error);
          } else {
            console.log(`  -> Successfully uploaded: ${result.url}`);
            successCount++;
            resolve(result);
          }
        });
      });
    } catch (error) {
      // Continue uploading the rest even if one fails
    }
  }

  console.log(`\n--- Upload Summary ---`);
  console.log(`Total local images: ${imageFiles.length}`);
  console.log(`Already uploaded (skipped): ${skippedCount}`);
  console.log(`Newly uploaded: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`----------------------\n`);
}

uploadImages();

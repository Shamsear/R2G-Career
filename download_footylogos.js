const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL || 'postgres://localhost/r2g',
  ssl: { rejectUnauthorized: false }
});

const outDir = path.join(__dirname, 'public', 'assets', 'images', 'club-logos');

const manualSlugs = {
  'atletico de madrid': 'atletico-madrid',
  'brighton': 'brighton-and-hove-albion',
  'fsv mainz 05': 'mainz-05',
  'liverpool': 'liverpool-fc',
  'mohun bagan sg': 'mohun-bagan-super-giant',
  'sepahan sc': 'sepahan',
  'villareal': 'villarreal-cf',
  'wolves': 'wolverhampton-wanderers',
  'real betis': 'real-betis-balompie',
  'fc barcalona': 'fc-barcelona',
  'man utd': 'manchester-united'
};

function slugify(name) {
  const lower = name.toLowerCase();
  if (manualSlugs[lower]) return manualSlugs[lower];
  return lower.replace(/\s+/g, '-');
}

async function getLogoUrl(slug) {
  try {
    const res = await axios.get(`https://www.footylogos.com/logos/${slug}`, { timeout: 10000 });
    const matches = [...res.data.matchAll(/<img[^>]+src="([^">]+(footylogos|footballlogos|logo)[^">]+)"/ig)];
    if (matches.length > 0) {
      return matches[0][1];
    }
    const cdnMatches = [...res.data.matchAll(/<img[^>]+src="([^">]+cdn\.prod\.website-files\.com[^">]+)"/ig)];
    if (cdnMatches.length > 0) {
        return cdnMatches[0][1];
    }
  } catch (err) {
    // skip
  }
  return null;
}

async function main() {
  const { rows } = await pool.query('SELECT name FROM clubs');
  
  if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
  }

  for (const row of rows) {
    const dbName = row.name;
    const slug = slugify(dbName);
    console.log(`Processing ${dbName} (slug: ${slug})...`);
    
    let logoUrl = await getLogoUrl(slug);
    
    if (!logoUrl) {
        logoUrl = await getLogoUrl(slug.replace('-fc', '').replace('-cf', ''));
    }
    if (!logoUrl && slug.includes('-')) {
        logoUrl = await getLogoUrl(slug.split('-').pop());
    }

    if (logoUrl) {
      console.log(`  Found logo URL: ${logoUrl}`);
      try {
        const imgRes = await axios.get(logoUrl, { responseType: 'arraybuffer', timeout: 10000 });
        const localFileName = encodeURIComponent(dbName.replace(/\s+/g, '-')) + '.webp';
        const localFilePath = path.join(outDir, localFileName);
        
        await sharp(imgRes.data)
            .resize({ width: 256, withoutEnlargement: true })
            .webp({ quality: 90 })
            .toFile(localFilePath);
            
        console.log(`  Saved to ${localFileName}`);
      } catch (e) {
        console.error(`  Error saving ${dbName}:`, e.message);
      }
    } else {
      console.log(`  Logo not found for ${dbName}`);
    }
  }
  
  pool.end();
}

main().catch(console.error);

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.SOLO_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const IMAGE_DIR = path.join(__dirname, '../public/assets/images/players');

const server = http.createServer(async (req, res) => {
  // CORS headers just in case
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // API to get players and their variants
  if (req.url === '/api/players' && req.method === 'GET') {
    try {
      const { rows: dbPlayers } = await pool.query('SELECT id, name FROM players');
      
      const playersWithVariants = [];
      
      if (fs.existsSync(IMAGE_DIR)) {
        const folders = fs.readdirSync(IMAGE_DIR, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && dirent.name !== 'club' && dirent.name !== 'modal');
          
        for (const folder of folders) {
          const folderName = folder.name;
          const matchingDbPlayer = dbPlayers.find(p => p.name.replace(/[/\\?%*:|"<>]/g, '-').trim() === folderName);
          
          if (matchingDbPlayer) {
            const folderPath = path.join(IMAGE_DIR, folderName);
            const images = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));
            
            if (images.length > 0) {
              playersWithVariants.push({
                id: matchingDbPlayer.id,
                name: matchingDbPlayer.name,
                folderName: folderName,
                images: images
              });
            }
          }
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(playersWithVariants));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API to serve the actual images so the UI can display them
  if (req.url.startsWith('/assets/') && req.method === 'GET') {
    // Strip any query parameters (like ?v=1) and decode the URL
    const urlWithoutQuery = req.url.split('?')[0];
    const decodedUrl = decodeURIComponent(urlWithoutQuery);
    const filePath = path.join(__dirname, '../public', decodedUrl);
    
    console.log(`[DEBUG] Image Request: ${req.url}`);
    console.log(`[DEBUG] Decoded Path: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`[DEBUG] -> SUCCESS: File found and served.`);
      // Send as webp since futbin mostly serves webp. Browsers will still render PNGs fine under this type.
      res.writeHead(200, { 'Content-Type': 'image/webp' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      console.log(`[DEBUG] -> ERROR: File NOT found at ${filePath}`);
      res.writeHead(404);
      res.end('Not found: ' + filePath);
    }
    return;
  }

  // API to select an image
  if (req.url === '/api/select' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { playerId, folderName, imageName } = JSON.parse(body);
        
        const sourcePath = path.join(IMAGE_DIR, folderName, imageName);
        const destPath = path.join(IMAGE_DIR, `${playerId}.png`);
        
        if (fs.existsSync(sourcePath)) {
          // Copy the selected image to the final destination
          fs.copyFileSync(sourcePath, destPath);
          
          // Delete the folder and all variants inside it
          const folderPath = path.join(IMAGE_DIR, folderName);
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            fs.unlinkSync(path.join(folderPath, file));
          }
          fs.rmdirSync(folderPath);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Source image not found' }));
        }
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve the HTML interface
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Player Image Selector</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: white; margin: 0; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          h1 { color: #38bdf8; text-align: center; }
          .player-row { background: #1e293b; margin-bottom: 20px; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
          .player-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
          .variants { display: flex; gap: 20px; flex-wrap: wrap; }
          .variant-card { background: #0f172a; border-radius: 8px; padding: 10px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; text-align: center; }
          .variant-card:hover { border-color: #38bdf8; transform: translateY(-5px); }
          .variant-img { width: 150px; height: 150px; object-fit: contain; }
          .loading { text-align: center; font-size: 1.2rem; color: #94a3b8; }
          .empty { text-align: center; color: #10b981; font-size: 1.2rem; margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Player Image Selector</h1>
          <div id="app" class="loading">Loading players...</div>
        </div>

        <script>
          async function loadPlayers() {
            try {
              const res = await fetch('/api/players');
              const players = await res.json();
              const app = document.getElementById('app');
              
              if (players.length === 0) {
                app.innerHTML = '<div class="empty">No player folders found! Either scraping is still running, or you have already selected images for everyone.</div>';
                return;
              }
              
              app.innerHTML = '';
              players.forEach(p => {
                const row = document.createElement('div');
                row.className = 'player-row';
                row.id = 'player-' + p.id;
                
                const title = document.createElement('div');
                title.className = 'player-name';
                title.innerText = '[' + p.id + '] ' + p.name;
                row.appendChild(title);
                
                const variants = document.createElement('div');
                variants.className = 'variants';
                
                p.images.forEach(imgName => {
                  const card = document.createElement('div');
                  card.className = 'variant-card';
                  card.onclick = () => selectImage(p.id, p.folderName, imgName);
                  
                  const img = document.createElement('img');
                  img.className = 'variant-img';
                  img.src = '/assets/images/players/' + encodeURIComponent(p.folderName) + '/' + encodeURIComponent(imgName);
                  
                  const label = document.createElement('div');
                  label.innerText = 'Select this';
                  label.style.marginTop = '10px';
                  label.style.color = '#38bdf8';
                  
                  card.appendChild(img);
                  card.appendChild(label);
                  variants.appendChild(card);
                });
                
                row.appendChild(variants);
                app.appendChild(row);
              });
            } catch (e) {
              document.getElementById('app').innerText = 'Error loading players: ' + e.message;
            }
          }
          
          async function selectImage(playerId, folderName, imageName) {
            const row = document.getElementById('player-' + playerId);
            row.style.opacity = '0.5';
            row.style.pointerEvents = 'none';
            
            try {
              const res = await fetch('/api/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, folderName, imageName })
              });
              
              if (res.ok) {
                // Remove the row dynamically
                row.remove();
                
                // Check if all are done
                if (document.querySelectorAll('.player-row').length === 0) {
                  document.getElementById('app').innerHTML = '<div class="empty">All images have been selected! You can close this tool.</div>';
                }
              } else {
                alert('Failed to select image.');
                row.style.opacity = '1';
                row.style.pointerEvents = 'auto';
              }
            } catch (e) {
              alert('Error: ' + e.message);
              row.style.opacity = '1';
              row.style.pointerEvents = 'auto';
            }
          }

          loadPlayers();
        </script>
      </body>
      </html>
    `);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\\n=============================================`);
  console.log(`✅ Image Selector Server is running!`);
  console.log(`👉 Open your browser to: http://localhost:${PORT}`);
  console.log(`=============================================\\n`);
});

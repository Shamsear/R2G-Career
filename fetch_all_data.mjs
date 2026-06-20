import fs from 'fs';
import { getManagersFromGoogleSheets, getManagerByNameFromGoogleSheets } from './utils/solo/googleSheetsFetcher.js';

const SPREADSHEET_ID = '16ajQjt7qVREV6z0x6wFgjtFrJErhPiFTK38Lfy0RCmw';

async function main() {
    console.log('Fetching all managers...');
    try {
        const managers = await getManagersFromGoogleSheets(SPREADSHEET_ID, 'summary');
        
        console.log(`Found ${managers.length} managers. Fetching their squads...`);
        
        const fullData = [];
        for (const manager of managers) {
            console.log(`Fetching squad for ${manager.name} (Club: ${manager.club})...`);
            try {
                const fullManager = await getManagerByNameFromGoogleSheets(SPREADSHEET_ID, manager.name, 'summary');
                fullData.push(fullManager);
            } catch (err) {
                console.error(`Failed to fetch squad for ${manager.name}: ${err.message}`);
                // Push just the summary if squad fails
                fullData.push(manager);
            }
            // Sleep to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        fs.writeFileSync('spreadsheet_data.json', JSON.stringify(fullData, null, 2));
        console.log('Successfully wrote data to spreadsheet_data.json');
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

main();

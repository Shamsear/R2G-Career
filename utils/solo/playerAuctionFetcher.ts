
export const SHEET_ID = '1DO93v-xB2cPZn31-drgOggeVFgaH-0V0XLPjhfkB5Ek';
export const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'];

export async function fetchPositionData(position: string) {
    const sheetURL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${position}`;
    const response = await fetch(sheetURL);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const jsonText = text.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');
    
    const data = JSON.parse(jsonText);
    if (!data?.table?.rows) return [];

    return data.table.rows
        .filter((row: any) => {
            if (!row.c) return false;
            const values = row.c.map((cell: any) => cell?.v ?? '');
            const isNumber = !isNaN(parseFloat(values[0]));
            const hasPlayerName = values[1] && String(values[1]).trim() !== '';
            const isHeader = (!isNumber && values[0] && String(values[0]).trim() !== '') || !hasPlayerName;
            return !isHeader;
        })
        .map((row: any) => {
            if (!row.c) return null;
            const values = row.c.map((cell: any) => cell?.v ?? '');
            if (!values[1] && values[1] !== 0) return null;
            
            return {
                name: String(values[1] || '').trim(),
                position: position,
                team: String(values[2] || '').trim(),
                rating: parseInt(values[3]) || 0,
                bidAmount: parseInt(values[4]) || 0,
                rowId: String(values[5] || '').trim(),
                contract: String(values[6] || '').trim(),
                reservePrice: parseInt(values[3]) || 0
            };
        })
        .filter(Boolean);
}

export async function fetchAllPositionData() {
    const fetchPromises = POSITIONS.map(position => fetchPositionData(position));
    const results = await Promise.allSettled(fetchPromises);
    const allPlayers: any[] = [];
    results.forEach((result) => {
        if (result.status === 'fulfilled') {
            allPlayers.push(...result.value);
        }
    });
    return allPlayers;
}

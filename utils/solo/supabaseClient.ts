
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hydmjqeamcxzbnbesdfh.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5ZG1qcWVhbWN4emJuYmVzZGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzkxMTYsImV4cCI6MjA5MTMxNTExNn0.JqELh84rh3tn8Q1jrc67qHqldc1YrLO2k8d7yWCluU4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getPlayers(onProgress?: (msg: string) => void) {
    try {
        let allPlayers: any[] = [];
        
        if (onProgress) onProgress('Counting total players...');
        
        const { count, error: countError } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true });
            
        if (countError) throw countError;
        
        if (onProgress) onProgress(`Found ${count} players to load`);
        
        const pageSize = 1000;
        const totalPages = Math.ceil((count || 0) / pageSize);
        
        for (let page = 0; page < totalPages; page++) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            if (onProgress) onProgress(`Loading players ${from+1} to ${Math.min(to+1, count || 0)}...`);
            
            const { data: players, error: playersError } = await supabase
                .from('players')
                .select(`
                    id, 
                    name,
                    position,
                    value,
                    level,
                    image_path,
                    star,
                    clubs (id, name)
                `)
                .range(from, to);
                
            if (playersError) throw playersError;
            allPlayers = [...allPlayers, ...players];
            if (onProgress) onProgress(`Loaded ${allPlayers.length} of ${count} players`);
        }
        
        if (onProgress) onProgress('Loading player statistics...');
        let allPlayerStats: any[] = [];
        
        for (let page = 0; page < totalPages; page++) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            if (onProgress) onProgress(`Loading stats batch ${page+1} of ${totalPages}...`);
            
            const { data: playerStats, error: statsError } = await supabase
                .from('player_stats')
                .select('*')
                .range(from, to);
                
            if (statsError) throw statsError;
            allPlayerStats = [...allPlayerStats, ...playerStats];
        }
        
        if (onProgress) onProgress('Processing player data...');
        
        const statsByPlayerId: Record<string, any[]> = {};
        allPlayerStats.forEach(stat => {
            if (!statsByPlayerId[stat.player_id]) {
                statsByPlayerId[stat.player_id] = [];
            }
            statsByPlayerId[stat.player_id].push(stat);
        });
        
        if (onProgress) onProgress(`Preparing ${allPlayers.length} players for display...`);
        
        return allPlayers.map(player => {
            const playerClub = player.clubs ? player.clubs.name : "FREE AGENT";
            const playerStats = statsByPlayerId[player.id] || [];
            
            let starRating = '3-star-standard';
            if (player.star && (player.star.includes('legend') || player.star.includes('standard'))) {
                starRating = player.star;
            } else {
                if (player.level >= 90) starRating = '5-star-standard';
                else if (player.level >= 85) starRating = '4-star-standard';
                else if (player.level >= 80) starRating = '3-star-standard';
            }
            
            return {
                id: player.id,
                name: player.name,
                club: playerClub,
                position: player.position || '',
                value: player.value || 0,
                star: starRating,
                level: player.level ? player.level.toString() : 'undefined',
                imagePath: player.image_path || `/assets/images/players/${player.name.replace(/\s+/g, '_')}.webp`,
                stats: playerStats.map(stat => ({
                    season: stat.season || 'N/A',
                    team: stat.team || 'N/A',
                    value: stat.value || 0
                }))
            };
        });
    } catch (error) {
        console.error('Error fetching players:', error);
        if (onProgress) onProgress('Error loading player data. Please try again.');
        return [];
    }
}

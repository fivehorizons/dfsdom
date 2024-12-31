import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import Papa from 'papaparse';

const DFSProjections = () => {
  const [projections, setProjections] = useState([]);
  const [loading, setLoading] = useState(true);

  const processStats = (data) => {
    const marketStats = {
      'player_points': 'PTS',
      'player_rebounds': 'TRB',
      'player_assists': 'AST',
      'player_threes': '3P',
      'player_steals': 'STL',
      'player_blocks': 'BLK',
      'player_turnovers': 'TOV'
    };
    
    const scoring = {
      'PTS': 1.0,
      '3P': 0.5,
      'TRB': 1.25,
      'AST': 1.5,
      'STL': 2.0,
      'BLK': 2.0,
      'TOV': -0.5
    };
    
    const playerMap = new Map();
    
    data.forEach(row => {
      const playerKey = `${row.description}_${row.game_id}`;
      if (!playerMap.has(playerKey)) {
        playerMap.set(playerKey, {
          description: row.description,
          game_id: row.game_id,
          home_team: row.home_team,
          away_team: row.away_team,
          bookmaker: row.bookmaker,
          stats: {}
        });
      }
      
      const player = playerMap.get(playerKey);
      const statKey = marketStats[row.market];
      if (statKey) {
        player.stats[statKey] = row.point || 0;
      }
    });
    
    return Array.from(playerMap.values())
      .map(player => {
        let fantasyPoints = 0;
        Object.entries(scoring).forEach(([stat, multiplier]) => {
          fantasyPoints += (player.stats[stat] || 0) * multiplier;
        });
        
        const doubleDigits = ['PTS', 'TRB', 'AST', 'STL', 'BLK']
          .filter(stat => (player.stats[stat] || 0) >= 10)
          .length;
        
        if (doubleDigits >= 2) fantasyPoints += 1.5;
        if (doubleDigits >= 3) fantasyPoints += 3.0;
        
        const availableProps = Object.keys(player.stats).length;
        const projectionConfidence = (availableProps / 7) * 100;
        
        return {
          ...player,
          fantasy_points: fantasyPoints,
          available_props: availableProps,
          projection_confidence: projectionConfidence
        };
      })
      .sort((a, b) => b.fantasy_points - a.fantasy_points);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/dfs1230.csv');
        const fileContent = await response.text();
        
        Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: function(results) {
            const overRecords = results.data.filter(row => row.label === 'Over');
            const processedData = processStats(overRecords);
            setProjections(processedData);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          Loading projections...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>NBA DFS Projections</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Player</th>
                <th className="text-right p-2">FPTS</th>
                <th className="text-right p-2">PTS</th>
                <th className="text-right p-2">REB</th>
                <th className="text-right p-2">AST</th>
                <th className="text-right p-2">3PM</th>
                <th className="text-right p-2">STL</th>
                <th className="text-right p-2">BLK</th>
                <th className="text-right p-2">TOV</th>
                <th className="text-right p-2">Conf%</th>
              </tr>
            </thead>
            <tbody>
              {projections.slice(0, 50).map((player, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <div>{player.description}</div>
                    <div className="text-sm text-gray-500">
                      {player.away_team} @ {player.home_team}
                    </div>
                  </td>
                  <td className="text-right p-2 font-bold">{player.fantasy_points.toFixed(1)}</td>
                  <td className="text-right p-2">{player.stats.PTS?.toFixed(1) || '0.0'}</td>
                  <td className="text-right p-2">{player.stats.TRB?.toFixed(1) || '0.0'}</td>
                  <td className="text-right p-2">{player.stats.AST?.toFixed(1) || '0.0'}</td>
                  <td className="text-right p-2">{player.stats['3P']?.toFixed(1) || '0.0'}</td>
                  <td className="text-right p-2">{player.stats.STL?.toFixed(1) || '0.0'}</td>
                  <td className="text-right p-2">{player.stats.BLK?.toFixed(1) || '0.0'}</td>
                  <td className="text-right p-2">{player.stats.TOV?.toFixed(1) || '0.0'}</td>
                  <td className="text-right p-2">{player.projection_confidence.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          Showing top 50 players sorted by projected fantasy points.
          Confidence percentage indicates completeness of available prop data.
        </div>
      </CardContent>
    </Card>
  );
};

export default DFSProjections;
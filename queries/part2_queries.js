
// Запуск: mongosh "ВАШ_URI" --file queries/part2_queries.js

db = db.getSiblingDB("spotify");

// ======================================================
// Завдання 1. Треки для вечірки
// danceability > 0.7, energy > 0.7, тривалість 3–5 хв (180000–300000 мс)
// ======================================================
print("=== Завдання 1: Треки для вечірки ===");

const partyTracks = db.tracks.find(
  {
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: { $gte: 180000, $lte: 300000 }
  },
  {
    _id: 0,
    track_id: 1,
    track_name: 1,
    artists: 1,
    track_genre: 1,
    duration_sec: 1,
    popularity: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1
  }
)
  .sort({ popularity: -1 })
  .limit(20)
  .toArray();

printjson(partyTracks);


// ======================================================
// Завдання 2. Виконавці, у яких усі треки популярні
// Мінімум 3 треки, мінімальна популярність >= 60, топ-20
// ======================================================
print("=== Завдання 2: Популярні виконавці (топ-20) ===");

const popularArtists = db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      track_count: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      track_count: 1,
      min_popularity: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  {
    $sort: {
      avg_popularity: -1,
      track_count: -1
    }
  },
  { $limit: 20 }
]).toArray();

printjson(popularArtists);


// ======================================================
// Завдання 3. Нетипові треки за темпом у межах жанру
// tempo > mean + 2 * stdDevPop
// ======================================================
print("=== Завдання 3: Нетипові треки за темпом ===");

const outlierTracksByGenre = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      std_tempo: { $stdDevPop: "$audio_features.tempo" },
      tracks: {
        $push: {
          _id: "$_id",
          track_name: "$track_name",
          popularity: "$popularity",
          artists: "$artists",
          audio_features: {
            tempo: "$audio_features.tempo"
          }
        }
      }
    }
  },
  {
    $addFields: {
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: [2, "$std_tempo"] }]
      }
    }
  },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 1] },
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_tracks: {
        $filter: {
          input: "$tracks",
          as: "track",
          cond: {
            $gt: ["$$track.audio_features.tempo", "$outlier_threshold"]
          }
        }
      }
    }
  },
  { $sort: { genre: 1 } }
]).toArray();

printjson(outlierTracksByGenre);


// ======================================================
// Завдання 4. Треки для фонової роботи
// loudness < -10, speechiness < 0.1, instrumentalness > 0.5, explicit: false
// ======================================================
print("=== Завдання 4: Треки для фонової роботи ===");

const focusTracks = db.tracks.find(
  {
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    explicit: false
  },
  {
    _id: 0,
    track_id: 1,
    track_name: 1,
    artists: 1,
    track_genre: 1,
    explicit: 1,
    popularity: 1,
    "audio_features.loudness": 1,
    "audio_features.speechiness": 1,
    "audio_features.instrumentalness": 1
  }
)
  .sort({ popularity: -1 })
  .limit(20)
  .toArray();

printjson(focusTracks);
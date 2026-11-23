
// Запуск: mongosh "ВАШ_URI" --file queries/part3_indexes.js

db = db.getSiblingDB("spotify");

// Допоміжна функція для компактного виводу ключових метрик explain("executionStats")
function printExplainSummary(label, explainResult) {
  const stats = explainResult.executionStats;
  const plan = explainResult.queryPlanner.winningPlan;

  print(`\n--- ${label} ---`);
  print("Winning Plan Stage: " + JSON.stringify(plan));
  print("executionSuccess: " + stats.executionSuccess);
  print("nReturned: " + stats.nReturned);
  print("executionTimeMillis: " + stats.executionTimeMillis);
  print("totalKeysExamined: " + stats.totalKeysExamined);
  print("totalDocsExamined: " + stats.totalDocsExamined);
}

// ======================================================
// Завдання 1. Аналіз запиту та індексація (ESR-правило)
// Запит: find({ track_genre: "pop", "audio_features.danceability": { $gte: 0.7 } }).sort({ popularity: -1 })
// ======================================================
print("======================================================");
print("Завдання 1: Пошук за жанром + danceability із сортуванням за popularity");
print("======================================================");

// 1.1. Видаляємо можливі старі користувацькі індекси для чистоти експерименту
db.tracks.dropIndexes();

// 1.2. Аналіз плану виконання ДО створення індексу
const explainBefore1 = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

printExplainSummary("ДО створення індексу (Завдання 1)", explainBefore1);

// 1.3. Створюємо складений індекс за правилом ESR:
// Equality (track_genre) -> Sort (popularity) -> Range (audio_features.danceability)
db.tracks.createIndex(
  {
    track_genre: 1,
    popularity: -1,
    "audio_features.danceability": 1
  },
  { name: "idx_genre_popularity_danceability" }
);

// 1.4. Аналіз плану виконання ПІСЛЯ створення індексу
const explainAfter1 = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

printExplainSummary("ПІСЛЯ створення індексу (Завдання 1)", explainAfter1);


// ======================================================
// Завдання 2. Індекс для треків для фонової роботи
// Поля: explicit, audio_features.instrumentalness, audio_features.speechiness
// ======================================================
print("\n======================================================");
print("Завдання 2: Пошук за explicit, instrumentalness та speechiness");
print("======================================================");

const focusFilter = {
  explicit: false,
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 }
};

// 2.1. Аналіз плану виконання ДО створення індексу
const explainBefore2 = db.tracks.find(focusFilter).explain("executionStats");
printExplainSummary("ДО створення індексу (Завдання 2)", explainBefore2);

// 2.2. Створюємо складений індекс:
// Спочатку точний збіг (explicit: 1), далі діапазонні фільтри
db.tracks.createIndex(
  {
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1
  },
  { name: "idx_explicit_instrumentalness_speechiness" }
);

// 2.3. Аналіз плану виконання ПІСЛЯ створення індексу
const explainAfter2 = db.tracks.find(focusFilter).explain("executionStats");
printExplainSummary("ПІСЛЯ створення індексу (Завдання 2)", explainAfter2);


// ======================================================
// Завдання 3. Покривний запит (Covered Query) — порівняння в терміналі
// ======================================================
print("\n======================================================");
print("Завдання 3: Порівняння звичайного запиту та Covered Query");
print("======================================================");

// 3.1. Вихідний запит із завдання (БЕЗ проєкції -> НЕ є covered query)
const explainNotCovered = db.tracks.find({
  track_genre: "pop",
  popularity: { $gte: 70 }
}).explain("executionStats");

printExplainSummary("3.1. БЕЗ проєкції (НЕ covered query -> стадія FETCH)", explainNotCovered);

// 3.2. Покривний запит (ІЗ проєкцією та _id: 0 -> COVERED QUERY)
const explainCovered = db.tracks.find(
  {
    track_genre: "pop",
    popularity: { $gte: 70 }
  },
  {
    _id: 0,
    track_genre: 1,
    popularity: 1
  }
).explain("executionStats");

printExplainSummary("3.2. ІЗ проєкцією (COVERED QUERY -> totalDocsExamined: 0)", explainCovered);
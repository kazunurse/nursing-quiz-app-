import { useState, useEffect } from 'react'
import './App.css'
import {
  FaHeart, FaBrain, FaLungs, FaBone, FaChild, FaUserNurse,
  FaBookMedical, FaSyringe, FaStethoscope, FaNotesMedical,
  FaTrophy, FaFire, FaStar, FaCheckCircle, FaTimesCircle,
  FaArrowLeft, FaArrowRight, FaHome, FaRedo, FaHistory,
  FaTrash, FaQuestionCircle, FaGraduationCap, FaChartLine
} from 'react-icons/fa'
import { GiKidneys, GiStomach, GiMedicines } from 'react-icons/gi'
import { MdQuiz, MdPlayArrow } from 'react-icons/md'

// 問題データをインポート（Notionから取得したデータ）
// データがない場合はサンプルデータを使用
const sampleData = {
  categories: [
    { id: '1', name: '循環器系', questionCount: 2 }
  ],
  questions: [
    {
      id: '1',
      category: '循環器系',
      question: 'ループ系利尿薬とジギタリス製剤を服用している。\n最も注意すべき血液検査項目はどれか。',
      choices: ['カリウム値', 'カルシウム値', 'ビリルビン値', 'クレアチニン値'],
      answer: 0,
      explanation: 'ループ系利尿薬は低カリウム血症を引き起こしやすく、低カリウム血症はジギタリス中毒を誘発するため、カリウム値の監視が重要です。',
      tags: ['心不全']
    },
    {
      id: '2',
      category: '循環器系',
      question: '心臓の右心室から出る血管はどれか。',
      choices: ['大動脈', '肺動脈', '肺静脈', '大静脈'],
      answer: 1,
      explanation: '右心室からは肺動脈が出て、肺へ静脈血を送ります。',
      tags: ['心臓の構造']
    }
  ]
}

// カテゴリーアイコンのマッピング
const categoryIcons = {
  '循環器系': FaHeart,
  '呼吸器系': FaLungs,
  '神経系': FaBrain,
  '消化器系': GiStomach,
  '腎・泌尿器系': GiKidneys,
  '骨・筋肉系': FaBone,
  '小児看護': FaChild,
  '母性看護': FaUserNurse,
  '基礎看護': FaBookMedical,
  '薬理学': GiMedicines,
  '成人看護': FaSyringe,
  '老年看護': FaStethoscope,
  '精神看護': FaBrain,
  '在宅看護': FaHome,
  '公衆衛生': FaNotesMedical,
  'default': FaQuestionCircle
}

// カテゴリーアイコンを取得
const getCategoryIcon = (categoryName) => {
  return categoryIcons[categoryName] || categoryIcons['default']
}

// ローカルストレージのキー
const STORAGE_KEYS = {
  HISTORY: 'nursing-quiz-history',
  WRONG_ANSWERS: 'nursing-quiz-wrong',
  STATS: 'nursing-quiz-stats'
}

// ローカルストレージ操作
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.error('Failed to save to localStorage')
    }
  }
}

function App() {
  const [data, setData] = useState(null)
  const [screen, setScreen] = useState('home') // home, category, quiz, result, history, wrong
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])
  const [quizQuestions, setQuizQuestions] = useState([])
  const [stats, setStats] = useState({ totalQuizzes: 0, totalCorrect: 0, totalQuestions: 0 })
  const [history, setHistory] = useState([])
  const [wrongAnswers, setWrongAnswers] = useState([])

  // データと保存データを読み込み
  useEffect(() => {
    // 問題データ読み込み
    import('./data/questions.json')
      .then(module => setData(module.default))
      .catch(() => setData(sampleData))

    // 保存データ読み込み
    const savedStats = storage.get(STORAGE_KEYS.STATS)
    const savedHistory = storage.get(STORAGE_KEYS.HISTORY)
    const savedWrong = storage.get(STORAGE_KEYS.WRONG_ANSWERS)

    if (savedStats) setStats(savedStats)
    if (savedHistory) setHistory(savedHistory)
    if (savedWrong) setWrongAnswers(savedWrong)
  }, [])

  // 結果を保存
  const saveResult = (category, correctCount, totalCount, wrongIds) => {
    // 統計更新
    const newStats = {
      totalQuizzes: stats.totalQuizzes + 1,
      totalCorrect: stats.totalCorrect + correctCount,
      totalQuestions: stats.totalQuestions + totalCount
    }
    setStats(newStats)
    storage.set(STORAGE_KEYS.STATS, newStats)

    // 履歴追加
    const newHistory = [
      {
        date: new Date().toISOString(),
        category: category,
        score: correctCount,
        total: totalCount,
        percentage: Math.round((correctCount / totalCount) * 100)
      },
      ...history.slice(0, 19) // 最新20件まで保存
    ]
    setHistory(newHistory)
    storage.set(STORAGE_KEYS.HISTORY, newHistory)

    // 間違えた問題を保存
    const updatedWrong = [...new Set([...wrongAnswers, ...wrongIds])]
    setWrongAnswers(updatedWrong)
    storage.set(STORAGE_KEYS.WRONG_ANSWERS, updatedWrong)
  }

  // 間違えた問題から削除（正解したら）
  const removeFromWrong = (questionId) => {
    const updated = wrongAnswers.filter(id => id !== questionId)
    setWrongAnswers(updated)
    storage.set(STORAGE_KEYS.WRONG_ANSWERS, updated)
  }

  if (!data) {
    return <div className="loading">読み込み中...</div>
  }

  // カテゴリー選択
  const selectCategory = (category) => {
    const questions = data.questions.filter(q => q.category === category.name)
    setQuizQuestions(questions)
    setSelectedCategory(category)
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 全問チャレンジ
  const startAllQuestions = () => {
    setQuizQuestions([...data.questions].sort(() => Math.random() - 0.5))
    setSelectedCategory({ name: '全問チャレンジ' })
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 間違えた問題に挑戦
  const startWrongQuestions = () => {
    const wrongQuestions = data.questions.filter(q => wrongAnswers.includes(q.id))
    if (wrongQuestions.length === 0) {
      alert('間違えた問題はありません！')
      return
    }
    setQuizQuestions(wrongQuestions.sort(() => Math.random() - 0.5))
    setSelectedCategory({ name: '間違えた問題' })
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 回答を選択
  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(index)
    setShowExplanation(true)

    const currentQuestion = quizQuestions[currentQuestionIndex]
    const isCorrect = index === currentQuestion.answer

    if (isCorrect) {
      setScore(score + 1)
      // 正解したら間違えた問題リストから削除
      if (wrongAnswers.includes(currentQuestion.id)) {
        removeFromWrong(currentQuestion.id)
      }
    }

    setAnswers([...answers, {
      questionId: currentQuestion.id,
      selected: index,
      correct: currentQuestion.answer,
      isCorrect
    }])
  }

  // 次の問題へ
  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    } else {
      // 結果を保存
      const wrongIds = answers.filter(a => !a.isCorrect).map(a => a.questionId)
      saveResult(selectedCategory.name, score, quizQuestions.length, wrongIds)
      setScreen('result')
    }
  }

  // ホームに戻る
  const goHome = () => {
    setScreen('home')
    setSelectedCategory(null)
    setQuizQuestions([])
  }

  // データリセット
  const resetData = () => {
    if (confirm('学習履歴をすべて削除しますか？')) {
      localStorage.removeItem(STORAGE_KEYS.HISTORY)
      localStorage.removeItem(STORAGE_KEYS.WRONG_ANSWERS)
      localStorage.removeItem(STORAGE_KEYS.STATS)
      setStats({ totalQuizzes: 0, totalCorrect: 0, totalQuestions: 0 })
      setHistory([])
      setWrongAnswers([])
    }
  }

  // ホーム画面
  if (screen === 'home') {
    const overallPercentage = stats.totalQuestions > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
      : 0

    return (
      <div className="app">
        <header className="header">
          <img src="/hero.png" alt="看護師国家試験対策" className="hero-image" />
          <h1><FaGraduationCap className="title-icon" /> 看護師国家試験アプリ</h1>
          <p className="subtitle">かずからの挑戦状</p>
        </header>

        <main className="main">
          {/* 学習統計 */}
          {stats.totalQuizzes > 0 && (
            <div className="stats-card">
              <h3><FaChartLine className="section-icon" /> 学習の記録</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon fire"><FaFire /></div>
                  <span className="stat-number">{stats.totalQuizzes}</span>
                  <span className="stat-label">回挑戦</span>
                </div>
                <div className="stat-item">
                  <div className="stat-icon trophy"><FaTrophy /></div>
                  <span className="stat-number">{overallPercentage}%</span>
                  <span className="stat-label">正解率</span>
                </div>
                <div className="stat-item">
                  <div className="stat-icon star"><FaStar /></div>
                  <span className="stat-number">{wrongAnswers.length}</span>
                  <span className="stat-label">要復習</span>
                </div>
              </div>
            </div>
          )}

          <button className="all-challenge-btn" onClick={startAllQuestions}>
            <MdPlayArrow className="btn-icon" />
            全問チャレンジ ({data.questions.length}問)
          </button>

          {wrongAnswers.length > 0 && (
            <button className="wrong-challenge-btn" onClick={startWrongQuestions}>
              <FaRedo className="btn-icon" />
              間違えた問題に挑戦 ({wrongAnswers.length}問)
            </button>
          )}

          <h2><MdQuiz className="section-icon" /> カテゴリーを選択</h2>
          <div className="category-grid">
            {data.categories.map(category => {
              const IconComponent = getCategoryIcon(category.name)
              return (
                <button
                  key={category.id}
                  className="category-btn"
                  onClick={() => selectCategory(category)}
                >
                  <div className="category-icon">
                    <IconComponent />
                  </div>
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{category.questionCount}問</span>
                </button>
              )
            })}
          </div>

          {/* 履歴・リセットボタン */}
          {stats.totalQuizzes > 0 && (
            <div className="history-actions">
              <button className="history-btn" onClick={() => setScreen('history')}>
                <FaHistory className="btn-icon-small" /> 学習履歴を見る
              </button>
              <button className="reset-btn" onClick={resetData}>
                <FaTrash className="btn-icon-small" /> データをリセット
              </button>
            </div>
          )}
        </main>

        <footer className="footer">
          <p>最終更新: {new Date(data.lastUpdated).toLocaleDateString('ja-JP')}</p>
        </footer>
      </div>
    )
  }

  // 履歴画面
  if (screen === 'history') {
    return (
      <div className="app">
        <header className="quiz-header">
          <button className="back-btn" onClick={goHome}><FaArrowLeft /> 戻る</button>
          <h2 style={{ flex: 1, textAlign: 'center', margin: 0 }}><FaHistory className="section-icon" /> 学習履歴</h2>
          <div style={{ width: '60px' }}></div>
        </header>

        <main className="history-main">
          {history.length === 0 ? (
            <p className="no-history">まだ学習履歴がありません</p>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-date">
                    {new Date(item.date).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="history-category">{item.category}</div>
                  <div className="history-score">
                    <span className={item.percentage >= 80 ? 'good' : item.percentage >= 60 ? 'ok' : 'bad'}>
                      {item.score}/{item.total} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // クイズ画面
  if (screen === 'quiz') {
    const question = quizQuestions[currentQuestionIndex]

    return (
      <div className="app">
        <header className="quiz-header">
          <button className="back-btn" onClick={goHome}><FaArrowLeft /> 戻る</button>
          <div className="progress">
            <span>{currentQuestionIndex + 1} / {quizQuestions.length}</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="score-display">
            正解: {score}問
          </div>
        </header>

        <main className="quiz-main">
          <div className="category-tag">{question.category}</div>

          <div className="question-card">
            <p className="question-text">{question.question}</p>
          </div>

          <div className="choices">
            {question.choices.map((choice, index) => {
              let className = 'choice-btn'
              if (selectedAnswer !== null) {
                if (index === question.answer) {
                  className += ' correct'
                } else if (index === selectedAnswer) {
                  className += ' incorrect'
                }
              }

              return (
                <button
                  key={index}
                  className={className}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                >
                  <span className="choice-number">{index + 1}</span>
                  <span className="choice-text">{choice}</span>
                </button>
              )
            })}
          </div>

          {showExplanation && (
            <div className="explanation">
              <h3 className={selectedAnswer === question.answer ? 'correct-title' : 'incorrect-title'}>
                {selectedAnswer === question.answer ? <><FaCheckCircle /> 正解！</> : <><FaTimesCircle /> 不正解</>}
              </h3>
              <p>{question.explanation}</p>
              <button className="next-btn" onClick={nextQuestion}>
                {currentQuestionIndex < quizQuestions.length - 1 ? <>次の問題へ <FaArrowRight /></> : <>結果を見る <FaTrophy /></>}
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // 結果画面
  if (screen === 'result') {
    const percentage = Math.round((score / quizQuestions.length) * 100)

    let message = ''
    let emoji = ''
    if (percentage === 100) {
      message = '完璧！素晴らしい！'
      emoji = '🎉'
    } else if (percentage >= 80) {
      message = '優秀です！'
      emoji = '😊'
    } else if (percentage >= 60) {
      message = 'もう少しで合格ライン！'
      emoji = '💪'
    } else {
      message = '復習しましょう！'
      emoji = '📚'
    }

    return (
      <div className="app">
        <main className="result-main">
          <h1 className="result-emoji">{emoji}</h1>
          <h2>結果発表</h2>

          <div className="result-card">
            <div className="result-score">
              <span className="score-number">{score}</span>
              <span className="score-total">/ {quizQuestions.length}</span>
            </div>
            <div className="result-percentage">{percentage}%</div>
            <p className="result-message">{message}</p>
          </div>

          <div className="result-details">
            <h3>解答一覧</h3>
            {answers.map((answer, index) => (
              <div key={index} className={`answer-item ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                <span className="answer-number">問{index + 1}</span>
                <span className="answer-status">{answer.isCorrect ? '⭕' : '❌'}</span>
              </div>
            ))}
          </div>

          <p className="save-notice">結果は自動保存されました</p>

          <div className="result-actions">
            <button className="retry-btn" onClick={() => {
              setCurrentQuestionIndex(0)
              setScore(0)
              setAnswers([])
              setSelectedAnswer(null)
              setShowExplanation(false)
              setScreen('quiz')
            }}>
              <FaRedo className="btn-icon" /> もう一度挑戦
            </button>
            <button className="home-btn" onClick={goHome}>
              <FaHome className="btn-icon" /> ホームに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}

export default App
